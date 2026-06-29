/**
 * Base d'établissements pré-remplie (la « vraie valeur d'usage » du module, §14.7).
 *
 * Source des CODES PSAN : formulaire 3916-bis officiel (rubrique 4.2), vérifiés dans
 * SOURCES-3916.md §5. ADRESSES : sourcées (registres officiels / imprints / Bank of
 * Lithuania, DNB, RCS… ; recherche web juin 2026). ⚠️ Les entités et adresses ÉVOLUENT
 * (ex. N26 Bank AG → SE en 2025) → afficher « à confirmer sur votre relevé ». On ne met
 * une adresse que si sourcée ; sinon `adresse: null` (cas Binance, entité variable).
 */

import type { Formulaire, TypeCompte } from "./types";

/**
 * Gabarit d'un compte déclarable impliqué par un établissement (multi-comptes).
 * Sourcé établissement par établissement (cf. SOURCES-3916.md §11). N'auto-déplier
 * que les comptes INHÉRENTS et fermement sourcés (ex. DEGIRO = titres + espèces).
 */
export interface GabaritCompte {
  readonly type: TypeCompte;
  readonly libelle: string;
  readonly note?: string;
}

export interface Etablissement {
  readonly id: string;
  readonly designation: string;
  readonly pays?: string;
  readonly url?: string;
  /** Type de compte par défaut (l'utilisateur peut le surcharger : certains acteurs sont multi-produits). */
  readonly typeParDefaut: TypeCompte;
  /** Types de compte proposés par cet établissement (multi-produits). Défaut : [typeParDefaut]. */
  readonly typesCompatibles?: readonly TypeCompte[];
  /**
   * Gabarit multi-comptes : comptes déclarables INHÉRENTS à l'ouverture chez cet
   * établissement (auto-dépliés en plusieurs fiches). Absent = 1 compte (cas général).
   * Réservé aux structures fermement sourcées (ex. DEGIRO = titres + espèces flatex).
   */
  readonly comptes?: readonly GabaritCompte[];
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
  { id: "etoro", designation: "eToro", typeParDefaut: "exchange_crypto", typesCompatibles: ["exchange_crypto", "titres_cto"], formulaireParDefaut: "3916-bis", codePsan: "013", pays: "CY", url: "https://www.etoro.com", adresse: "eToro (Europe) Ltd, 4 Profiti Ilia Street, KIBC 7e étage, Germasogeia 4046, Limassol, Chypre", note: "Multi-produits : si vous détenez à la fois un compte actions/CFD (→ 3916) ET un compte crypto (→ 3916-bis), ce sont DEUX comptes distincts à déclarer." },
  {
    id: "trade-republic",
    designation: "Trade Republic Bank GmbH",
    pays: "DE",
    url: "https://traderepublic.com",
    typeParDefaut: "titres_cto",
    typesCompatibles: ["titres_cto", "pea", "exchange_crypto"],
    formulaireParDefaut: "3916",
    codePsan: "029",
    adresse: "Köpenicker Straße 40c, 10179 Berlin, Allemagne",
    note:
      "Code PSAN 029 = volet crypto (3916-bis). IBAN : compte espèces à IBAN français (FR, clients récents) = compte français NON déclarable ; IBAN allemand (DE, historique) = à déclarer. " +
      "Le compte-titres reste à déclarer (3916) ; le sort d'un éventuel PEA « enveloppe FR » chez ce teneur étranger n'est PAS tranché → « à vérifier ».",
  },

  // ── Néobanques / banques étrangères (3916) ──
  { id: "revolut", designation: "Revolut", pays: "LT", url: "https://www.revolut.com", typeParDefaut: "neobanque", typesCompatibles: ["neobanque", "paiement_emoney", "titres_cto", "exchange_crypto"], formulaireParDefaut: "3916", adresse: "Revolut Bank UAB, Konstitucijos ave. 21B, 08130 Vilnius, Lituanie", note: "Le compte courant EUR / Épargne (Revolut France, succursale FR, IBAN FR) n'est PAS à déclarer. Sont à déclarer, si vous les détenez : le compte titres / Flexible Cash Funds (Revolut Securities Europe, Lituanie → 3916) et le compte crypto (Revolut Digital Assets, Chypre → 3916-bis), comptes distincts. Un IBAN lituanien (LT) historique reste, lui, déclarable." },
  { id: "n26", designation: "N26 Bank SE", pays: "DE", url: "https://n26.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: "Voltairestraße 8, 10179 Berlin, Allemagne", note: "IBAN allemand (DE) → compte à déclarer (la rumeur d'un IBAN français depuis 2023 est infirmée). Les « Espaces » partagent l'IBAN principal → un seul compte (sauf IBAN propre, à vérifier). Ex-N26 Bank AG (forme changée en 2025)." },
  { id: "bunq", designation: "bunq B.V.", pays: "NL", url: "https://www.bunq.com", typeParDefaut: "neobanque", formulaireParDefaut: "3916", adresse: "Naritaweg 131-133, 1043 BS Amsterdam, Pays-Bas" },
  { id: "wise", designation: "Wise Europe SA", pays: "BE", url: "https://wise.com", typeParDefaut: "neobanque", typesCompatibles: ["neobanque", "paiement_emoney"], formulaireParDefaut: "3916", adresse: "Rue du Trône 100, 1050 Bruxelles, Belgique", note: "Établissement de monnaie électronique — l'exemption e-money peut s'appliquer si les 3 conditions sont remplies." },

  // ── Paiement / monnaie électronique (exemption e-money possible) ──
  { id: "paypal", designation: "PayPal (Europe) S.à r.l. et Cie, S.C.A.", pays: "LU", url: "https://www.paypal.com", typeParDefaut: "paiement_emoney", formulaireParDefaut: "3916", adresse: "22-24 Boulevard Royal, L-2449 Luxembourg", note: "Exemption possible : usage ventes de biens en ligne + adossé compte FR + encaissements ≤ 10 000 €." },

  // ── Courtiers étrangers (compte-titres ordinaire) ──
  { id: "ibkr", designation: "Interactive Brokers Ireland Limited", pays: "IE", url: "https://www.interactivebrokers.eu", typeParDefaut: "titres_cto", formulaireParDefaut: "3916", adresse: "North Dock One, 91/92 North Wall Quay, Dublin 1, D01 H7V7, Irlande" },
  {
    id: "degiro",
    designation: "flatexDEGIRO Bank AG",
    pays: "DE",
    url: "https://www.degiro.fr",
    typeParDefaut: "titres_cto",
    typesCompatibles: ["titres_cto", "banque"],
    formulaireParDefaut: "3916",
    adresse: "Omniturm, Große Gallusstraße 16-18, 60312 Francfort-sur-le-Main, Allemagne",
    comptes: [
      { type: "titres_cto", libelle: "Compte-titres DEGIRO (succursale néerlandaise, Amsterdam)" },
      { type: "banque", libelle: "Compte espèces flatex (flatexDEGIRO Bank, Allemagne, IBAN DE)", note: "Compte espèces distinct du compte-titres (depuis ~2020/2022)." },
    ],
    note: "Ajoutez vos éventuels sous-comptes devises (AutoFX USD/GBP/CHF) s'ils ont un IBAN propre — à vérifier sur votre relevé.",
  },
] as const;

/** Recherche un établissement par id. */
export function etablissementParId(id: string): Etablissement | undefined {
  return ETABLISSEMENTS.find((e) => e.id === id);
}

/** Types de compte proposés par un établissement (multi-produits ; défaut = [typeParDefaut]). */
export function typesDeEtablissement(e: Etablissement): readonly TypeCompte[] {
  return e.typesCompatibles ?? [e.typeParDefaut];
}

/** Établissements compatibles avec un type de compte (pour filtrer la liste déroulante). */
export function etablissementsPourType(type: TypeCompte): readonly Etablissement[] {
  return ETABLISSEMENTS.filter((e) => typesDeEtablissement(e).includes(type));
}
