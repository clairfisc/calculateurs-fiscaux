/**
 * Pages qui délèguent volontairement leur canonical à une autre URL.
 *
 * Cas d'usage : deux pages répondent à la même intention de recherche et se
 * cannibalisent. Plutôt que de supprimer la plus faible (elle reste utile aux
 * visiteurs et à la navigation), on déclare à Google laquelle indexer. Les signaux
 * se consolident sur la page cible ; la page source reste vivante et fonctionnelle.
 *
 * Conséquences appliquées automatiquement — ne rien câbler page par page :
 *  - `<link rel="canonical">` et `og:url` pointent vers la cible (BaseLayout) ;
 *  - la page n'émet plus de données structurées : elle n'a pas vocation à être
 *    indexée, son JSON-LD ne serait que du bruit concurrent de celui de la cible ;
 *  - l'URL est retirée du sitemap (astro.config.mjs) — annoncer dans un sitemap une
 *    URL qu'on canonicalise ailleurs est contradictoire.
 *
 * Clés et valeurs : chemins à slash final (cf. `trailingSlash: 'always'`).
 */
export const CANONIQUES_DELEGUEES: Record<string, string> = {
  // « PFU ou barème » et « faut-il cocher la case 2OP » sont la même question, et
  // les deux pages embarquent désormais le même simulateur : /pfu-ou-bareme/ est
  // devenu un sous-ensemble strict du guide. Le guide est celui que Google classe
  // (position 17 contre 67), c'est donc lui qui porte le cluster.
  "/pfu-ou-bareme/": "/faut-il-cocher-2op/",
};

/** Normalise vers la forme canonique à slash final. */
function normaliser(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

/**
 * Chemin canonique d'une page : celui vers lequel elle délègue, ou lui-même.
 */
export function cheminCanonique(pathname: string): string {
  const chemin = normaliser(pathname);
  return CANONIQUES_DELEGUEES[chemin] ?? chemin;
}

/** Vrai si la page délègue son canonical à une autre URL. */
export function delegueSonCanonical(pathname: string): boolean {
  const chemin = normaliser(pathname);
  return chemin in CANONIQUES_DELEGUEES;
}
