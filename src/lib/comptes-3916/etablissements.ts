/**
 * Base d'établissements pré-remplie (la « vraie valeur d'usage » du module, §X).
 *
 * Source des CODES PSAN : formulaire 3916-bis officiel (rubrique 4.2), vérifiés dans
 * SOURCES-3916.md §5. ADRESSES : sourcées (registres officiels / imprints / Bank of
 * Lithuania, DNB, RCS… ; recherche web juin 2026). ⚠️ Les entités et adresses ÉVOLUENT
 * (ex. N26 Bank AG → SE en 2025) → afficher « à confirmer sur votre relevé ». On ne met
 * une adresse que si sourcée ; sinon `adresse: null` (cas Binance, entité variable).
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
  /** Adresse postale (sourcée juin 2026 ; à confirmer sur le relevé). `null` = non figée. */
  readonly adresse: string | null;
  /** Avertissement à afficher (cas ambigu / multi-produits). */
  readonly note?: string;
}

export const ETABLISSEMENTS: readonly Etablissement[] = [
  // ── PSAN / exchanges crypto (codes vérifiés sur le cerfa 3916-bis) ──
  {
    id: "binance",
    designation: "Binance",
    typeParDefaut: "exchange_crypto",
    formulaireParDefaut: "3916-bis",
    codePsan: "001",
    url: "https://www.binance.com",
    adresse: null,
    note:
      "Entité variable selon le compte → adresse à confirmer sur votre relevé. " +
      "Si votre compte relève de Binance France SAS (enregistrée AMF), c'est un compte FRANÇAIS → non concerné par le 3916-bis.",
  },
  { id: "coinbase", designation: "Coinbase", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "009", pays: "LU", url: "https://www.coinbase.com", adresse: "Coinbase Luxembourg S.A., 58 Boulevard Grande-Duchesse Charlotte, L-1330 Luxembourg", note: "Entité Coinbase Luxembourg S.A. — confirmer selon votre relevé." },
  { id: "kraken", designation: "Kraken", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "020", pays: "IE", url: "https://www.kraken.com", adresse: "Payward Ireland Limited, 70 Sir John Rogerson's Quay, Dublin 2, D02 R296, Irlande" },
  { id: "etoro", designation: "eToro", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "013", pays: "CY", url: "https://www.etoro.com", adresse: "eToro (Europe) Ltd, 4 Profiti Ilia Street, KIBC 7e étage, Germasogeia 4046, Limassol, Chypre", note: "Multi-produits (crypto + courtage) — vérifier la nature exacte du compte." },
  {
    id: "trade-republic",
    designation: "Trade Republic Bank GmbH",
    pays: "DE",
    url: "https://traderepublic.com",
    typeParDefaut: "titres_cto",
    formulaireParDefaut: "3916",
    codePsan: "029",
    adresse: "Köpenicker Straße 40c, 10179 Berlin, Allemagne",
    note:
      "Multi-produits : code PSAN 029 = volet crypto (3916-bis). Un COMPTE-TITRES y est à déclarer (3916) ; " +
      "le sort d'un éventuel PEA « enveloppe FR » chez ce teneur étranger n'est PAS tranché → « à vérifier ».",
  },

  // ── Néobanques / banques étrangères (3916) ──
  { id: "revolut", designation: "Revolut Bank UAB", pays: "LT", url: "https://www.revolut.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: "Konstitucijos ave. 21B, 08130 Vilnius, Lituanie" },
  { id: "n26", designation: "N26 Bank SE", pays: "DE", url: "https://n26.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: "Voltairestraße 8, 10179 Berlin, Allemagne", note: "Ex-N26 Bank AG (changement de forme en 2025) — vérifier la désignation sur votre relevé." },
  { id: "bunq", designation: "bunq B.V.", pays: "NL", url: "https://www.bunq.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: "Naritaweg 131-133, 1043 BS Amsterdam, Pays-Bas" },
  { id: "wise", designation: "Wise Europe SA", pays: "BE", url: "https://wise.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: "Rue du Trône 100, 1050 Bruxelles, Belgique", note: "Établissement de monnaie électronique — l'exemption e-money peut s'appliquer si les 3 conditions sont remplies." },

  // ── Paiement / monnaie électronique (exemption e-money possible) ──
  { id: "paypal", designation: "PayPal (Europe) S.à r.l. et Cie, S.C.A.", pays: "LU", url: "https://www.paypal.com", typeParDefaut: "paiement_emoney", formulaireParDefaut: "3916", adresse: "22-24 Boulevard Royal, L-2449 Luxembourg", note: "Exemption possible : usage ventes de biens en ligne + adossé compte FR + encaissements ≤ 10 000 €." },

  // ── Courtiers étrangers (compte-titres ordinaire) ──
  { id: "ibkr", designation: "Interactive Brokers Ireland Limited", pays: "IE", url: "https://www.interactivebrokers.eu", typeParDefaut: "titres_cto", formulaireParDefaut: "3916", adresse: "North Dock One, 91/92 North Wall Quay, Dublin 1, D01 H7V7, Irlande" },
  { id: "degiro", designation: "flatexDEGIRO Bank AG", pays: "DE", url: "https://www.degiro.fr", typeParDefaut: "titres_cto", formulaireParDefaut: "3916", adresse: "Omniturm, Große Gallusstraße 16-18, 60312 Francfort-sur-le-Main, Allemagne" },
] as const;

/** Recherche un établissement par id. */
export function etablissementParId(id: string): Etablissement | undefined {
  return ETABLISSEMENTS.find((e) => e.id === id);
}
