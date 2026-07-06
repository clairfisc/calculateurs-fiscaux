/**
 * Barrel public du levier **L4 — Arbitrage PEA / CTO** (simulateur d'arbitrage, mode A).
 * Sous-moteur neuf de la part PEA (exo IR ≥ 5 ans, PS dus) + composition `pfu-bareme` pour le CTO
 * et la part IR avant 5 ans. Règles & oracle : `SOURCES-PEA.md`.
 */

export { calculePeaCto } from "./compute";
export { GARDE_FOUS_PEA_CTO } from "./types";
export type {
  PeaCtoInput,
  DetailsPeaCto,
  ParametresImposition,
  RegimeImposition,
  HorizonPea,
} from "./types";
