/**
 * Comparateur PFU (flat tax) vs option barème progressif (case 2OP) sur les revenus du capital.
 * Module pur : aucune dépendance DOM/Astro/React, 100 % testable.
 * Mécanique et sources fiscales détaillées : voir SOURCES-PFU-BAREME.md.
 *
 * RÈGLE D'OR : jamais de flottant pour de l'argent. Les montants circulent en
 * **centimes d'euro entiers** ; on n'arrondit à l'euro qu'en sortie.
 */

/** Montant en centimes d'euro (entier). */
export type Cents = number;

/**
 * Année de **perception** des revenus (détermine taux PS, CSG déductible, révocabilité 2OP).
 * - `2025` : décl. 2026, PFU 30 % (PS 17,2 %), option 2OP irrévocable.
 * - `2026` : décl. 2027, PFU 31,4 % (PS 18,6 %), option 2OP révocable.
 * cf. SOURCES-PFU-BAREME.md §2.
 */
export type Millesime = 2025 | 2026;

/**
 * Assiettes brutes des revenus du capital de l'année, en centimes (≥ 0).
 * L'option barème (case 2OP) est **globale** : elle vaut pour l'ensemble de ces revenus,
 * on ne peut pas mixer PFU et barème ligne par ligne (cf. SOURCES-PFU-BAREME.md §6).
 */
export interface ComparateurInput {
  readonly millesime: Millesime;
  /** Taux marginal d'imposition du foyer, en points de base (0 / 1100 / 3000 / 4100 / 4500). */
  readonly tmiBp: number;
  /** Dividendes **éligibles** à l'abattement de 40 % (barème uniquement), en centimes. */
  readonly dividendesEligiblesCents: Cents;
  /** Intérêts et autres RCM (aucun abattement), en centimes. */
  readonly interetsCents: Cents;
  /** Plus-values mobilières (aucun abattement v0 — pré-2018 OUT, §6), en centimes. */
  readonly plusValuesCents: Cents;
}

/** Détail chiffré d'un régime (PFU ou barème), valeurs en euros arrondies pour affichage. */
export interface RegimeResultat {
  /** Composante impôt sur le revenu. */
  readonly irEur: number;
  /** Composante prélèvements sociaux (identique dans les deux régimes). */
  readonly psEur: number;
  /** Total = IR + PS. */
  readonly totalEur: number;
}

/** Régime le moins coûteux. `egalite` = totaux identiques au centime près. */
export type RegimeGagnant = "pfu" | "bareme" | "egalite";

/** Résultat de la comparaison PFU vs barème. */
export interface ComparaisonResult {
  readonly millesime: Millesime;
  readonly pfu: RegimeResultat;
  readonly bareme: RegimeResultat;
  /** Régime à privilégier (coût total le plus bas). */
  readonly gagnant: RegimeGagnant;
  /** Écart absolu de coût total entre les deux régimes, en euros (≥ 0). */
  readonly ecartEur: number;
  /**
   * Économie d'IR liée à la CSG déductible (barème uniquement), en euros — exposée car
   * c'est un effet souvent ignoré et décalé à N+1 (cf. SOURCES-PFU-BAREME.md §3, §6).
   */
  readonly economieCsgDeductibleEur: number;
}
