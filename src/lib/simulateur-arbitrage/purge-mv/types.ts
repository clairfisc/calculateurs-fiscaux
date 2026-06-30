/**
 * Levier **L1 — Purge des moins-values** (tax-loss harvesting), simulateur d'arbitrage mode A.
 * Cadrage : §X (L1), §X (DoD), §X (mode A), §X (composition).
 *
 * Ce sous-module n'invente **aucune** règle fiscale : il **compose** `cessions-2074.calculeDeclaration`
 * (imputation 3VG/3VH, moins-values antérieures, report 10 ans même nature) et `pfu-bareme.compareRegimes`
 * (impôt + PS), puis **diffe** le scénario A (« je ne réalise pas mes moins-values latentes ») et le
 * scénario B (« je réalise N € de moins-values latentes avant le 31/12 »). On expose le différentiel ;
 * aucune chaîne ne désigne un scénario comme préférable (mode A, §X).
 */

import type { Cents } from "../types";

/**
 * Régime d'imposition retenu pour estimer impôt + PS de la plus-value nette (case 3VG).
 * Défaut **PFU** : cas dominant des titres détenus en compte-titres ordinaire (cf. `cessions-2074`).
 * `BAREME` = option globale barème progressif (case 2OP). Repris du contrat `pfu-bareme`.
 */
export type RegimeImposition = "PFU" | "BAREME";

/**
 * Paramètres d'imposition, repris tels quels de `pfu-bareme.ComparateurInput`. Deux modes
 * mutuellement compatibles (le mode précis prend le pas s'il est fourni, comme dans `compareRegimes`) :
 *  - **mode rapide** : `tmiBp` (taux marginal en points de base : 0 / 1100 / 3000 / 4100 / 4500) ;
 *  - **mode précis** : `revenuImposableHorsCapitalCents` + `parts` (gère le franchissement de tranche).
 * Sous PFU ces paramètres n'influent pas sur l'impôt (12,8 % forfaitaire) mais sont conservés pour
 * permettre la bascule de régime sans changer la forme de l'entrée.
 */
export interface ParametresImposition {
  /** Année de perception (taux PS, CSG déductible). Repris de `pfu-bareme.Millesime`. */
  readonly millesime: 2025 | 2026;
  /** Régime retenu pour chiffrer l'impôt sur la plus-value nette. Défaut `PFU`. */
  readonly regime?: RegimeImposition;
  /** Mode rapide — TMI du foyer en points de base. Ignoré si le mode précis est fourni. */
  readonly tmiBp?: number;
  /** Mode précis — revenu net imposable du foyer **hors** la plus-value comparée (centimes). */
  readonly revenuImposableHorsCapitalCents?: Cents;
  /** Mode précis — nombre de parts de quotient familial (défaut 1). */
  readonly parts?: number;
}

/**
 * Entrée du levier L1. Tous les montants en **centimes entiers** (convention partagée).
 *
 * Modélisation : la plus-value nette déjà réalisée de l'année est représentée comme un gain, et la
 * moins-value que l'on choisit de réaliser (scénario B) comme une perte. Le moteur 2074 applique alors
 * l'ordre d'imputation réel (moins-values de l'année, puis antérieures, reliquat reporté 10 ans).
 */
export interface PurgeMvInput {
  /**
   * Plus-value nette de l'année **déjà réalisée** (centimes, ≥ 0). Reprise d'une saisie du module 2074
   * ou saisie directement. Une valeur ≤ 0 signifie « aucune plus-value à effacer cette année ».
   */
  readonly plusValueNetteAnneeCents: Cents;
  /**
   * Moins-values **latentes** mobilisables avant le 31/12 (centimes, ≥ 0). Plafond de ce qui peut être
   * réalisé en scénario B. Informatif ici : c'est `mvLatenteARealiserCents` qui est effectivement réalisé.
   */
  readonly mvLatenteMobilisableCents: Cents;
  /**
   * Montant de moins-value latente que l'on **choisit de réaliser** en scénario B (centimes, ≥ 0).
   * Borné à `mvLatenteMobilisableCents`. Scénario A = on n'en réalise aucune.
   */
  readonly mvLatenteARealiserCents: Cents;
  /**
   * Stock de moins-values **antérieures** reportables (centimes, ≥ 0). Imputées après les moins-values
   * de l'année, dans les deux scénarios. Saisie manuelle (le suivi pluriannuel persistant n'est pas conservé par cet outil).
   */
  readonly mvAnterieuresReportablesCents?: Cents;
  /** Paramètres d'imposition (régime + TMI/parts/millésime), repris de `pfu-bareme`. */
  readonly imposition: ParametresImposition;
}

/**
 * Données propres au levier L1, en plus du comparatif neutre A/B. Tout est **descriptif** : on chiffre
 * le différentiel, on ne désigne pas de scénario à retenir (mode A).
 */
export interface DetailsPurgeMV {
  readonly regime: RegimeImposition;
  /** Case 3VG (plus-value nette imposable, euros) du scénario A. */
  readonly case3vgAEur: number;
  /** Case 3VG du scénario B. */
  readonly case3vgBEur: number;
  /** case3VG(B) − case3VG(A), signé (euros). Négatif = la purge réduit la plus-value imposable. */
  readonly deltaCase3vgEur: number;
  /** Moins-value totale reportable (créée + antérieures restantes, centimes) du scénario A. */
  readonly mvReportableTotaleACents: Cents;
  /** Moins-value totale reportable (centimes) du scénario B. */
  readonly mvReportableTotaleBCents: Cents;
  /**
   * mvReportable(B) − mvReportable(A), signé (centimes). Positif = la purge **crée** du report
   * (moins-value non imputée faute de plus-value à effacer) ; négatif = elle en **consomme**.
   */
  readonly deltaMvReportableCents: Cents;
  /** Montant de moins-value effectivement réalisé en scénario B (centimes), après bornage. */
  readonly mvRealiseeCents: Cents;
  /** Garde-fous propres au levier L1, en texte neutre (mode A) — non normatifs. */
  readonly gardeFous: readonly string[];
}

/**
 * Garde-fous L1 en **texte neutre** (mode A, §X). Le point « wash-sale » est désormais
 * **tranché et sourcé** (cf. cessions-2074/SOURCES-2074.md §6bis) : la France n'a pas de règle
 * wash-sale, la purge est licite ; seule la fictivité de l'opération est un risque. L'UI peut les
 * porter à la place ; on les expose ici pour qu'ils voyagent avec le calcul.
 */
export const GARDE_FOUS_PURGE_MV: readonly string[] = [
  "Il n'existe pas de règle « wash-sale » en France (à la différence des États-Unis) : vous pouvez " +
    "vendre à perte puis racheter les mêmes titres sans délai. Réaliser une moins-value pour l'imputer " +
    "est un usage prévu par la loi (CGI art. 150-0 D, 11). Seule limite : l'opération doit être une " +
    "vraie transaction de marché — une vente fictive, à soi-même ou à un prix hors marché pourrait être " +
    "écartée au titre de l'abus de droit (LPF art. L64 / L64 A).",
  "Sans plus-value de l'année à effacer, réaliser une moins-value ne réduit pas l'impôt de l'année : " +
    "la moins-value est simplement reportée (10 ans, imputable sur des plus-values de même nature).",
  "Si vous rachetez les titres (aller-retour pour garder la position), vous le faites au prix du marché " +
    "actuel : votre prix de revient baisse d'autant, ce qui augmente votre plus-value imposable future. " +
    "La purge décale alors l'impôt dans le temps plutôt qu'elle ne le supprime. Cette simulation ne porte " +
    "que sur l'année en cours — ni cet effet différé, ni les frais de courtage ne sont chiffrés ici.",
];
