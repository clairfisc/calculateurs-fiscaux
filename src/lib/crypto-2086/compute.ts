/**
 * Moteur de calcul 2086 — plus-values de cession d'actifs numériques (CGI art. 150 VH bis),
 * méthode de la **valeur globale du portefeuille**, sur un **journal chronologique** d'opérations
 * (achats + ventes). Module pur, 100 % testable.
 *
 * Oracle fiscal et citations (Legifrance / BOFiP / formulaire 2086) : voir SOURCES-2086.md.
 * Cas-types gelés : voir compute.test.ts.
 *
 * Mécanique (cf. SOURCES-2086.md §2-3), opérations traitées dans l'ordre chronologique :
 *   à chaque ACHAT  : ptaNet += montant payé                                   (ligne 220 cumulée)
 *   à chaque VENTE  : fractionImputée = ptaNet × ( prixCession / valeurGlobale )   (217 / 212)
 *                     PV = ( prixCession − frais ) − fractionImputée               (218 − …)
 *                     ptaNet -= fractionImputée                                     (ligne 221)
 *
 * Un rachat entre deux ventes augmente donc `ptaNet` pour les ventes suivantes (équivalent à la
 * ligne 223 = 220 − 221 du cerfa). Argent en **centimes entiers** ; seul le ratio
 * `prixCession / valeurGlobale` est flottant, appliqué puis arrondi au centime.
 */

import {
  SEUIL_EXONERATION_CENTS,
  type Cents,
  type Declaration2086,
  type Operation,
  type ResultatVente,
  type Vente,
} from "./types";

/** Erreur explicite : la valeur globale du portefeuille doit être strictement positive. */
export class ValeurGlobaleInvalideError extends Error {
  constructor(public readonly vente: Vente) {
    super(
      `Valeur globale du portefeuille invalide (${vente.valeurGlobalePortefeuilleCents} centimes) ` +
        `pour la vente du ${vente.date} : elle doit être > 0 (ligne 212 du 2086).`,
    );
    this.name = "ValeurGlobaleInvalideError";
  }
}

/** Centimes → euros entiers (arrondi au plus proche), pour les valeurs reportées sur le cerfa. */
function eurosArrondis(cents: Cents): number {
  return Math.round(cents / 100);
}

/**
 * Calcule la déclaration 2086 (assiette) à partir du journal d'opérations de l'année.
 *
 * @param operations Suite d'**achats** (acquisitions en €) et de **ventes** (cessions
 *                   imposables). Triées par date pour l'imputation (ordre de saisie conservé à
 *                   date égale). Les échanges crypto→crypto ne sont PAS des opérations (sursis).
 * @returns Détail par vente + agrégats (PV nette, 3AN/3BN, exonération 305 €), en EUR pour les
 *          valeurs reportables.
 *
 * @throws ValeurGlobaleInvalideError si une vente a une valeur globale ≤ 0.
 */
export function calculeDeclaration2086(operations: readonly Operation[]): Declaration2086 {
  // Ordre chronologique : achats et ventes s'enchaînent ; l'imputation est séquentielle.
  // Tri stable → à date égale, l'ordre de saisie (donc l'intention de l'utilisateur) est conservé.
  const journal = operations
    .map((op, i) => ({ op, i }))
    .sort((a, b) => (a.op.date < b.op.date ? -1 : a.op.date > b.op.date ? 1 : a.i - b.i))
    .map(({ op }) => op);

  let ptaNetCents = 0;
  let totalCessionsNetFraisCents = 0;
  let plusValueNetteCents = 0;
  const ventes: ResultatVente[] = [];

  for (const op of journal) {
    if (op.type === "achat") {
      // Acquisition : augmente le prix total d'acquisition disponible (ligne 220 cumulée).
      ptaNetCents += op.montantCents;
      continue;
    }

    // op.type === "vente"
    if (!Number.isInteger(op.valeurGlobalePortefeuilleCents) || op.valeurGlobalePortefeuilleCents <= 0) {
      throw new ValeurGlobaleInvalideError(op);
    }
    const frais = op.fraisCessionCents ?? 0;

    // Ligne 218 (minuende) = prix de cession net des frais. Ligne 217 (numérateur du ratio) =
    // prix de cession BRUT de frais : les frais réduisent le gain, pas la proportion cédée.
    const prixNetFrais = op.prixCessionCents - frais;

    // Fraction de capital initial imputée = ptaNet × (217 / 212), arrondie au centime.
    const fraction = Math.round(
      (ptaNetCents * op.prixCessionCents) / op.valeurGlobalePortefeuilleCents,
    );

    const plusValue = prixNetFrais - fraction;

    ventes.push({
      date: op.date,
      prixCessionCents: op.prixCessionCents,
      fraisCessionCents: frais,
      valeurGlobalePortefeuilleCents: op.valeurGlobalePortefeuilleCents,
      prixAcquisitionNetCents: ptaNetCents,
      fractionAcquisitionImputeeCents: fraction,
      plusValueCents: plusValue,
    });

    // Report sur les ventes suivantes : le prix d'acquisition disponible diminue (ligne 221).
    ptaNetCents -= fraction;
    totalCessionsNetFraisCents += prixNetFrais;
    plusValueNetteCents += plusValue;
  }

  // Seuil 305 € (II-B) sur la somme des prix de cession nets de frais (ligne 51) — tout ou rien.
  const exonere305 = totalCessionsNetFraisCents <= SEUIL_EXONERATION_CENTS;

  // Routage : net > 0 → 3AN ; net < 0 → 3BN (valeur absolue) ; exonéré → 0 partout (II-B).
  const netEur = exonere305 ? 0 : eurosArrondis(plusValueNetteCents);

  return {
    ventes,
    totalCessionsEur: eurosArrondis(totalCessionsNetFraisCents),
    exonere305,
    plusValueNetteEur: exonere305 ? 0 : eurosArrondis(plusValueNetteCents),
    case3anEur: netEur > 0 ? netEur : 0,
    case3bnEur: netEur < 0 ? -netEur : 0,
    prixAcquisitionRestantCents: ptaNetCents,
  };
}
