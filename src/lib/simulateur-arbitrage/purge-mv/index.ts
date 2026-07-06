/**
 * Barrel public du levier **L1 — Purge des moins-values** (simulateur d'arbitrage, mode A).
 * Compose `cessions-2074` + `pfu-bareme` et diffe les scénarios A/B.
 */

export { calculePurgeMv } from "./compute";
export { GARDE_FOUS_PURGE_MV } from "./types";
export type {
  PurgeMvInput,
  DetailsPurgeMV,
  ParametresImposition,
  RegimeImposition,
} from "./types";
