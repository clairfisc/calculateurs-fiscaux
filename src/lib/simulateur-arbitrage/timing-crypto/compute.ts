/**
 * Levier **L3 — Timing / fractionnement de la conversion fiat (crypto)** : moteur de **composition**
 * (aucune règle fiscale en propre).
 *
 * On appelle `crypto-2086.calculeDeclaration2086` **une fois par année** :
 *   - scénario A : une seule année, une seule cession du montant total à convertir ;
 *   - scénario B : `nbFractions` années consécutives, une cession égale par année — le prix
 *     d'acquisition net **restant** (`prixAcquisitionRestantCents`, ligne 223) étant reporté d'une
 *     année à la suivante via le paramètre `reportAcquisitionNetCents`, exactement comme le 2086 le
 *     prévoit pour un portefeuille déjà détenu (CGI art. 150 VH bis, III-B).
 * On **cumule l'assiette imposable en centimes** (la plus-value nette de chaque année, 0 si l'année
 * est exonérée par le seuil 305 €), puis on estime l'impôt + PS **une seule fois** sur ce cumul via
 * `pfu-bareme.compareRegimes` (même source de taux que la page /plus-values-crypto-2086 : la
 * plus-value crypto est, comme une plus-value mobilière, soumise au PFU ou, sur option globale au
 * barème — case 3CN, cessions depuis le 01/01/2023, distincte de la 2OP des titres ; LF 2022 art. 79).
 *
 * RÈGLE D'OR : on travaille en **centimes** de bout en bout et on n'arrondit à l'euro qu'à la toute
 * fin. À taux constant (hypothèse du levier), l'impôt est linéaire en l'assiette : taxer le cumul
 * revient à taxer année par année, **mais sans accumuler les arrondis** — sommer des euros déjà
 * arrondis chaque année introduisait un faux écart de ±1 € (assiette et impôt dérivant en sens
 * opposés). Le seul écart réel entre A et B reste donc l'effet du seuil 305 €. Mode A : libellés neutres.
 */

import { calculeDeclaration2086 } from "../../crypto-2086";
import type { Cents as Cents2086, Operation } from "../../crypto-2086";
import { compareRegimes } from "../../pfu-bareme/index";
import type { Cents, ComparatifArbitrage, ScenarioChiffre } from "../types";
import {
  GARDE_FOUS_TIMING_CRYPTO,
  MAX_FRACTIONS,
  type DetailsTimingCrypto,
  type ParametresImposition,
  type RegimeImposition,
  type TimingCryptoInput,
} from "./types";

/** Identifiant du levier dans le contrat partagé. */
const LEVIER = "timing-crypto";

const clampMin0 = (n: number): number => (n > 0 ? Math.round(n) : 0);

/**
 * Impôt + PS estimés (centimes) sur une **assiette imposable en centimes** (plus-value nette crypto
 * cumulée, case 3AN), via `compareRegimes`. Appelé **une seule fois** par scénario sur le cumul, pour
 * n'arrondir qu'à la fin (cf. RÈGLE D'OR).
 */
function impotEtPsCents(assietteTaxableCents: Cents, imposition: ParametresImposition): Cents {
  const regime: RegimeImposition = imposition.regime ?? "PFU";
  const r = compareRegimes({
    millesime: imposition.millesime,
    tmiBp: imposition.tmiBp,
    revenuImposableHorsCapitalCents: imposition.revenuImposableHorsCapitalCents,
    parts: imposition.parts,
    dividendesCents: 0,
    interetsCents: 0,
    // La plus-value crypto (case 3AN) est une plus-value mobilière au sens du PFU / barème.
    plusValuesCents: Math.max(0, assietteTaxableCents),
  });
  // `compareRegimes` renvoie des euros pleins ; on repasse en centimes (exact, pas de perte).
  const totalEur = regime === "BAREME" ? r.bareme.totalEur : r.pfu.totalEur;
  return totalEur * 100;
}

/** Résultat agrégé d'un découpage en `nbAnnees` cessions égales du montant total à convertir. */
interface ResultatDecoupage {
  /** Assiette imposable cumulée (case 3AN) sur toutes les années, en **centimes** (post-seuil 305 €). */
  readonly assietteTaxableTotaleCents: Cents;
  /** Nombre d'années exonérées au titre du seuil 305 €. */
  readonly nbAnneesExonerees305: number;
}

/**
 * Découpe la conversion en `nbAnnees` cessions égales (une par année) et cumule, année par année,
 * la **plus-value nette imposable en centimes** (via le moteur 2086, en reportant le prix
 * d'acquisition net restant). On ne liquide PAS l'impôt ici : on agrège l'assiette, l'impôt est
 * estimé une fois sur le cumul (cf. `calculeTimingCrypto`) pour ne pas accumuler les arrondis.
 *
 * Hypothèse neutre : pas d'évolution de cours. La valeur globale du portefeuille de l'année `k`
 * (0-indexé) est la valeur globale initiale diminuée de ce qui a déjà été cédé les années
 * précédentes — le portefeuille rétrécit de la part convertie. Ainsi, sans effet de seuil, l'assiette
 * cumulée (en centimes) est **identique** quel que soit le découpage : seul le seuil 305 € peut faire
 * diverger A et B.
 */
function decoupe(input: TimingCryptoInput, nbAnnees: number): ResultatDecoupage {
  const total: Cents2086 = clampMin0(input.montantTotalAConvertirCents);
  const prixAcqTotal: Cents2086 = clampMin0(input.prixAcquisitionTotalCents);
  // Valeur globale : au moins le montant converti (on ne peut convertir plus que ce qu'on détient).
  const valeurGlobaleInit: Cents2086 = Math.max(
    clampMin0(input.valeurGlobalePortefeuilleCents ?? 0),
    total,
  );

  // Cessions égales en centimes ; le reliquat d'arrondi part sur la dernière année (somme exacte).
  const parAnnee = Math.floor(total / nbAnnees);
  const reste = total - parAnnee * nbAnnees;

  let reportAcquisitionNetCents: Cents2086 = prixAcqTotal;
  let dejaCede: Cents2086 = 0;
  let assietteTaxableTotaleCents = 0;
  let nbAnneesExonerees305 = 0;

  for (let k = 0; k < nbAnnees; k++) {
    const montantAnnee = parAnnee + (k === nbAnnees - 1 ? reste : 0);
    if (montantAnnee <= 0) continue;

    // Valeur globale du portefeuille avant la cession de l'année : valeur initiale − déjà cédé.
    // Bornée au montant de l'année (le moteur 2086 exige valeurGlobale > 0 et ≥ part cédée).
    const valeurGlobaleAnnee = Math.max(valeurGlobaleInit - dejaCede, montantAnnee);

    const operations: Operation[] = [
      {
        type: "vente",
        date: `${2025 + k}-06-30`,
        prixCessionCents: montantAnnee,
        valeurGlobalePortefeuilleCents: valeurGlobaleAnnee,
      },
    ];

    const decl = calculeDeclaration2086(operations, reportAcquisitionNetCents);

    // Assiette en centimes (et non l'euro arrondi `case3anEur`) : une année exonérée par le seuil
    // 305 € ne contribue pas ; sinon on cumule la plus-value nette positive de l'année.
    if (decl.exonere305) {
      nbAnneesExonerees305 += 1;
    } else {
      const netAnneeCents = decl.ventes.reduce((s, v) => s + v.plusValueCents, 0);
      assietteTaxableTotaleCents += Math.max(0, netAnneeCents);
    }

    // Report sur l'année suivante : le prix d'acquisition net consommé est retranché (ligne 223).
    reportAcquisitionNetCents = decl.prixAcquisitionRestantCents;
    dejaCede += montantAnnee;
  }

  return {
    assietteTaxableTotaleCents,
    nbAnneesExonerees305,
  };
}

/**
 * Calcule le comparatif neutre A vs B du levier L3.
 *
 * @param input situation saisie (montant total à convertir, prix d'acquisition, valeur du
 *              portefeuille, nombre de fractions, paramètres d'imposition).
 * @returns `ComparatifArbitrage<DetailsTimingCrypto>` — différentiel d'impôt + PS et d'assiette
 *          crypto (case 3AN cumulée) entre « tout convertir maintenant » et « fractionner sur N
 *          années ». Aucun champ ne désigne un scénario à retenir (mode A).
 */
export function calculeTimingCrypto(
  input: TimingCryptoInput,
): ComparatifArbitrage<DetailsTimingCrypto> {
  const nbFractions = Math.min(Math.max(1, Math.floor(input.nbFractions || 1)), MAX_FRACTIONS);

  // Scénario A : tout convertir en une fois (une seule année).
  const resA = decoupe(input, 1);
  // Scénario B : fractionner sur `nbFractions` années consécutives.
  const resB = decoupe(input, nbFractions);

  // Impôt + PS estimé une seule fois par scénario, sur l'assiette cumulée (centimes) → un seul arrondi.
  const impotACents = impotEtPsCents(resA.assietteTaxableTotaleCents, input.imposition);
  const impotBCents = impotEtPsCents(resB.assietteTaxableTotaleCents, input.imposition);
  // Case 3AN affichée : l'assiette imposable cumulée arrondie à l'euro (cohérente avec l'impôt ci-dessus).
  const case3anAEur = Math.round(resA.assietteTaxableTotaleCents / 100);
  const case3anBEur = Math.round(resB.assietteTaxableTotaleCents / 100);

  const scenarioA: ScenarioChiffre = {
    id: "A",
    libelle: "Je convertis tout en une seule fois cette année",
    assietteImposableCents: resA.assietteTaxableTotaleCents,
    impotEtPsCents: impotACents,
  };
  const scenarioB: ScenarioChiffre = {
    id: "B",
    libelle: `Je fractionne la conversion sur ${nbFractions} années`,
    assietteImposableCents: resB.assietteTaxableTotaleCents,
    impotEtPsCents: impotBCents,
  };

  const details: DetailsTimingCrypto = {
    regime: input.imposition.regime ?? "PFU",
    nbFractions,
    case3anAEur,
    case3anBEur,
    deltaCase3anEur: case3anBEur - case3anAEur,
    nbAnneesExonerees305B: resB.nbAnneesExonerees305,
    exonere305A: resA.nbAnneesExonerees305 > 0,
    gardeFous: GARDE_FOUS_TIMING_CRYPTO,
  };

  return {
    levier: LEVIER,
    scenarioA,
    scenarioB,
    deltaImpotEtPsCents: impotBCents - impotACents,
    details,
  };
}
