/**
 * Barrel public du levier **L5 — Donation avant cession** (simulateur d'arbitrage, mode A — risque le
 * plus élevé). Compose `cessions-2074` + `pfu-bareme` pour l'imposition de la plus-value et ajoute le
 * seul calcul fiscal neuf : les **droits de donation** (barème + abattement). Oracle : SOURCES-DONATION.md.
 */

export { calculeDonation } from "./compute";
export { GARDE_FOUS_DONATION } from "./types";
export type {
  DonationInput,
  DetailsDonation,
  LienDonataire,
  ParametresImposition,
  RegimeImposition,
} from "./types";
