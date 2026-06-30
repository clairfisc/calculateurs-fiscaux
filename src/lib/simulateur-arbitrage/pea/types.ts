/**
 * Levier **L4 — Arbitrage PEA / CTO** (simulateur d'arbitrage, mode A, year-round).
 * Cadrage : §X (simulateur) + méthode  (VALIDATION-D'ABORD : oracle gelé avant le code).
 *
 * Ce levier introduit **le seul sous-moteur fiscal neuf autorisé** du module : la **part PEA**
 * (exonération d'IR après 5 ans — CGI art. 157, 5° bis ; prélèvements sociaux dus au retrait). Il
 * est **intégralement sourcé** dans `SOURCES-PEA.md` et **gelé en tests** (`compute.test.ts`). Pour
 * le **CTO** (plus-value mobilière de droit commun) et pour la **part IR** de la sortie PEA avant
 * 5 ans, il **compose** `pfu-bareme.compareRegimes` — aucun recalcul propre de l'IR/PS du CTO.
 *
 * On expose un **comparatif neutre A vs B** (mode A, §X) : A = sortie en CTO maintenant,
 * B = sortie en PEA selon l'horizon. Aucune chaîne ne désigne un scénario comme préférable.
 */

import type { Cents } from "../types";

/**
 * Régime d'imposition retenu pour la **composante IR** (CTO, et PEA avant 5 ans). Repris du contrat
 * `pfu-bareme`. Défaut **PFU** (cas dominant). `BAREME` = option globale barème progressif (2OP).
 */
export type RegimeImposition = "PFU" | "BAREME";

/**
 * Horizon de détention du PEA au moment de la sortie envisagée (scénario B). Le seuil des 5 ans
 * est **la** bascule fiscale du PEA (CGI 157, 5° bis ; BOI-RPPM-RCM-40-50) :
 *  - `AVANT_5_ANS` : retrait = **clôture** + imposition du gain net (IR au PFU/barème **+ PS**) ;
 *  - `APRES_5_ANS` : gain **exonéré d'IR**, **PS seuls dus**.
 */
export type HorizonPea = "AVANT_5_ANS" | "APRES_5_ANS";

/**
 * Paramètres d'imposition, repris de `pfu-bareme.ComparateurInput`. Deux modes (le mode précis
 * prend le pas s'il est fourni, comme dans `compareRegimes`) :
 *  - **mode rapide** : `tmiBp` (0 / 1100 / 3000 / 4100 / 4500) ;
 *  - **mode précis** : `revenuImposableHorsCapitalCents` + `parts`.
 * Sous PFU ces paramètres n'influent pas sur l'IR (12,8 % forfaitaire) mais sont conservés pour
 * permettre la bascule de régime sans changer la forme de l'entrée.
 */
export interface ParametresImposition {
  /** Année de perception (détermine taux PS, CSG déductible). Repris de `pfu-bareme.Millesime`. */
  readonly millesime: 2025 | 2026;
  /** Régime retenu pour la composante IR. Défaut `PFU`. */
  readonly regime?: RegimeImposition;
  /** Mode rapide — TMI du foyer en points de base. Ignoré si le mode précis est fourni. */
  readonly tmiBp?: number;
  /** Mode précis — revenu net imposable du foyer **hors** la plus-value comparée (centimes). */
  readonly revenuImposableHorsCapitalCents?: Cents;
  /** Mode précis — nombre de parts de quotient familial (défaut 1). */
  readonly parts?: number;
}

/**
 * Entrée du levier L4. Montants en **centimes entiers** (convention partagée).
 *
 * `plusValueLatenteCents` = gain net de la sortie envisagée (différence valeur liquidative −
 * versements/prix de revient). C'est l'assiette **commune** : IR (CTO, PEA < 5 ans) **et** PS.
 */
export interface PeaCtoInput {
  /** Plus-value latente / gain net de la sortie envisagée (centimes, ≥ 0). Assiette commune IR + PS. */
  readonly plusValueLatenteCents: Cents;
  /** Horizon de détention du PEA au moment de la sortie (scénario B). */
  readonly horizonPea: HorizonPea;
  /** Paramètres d'imposition (régime + TMI/parts/millésime), repris de `pfu-bareme`. */
  readonly imposition: ParametresImposition;
}

/**
 * Données propres au levier L4, en plus du comparatif neutre A/B. Tout est **descriptif** : on
 * chiffre le différentiel, on ne désigne pas de scénario à retenir (mode A).
 */
export interface DetailsPeaCto {
  readonly regime: RegimeImposition;
  readonly horizonPea: HorizonPea;
  /** Plus-value latente / gain net retenu comme assiette (centimes). */
  readonly plusValueLatenteCents: Cents;
  /** Composante IR de la sortie CTO (scénario A), centimes. */
  readonly irCtoCents: Cents;
  /** Composante PS de la sortie CTO (patrimoine : 18,6 % dès 2025), centimes. */
  readonly psCtoCents: Cents;
  /** Composante IR de la sortie PEA (scénario B) : 0 après 5 ans (exonéré), sinon = irCto. Centimes. */
  readonly irPeaCents: Cents;
  /** Composante PS de la sortie PEA : 17,2 % (2025) / 18,6 % (2026) du gain net. Centimes. */
  readonly psPeaCents: Cents;
  /** Garde-fous propres au levier L4, texte neutre (mode A) — non normatifs, signalés non tranchés. */
  readonly gardeFous: readonly string[];
}

/**
 * Garde-fous L4 en **texte neutre** (mode A, §X). Établis et sourcés dans `SOURCES-PEA.md` §6.
 * L'éligibilité UE/EEE est en **premier** : elle **conditionne tout** le levier (un titre non
 * éligible ne peut pas être logé en PEA, la comparaison n'a alors pas d'objet). L'UI peut les
 * porter ; on les expose ici pour qu'ils voyagent avec le calcul.
 */
export const GARDE_FOUS_PEA_CTO: readonly string[] = [
  "L'éligibilité au PEA conditionne toute cette comparaison : seules les actions de sociétés ayant " +
    "leur siège dans l'Union européenne ou l'EEE (ou les fonds/ETF investis à au moins 75 % en de " +
    "telles actions) peuvent être logées en PEA (C. mon. fin. art. L221-31). Un titre non éligible " +
    "ne peut pas y figurer — la comparaison PEA n'a alors pas d'objet.",
  "Le PEA a un plafond de versements de 150 000 € (225 000 € cumulé avec un PEA-PME). C'est un " +
    "plafond de versements, pas de valorisation : le plan peut dépasser ce montant par capitalisation. " +
    "Ce simulateur ne vérifie pas ce plafond.",
  "Un retrait du PEA avant 5 ans entraîne en principe la clôture du plan et l'imposition du gain net " +
    "réalisé depuis l'ouverture (impôt sur le revenu au PFU ou au barème, plus prélèvements sociaux). " +
    "Un retrait après 5 ans est exonéré d'impôt sur le revenu, mais les prélèvements sociaux restent dus.",
  "Pour un PEA ouvert avant 2018, une partie des prélèvements sociaux peut relever de « taux " +
    "historiques » par couches : ce cas n'est pas modélisé ici (à vérifier auprès de votre " +
    "intermédiaire), le simulateur applique un taux unique au jour du retrait.",
  "Cette simulation ne chiffre ni les dividendes capitalisés dans le plan, ni les frais de courtage " +
    "ou de garde, ni le rendement du placement. Elle ne compare que le coût fiscal de sortie d'un " +
    "gain donné, à titre informatif.",
];
