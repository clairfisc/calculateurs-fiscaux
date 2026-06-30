/**
 * Levier **L4 — Arbitrage PEA / CTO** : sous-moteur de la **part PEA** + composition `pfu-bareme`.
 *
 * Découpage (cf. SOURCES-PEA.md §7) :
 *  - **CTO (scénario A)** et **part IR** de la sortie PEA : 100 % `pfu-bareme.compareRegimes` (le
 *    seul calcul d'IR/PS de plus-value mobilière déjà sous test) ;
 *  - **part PS du PEA** : calculée ici (assiette = gain net, **taux du millésime** lu dans
 *    `pfu-bareme.PARAMETRES` — catégorie « placement », car la hausse CSG ne frappe le PEA qu'au
 *    1ᵉʳ janvier 2026 : 17,2 % en 2025, 18,6 % en 2026, sans rétroactivité) ;
 *  - **part IR du PEA** : 0 après 5 ans (exonéré, CGI 157 5° bis), sinon = part IR du CTO (avant
 *    5 ans le gain net est imposé comme une plus-value mobilière de droit commun).
 *
 * Pourquoi ne PAS réutiliser `compareRegimes.totalEur` pour le PEA : le PEA et le CTO **divergent**
 * sur le taux de PS au millésime 2025 (PEA 17,2 % « placement » vs CTO 18,6 % « patrimoine ») et
 * sur l'IR après 5 ans (PEA exonéré). On emprunte donc à `pfu-bareme` la **seule composante IR**
 * (identique au CTO avant 5 ans) et on calcule la **composante PS PEA** ici. cf. SOURCES-PEA.md §4.
 *
 * RÈGLE D'OR : centimes entiers ; arrondi à l'euro uniquement là où `pfu-bareme` le fait déjà
 * (composantes IR/PS reportées en euros pleins). Mode A : libellés descriptifs et neutres.
 */

import { compareRegimes, PARAMETRES } from "../../pfu-bareme/index";
import type { Cents, ComparatifArbitrage, ScenarioChiffre } from "../types";
import {
  GARDE_FOUS_PEA_CTO,
  type DetailsPeaCto,
  type ParametresImposition,
  type PeaCtoInput,
  type RegimeImposition,
} from "./types";

/** Identifiant du levier dans le contrat partagé. */
const LEVIER = "pea-cto";

const clampMin0 = (n: number): number => (n > 0 ? n : 0);

/** Troncature entière d'un taux en bp appliqué à des centimes (même convention que `pfu-bareme`). */
const appliqueBp = (montantCents: Cents, bp: number): Cents =>
  Math.trunc((montantCents * bp) / 10_000);

/**
 * Composantes IR et PS de la **sortie en CTO** d'une plus-value mobilière (gain net en centimes),
 * via `pfu-bareme.compareRegimes`. Renvoie des montants en **centimes** (euros pleins × 100).
 */
function composantesCto(
  plusValueCents: Cents,
  imposition: ParametresImposition,
): { irCents: Cents; psCents: Cents } {
  const regime: RegimeImposition = imposition.regime ?? "PFU";
  const r = compareRegimes({
    millesime: imposition.millesime,
    tmiBp: imposition.tmiBp,
    revenuImposableHorsCapitalCents: imposition.revenuImposableHorsCapitalCents,
    parts: imposition.parts,
    dividendesCents: 0,
    interetsCents: 0,
    plusValuesCents: clampMin0(plusValueCents),
  });
  const reg = regime === "BAREME" ? r.bareme : r.pfu;
  // `compareRegimes` renvoie des euros pleins → retour en centimes (exact, pas de perte).
  return { irCents: reg.irEur * 100, psCents: reg.psEur * 100 };
}

/**
 * Calcule le comparatif neutre A vs B du levier L4.
 *
 * @param input plus-value latente de sortie, horizon PEA (avant / après 5 ans), paramètres d'imposition.
 * @returns `ComparatifArbitrage<DetailsPeaCto>` — A = sortie en CTO, B = sortie en PEA. Différentiel
 *          d'impôt + PS exposé tel quel ; aucun champ ne désigne un scénario à retenir (mode A).
 */
export function calculePeaCto(input: PeaCtoInput): ComparatifArbitrage<DetailsPeaCto> {
  const plusValueLatenteCents = clampMin0(input.plusValueLatenteCents);
  const regime: RegimeImposition = input.imposition.regime ?? "PFU";
  const horizon = input.horizonPea;

  // --- Scénario A : sortie en CTO (plus-value mobilière de droit commun) — composition pure.
  const cto = composantesCto(plusValueLatenteCents, input.imposition);
  const irCtoCents = cto.irCents;
  const psCtoCents = cto.psCents;
  const coutCtoCents = irCtoCents + psCtoCents;

  // --- Scénario B : sortie en PEA.
  // PS PEA : taux du millésime (catégorie « placement » — pas de rétroactivité 2025), base = gain net.
  // Arrondi à l'euro comme `pfu-bareme` le fait pour la PS du CTO (psEur) : sans cet alignement, deux
  // conventions cohabitent (CTO euro-arrondi vs PEA centimes) et la sortie « PEA avant 5 ans » — qui en
  // 2026 est imposée à l'identique du CTO — afficherait un écart d'arrondi parasite (delta ≠ 0 attendu 0).
  const tauxPsPeaBp = PARAMETRES[input.imposition.millesime].psPlacementBp;
  const psPeaCents = Math.round(appliqueBp(plusValueLatenteCents, tauxPsPeaBp) / 100) * 100;
  // IR PEA : exonéré après 5 ans (CGI 157 5° bis) ; sinon imposé comme une PV mobilière (= IR CTO).
  const irPeaCents = horizon === "APRES_5_ANS" ? 0 : irCtoCents;
  const coutPeaCents = irPeaCents + psPeaCents;

  const libelleHorizon =
    horizon === "APRES_5_ANS"
      ? "Je sors mon titre du PEA après 5 ans de détention"
      : "Je sors mon titre du PEA avant 5 ans (clôture du plan)";

  const scenarioA: ScenarioChiffre = {
    id: "A",
    libelle: "Je loge / sors mon titre sur un compte-titres ordinaire",
    assietteImposableCents: plusValueLatenteCents,
    impotEtPsCents: coutCtoCents,
  };
  const scenarioB: ScenarioChiffre = {
    id: "B",
    libelle: libelleHorizon,
    assietteImposableCents: plusValueLatenteCents,
    impotEtPsCents: coutPeaCents,
  };

  const details: DetailsPeaCto = {
    regime,
    horizonPea: horizon,
    plusValueLatenteCents,
    irCtoCents,
    psCtoCents,
    irPeaCents,
    psPeaCents,
    gardeFous: GARDE_FOUS_PEA_CTO,
  };

  return {
    levier: LEVIER,
    scenarioA,
    scenarioB,
    deltaImpotEtPsCents: coutPeaCents - coutCtoCents,
    details,
  };
}
