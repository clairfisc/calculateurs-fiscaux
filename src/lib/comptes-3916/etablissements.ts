/**
 * Base d'établissements pré-remplie (la « vraie valeur d'usage » du module, §X).
 *
 * Source des CODES PSAN : formulaire 3916-bis officiel (rubrique 4.2), vérifiés dans
 * SOURCES-3916.md §5. Les identités (nom/pays) sont notoires ; les ADRESSES POSTALES
 * exactes restent À COMPLÉTER depuis les sources officielles (cerfa / KBIS / mentions
 * légales) — on n'invente pas d'adresse (règle de justesse auditable). `adresse: null`
 * = à renseigner avant mise en service de la fiche.
 */

import type { Formulaire, TypeCompte } from "./types";

export interface Etablissement {
  readonly id: string;
  readonly designation: string;
  readonly pays?: string;
  readonly url?: string;
  /** Type de compte par défaut (l'utilisateur peut le surcharger : certains acteurs sont multi-produits). */
  readonly typeParDefaut: TypeCompte;
  readonly formulaireParDefaut: Formulaire;
  /** Code PSAN du formulaire 3916-bis (actifs numériques uniquement). */
  readonly codePsan?: string;
  /** Adresse postale complète — À COMPLÉTER depuis une source officielle (null tant que non vérifiée). */
  readonly adresse: string | null;
  /** Avertissement à afficher (cas ambigu / multi-produits). */
  readonly note?: string;
}

export const ETABLISSEMENTS: readonly Etablissement[] = [
  // ── PSAN / exchanges crypto (codes vérifiés sur le cerfa 3916-bis) ──
  { id: "binance", designation: "Binance", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "001", url: "https://www.binance.com", adresse: null },
  { id: "coinbase", designation: "Coinbase Exchange", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "009", url: "https://www.coinbase.com", adresse: null },
  { id: "etoro", designation: "eToro", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "013", url: "https://www.etoro.com", adresse: null, note: "Multi-produits (crypto + courtage) — vérifier la nature exacte du compte." },
  { id: "kraken", designation: "Kraken", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "020", url: "https://www.kraken.com", adresse: null },
  {
    id: "trade-republic",
    designation: "Trade Republic",
    pays: "DE",
    url: "https://traderepublic.com",
    typeParDefaut: "titres_cto",
    formulaireParDefaut: "3916",
    codePsan: "029",
    adresse: null,
    note:
      "Multi-produits : code PSAN 029 = volet crypto (3916-bis). Un COMPTE-TITRES y est à déclarer (3916) ; " +
      "le sort d'un éventuel PEA « enveloppe FR » chez ce teneur étranger n'est PAS tranché → « à vérifier ».",
  },

  // ── Néobanques / banques étrangères (3916) ──
  { id: "revolut", designation: "Revolut Bank UAB", pays: "LT", url: "https://www.revolut.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: null },
  { id: "n26", designation: "N26", pays: "DE", url: "https://n26.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: null },
  { id: "bunq", designation: "bunq", pays: "NL", url: "https://www.bunq.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: null },
  { id: "wise", designation: "Wise", pays: "BE", url: "https://wise.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: null, note: "Établissement de monnaie électronique — l'exemption e-money peut s'appliquer si les 3 conditions sont remplies." },

  // ── Paiement / monnaie électronique (exemption e-money possible) ──
  { id: "paypal", designation: "PayPal (Europe)", pays: "LU", url: "https://www.paypal.com", typeParDefaut: "paiement_emoney", formulaireParDefaut: "3916", adresse: null, note: "Exemption possible : usage ventes de biens en ligne + adossé compte FR + encaissements ≤ 10 000 €." },

  // ── Courtiers étrangers (compte-titres ordinaire) ──
  { id: "ibkr", designation: "Interactive Brokers", pays: "IE", url: "https://www.interactivebrokers.eu", typeParDefaut: "titres_cto", formulaireParDefaut: "3916", adresse: null },
  { id: "degiro", designation: "DEGIRO (flatexDEGIRO Bank)", pays: "DE", url: "https://www.degiro.fr", typeParDefaut: "titres_cto", formulaireParDefaut: "3916", adresse: null },
] as const;

/** Recherche un établissement par id. */
export function etablissementParId(id: string): Etablissement | undefined {
  return ETABLISSEMENTS.find((e) => e.id === id);
}
