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
 *
 * Retour d'expérience : le canonical délégué n'est qu'un signal, que Google peut
 * ignorer. Cas vécu — `/pfu-ou-bareme/` déléguait ici vers `/faut-il-cocher-2op/`
 * depuis le 18/08/2026 ; au recrawl du 18/09/2026, Google a gardé
 * `/pfu-ou-bareme/` comme « URL canonique sélectionnée par Google », toujours
 * indexée et concurrente du guide sur les mêmes requêtes. Remplacé par une
 * redirection 301 (`public/.htaccess`), bien plus contraignante pour Google.
 * Leçon : quand les deux pages sont quasi identiques (même simulateur, contenu
 * texte en grande partie redondant), préférer d'emblée la 301 à la délégation de
 * canonical — celle-ci ne vaut vraiment que pour deux pages qui restent chacune
 * utile de plein droit.
 */
export const CANONIQUES_DELEGUEES: Record<string, string> = {};

/**
 * Pages utilitaires sans intérêt de recherche, à exclure du sitemap.
 *
 * Différent de `CANONIQUES_DELEGUEES` : il ne s'agit pas ici de cannibalisation
 * entre deux pages qui répondent à la même intention, mais de pages qui n'ont
 * simplement rien à faire dans un index (formulaire de contact, confirmation
 * d'envoi). Ces pages portent par ailleurs un `<meta name="robots" content="noindex">`
 * posé directement sur la page (slot `head` de BaseLayout) — l'exclusion du
 * sitemap n'en est que la conséquence cohérente côté découverte.
 *
 * Chemins à slash final (cf. `trailingSlash: 'always'`).
 */
export const PAGES_HORS_SITEMAP: string[] = ["/signaler/", "/signaler/merci/"];

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

/** Vrai si la page est explicitement exclue du sitemap (cf. `PAGES_HORS_SITEMAP`). */
export function estHorsSitemap(pathname: string): boolean {
  const chemin = normaliser(pathname);
  return PAGES_HORS_SITEMAP.includes(chemin);
}
