/**
 * Moteur de calcul 2086 — plus-values de cession d'actifs numériques (CGI art. 150 VH bis),
 * méthode de la **valeur globale du portefeuille**. Module pur, 100 % testable.
 *
 * Oracle fiscal et citations (Legifrance / BOFiP / formulaire 2086) : voir SOURCES-2086.md.
 * Cas-types gelés : voir compute.test.ts.
 *
 * Mécanique (cf. SOURCES-2086.md §2-3), cessions imposables ordonnées chronologiquement :
 *   ptaNet(n)       = prixTotalAcquisitionInitial − Σ_{k<n} fractionImputée(k)        (ligne 223)
 *   fractionImputée(n) = ptaNet(n) × ( prixCession(n) / valeurGlobale(n) )            (217 / 212)
 *   PV(n)           = ( prixCession(n) − frais(n) ) − fractionImputée(n)              (218 − …)
 *
 * Argent en **centimes entiers** ; seul le ratio `prixCession / valeurGlobale` est flottant,
 * appliqué puis arrondi au centime.
 */

import {
  SEUIL_EXONERATION_CENTS,
  type Cents,
  type Cession,
  type Declaration2086,
  type ResultatCession,
} from "./types";

/** Erreur explicite : la valeur globale du portefeuille doit être strictement positive. */
export class ValeurGlobaleInvalideError extends Error {
  constructor(public readonly cession: Cession) {
    super(
      `Valeur globale du portefeuille invalide (${cession.valeurGlobalePortefeuilleCents} centimes) ` +
        `pour la cession du ${cession.date} : elle doit être > 0 (ligne 212 du 2086).`,
    );
    this.name = "ValeurGlobaleInvalideError";
  }
}

/**
 * Une cession est-elle un fait générateur imposable ? (CGI 150 VH bis, I & II-A.)
 * Faux pour les échanges crypto→crypto sans soulte (`actif-numerique`), qui bénéficient du
 * sursis d'imposition et sont exclus du calcul. Cf. SOURCES-2086.md §4.
 */
export function estImposable(contrepartie: Cession["contrepartie"]): boolean {
  return contrepartie !== "actif-numerique";
}

/** Centimes → euros entiers (arrondi au plus proche), pour les valeurs reportées sur le cerfa. */
function eurosArrondis(cents: Cents): number {
  return Math.round(cents / 100);
}

/**
 * Calcule la déclaration 2086 (assiette) à partir des cessions de l'année.
 *
 * @param cessions Opérations de l'année (l'historique peut contenir des échanges crypto→crypto :
 *                 ils sont automatiquement filtrés). Triées par date pour l'imputation.
 * @param prixTotalAcquisitionInitialCents Prix total d'acquisition initial du portefeuille
 *                 (ligne 220 de la première cession), en centimes : somme des prix acquittés en
 *                 monnaie ayant cours légal pour acquérir les actifs détenus. Les actifs reçus
 *                 par échange en sursis comptent pour 0 (cf. SOURCES-2086.md §2).
 * @returns Détail par cession + agrégats (PV nette, 3AN/3BN, exonération 305 €), en EUR pour les
 *          valeurs reportables.
 *
 * @throws ValeurGlobaleInvalideError si une cession imposable a une valeur globale ≤ 0.
 */
export function calculeDeclaration2086(
  cessions: readonly Cession[],
  prixTotalAcquisitionInitialCents: Cents,
): Declaration2086 {
  // 1) Garde-fou crypto→crypto : on ne calcule QUE les cessions imposables (II-A).
  // 2) Ordre chronologique : l'imputation des fractions de capital initial est séquentielle.
  const imposables = cessions
    .filter((c) => estImposable(c.contrepartie))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let ptaNetCents = prixTotalAcquisitionInitialCents;
  let totalCessionsNetFraisCents = 0;
  let plusValueNetteCents = 0;
  const resultats: ResultatCession[] = [];

  for (const c of imposables) {
    if (!Number.isInteger(c.valeurGlobalePortefeuilleCents) || c.valeurGlobalePortefeuilleCents <= 0) {
      throw new ValeurGlobaleInvalideError(c);
    }
    const frais = c.fraisCessionCents ?? 0;

    // Ligne 218 (minuende) = prix de cession net des frais. Ligne 217 (numérateur du ratio) =
    // prix de cession BRUT de frais : les frais réduisent le gain, pas la proportion cédée.
    const prixNetFrais = c.prixCessionCents - frais;

    // Fraction de capital initial imputée = ptaNet × (217 / 212), arrondie au centime.
    const fraction = Math.round(
      (ptaNetCents * c.prixCessionCents) / c.valeurGlobalePortefeuilleCents,
    );

    const plusValue = prixNetFrais - fraction;

    resultats.push({
      date: c.date,
      prixCessionCents: c.prixCessionCents,
      fraisCessionCents: frais,
      valeurGlobalePortefeuilleCents: c.valeurGlobalePortefeuilleCents,
      prixAcquisitionNetCents: ptaNetCents,
      fractionAcquisitionImputeeCents: fraction,
      plusValueCents: plusValue,
    });

    // Report sur les cessions suivantes : le prix d'acquisition disponible diminue (ligne 221).
    ptaNetCents -= fraction;
    totalCessionsNetFraisCents += prixNetFrais;
    plusValueNetteCents += plusValue;
  }

  // Seuil 305 € (II-B) sur la somme des prix de cession nets de frais (ligne 51) — tout ou rien.
  const exonere305 = totalCessionsNetFraisCents <= SEUIL_EXONERATION_CENTS;

  // Routage : net > 0 → 3AN ; net < 0 → 3BN (valeur absolue) ; exonéré → 0 partout (II-B).
  const netEur = exonere305 ? 0 : eurosArrondis(plusValueNetteCents);

  return {
    cessions: resultats,
    totalCessionsEur: eurosArrondis(totalCessionsNetFraisCents),
    exonere305,
    plusValueNetteEur: exonere305 ? 0 : eurosArrondis(plusValueNetteCents),
    case3anEur: netEur > 0 ? netEur : 0,
    case3bnEur: netEur < 0 ? -netEur : 0,
  };
}
