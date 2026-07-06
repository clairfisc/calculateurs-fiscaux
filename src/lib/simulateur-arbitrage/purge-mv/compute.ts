/**
 * Levier **L1 — Purge des moins-values** : moteur de **composition** (aucune règle fiscale en propre).
 *
 * On appelle `cessions-2074.calculeDeclaration` **deux fois** — scénario A (« je ne réalise pas mes
 * moins-values latentes ») et scénario B (« je réalise N € de moins-values latentes ») — pour obtenir
 * la case 3VG et la moins-value reportable de chaque scénario, en laissant le moteur 2074 appliquer
 * l'ordre d'imputation réel (moins-values de l'année, puis antérieures, reliquat reporté 10 ans même
 * nature). Puis on estime impôt + PS de chaque scénario via `pfu-bareme.compareRegimes` (sur la
 * plus-value nette = case 3VG) et on **diffe** les sorties.
 *
 * RÈGLE D'OR : montants en centimes entiers ; on n'arrondit à l'euro que là où les moteurs composés
 * le font déjà (case 3VG, impôt + PS). Mode A : libellés descriptifs et neutres.
 */

import { calculeDeclaration } from "../../cessions-2074/index";
import type { Cession } from "../../cessions-2074/index";
import { compareRegimes } from "../../pfu-bareme/index";
import type { Cents, ComparatifArbitrage, ScenarioChiffre } from "../types";
import {
  GARDE_FOUS_PURGE_MV,
  type DetailsPurgeMV,
  type ParametresImposition,
  type PurgeMvInput,
  type RegimeImposition,
} from "./types";

/** Identifiant du levier dans le contrat partagé. */
const LEVIER = "purge-mv";

const clampMin0 = (n: number): number => (n > 0 ? n : 0);

/**
 * Construit les cessions synthétiques d'un scénario : un gain représentant la plus-value nette déjà
 * réalisée de l'année, et (si `mvRealiseeCents > 0`) une perte représentant la moins-value latente
 * réalisée. Modélisées via un PMP direct (montants déjà en EUR), sans change ni abattement.
 */
function cessionsScenario(plusValueNetteCents: Cents, mvRealiseeCents: Cents): Cession[] {
  const cessions: Cession[] = [];
  if (plusValueNetteCents > 0) {
    cessions.push({
      id: "pv-realisee-annee",
      dateISO: "2025-12-31",
      devise: "EUR",
      quantiteCedee: 1,
      prixUnitaireCents: plusValueNetteCents, // cession nette
      acquisition: { type: "pmp", pmpUnitaireEurCents: 0, quantiteTotale: 1 }, // revient 0 → gain = prix
    });
  }
  if (mvRealiseeCents > 0) {
    cessions.push({
      id: "mv-latente-realisee",
      dateISO: "2025-12-31",
      devise: "EUR",
      quantiteCedee: 1,
      prixUnitaireCents: 0, // cession nette 0
      acquisition: { type: "pmp", pmpUnitaireEurCents: mvRealiseeCents, quantiteTotale: 1 }, // revient → perte
    });
  }
  return cessions;
}

/** Impôt + PS estimés (centimes) sur une plus-value nette (case 3VG en euros), via `compareRegimes`. */
function impotEtPsCents(case3vgEur: number, imposition: ParametresImposition): Cents {
  const regime: RegimeImposition = imposition.regime ?? "PFU";
  const r = compareRegimes({
    millesime: imposition.millesime,
    tmiBp: imposition.tmiBp,
    revenuImposableHorsCapitalCents: imposition.revenuImposableHorsCapitalCents,
    parts: imposition.parts,
    dividendesCents: 0,
    interetsCents: 0,
    plusValuesCents: clampMin0(case3vgEur) * 100, // 3VG est en euros pleins → conversion exacte en centimes
  });
  // `compareRegimes` renvoie des euros pleins ; on repasse en centimes (exact, pas de perte).
  const totalEur = regime === "BAREME" ? r.bareme.totalEur : r.pfu.totalEur;
  return totalEur * 100;
}

/**
 * Calcule le comparatif neutre A vs B du levier L1.
 *
 * @param input situation saisie (plus-value nette de l'année, moins-values latentes/antérieures,
 *              montant réalisé en B, paramètres d'imposition).
 * @returns `ComparatifArbitrage<DetailsPurgeMV>` — différentiel d'impôt + PS, de case 3VG et de
 *          moins-value reportable. Aucun champ ne désigne un scénario à retenir (mode A).
 */
export function calculePurgeMv(input: PurgeMvInput): ComparatifArbitrage<DetailsPurgeMV> {
  const plusValueNetteCents = clampMin0(input.plusValueNetteAnneeCents);
  const mobilisableCents = clampMin0(input.mvLatenteMobilisableCents);
  // On ne réalise jamais plus que ce qui est mobilisable.
  const mvRealiseeCents = Math.min(clampMin0(input.mvLatenteARealiserCents), mobilisableCents);
  const mvAnterieuresCents = clampMin0(input.mvAnterieuresReportablesCents ?? 0);

  // --- Scénario A : on ne réalise aucune moins-value latente ---
  const declA = calculeDeclaration({
    cessions: cessionsScenario(plusValueNetteCents, 0),
    regime: "PFU", // PMP direct EUR, sans abattement : le régime 2074 n'affecte ni 3VG ni l'imputation ici
    moinsValuesAnterieuresCents: mvAnterieuresCents,
  });

  // --- Scénario B : on réalise `mvRealiseeCents` de moins-value latente ---
  const declB = calculeDeclaration({
    cessions: cessionsScenario(plusValueNetteCents, mvRealiseeCents),
    regime: "PFU",
    moinsValuesAnterieuresCents: mvAnterieuresCents,
  });

  const impotPsACents = impotEtPsCents(declA.case3VG, input.imposition);
  const impotPsBCents = impotEtPsCents(declB.case3VG, input.imposition);

  const scenarioA: ScenarioChiffre = {
    id: "A",
    libelle: "Je ne réalise pas mes moins-values latentes",
    assietteImposableCents: declA.case3VG * 100,
    impotEtPsCents: impotPsACents,
  };
  const scenarioB: ScenarioChiffre = {
    id: "B",
    libelle: "Je réalise mes moins-values latentes avant le 31/12",
    assietteImposableCents: declB.case3VG * 100,
    impotEtPsCents: impotPsBCents,
  };

  const details: DetailsPurgeMV = {
    regime: input.imposition.regime ?? "PFU",
    case3vgAEur: declA.case3VG,
    case3vgBEur: declB.case3VG,
    deltaCase3vgEur: declB.case3VG - declA.case3VG,
    mvReportableTotaleACents: declA.moinsValueReportableTotaleEurCents,
    mvReportableTotaleBCents: declB.moinsValueReportableTotaleEurCents,
    deltaMvReportableCents:
      declB.moinsValueReportableTotaleEurCents - declA.moinsValueReportableTotaleEurCents,
    mvRealiseeCents,
    gardeFous: GARDE_FOUS_PURGE_MV,
  };

  return {
    levier: LEVIER,
    scenarioA,
    scenarioB,
    deltaImpotEtPsCents: impotPsBCents - impotPsACents,
    details,
  };
}
