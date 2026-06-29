/** Types internes à l'UI du calculateur 2074-CMV (valeurs en chaînes, non validées). */
import type { Regime } from "../../lib/cessions-2074";

/** Base d'acquisition saisie : liste de lots (PMP calculé) ou PMP connu directement. */
export type BaseMode = "lots" | "pmp";

/** Un lot d'acquisition tel que saisi. La devise est celle de la cession parente. */
export interface LotSaisie {
  readonly id: string;
  /** Date d'acquisition (input type=date → yyyy-mm-dd). */
  dateISO: string;
  /** Quantité du lot (chaîne ; décimales tolérées). */
  quantite: string;
  /** Prix unitaire d'acquisition, dans la devise de la cession (chaîne). */
  prixUnitaire: string;
  /** Frais d'acquisition du lot, dans la devise (chaîne, optionnel). */
  frais: string;
}

/** Une cession telle que saisie dans le formulaire. */
export interface CessionSaisie {
  readonly id: string;
  /** Libellé libre (titre, ISIN…) pour retrouver la ligne. */
  libelle: string;
  /** Date de cession (yyyy-mm-dd). */
  dateISO: string;
  /**
   * Devise de l'opération (EUR par défaut). Une seule devise par cession : elle s'applique à la
   * cession ET à ses lots d'acquisition (un titre se négocie dans une seule devise) — simplification
   * d'UI ; le moteur gère par ailleurs une devise par opération.
   */
  devise: string;
  /** Quantité cédée (chaîne). */
  quantiteCedee: string;
  /** Prix unitaire de cession, dans la devise (chaîne). */
  prixUnitaire: string;
  /** Frais de cession, dans la devise (chaîne, optionnel). */
  frais: string;
  /** Mode de saisie de la base d'acquisition. */
  baseMode: BaseMode;
  /** Lots (si baseMode = "lots"). */
  lots: LotSaisie[];
  /** PMP unitaire connu, en EUR (si baseMode = "pmp"). */
  pmpUnitaire: string;
  /** Quantité totale détenue (si baseMode = "pmp"). */
  quantiteTotale: string;
  /**
   * Date d'acquisition de référence pour l'abattement durée de détention (régime barème ;
   * requise si PMP direct ou lots multiples avec une plus-value).
   */
  dateAcquisitionRef: string;
}

/** État global du formulaire 2074-CMV. */
export interface EtatFormulaire {
  cessions: CessionSaisie[];
  regime: Regime;
  /** Stock de moins-values antérieures reportées (saisie manuelle), en EUR (chaîne). */
  moinsValuesAnterieures: string;
}
