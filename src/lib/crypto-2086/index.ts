/**
 * Point d'entrée public du module 2086 — plus-values de cession d'actifs numériques
 * (particuliers, CGI art. 150 VH bis, méthode de la valeur globale du portefeuille).
 * Oracle & sources : SOURCES-2086.md.
 */
export {
  calculeDeclaration2086,
  estImposable,
  ValeurGlobaleInvalideError,
} from "./compute";
export {
  SEUIL_EXONERATION_CENTS,
  type Cents,
  type Cession,
  type Contrepartie,
  type Declaration2086,
  type ResultatCession,
} from "./types";
