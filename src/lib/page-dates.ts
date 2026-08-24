/**
 * Dates éditoriales des pages — source unique pour le `dateModified` des données
 * structurées, la mention « Mis à jour le » affichée et le `<lastmod>` du sitemap.
 *
 * Pourquoi une table explicite plutôt que la date git du fichier : le build tourne
 * en CI sur un clone superficiel (`actions/checkout`), où l'historique par fichier
 * n'existe pas. Et surtout, toutes les modifications ne sont pas éditoriales — une
 * passe d'hygiène d'URL ou de lint ne rend pas une page « à jour ».
 *
 * Règle : ne bouger `modifiee` QUE lors d'un changement de fond (taux, règle
 * fiscale, correction d'une erreur, section ajoutée). Jamais pour une reformulation
 * cosmétique, un lien ajouté ou un renommage de classe. Annoncer une fraîcheur que
 * le contenu n'a pas est trompeur pour le lecteur.
 *
 * Format : ISO `YYYY-MM-DD`, fuseau France.
 */

export interface DatesPage {
  /** Première mise en ligne. */
  publiee: string;
  /** Dernière révision de fond. */
  modifiee: string;
}

/** Clés = chemins canoniques, avec slash final (cf. `trailingSlash: 'always'`). */
export const DATES_PAGES: Record<string, DatesPage> = {
  "/": { publiee: "2026-06-24", modifiee: "2026-06-30" },

  // Calculateurs
  "/dividendes-etrangers-2047/": { publiee: "2026-06-29", modifiee: "2026-06-29" },
  "/plus-values-cession-titres-etrangers/": { publiee: "2026-06-26", modifiee: "2026-06-29" },
  "/plus-values-crypto-2086/": { publiee: "2026-06-26", modifiee: "2026-06-29" },
  "/comptes-etrangers-3916/": { publiee: "2026-06-26", modifiee: "2026-06-29" },
  "/pfu-ou-bareme/": { publiee: "2026-06-26", modifiee: "2026-08-18" },

  // Simulateur d'arbitrage
  "/purger-ses-moins-values/": { publiee: "2026-06-30", modifiee: "2026-06-30" },
  "/quand-convertir-ses-cryptos/": { publiee: "2026-06-30", modifiee: "2026-06-30" },
  "/pea-ou-compte-titres/": { publiee: "2026-06-30", modifiee: "2026-07-01" },
  "/donner-ou-vendre-des-actions/": { publiee: "2026-06-30", modifiee: "2026-06-30" },

  // Guides
  "/guide-credit-impot-dividendes-etrangers/": { publiee: "2026-06-24", modifiee: "2026-06-29" },
  "/case-8pl-8vl-2026/": { publiee: "2026-06-24", modifiee: "2026-06-29" },
  "/declarer-ses-cryptos-aux-impots/": { publiee: "2026-06-29", modifiee: "2026-06-29" },
  "/faut-il-cocher-2op/": { publiee: "2026-06-29", modifiee: "2026-08-18" },
  "/reporter-ses-moins-values-bourse/": { publiee: "2026-06-29", modifiee: "2026-06-29" },
  "/case-2bh-2cg/": { publiee: "2026-08-18", modifiee: "2026-08-18" },

  // Hub des fiches établissement. Entrée explicite nécessaire : la règle par
  // préfixe ci-dessous ne couvre que les fiches filles, pas l'index lui-même.
  "/declarer-compte/": { publiee: "2026-08-24", modifiee: "2026-08-24" },

  // Divers
  "/le-projet/": { publiee: "2026-07-01", modifiee: "2026-07-01" },
};

/**
 * Fiches « déclarer un compte » : générées depuis un même gabarit, elles partagent
 * la date du gabarit plutôt qu'une entrée par établissement.
 */
const PREFIXE_DECLARER_COMPTE = "/declarer-compte/";
const DATES_DECLARER_COMPTE: DatesPage = {
  publiee: "2026-06-26",
  modifiee: "2026-06-29",
};

/** Normalise vers la forme canonique à slash final. */
function normaliser(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

/**
 * Dates d'une page, ou `undefined` si elle n'est pas répertoriée — auquel cas
 * l'appelant omet simplement les dates (mieux qu'une date inventée).
 */
export function datesPour(pathname: string): DatesPage | undefined {
  const chemin = normaliser(pathname);
  const exact = DATES_PAGES[chemin];
  if (exact) return exact;
  if (chemin.startsWith(PREFIXE_DECLARER_COMPTE) && chemin !== PREFIXE_DECLARER_COMPTE) {
    return DATES_DECLARER_COMPTE;
  }
  return undefined;
}

/** Format lisible pour l'affichage, ex. « 18 août 2026 ». */
export function formaterDateFr(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
