/** Types internes à l'UI du calculateur (ne dépendent pas de l'API moteur). */
import type { TypeRevenu } from "../lib/tax-engine";

/** Mode de saisie du montant : tel que l'utilisateur le connaît. */
export type ModeMontant = "brut" | "net";

/**
 * Une ligne telle que saisie dans le formulaire (valeurs en chaînes, non validées).
 * La conversion vers le type `Ligne` du moteur se fait au moment du calcul.
 */
export interface LigneSaisie {
  /** Identifiant stable pour les clés React. */
  readonly id: string;
  /** Code pays (clé dans PAYS_2025). */
  paysCode: string;
  type: TypeRevenu;
  /** Montant saisi (brut ou net selon `mode`), en euros, sous forme de chaîne. */
  montant: string;
  mode: ModeMontant;
  /** Devise saisie (texte libre, défaut EUR). */
  devise: string;
  /** Date d'encaissement (format ISO yyyy-mm-dd issu d'un <input type="date">). */
  dateEncaissement: string;
  /** Impôt étranger réellement retenu, dans la devise saisie, sous forme de chaîne. */
  impotEtranger: string;
  /**
   * Dividende éligible à l'abattement de 40 % — conditions cumulatives : société
   * soumise à l'IS ou équivalent, siège UE ou pays conventionné, dividende voté en
   * AG (cf. `LigneFormulaire.tsx`) → routage 2DC ; sinon 2TS. Défaut `true`. Non
   * pertinent pour les intérêts.
   */
  eligibleAbattement40?: boolean;
}
