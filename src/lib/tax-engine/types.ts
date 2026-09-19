/**
 * Moteur de calcul du crédit d'impôt sur revenus mobiliers étrangers (formulaire 2047 FR).
 * Module pur : aucune dépendance DOM/Astro/React, 100 % testable.
 * Mécanique et sources fiscales détaillées : voir SOURCES-2047.md.
 *
 * RÈGLE D'OR : jamais de flottant pour de l'argent. Les montants circulent en
 * **centimes d'euro entiers** ; on n'arrondit à l'euro qu'en sortie (valeurs des cases).
 */

/** Montant en centimes d'euro (entier). */
export type Cents = number;

export type TypeRevenu = "dividende" | "interet";

/**
 * Case du formulaire 2042 / 2042C où le revenu doit être reporté après passage par
 * le 2047 (notice 2047-NOT rev. 2025, bloc « N'oubliez pas de reporter le montant de
 * ces revenus sur votre déclaration no 2042 »). cf. SOURCES-2047.md §5.
 *
 * - `2DC` : revenus d'actions et parts de sociétés (UE ou État à convention avec clause
 *   d'assistance administrative) → éligibles à l'abattement de 40 % → dividendes étrangers.
 * - `2TS` : autres revenus distribués (siège dans un autre État, NON éligibles à l'abattement
 *   de 40 %) et jetons de présence. Couvre notamment certains ETF/fonds distribuants.
 * - `2TR` : intérêts et autres produits de placement à revenu fixe.
 */
export type Case2042 = "2DC" | "2TS" | "2TR";

/**
 * Le revenu (dividende) ouvre-t-il droit à l'abattement de 40 % ?
 * `true`  → société dont le siège est dans l'UE ou un État/territoire à convention avec
 *           clause d'assistance administrative (notice : « susceptibles de bénéficier de
 *           l'abattement de 40 % ») → case 2DC.
 * `false` → société hors de cette liste → autres revenus distribués → case 2TS.
 * Non pertinent pour les intérêts (toujours 2TR).
 */
export type EligibiliteAbattement40 = boolean;

/**
 * Pays d'origine du revenu + ses taux de crédit forfaitaires de la notice 2047,
 * exprimés **sur le montant NET encaissé**, en points de base (1760 = 17,60 %).
 *
 * IMPORTANT (cf. SOURCES-2047.md §2) : le taux de la notice s'applique au montant NET
 * (ligne 203), pas au brut. Le forfait 17,6 % = 15/85 est l'équivalent-sur-net d'une
 * convention à 15 % de retenue : la notice a déjà fait la conversion. On NE reconstruit
 * PAS le brut. La mécanique `ligne 207 = min(205, 206)` traite à elle seule le cas
 * « retenue étrangère > convention » (DE 26,375 %, CH 35 %) : l'excédent est plafonné.
 *
 * `forfaitSurNetBp` = taux dividendes (0 si la notice marque le pays `c/`, ex. Irlande).
 * `forfaitInteretSurNetBp` = taux intérêts (0 si `c/`, ex. DE/CH/GB intérêts).
 */
export interface Pays {
  readonly code: string;
  readonly nom: string;
  /** Taux notice DIVIDENDES sur net, en bp (1760 = 17,6 %). 0 = pas de crédit (`c/`). */
  readonly forfaitSurNetBp: number;
  /**
   * Taux notice INTÉRÊTS sur net, en bp. 0 = pas de crédit (`c/`).
   * Optionnel : si absent, on retombe sur `forfaitSurNetBp` (rétrocompat).
   */
  readonly forfaitInteretSurNetBp?: number;
}

/** Une ligne de revenu étranger, déjà convertie en EUR (centimes). */
export interface Ligne {
  readonly pays: Pays;
  readonly type: TypeRevenu;
  /** Ligne 203 : montant NET encaissé (après retenue étrangère), en centimes. */
  readonly netEncaisseCents: Cents;
  /** Ligne 206 : impôt réellement supporté à l'étranger, en centimes. */
  readonly impotEtrangerCents: Cents;
  /**
   * Optionnel — uniquement pour les dividendes : le revenu est-il éligible à l'abattement
   * de 40 % (→ case 2DC) ou non (→ case 2TS) ?
   *
   * Par défaut, un dividende provenant d'un `Pays` de notre table (tous UE ou à convention
   * avec clause d'assistance) est réputé éligible → 2DC. Passer `false` pour forcer le
   * routage en 2TS : c'est le cas des « autres revenus distribués » non éligibles à
   * l'abattement, notamment certains ETF/fonds distribuants (cf. SOURCES-2047.md §5).
   * Ignoré pour les intérêts (toujours 2TR).
   */
  readonly eligibleAbattement40?: EligibiliteAbattement40;
}

/** Résultat d'une ligne, en euros (valeurs telles qu'elles vont dans les cases). */
export interface ResultatLigne {
  /** Ligne 205 : crédit calculé = net × taux notice. */
  readonly ligne205Eur: number;
  /** Ligne 206 : impôt étranger arrondi. */
  readonly ligne206Eur: number;
  /** Ligne 207 : crédit retenu = min(205, 206). */
  readonly ligne207Eur: number;
  /** Part de retenue étrangère non récupérable côté FR (206 − 207). */
  readonly excedentNonRecuperableEur: number;
  /** La ligne ouvre-t-elle droit à crédit (forfait > 0) ? */
  readonly ouvreDroitCredit: boolean;
  /**
   * Case du 2042 / 2042C où reporter le montant BRUT de cette ligne (routage post-2047,
   * cf. `Declaration2047.report2042` pour le montant lui-même — net encaissé + crédit
   * retenu, équivalent ligne 208 du 2047 ; la notice 2047-NOT exige de reporter « le
   * revenu brut sans déduction de l'impôt étranger »). Dividende éligible abattement
   * 40 % → `2DC` ; dividende non éligible (autres revenus distribués, ETF distribuants)
   * → `2TS` ; intérêt → `2TR`. cf. SOURCES-2047.md §5.
   */
  readonly case2042: Case2042;
}

/** Sortie agrégée prête à reporter sur la déclaration. */
export interface Declaration2047 {
  readonly lignes: readonly ResultatLigne[];
  /** Case 8VL : somme des crédits retenus (lignes 207). */
  readonly case8vlEur: number;
  /** Case 8PL (2026) : somme des bases nettes ouvrant droit à crédit. */
  readonly case8plEur: number;
  /**
   * Routage 2042 : pour chaque case du 2042 / 2042C (`2DC`, `2TS`, `2TR`), somme en EUR
   * des montants BRUTS à y reporter (net encaissé + crédit retenu, équivalent ligne 208
   * du 2047), toutes lignes confondues, qu'elles ouvrent droit à crédit ou non — le revenu
   * reste imposable même sans crédit. La notice 2047-NOT exige de reporter « le revenu
   * brut sans déduction de l'impôt étranger » (Brochure IR 2026 p.126 : « montant brut,
   * majoré du crédit d'impôt conventionnel »). cf. SOURCES-2047.md §5.
   *
   * Les clés absentes valent 0 ; on n'expose que les cases effectivement alimentées.
   */
  readonly report2042: Record<Case2042, number>;
}
