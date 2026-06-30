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
  /**
   * **Mode rapide** — taux marginal d'imposition du foyer, en points de base
   * (0 / 1100 / 3000 / 4100 / 4500). Utilisé uniquement si le mode précis n'est pas fourni
   * (`revenuImposableHorsCapitalCents` absent). Approximation : le revenu du capital est
   * imposé entièrement à ce taux, sans gérer un éventuel franchissement de tranche.
   */
  readonly tmiBp?: number;
  /**
   * **Mode précis** — revenu net imposable du foyer **hors** revenus du capital comparés
   * (en centimes). Si fourni, le barème est calculé réellement (différence de deux impositions
   * avec/sans le revenu du capital), ce qui gère le franchissement de tranche. Prend le pas
   * sur `tmiBp`. cf. SOURCES-PFU-BAREME.md §6.
   */
  readonly revenuImposableHorsCapitalCents?: Cents;
  /** Mode précis — nombre de parts de quotient familial (défaut 1 si absent ou ≤ 0). */
  readonly parts?: number;
  /** Dividendes (montant brut perçu), en centimes. */
  readonly dividendesCents: Cents;
  /**
   * Les dividendes sont-ils éligibles à l'abattement de 40 % (au barème) ? Défaut : `true`.
   * `false` → imposés à 100 % au barème, comme des intérêts : cas des SIIC/foncières cotées,
   * de certains ETF/fonds distribuants, des jetons de présence, ou des sociétés hors
   * UE/convention. cf. SOURCES-PFU-BAREME.md §4.
   */
  readonly dividendesEligiblesAbattement40?: boolean;
  /** Intérêts et autres RCM (aucun abattement), en centimes. */
  readonly interetsCents: Cents;
  /** Plus-values mobilières (montant brut, 100 %), en centimes. */
  readonly plusValuesCents: Cents;
  /**
   * Part des plus-values ci-dessus (⊆ `plusValuesCents`) ouvrant l'**abattement pour durée de
   * détention** — titres **acquis avant le 1ᵉʳ janvier 2018** (CGI 150-0 D, 1 ter). L'abattement
   * ne joue **que sous barème** et **seulement sur la part IR** ; les prélèvements sociaux et le PFU
   * restent sur 100 % de la plus-value. Défaut 0. cf. SOURCES-PFU-BAREME.md §6.
   */
  readonly plusValuesAbattablesCents?: Cents;
  /**
   * Taux de l'abattement pour durée de détention, en points de base : **6500** (détention ≥ 8 ans)
   * ou **5000** (≥ 2 et < 8 ans). Défaut **6500** — en pratique, pour des revenus 2025, tout titre
   * acquis avant 2018 est détenu ≥ 8 ans, donc 65 % (la tranche 50 % est devenue quasi-théorique).
   */
  readonly tauxAbattementDureeDetentionBp?: number;
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
  /**
   * Montant de l'abattement pour durée de détention retranché de l'assiette **IR du barème**
   * (titres pré-2018), en euros — 0 si non renseigné. Exposé pour expliquer pourquoi le barème
   * peut devenir plus avantageux qu'il n'y paraît (cf. SOURCES-PFU-BAREME.md §6).
   */
  readonly abattementDureeDetentionEur: number;
}
