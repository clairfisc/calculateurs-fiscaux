/** Types internes à l'UI du calculateur 2086 (ne dépendent pas de l'API moteur). */

/**
 * Une cession imposable telle que saisie dans le formulaire (valeurs en chaînes, non validées).
 * La conversion vers le type `Cession` du moteur se fait au moment du calcul.
 *
 * On ne saisit QUE des cessions imposables (vente contre €, ou paiement d'un bien/service en
 * crypto) : les échanges crypto→crypto sont en sursis d'imposition et ne se déclarent pas
 * (cf. encart d'aide). Tous les montants sont en euros (le 2086 raisonne en EUR : convertir au
 * préalable la valeur de marché des actifs au cours du jour de la cession).
 */
export interface CessionSaisie {
  /** Identifiant stable pour les clés React. */
  readonly id: string;
  /** Date de la cession (ISO yyyy-mm-dd) — détermine l'ordre d'imputation. */
  date: string;
  /** Prix de cession (€), chaîne. */
  prixCession: string;
  /** Frais de cession (€), chaîne (optionnel). */
  frais: string;
  /** Valeur globale du portefeuille au moment de la cession (€), chaîne. */
  valeurGlobale: string;
}
