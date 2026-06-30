/**
 * Barrel public du levier **L3 — Timing / fractionnement de la conversion fiat (crypto)**
 * (simulateur d'arbitrage, mode A). Compose `crypto-2086` + `pfu-bareme` et diffe les scénarios
 * A (« tout convertir maintenant ») / B (« fractionner sur N années »). cf. §X.
 */

export { calculeTimingCrypto } from "./compute";
export { GARDE_FOUS_TIMING_CRYPTO, MAX_FRACTIONS } from "./types";
export type {
  TimingCryptoInput,
  DetailsTimingCrypto,
  ParametresImposition,
  RegimeImposition,
} from "./types";
