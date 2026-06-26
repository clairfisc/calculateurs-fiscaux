/**
 * Point d'entrée public du module 2074 / 2074-CMV (plus/moins-values de cession, compte-titres
 * ordinaire, courtier étranger, PEA exclu). Périmètre : calcul + saisie manuelle.
 * Oracle fiscal et cas-types : SOURCES-2074.md.
 */
export type {
  Cents,
  Regime,
  Lot,
  BaseAcquisition,
  Cession,
  ResultatCession,
  Declaration2074,
} from "./types";
export {
  calculeCession,
  calculeDeclaration,
  tauxAbattementDureeDetentionPct,
  QuantiteCedeeInvalideError,
  AbattementDateRequiseError,
  AbattementImputationNonSupporteError,
} from "./compute";
export type { Declaration2074Input } from "./compute";
