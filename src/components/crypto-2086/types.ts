/** Types internes à l'UI du calculateur 2086 (ne dépendent pas de l'API moteur). */

/** Type d'opération du journal. */
export type TypeOperationSaisie = "achat" | "vente";

/**
 * Une opération telle que saisie dans le formulaire (valeurs en chaînes, non validées). La
 * conversion vers le type `Operation` du moteur se fait au moment du calcul.
 *
 * Modèle « journal chronologique » : on recopie ses **achats** (montant payé) et ses **ventes**
 * imposables (prix, valeur globale, frais) dans l'ordre. Les échanges crypto→crypto (sursis) ne
 * se saisissent pas. Tous les montants sont en euros (le 2086 raisonne en EUR : convertir au
 * préalable la valeur de marché des actifs au cours du jour).
 */
export interface OperationSaisie {
  /** Identifiant stable pour les clés React. */
  readonly id: string;
  /** Achat (acquisition en €) ou vente (cession imposable). */
  type: TypeOperationSaisie;
  /** Date de l'opération (ISO yyyy-mm-dd) — détermine l'ordre d'imputation. */
  date: string;
  /** ACHAT — montant payé en € (chaîne). */
  montant: string;
  /** VENTE — prix de cession en € (chaîne). */
  prixCession: string;
  /** VENTE — frais de cession en € (chaîne, optionnel). */
  frais: string;
  /** VENTE — valeur globale du portefeuille au moment de la cession en € (chaîne). */
  valeurGlobale: string;
}
