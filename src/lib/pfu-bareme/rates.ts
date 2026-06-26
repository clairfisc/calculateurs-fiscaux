/**
 * Taux et seuils du comparateur PFU vs barème, par millésime.
 * Toutes les valeurs en **points de base** (bp) : 1280 = 12,80 %.
 * Sources & justifications : SOURCES-PFU-BAREME.md (§2 à §4).
 */

import type { Millesime } from "./types";

/** Part IR du PFU = 12,8 % — inchangée depuis 2018 (CGI art. 200 A, 1-B-1°). */
export const PFU_IR_BP = 1280;

/** Abattement de 40 % sur dividendes éligibles, barème uniquement (CGI art. 158, 3-2°). */
export const ABATTEMENT_DIVIDENDES_BP = 4000;

/** Fraction de CSG déductible du revenu global, barème uniquement (CGI art. 154 quinquies, II). */
export const CSG_DEDUCTIBLE_BP = 680;

/** Paramètres fiscaux dépendant du millésime de perception. */
export interface ParametresMillesime {
  /** Prélèvements sociaux sur revenus du capital (bp). */
  readonly prelevementsSociauxBp: number;
  /** PFU total = part IR (12,8 %) + PS — pour affichage / contrôle. */
  readonly pfuTotalBp: number;
  /** L'option pour le barème (case 2OP) est-elle révocable pour ce millésime ? */
  readonly option2opRevocable: boolean;
}

/**
 * - 2025 (décl. 2026) : PS 17,2 % → PFU 30,0 % ; option 2OP **irrévocable**.
 * - 2026 (décl. 2027) : PS 18,6 % (CSG +1,4 pt) → PFU 31,4 % ; option 2OP **révocable**.
 * cf. SOURCES-PFU-BAREME.md §2.
 */
export const PARAMETRES: Record<Millesime, ParametresMillesime> = {
  2025: { prelevementsSociauxBp: 1720, pfuTotalBp: 3000, option2opRevocable: false },
  2026: { prelevementsSociauxBp: 1860, pfuTotalBp: 3140, option2opRevocable: true },
};

/**
 * Tranches du barème IR (revenus 2025, décl. 2026 — LF 19/02/2026 art. 4, indexation +0,9 %),
 * exprimées par part de quotient familial. Fournies pour peupler/légender le choix de TMI et
 * documenter l'oracle ; le moteur applique la **TMI fournie** (cf. SOURCES-PFU-BAREME.md §6).
 *
 * ⚠️ Les seuils 2026 (revenus 2026) ne sont pas encore connus à la date de validation : utiliser
 * la TMI choisie par l'utilisateur, indépendante des seuils exacts.
 */
export interface TrancheBareme {
  /** Limite supérieure de la tranche (€/part) ; `null` = dernière tranche. */
  readonly plafondEur: number | null;
  /** Taux marginal de la tranche, en bp. */
  readonly tauxBp: number;
}

export const BAREME_2025: readonly TrancheBareme[] = [
  { plafondEur: 11_600, tauxBp: 0 },
  { plafondEur: 29_579, tauxBp: 1100 },
  { plafondEur: 84_577, tauxBp: 3000 },
  { plafondEur: 181_917, tauxBp: 4100 },
  { plafondEur: null, tauxBp: 4500 },
];

/** TMI proposables à l'utilisateur (bp). */
export const TMI_DISPONIBLES_BP: readonly number[] = [0, 1100, 3000, 4100, 4500];
