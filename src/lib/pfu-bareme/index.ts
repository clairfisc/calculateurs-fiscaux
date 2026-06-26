/** API publique du comparateur PFU vs barème progressif. Voir SOURCES-PFU-BAREME.md. */

export type {
  Cents,
  Millesime,
  ComparateurInput,
  RegimeResultat,
  RegimeGagnant,
  ComparaisonResult,
} from "./types";

export { arrondiEuro, compareRegimes } from "./compute";

export {
  PFU_IR_BP,
  ABATTEMENT_DIVIDENDES_BP,
  CSG_DEDUCTIBLE_BP,
  PARAMETRES,
  BAREME_2025,
  TMI_DISPONIBLES_BP,
} from "./rates";
export type { ParametresMillesime, TrancheBareme } from "./rates";
