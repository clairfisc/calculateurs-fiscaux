/**
 * Moteur de calcul des plus/moins-values de cession de valeurs mobilières (formulaire 2074 /
 * fiche 2074-CMV, compte-titres ordinaire — courtier étranger, PEA exclu). Périmètre de
 * l'périmètre : calcul + saisie manuelle. Mécanique et sources fiscales : voir SOURCES-2074.md.
 *
 * RÈGLE D'OR (identique au tax-engine 2047) : jamais de flottant pour de l'argent. Les montants
 * circulent en **centimes entiers** ; on n'arrondit à l'euro qu'en sortie (valeurs des cases).
 * Les montants saisis pour une opération en devise sont en **centimes de la devise** et convertis
 * en euros au cours BCE du **jour de l'opération** (module `tax-engine/fx`).
 */

/** Montant en centimes (entier). EUR sauf mention « de la devise ». */
export type Cents = number;

/**
 * Régime d'imposition. Défaut = **PFU** (12,8 %, sans abattement) — cas dominant des titres
 * acquis depuis 2018. `BAREME` = option globale barème progressif (case 2OP) : seul régime qui
 * ouvre l'abattement pour durée de détention (et seulement pour les titres acquis avant 2018).
 * cf. SOURCES-2074.md §4-5.
 */
export type Regime = "PFU" | "BAREME";

/**
 * Un lot d'acquisition de titres fongibles de même nature. Prix et frais en **centimes de la
 * devise**, convertis en EUR au cours du jour d'acquisition (FX par opération, cf. CE 13/09/2021,
 * SOURCES-2074.md §3). Les frais d'acquisition **majorent** le coût (CGI 150-0 D ; §1).
 */
export interface Lot {
  /** Jour d'acquisition (YYYY-MM-DD) — sert au cours de change et à la durée de détention. */
  readonly dateISO: string;
  /** Code devise ISO (« EUR », « USD », …). */
  readonly devise: string;
  /** Quantité de titres du lot (peut être fractionnaire : actions fractionnées). */
  readonly quantite: number;
  /** Prix unitaire d'acquisition, en **centimes de la devise**. */
  readonly prixUnitaireCents: Cents;
  /** Frais d'acquisition du lot (courtage, commissions…), centimes de la devise. Défaut 0. */
  readonly fraisCents?: Cents;
}

/**
 * Base d'acquisition d'une cession : soit la liste des **lots** (le moteur calcule le PMP en
 * convertissant chaque lot à son cours), soit un **PMP fourni directement** en EUR (cas où
 * l'utilisateur connaît déjà son prix de revient unitaire). cf. §X (« soit le PMP, soit
 * les lots »).
 */
export type BaseAcquisition =
  | { readonly type: "lots"; readonly lots: readonly Lot[] }
  | {
      readonly type: "pmp";
      /** Prix moyen pondéré unitaire, déjà en **centimes d'EUR**. */
      readonly pmpUnitaireEurCents: Cents;
      /** Quantité totale détenue (pour contrôle de cohérence). */
      readonly quantiteTotale: number;
      /** Date d'acquisition de référence (abattement durée de détention sous barème). */
      readonly dateAcquisitionRefISO?: string;
    };

/** Une cession (vente) de titres fongibles, avec sa base d'acquisition. */
export interface Cession {
  /** Identifiant libre (titre, ISIN…) pour retrouver la ligne en sortie. */
  readonly id?: string;
  /** Jour de cession (YYYY-MM-DD) — cours de change + durée de détention. */
  readonly dateISO: string;
  /** Code devise de la cession. */
  readonly devise: string;
  /** Quantité cédée (≤ quantité détenue ; peut être fractionnaire). */
  readonly quantiteCedee: number;
  /** Prix unitaire de cession, en **centimes de la devise**. */
  readonly prixUnitaireCents: Cents;
  /** Frais de cession (courtage, commissions…), centimes de la devise. **Diminuent** le prix. Défaut 0. */
  readonly fraisCents?: Cents;
  /** Base d'acquisition (lots → PMP calculé, ou PMP direct). */
  readonly acquisition: BaseAcquisition;
  /**
   * Date d'acquisition de référence pour l'abattement durée de détention sous **barème**.
   * Requise si la base est un PMP direct ou des lots multiples ET que le régime est BAREME et que
   * la cession dégage une plus-value. Pour un lot unique, déduite automatiquement de ce lot.
   */
  readonly dateAcquisitionRefISO?: string;
}

/** Résultat détaillé d'une cession (montants EUR en centimes ; résultat **signé**). */
export interface ResultatCession {
  readonly id?: string;
  /** Ligne 518 : prix de cession net de frais, converti en EUR (centimes). */
  readonly prixCessionNetEurCents: Cents;
  /** Ligne 523 : prix de revient alloué à la quantité cédée (PMP × q), EUR centimes. */
  readonly prixRevientAlloueEurCents: Cents;
  /** PMP unitaire retenu (EUR centimes), inchangé sur le reliquat après cession partielle. */
  readonly pmpUnitaireEurCents: Cents;
  /** Ligne 524 : résultat = cession nette − prix de revient, **signé** (EUR centimes). */
  readonly resultatEurCents: Cents;
  /** Taux d'abattement durée de détention appliqué (0 hors barème / titres post-2018). */
  readonly abattementPct: 0 | 50 | 65;
  /** Résultat après abattement, **signé** (= résultat si abattement 0 ou si moins-value). */
  readonly resultatApresAbattementEurCents: Cents;
}

/** Sortie agrégée prête à reporter sur la déclaration (cases 2042). cf. SOURCES-2074.md §4, §6. */
export interface Declaration2074 {
  readonly cessions: readonly ResultatCession[];
  readonly regime: Regime;
  /** Somme des résultats positifs de l'année, **avant** abattement (EUR centimes). */
  readonly plusValueBruteAnneeEurCents: Cents;
  /** Somme des moins-values de l'année, en valeur **positive** (EUR centimes). */
  readonly moinsValueAnneeEurCents: Cents;
  /** Moins-values antérieures effectivement imputées cette année (EUR centimes). */
  readonly moinsValuesAnterieuresImputeesEurCents: Cents;
  /** Case 3VG : plus-value nette imposable de l'année, en **euros**. */
  readonly case3VG: number;
  /** Case 3VH : moins-value **de l'année** non imputée, en **euros** (positif). */
  readonly case3VH: number;
  /** Moins-value de l'année non imputée (EUR centimes) — la part reportable créée cette année. */
  readonly moinsValueAnneeReportableEurCents: Cents;
  /** Reliquat de moins-values **antérieures** non utilisé (EUR centimes) — toujours reportable, hors 3VH. */
  readonly moinsValuesAnterieuresRestantesEurCents: Cents;
  /** Total reportable affiché (année non imputée + antérieures restantes), EUR centimes. */
  readonly moinsValueReportableTotaleEurCents: Cents;
}
