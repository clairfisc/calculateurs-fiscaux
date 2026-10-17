/**
 * Base d'établissements pré-remplie (la « vraie valeur d'usage » du module).
 *
 * Source des CODES PSAN : formulaire 3916-bis officiel (rubrique 4.2), vérifiés dans
 * SOURCES-3916.md §5. ADRESSES : sourcées (registres officiels / imprints / Bank of
 * Lithuania, DNB, RCS… ; recherche web juin 2026). ⚠️ Les entités et adresses ÉVOLUENT
 * (ex. N26 Bank AG → SE en 2025) → afficher « à confirmer sur votre relevé ». On ne met
 * une adresse que si sourcée ; sinon `adresse: null` (cas Binance, entité variable).
 */

import type { Formulaire, ResultatCompte, TypeCompte } from "./types";
import { libelleVerdictCourt } from "./libelles";

/**
 * Gabarit d'un compte déclarable impliqué par un établissement (multi-comptes).
 * Sourcé établissement par établissement (cf. SOURCES-3916.md §11). N'auto-déplier
 * que les comptes INHÉRENTS et fermement sourcés (ex. DEGIRO = titres + espèces).
 */
export interface GabaritCompte {
  readonly type: TypeCompte;
  readonly libelle: string;
  /** Pays/adresse propres à ce compte s'ils diffèrent de l'établissement (ex. DEGIRO titres NL vs espèces DE). */
  readonly pays?: string;
  readonly adresse?: string;
  readonly note?: string;
  /** Cf. `Etablissement.teneurHorsDeFrance` — surcharge par compte (ex. DEGIRO titres NL / espèces DE). */
  readonly teneurHorsDeFrance?: boolean;
}

/**
 * Entité qui TIENT un compte d'un type donné quand ce n'est pas l'établissement
 * principal, et sans que ce compte soit inhérent à l'ouverture (sinon : gabarit
 * `comptes`, auto-déplié). Cas d'usage (addendum du 17/10/2026, SOURCES-3916 §14) :
 * le compte crypto proposé par un intermédiaire qui ne fait que transmettre ou
 * exécuter les ordres (N26, DEGIRO, IBKR) ou par une entité sœur (Revolut) — le
 * compte 3916-bis est celui du CONSERVATEUR (CGI ann. III art. 344 G decies, I :
 * « personne […] qui reçoit habituellement en dépôt des crypto-actifs »).
 *
 * N'est PAS auto-dépliée : ne sert qu'à remplir correctement la fiche à recopier et
 * le lieu de tenue quand l'utilisateur ajoute lui-même une ligne de ce type.
 */
export interface EntiteTeneuse {
  /** Raison sociale du teneur, celle à recopier sur le formulaire. */
  readonly designation: string;
  readonly pays: string;
  /** Uniquement si sourcée (SOURCES-3916) ; absente = « à renseigner » sur la fiche. */
  readonly adresse?: string;
  /** Lieu de tenue SOURCÉ pour tous les clients (obligatoire : c'est la raison d'être de l'entrée). */
  readonly teneurHorsDeFrance: boolean;
  /** Code PSAN propre au teneur (jamais hérité de l'établissement principal). */
  readonly codePsan?: string;
  /** Mention affichée sous le verdict de la ligne. */
  readonly note?: string;
}

/** Résolution (établissement, type) → ce que la fiche à recopier et le moteur doivent lire. */
export interface TeneurResolu {
  readonly designation: string;
  readonly pays?: string;
  readonly adresse?: string;
  readonly codePsan?: string;
  readonly teneurHorsDeFrance?: boolean;
  readonly note?: string;
  /**
   * Nom de l'établissement par lequel le compte a été souscrit, quand il diffère du
   * teneur (`entitesParType`) — pour l'afficher comme intermédiaire, jamais comme teneur.
   */
  readonly intermediaire?: string;
}

export interface Etablissement {
  readonly id: string;
  readonly designation: string;
  /**
   * Nom d'usage pour le title/H1/meta description (ex. « Trade Republic » plutôt que
   * « Trade Republic Bank GmbH »). Absent = fallback sur `designation` — la raison
   * sociale reste affichée telle quelle dans le corps de la fiche (adresse, PSAN…).
   */
  readonly nomCourt?: string;
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
  /**
   * Teneur propre à un type de compte FACULTATIF (non auto-déplié), quand il diffère de
   * l'établissement principal — cf. `EntiteTeneuse`. Un type présent ici doit figurer dans
   * `typesCompatibles`, différer de `typeParDefaut` et n'avoir aucun gabarit `comptes`
   * (le gabarit primerait : l'entrée serait morte) — invariants gelés par les tests.
   */
  readonly entitesParType?: Partial<Record<TypeCompte, EntiteTeneuse>>;
  readonly formulaireParDefaut: Formulaire;
  /**
   * L'établissement teneur est-il situé hors de France ? (cf. `Compte.teneurHorsDeFrance`.)
   *
   * À ne renseigner que si la base le sait de façon SOURCÉE et pour TOUS les clients.
   * Laisser `undefined` dès qu'un même acteur tient à la fois des comptes français et
   * étrangers selon le client — c'est le cas de N26, Revolut et Trade Republic, qui ont
   * une succursale française ET des clients restés chez l'entité d'origine : trancher
   * produirait une réponse ferme et fausse pour la moitié des lecteurs. Le moteur rend
   * alors `info_manquante` en énonçant les deux branches, ce qui est une réponse
   * conditionnelle précise — pas un « à vérifier » qui botte en touche.
   */
  readonly teneurHorsDeFrance?: boolean;
  /** Code PSAN du formulaire 3916-bis (actifs numériques uniquement). */
  readonly codePsan?: string;
  /** Adresse postale (sourcée juin 2026 ; à confirmer sur le relevé). `null` = non figée. */
  readonly adresse: string | null;
  /** Avertissement à afficher (cas ambigu / multi-produits). */
  readonly note?: string;
  /**
   * Meta description sur mesure (SEO). Absent = fallback sur la description générée
   * depuis `verdictTexte`/`designation` (cf. [etablissement].astro) — à réserver aux
   * fiches où la réponse générique manque le vrai différenciant (ex. IBAN FR vs DE).
   */
  readonly descriptionSeo?: string;
  /**
   * Sections détaillées (H2 + paragraphe), affichées entre l'encadré verdict et
   * « Le principe ». Réservé aux fiches où la réponse à la requête est enfouie dans
   * `note` et mérite d'être mise en avant (ex. Revolut, question IBAN français).
   */
  readonly sections?: readonly { titre: string; corps: string }[];
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
    // Binance France SAS a été radiée du registre AMF le 02/07/2026 : il ne subsiste plus
    // d'entité française susceptible de tenir le compte. La branche « compte FR » de la note
    // ne vaut donc que pour l'historique (années antérieures, encore déclarables).
    teneurHorsDeFrance: true,
    note:
      "Pas d'adresse d'établissement unique : elle dépend de votre entité contractante. " +
      "• Compte rattaché à Binance France SAS (Paris) jusqu'à sa radiation du registre AMF le 02/07/2026 → compte français, non concerné par le 3916-bis pour les périodes antérieures ; depuis, il ne subsiste plus d'entité française teneuse. " +
      "• Compte sur la plateforme internationale (binance.com) → déclarez l'entité étrangère figurant dans vos conditions générales / relevé, avec SON adresse (et non celle des bureaux parisiens). À reporter depuis vos CGU. " +
      "Binance France SAS a été radiée du registre AMF le 2 juillet 2026 (caducité à la fin de la période transitoire MiCA) et Binance a cessé de fournir des services sur crypto-actifs dans l'Union européenne : sans effet sur la déclaration. " +
      "Un compte qui a existé en 2026 — même soldé, transféré ou clos en cours d'année — reste à déclarer au printemps 2027 ; si vous avez déplacé vos avoirs vers une autre plateforme, le compte d'arrivée se déclare en plus, au titre de la même année.",
  },
  { id: "coinbase", designation: "Coinbase", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "009", pays: "LU", url: "https://www.coinbase.com", teneurHorsDeFrance: true, adresse: "Coinbase Luxembourg S.A., 58 Boulevard Grande-Duchesse Charlotte, L-1330 Luxembourg", note: "Entité Coinbase Luxembourg S.A. — confirmer selon votre relevé." },
  { id: "kraken", designation: "Kraken", typeParDefaut: "exchange_crypto", formulaireParDefaut: "3916-bis", codePsan: "020", pays: "IE", url: "https://www.kraken.com", teneurHorsDeFrance: true, adresse: "Payward Europe Solutions Limited, 70 Sir John Rogerson's Quay, Dublin 2, D02 R296, Irlande" },
  { id: "etoro", designation: "eToro", typeParDefaut: "exchange_crypto", typesCompatibles: ["exchange_crypto", "titres_cto"], formulaireParDefaut: "3916-bis", codePsan: "013", pays: "CY", url: "https://www.etoro.com", teneurHorsDeFrance: true, adresse: "eToro (Europe) Ltd, 4 Profiti Ilia Street, KIBC 7e étage, Germasogeia 4046, Limassol, Chypre", note: "Multi-produits : si vous détenez à la fois un compte actions/CFD (→ 3916) ET un compte crypto (→ 3916-bis), ce sont DEUX comptes distincts à déclarer." },
  {
    id: "trade-republic",
    designation: "Trade Republic Bank GmbH",
    pays: "DE",
    url: "https://traderepublic.com",
    typeParDefaut: "titres_cto",
    typesCompatibles: ["titres_cto", "pea", "exchange_crypto"],
    formulaireParDefaut: "3916",
    codePsan: "029",
    // Adresse de l'entité PARENTE (celle à reporter pour le compte crypto, tenu à Berlin).
    // Tranchée sur le REGAFI (ACPR), qui donne Brunnenstr. 19-21 — et non la Köpenicker
    // Straße retenue jusqu'au 18/09/2026, non confirmée par le registre.
    adresse: "Trade Republic Bank GmbH, Brunnenstraße 19-21, 10119 Berlin, Allemagne",
    // Volontairement `undefined` : depuis l'ouverture de la succursale française (09/01/2025),
    // espèces, titres et PEA sont tenus EN FRANCE pour les clients qui y ont un compte de
    // dépôt — mais les mentions légales précisent qu'« il y a aussi des clients pour lesquels
    // Trade Republic Bank GmbH fournit tous les services sur une base transfrontalière ».
    // Les deux branches coexistent donc : seul le client peut dire laquelle est la sienne.
    note:
      "Trois comptes possibles, et ils ne suivent pas le même régime. " +
      "• Si vous avez un IBAN FR : compte espèces, compte-titres et PEA sont fournis par Trade Republic Bank GmbH, Succursale France (REGAFI 741192, SIREN 900 796 855), depuis l'ouverture de cette succursale le 9 janvier 2025 — sous le régime de la liberté d'établissement et sous le contrôle de l'ACPR et de l'AMF — comptes tenus en France, NON déclarables. " +
      "• Compte crypto : il reste fourni par l'entité allemande Trade Republic Bank GmbH en libre prestation de services (agrément MiCA BaFin, liste blanche AMF, depuis le 28 avril 2025), la conservation des crypto-actifs étant assurée à Berlin — compte tenu hors de France, À DÉCLARER au 3916-bis (code PSAN 029), quel que soit l'IBAN du compte espèces. " +
      "• Certains clients sont restés entièrement servis depuis l'Allemagne, sur une base transfrontalière : si votre compte espèces a encore un IBAN allemand (DE), ou en a eu un avant migration, ce sont ces comptes-là (espèces ET titres) qui sont à déclarer au 3916, y compris au titre de l'année de leur clôture. " +
      "Adresse à confirmer sur votre relevé.",
  },

  // ── Néobanques / banques étrangères (3916) ──
  {
    id: "revolut",
    designation: "Revolut",
    pays: "LT",
    url: "https://www.revolut.com",
    typeParDefaut: "neobanque",
    typesCompatibles: ["neobanque", "paiement_emoney", "titres_cto", "exchange_crypto"],
    formulaireParDefaut: "3916",
    adresse: "Revolut Bank UAB, Konstitucijos ave. 21B, 08130 Vilnius, Lituanie",
    // Titres et crypto sont tenus par des entités sœurs, pas par Revolut Bank UAB
    // (SOURCES-3916 §11 et §12) : sans ces entrées, la fiche à recopier d'une ligne crypto
    // affichait « Revolut Bank UAB, Vilnius » (défaut corrigé le 17/10/2026). Adresses non
    // sourcées → absentes (la fiche affiche « à renseigner »).
    entitesParType: {
      titres_cto: { designation: "Revolut Securities Europe UAB", pays: "LT", teneurHorsDeFrance: true },
      exchange_crypto: { designation: "Revolut Digital Assets Europe Ltd", pays: "CY", teneurHorsDeFrance: true },
    },
    // Réponse à la requête « compte Revolut IBAN français, faut-il déclarer » mise en
    // avant en sections (cf. [etablissement].astro) plutôt qu'enfouie dans `note`.
    sections: [
      {
        titre: "Quels comptes Revolut sont à déclarer ?",
        corps:
          "Tout dépend de l'entité qui tient le compte, et Revolut en a plusieurs. Le compte courant EUR / Épargne (Revolut France, succursale FR, IBAN FR) est tenu en France : il n'est PAS à déclarer. " +
          "Depuis l'agrément bancaire français délivré le 10 août 2026 à Revolut Bank S.A., les clients français sont transférés depuis Revolut Bank UAB (succursale française) : d'après le courriel de Revolut du 29 septembre 2026, chaque compte est transféré en une journée entre le 2 et le 5 décembre 2026 (IBAN et BIC conservés, nouvelles conditions générales dès le 2 décembre). Sans effet sur le 3916, le compte courant à IBAN FR étant tenu en France avant comme après.",
      },
      {
        titre: "Ce qui reste à déclarer chez Revolut",
        corps:
          "Si vous les détenez, deux autres comptes sont à déclarer, distincts du compte courant : le compte titres / Flexible Cash Funds (Revolut Securities Europe UAB, Lituanie → 3916) et le compte crypto (Revolut Digital Assets Europe Ltd, Chypre → 3916-bis).",
      },
      {
        titre: "Un ancien IBAN lituanien ?",
        corps: "Un IBAN lituanien (LT) historique reste, lui, déclarable, y compris au titre de l'année de sa clôture.",
      },
    ],
    note: "Vérifiez l'entité qui détient chacun de vos comptes dans l'application ou sur votre relevé.",
    descriptionSeo:
      "Compte Revolut à IBAN FR (succursale française) : non déclarable. À déclarer : compte titres (3916), " +
      "compte crypto (3916-bis), ancien IBAN lituanien.",
  },
  {
    id: "n26",
    designation: "N26 Bank SE",
    pays: "DE",
    url: "https://n26.com",
    typeParDefaut: "neobanque",
    typesCompatibles: ["neobanque", "exchange_crypto"],
    formulaireParDefaut: "3916",
    // N26 Crypto : N26 ne fait que transmettre les ordres (RTO) ; exécution et conservation
    // par Bitpanda GmbH, Vienne (conditions particulières France, art. 12.2 et Partie F
    // §2.2.1 — SOURCES-3916 §14, 17/10/2026). Le compte 3916-bis est celui du conservateur.
    entitesParType: {
      exchange_crypto: {
        designation: "Bitpanda GmbH",
        pays: "AT",
        adresse: "Bitpanda GmbH, Stella-Klein-Löw-Weg 17, 1020 Vienne, Autriche",
        teneurHorsDeFrance: true,
      },
    },
    // Adresse de l'entité allemande (celle à reporter si le compte est resté en IBAN DE).
    // Confirmée au REGAFI (ACPR) le 18/09/2026.
    adresse: "N26 Bank SE, Voltairestraße 8, 10179 Berlin, Allemagne",
    // Volontairement `undefined` : les deux branches coexistent réellement. L'ancienne
    // mention « la rumeur d'un IBAN français depuis 2023 est infirmée » était FAUSSE —
    // l'IBAN FR est documenté par N26 (communiqué du 05/07/2023) et la succursale
    // française est inscrite au REGAFI depuis le 15/03/2018.
    note:
      "Deux situations pour votre compte courant, selon votre IBAN. " +
      "• IBAN français (FR) : votre compte est tenu par N26 Bank SE, Succursale France (17-21 rue Saint-Fiacre, 75002 Paris ; REGAFI 72460, SIREN 840 460 943) — compte tenu en France, NON déclarable. N26 attribue un IBAN français à ses nouveaux clients depuis juin 2023, et migre les clients existants sur invitation, par groupes. " +
      "• IBAN allemand (DE) : compte tenu par N26 Bank SE à Berlin, à déclarer au 3916, même vide — y compris au titre de l'année de la migration vers l'IBAN FR, puisque le compte allemand a existé pendant une partie de l'année. " +
      "Les « Espaces » : la fonction d'IBAN dédié n'est pas proposée aux comptes ouverts en France (N26 en exclut nommément la France, l'Italie et l'Espagne) — vos Espaces partagent donc l'IBAN principal, cela reste un seul compte. " +
      "Ex-N26 Bank AG (forme changée en 2025). " +
      "• Compte crypto (N26 Crypto, depuis mars 2024) : N26 ne fait que transmettre vos ordres. L'exécution et la conservation sont assurées par Bitpanda GmbH (Vienne, Autriche), avec laquelle vous signez un contrat distinct, comme le précisent les conditions particulières France de N26. C'est un compte de crypto-actifs tenu hors de France : À DÉCLARER au 3916-bis, au nom de Bitpanda GmbH, Stella-Klein-Löw-Weg 17, 1020 Vienne, Autriche, quel que soit l'IBAN (FR ou DE) de votre compte courant.",
  },
  {
    id: "bunq",
    designation: "bunq B.V.",
    pays: "NL",
    url: "https://www.bunq.com",
    typeParDefaut: "neobanque",
    formulaireParDefaut: "3916",
    // Adresse des mentions légales bunq FR (17/10/2026) ; le REGAFI et l'ancienne fiche
    // donnent Naritaweg 131-133 — divergence consignée dans SOURCES-3916 §14.
    adresse: "bunq B.V., Basisweg 32, 1043 AP Amsterdam, Pays-Bas",
    // Volontairement `undefined` (était `true` jusqu'au 17/10/2026) : depuis 2021, bunq
    // attribue un IBAN FR, tenu par sa succursale française (REGAFI, CIB 27633), aux clients
    // domiciliés en France, et les IBAN NL/étrangers coexistent — modèle N26.
    note:
      "Tout dépend de l'IBAN de chaque compte : chez bunq, chaque sous-compte a son propre IBAN. " +
      "• IBAN français (FR) : compte tenu par bunq B.V., succursale française (REGAFI, SIREN 893 970 970, code banque 27633), que bunq attribue automatiquement depuis 2021 aux clients domiciliés en France — compte tenu en France, NON déclarable. " +
      "• IBAN néerlandais (NL), y compris un ancien compte conservé après le passage à l'IBAN FR, ou IBAN d'un autre pays (DE, ES, IT, IE, BE, via les « International Bank Accounts ») : compte tenu hors de France, À DÉCLARER au 3916, même vide, y compris l'année de sa clôture.",
  },
  { id: "wise", designation: "Wise Europe SA", pays: "BE", url: "https://wise.com", typeParDefaut: "neobanque", typesCompatibles: ["neobanque", "paiement_emoney"], formulaireParDefaut: "3916", teneurHorsDeFrance: true, adresse: "Rue du Trône 100, 1050 Bruxelles, Belgique", note: "Établissement de monnaie électronique établi en Belgique — compte tenu hors de France : à déclarer au 3916. La dispense du BOFiP §85 suppose un compte adossé à un compte ouvert en France, ce qui n'est pas le montage Wise (IBAN belge autonome, ouverture ne supposant la détention d'aucun compte français) : en pratique le compte est à déclarer au 3916.", descriptionSeo: "Wise (Belgique) : compte tenu hors de France, à déclarer au 3916. La dispense d'encaissements en ligne ne joue pas : aucun compte français adossé." },

  // ── Paiement / encaissement en ligne (dispense BOFiP §85 possible) ──
  { id: "paypal", designation: "PayPal (Europe) S.à r.l. et Cie, S.C.A.", pays: "LU", url: "https://www.paypal.com", typeParDefaut: "paiement_emoney", formulaireParDefaut: "3916", teneurHorsDeFrance: true, adresse: "22-24 Boulevard Royal, L-2449 Luxembourg", note: "Compte tenu au Luxembourg : déclarable au 3916, SAUF si les trois conditions cumulatives de dispense sont réunies (voir ci-dessus). Le cas le plus fréquent — un compte servant uniquement à payer ses achats en ligne, adossé à un compte français — remplit les conditions (1) et (2) ; ses encaissements de ventes étant nuls, la condition (3) (seuil de 10 000 €) est elle aussi automatiquement remplie → dispensé.", descriptionSeo: "Compte PayPal : non déclarable s'il sert à payer vos achats, est adossé à un compte français et encaisse ≤ 10 000 €/an. Sinon, 3916." },

  // ── Courtiers étrangers (compte-titres ordinaire) ──
  {
    id: "ibkr",
    designation: "Interactive Brokers Ireland Limited",
    pays: "IE",
    url: "https://www.interactivebrokers.eu",
    typeParDefaut: "titres_cto",
    typesCompatibles: ["titres_cto", "exchange_crypto"],
    formulaireParDefaut: "3916",
    teneurHorsDeFrance: true,
    adresse: "North Dock One, 91/92 North Wall Quay, Dublin 1, D01 H7V7, Irlande",
    // IBIE n'est ni partie aux transactions ni conservateur : conservation chez zerohash
    // europe B.V., dans un compte au nom du client (SOURCES-3916 §14, 17/10/2026).
    entitesParType: {
      exchange_crypto: {
        designation: "zerohash europe B.V.",
        pays: "NL",
        adresse: "zerohash europe B.V., Herengracht 244-3, 1016 BT Amsterdam, Pays-Bas",
        teneurHorsDeFrance: true,
      },
    },
    note:
      "Compte crypto (proposé aux clients européens éligibles depuis mars 2026, si l'offre vous est ouverte) : Interactive Brokers n'est ni partie aux transactions ni conservateur. Vos crypto-actifs sont conservés par zerohash europe B.V. (Amsterdam), dans un compte ouvert à votre nom. C'est un compte distinct de votre compte-titres, tenu hors de France : À DÉCLARER au 3916-bis, au nom de zerohash europe B.V., Herengracht 244-3, 1016 BT Amsterdam, Pays-Bas.",
  },
  {
    id: "degiro",
    designation: "flatexDEGIRO Bank SE",
    pays: "DE",
    url: "https://www.degiro.fr",
    typeParDefaut: "titres_cto",
    typesCompatibles: ["titres_cto", "banque", "exchange_crypto"],
    formulaireParDefaut: "3916",
    teneurHorsDeFrance: true,
    adresse: "Omniturm, Große Gallusstraße 16-18, 60312 Francfort-sur-le-Main, Allemagne",
    // Les deux comptes sont tenus hors de France de façon certaine (succursale
    // néerlandaise pour les titres, entité allemande pour les espèces) : c'est le cas
    // où la base SAIT, et où le moteur peut donc trancher sans rien demander.
    comptes: [
      { type: "titres_cto", libelle: "Compte-titres DEGIRO (succursale néerlandaise)", pays: "Pays-Bas", teneurHorsDeFrance: true, adresse: "flatexDEGIRO Bank Dutch Branch, Amstelplein 1, 1096 HA Amsterdam, Pays-Bas" },
      { type: "banque", libelle: "Compte espèces flatex (Allemagne, IBAN DE)", pays: "Allemagne", teneurHorsDeFrance: true, adresse: "flatexDEGIRO Bank SE, Omniturm, Große Gallusstraße 16-18, 60312 Francfort-sur-le-Main, Allemagne", note: "Compte espèces distinct du compte-titres (depuis ~2020/2022). Ex-flatexDEGIRO Bank AG (forme changée le 30/12/2025)." },
    ],
    // Compte crypto FACULTATIF (non auto-déplié) : DEGIRO transmet/fait exécuter, Tangany
    // GmbH conserve (FAQ degiro.fr ; SOURCES-3916 §14, 17/10/2026).
    entitesParType: {
      exchange_crypto: {
        designation: "Tangany GmbH",
        pays: "DE",
        adresse: "Tangany GmbH, Brienner Straße 53, 80333 Munich, Allemagne",
        teneurHorsDeFrance: true,
      },
    },
    note:
      "Ajoutez vos éventuels sous-comptes devises (AutoFX USD/GBP/CHF) s'ils ont un IBAN propre — à vérifier sur votre relevé. " +
      "Compte crypto (proposé en France depuis septembre 2025) : DEGIRO transmet et fait exécuter vos ordres, mais ne conserve pas vos crypto-actifs. Ils sont conservés par Tangany GmbH (Munich), avec laquelle vous concluez un contrat distinct. C'est un compte distinct, tenu hors de France : À DÉCLARER au 3916-bis, au nom de Tangany GmbH, Brienner Straße 53, 80333 Munich, Allemagne.",
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

/**
 * Lieu de tenue connu pour un (établissement, type de compte) — `undefined` si la base
 * ne le sait pas de façon sourcée pour tous les clients.
 *
 * Le gabarit du compte prime sur l'établissement : un même acteur peut tenir ses
 * comptes à des endroits différents selon le produit (DEGIRO titres NL / espèces DE).
 * Sans ce résolveur, la fiche et le hub — qui appellent le moteur avec le seul
 * `typeParDefaut` — perdraient l'information portée par les gabarits.
 */
export function teneurHorsDeFrancePourType(e: Etablissement, type: TypeCompte): boolean | undefined {
  return teneurPourType(e, type).teneurHorsDeFrance;
}

/**
 * Teneur d'un compte (établissement, type) : ce que la fiche à recopier doit afficher
 * (raison sociale, adresse, pays, code PSAN) et le lieu de tenue prérempli.
 *
 * Priorité : gabarit `comptes` du même type (même raison sociale, pays/adresse/lieu
 * propres au compte) > `entitesParType[type]` (teneur distinct, l'établissement
 * principal n'étant qu'intermédiaire) > établissement principal. Sans ce résolveur, une
 * ligne crypto Revolut affichait « Revolut / Revolut Bank UAB, Vilnius » au lieu de
 * Revolut Digital Assets Europe Ltd (Chypre) — défaut corrigé le 17/10/2026.
 *
 * Le code PSAN d'une `entitesParType` n'est JAMAIS hérité de l'établissement principal :
 * c'est le code du teneur, pas celui de l'intermédiaire.
 */
export function teneurPourType(e: Etablissement, type: TypeCompte): TeneurResolu {
  const gabarit = e.comptes?.find((g) => g.type === type);
  if (gabarit) {
    return {
      designation: e.designation,
      pays: gabarit.pays ?? e.pays,
      adresse: gabarit.adresse ?? e.adresse ?? undefined,
      codePsan: e.codePsan,
      teneurHorsDeFrance: gabarit.teneurHorsDeFrance ?? e.teneurHorsDeFrance,
      note: gabarit.note,
    };
  }
  const entite = e.entitesParType?.[type];
  if (entite) {
    return {
      designation: entite.designation,
      pays: entite.pays,
      adresse: entite.adresse,
      codePsan: entite.codePsan,
      teneurHorsDeFrance: entite.teneurHorsDeFrance,
      note: entite.note,
      intermediaire: e.nomCourt ?? e.designation,
    };
  }
  return {
    designation: e.designation,
    pays: e.pays,
    adresse: e.adresse ?? undefined,
    codePsan: e.codePsan,
    teneurHorsDeFrance: e.teneurHorsDeFrance,
  };
}

/**
 * Meta description effective d'une fiche établissement — `descriptionSeo` explicite si
 * défini, sinon un gabarit court dérivé du verdict par défaut du moteur.
 *
 * Extrait le 19/09/2026 (contre-vérification post-revue) : `[etablissement].astro` et
 * `etablissements.test.ts` en avaient chacun leur propre copie du gabarit — le test ne
 * cassait donc pas si la page divergeait du texte qu'il était censé garantir. Fonction
 * PARTAGÉE : c'est elle qui fait foi des deux côtés.
 */
export function descriptionFiche(etab: Etablissement, r: ResultatCompte): string {
  const nomAffiche = etab.nomCourt ?? etab.designation;
  return (
    etab.descriptionSeo ??
    `Compte ${nomAffiche} : ${libelleVerdictCourt(r.verdict, r.formulaire, etab.typeParDefaut)}. ` +
      `Formulaire ${etab.formulaireParDefaut}, règles et fiche à recopier.`
  );
}
