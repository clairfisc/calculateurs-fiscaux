/**
 * Source unique de la navigation du site (Header, Footer, page d'accueil-hub).
 * Ajouter un calculateur ou un guide ici le fait apparaître partout. À ne modifier qu'ici.
 */

export interface LienOutil {
  /** URL absolue interne (slug). */
  href: string;
  /** Libellé court pour le menu (header). */
  court: string;
  /** Libellé long / titre de carte sur la home. */
  long: string;
  /** Une phrase d'accroche (carte de la home). */
  resume: string;
}

/** Calculateurs interactifs — le cœur du produit. */
export const CALCULATEURS: LienOutil[] = [
  {
    href: "/dividendes-etrangers-2047",
    court: "Dividendes 2047",
    long: "Crédit d'impôt sur dividendes étrangers",
    resume:
      "Cases 2047 (205/207), 8VL et 8PL 2026 : calculez le crédit d'impôt sur vos dividendes et intérêts étrangers.",
  },
  {
    href: "/plus-values-cession-titres-etrangers",
    court: "Plus-values 2074",
    long: "Plus-values de cession de titres",
    resume:
      "Compte-titres étranger : prix moyen pondéré, change par opération, report des moins-values, cases 3VG/3VH (2074-CMV).",
  },
  {
    href: "/plus-values-crypto-2086",
    court: "Crypto 2086",
    long: "Plus-values crypto (2086)",
    resume:
      "Méthode de la valeur globale du portefeuille (150 VH bis), exonération 305 €, cases 3AN/3BN de la 2042-C.",
  },
  {
    href: "/comptes-etrangers-3916",
    court: "Comptes 3916",
    long: "Comptes étrangers à déclarer",
    resume:
      "Banque, néobanque, courtier, exchange crypto, PayPal : checklist 3916 / 3916-bis et fiche à recopier, compte par compte.",
  },
  {
    href: "/pfu-ou-bareme",
    court: "PFU ou barème",
    long: "PFU ou barème (case 2OP)",
    resume:
      "Comparez la flat tax (30 % / 31,4 % en 2026) et l'option barème progressif : abattement 40 %, CSG déductible.",
  },
];

/**
 * Simulateur d'arbitrage (mode A, year-round) — leviers décisionnels « avant chaque décision ».
 * Sous-groupe distinct des calculateurs déclaratifs : ils composent les moteurs existants et
 * comparent deux scénarios A/B. Regroupés sous un menu dédié dans la nav.
 */
export const SIMULATEUR: LienOutil[] = [
  {
    href: "/purger-ses-moins-values",
    court: "Purge moins-values",
    long: "Purger ses moins-values (simulateur)",
    resume:
      "Avant le 31/12 : simulez l'impact de réaliser vos moins-values latentes pour effacer vos plus-values de l'année — différence d'impôt et report sur 10 ans.",
  },
  {
    href: "/quand-convertir-ses-cryptos",
    court: "Timing conversion crypto",
    long: "Quand convertir ses cryptos (simulateur)",
    resume:
      "Convertir en une fois ou fractionner sur plusieurs années : simulez l'impôt sur la plus-value crypto (150 VH bis), l'effet du seuil 305 € et du PFU.",
  },
  {
    href: "/pea-ou-compte-titres",
    court: "PEA ou CTO",
    long: "PEA ou compte-titres (fiscalité)",
    resume:
      "Comparez le coût fiscal de sortie d'une plus-value en PEA vs compte-titres : avant 5 ans (clôture + imposition) ou après 5 ans (exonération d'impôt, prélèvements sociaux 17,2 % / 18,6 %).",
  },
  {
    href: "/donner-ou-vendre-des-actions",
    court: "Donner ou vendre",
    long: "Donner ou vendre des actions",
    resume:
      "Donation avant cession : comparez vendre puis donner le net (plus-value taxée) ou donner les titres appréciés (plus-value latente non imposée) — droits de donation, abattement 100 000 €, avertissement abus de droit.",
  },
];

/** Guides éditoriaux (contenu SEO de support). */
export const GUIDES: LienOutil[] = [
  {
    href: "/guide-credit-impot-dividendes-etrangers",
    court: "Crédit d'impôt dividendes",
    long: "Guide : crédit d'impôt dividendes étrangers",
    resume:
      "Cases 203 à 207 du 2047, cases 8VL et 8PL 2026 expliquées simplement.",
  },
  {
    href: "/case-8pl-8vl-2026",
    court: "Cases 8PL / 8VL",
    long: "Cases 8PL et 8VL 2026",
    resume:
      "Que mettre dans les cases 8VL et 8PL, et comment corriger l'erreur « ligne 8VL sans code 8PL ».",
  },
  {
    href: "/declarer-ses-cryptos-aux-impots",
    court: "Déclarer ses cryptos",
    long: "Faut-il déclarer ses cryptos ?",
    resume:
      "Quand une vente crypto est imposable, pourquoi crypto→crypto ne l'est pas, la méthode 150 VH bis et le seuil de 305 €.",
  },
  {
    href: "/faut-il-cocher-2op",
    court: "Faut-il cocher 2OP",
    long: "Faut-il cocher la case 2OP ?",
    resume:
      "PFU ou barème selon votre TMI : ce que débloque la case 2OP (abattement 40 %, CSG déductible) et les pièges avant de la cocher.",
  },
  {
    href: "/reporter-ses-moins-values-bourse",
    court: "Report moins-values",
    long: "Reporter ses moins-values de bourse",
    resume:
      "Report 10 ans, imputation sur plus-values de même nature, case 3VH et « purge » de fin d'année des moins-values de titres.",
  },
];
