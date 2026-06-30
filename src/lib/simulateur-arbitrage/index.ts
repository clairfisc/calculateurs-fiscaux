/**
 * Point d'entrée public du **simulateur d'arbitrage** (mode A, year-round — réf. §X ).
 *
 * Couche de **composition** : chaque levier importe un moteur déjà sous test (`cessions-2074`,
 * `pfu-bareme`, …), l'appelle pour le scénario A (statu quo) et le scénario B (arbitrage envisagé),
 * et expose un `ComparatifArbitrage` neutre. Le simulateur n'invente aucun chiffre fiscal.
 *
 * Leviers livrés :
 *   - L1 « purge-mv » — purge / réalisation de moins-values (compose cessions-2074 + pfu-bareme).
 *   - L3 « timing-crypto » — timing/fractionnement de la conversion fiat (compose crypto-2086 + pfu-bareme).
 *   - L4 « pea » — arbitrage PEA / CTO (sous-moteur PEA + compose pfu-bareme pour le CTO).
 *   - L5 « donation » — donation avant cession (sous-moteur droits de donation + compose cessions-2074/pfu-bareme).
 *
 * L2 (PFU vs barème, case 2OP) est **déjà servi** par la page `/pfu-ou-bareme` (composant
 * `ComparateurPfuBareme`, qui compose directement `pfu-bareme`) : pas de levier dédié ici tant
 * qu'un hub unifié multi-leviers n'existe pas. cf. réf. §X.
 */

// Contrat partagé (forme du comparatif A/B, commune à tous les leviers).
export type { Cents, ScenarioChiffre, ComparatifArbitrage } from "./types";

// Paramètres d'imposition communs (publiés une seule fois, depuis L1 ; réutilisés par L3/L4).
export type { ParametresImposition, RegimeImposition } from "./purge-mv";

// L1 — Purge des moins-values.
export { calculePurgeMv, GARDE_FOUS_PURGE_MV } from "./purge-mv";
export type { PurgeMvInput, DetailsPurgeMV } from "./purge-mv";

// L3 — Timing / fractionnement de la conversion fiat (crypto).
export { calculeTimingCrypto, GARDE_FOUS_TIMING_CRYPTO, MAX_FRACTIONS } from "./timing-crypto";
export type { TimingCryptoInput, DetailsTimingCrypto } from "./timing-crypto";

// L4 — Arbitrage PEA / CTO.
export { calculePeaCto, GARDE_FOUS_PEA_CTO } from "./pea";
export type { PeaCtoInput, DetailsPeaCto, HorizonPea } from "./pea";

// L5 — Donation avant cession (purge de plus-value latente).
export { calculeDonation, GARDE_FOUS_DONATION } from "./donation";
export type { DonationInput, DetailsDonation, LienDonataire } from "./donation";
