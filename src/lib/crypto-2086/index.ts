/**
 * Point d'entrée public du module 2086 — plus-values de cession d'actifs numériques
 * (particuliers, CGI art. 150 VH bis, méthode de la valeur globale du portefeuille).
 * Saisie en journal chronologique d'opérations (achats + ventes). Oracle & sources : SOURCES-2086.md.
 */
export { calculeDeclaration2086, ValeurGlobaleInvalideError } from "./compute";
export {
  SEUIL_EXONERATION_CENTS,
  type Achat,
  type Cents,
  type Declaration2086,
  type Operation,
  type ResultatVente,
  type Vente,
} from "./types";
