/**
 * Point d'entrée public du **simulateur d'arbitrage** (mode A, year-round — réf. §X ).
 *
 * Couche de **composition** : chaque levier importe un moteur déjà sous test (`cessions-2074`,
 * `pfu-bareme`, …), l'appelle pour le scénario A (statu quo) et le scénario B (arbitrage envisagé),
 * et expose un `ComparatifArbitrage` neutre. Le simulateur n'invente aucun chiffre fiscal.
 *
 * Leviers livrés (v0) :
 *   - L1 « purge-mv » — purge / réalisation de moins-values (compose cessions-2074 + pfu-bareme).
 *
 * L2 (PFU vs barème, case 2OP) est **déjà servi** par la page `/pfu-ou-bareme` (composant
 * `ComparateurPfuBareme`, qui compose directement `pfu-bareme`) : pas de levier dédié ici tant
 * qu'un hub unifié multi-leviers n'existe pas. cf. réf. §X.
 * Leviers cadrés à venir : L3 timing conversion fiat (v1), L4 PEA/CTO, L5 donation (v2). cf. §X.
 */

// Contrat partagé (forme du comparatif A/B, commune à tous les leviers).
export type { Cents, ScenarioChiffre, ComparatifArbitrage } from "./types";

// L1 — Purge des moins-values.
export { calculePurgeMv, GARDE_FOUS_PURGE_MV } from "./purge-mv";
export type {
  PurgeMvInput,
  DetailsPurgeMV,
  ParametresImposition,
  RegimeImposition,
} from "./purge-mv";
