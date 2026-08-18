# Contribuer

Merci de votre intérêt ! Ce projet est un calculateur **gratuit et open source** (AGPLv3) du
crédit d'impôt sur revenus mobiliers étrangers. Sa valeur tient à **une seule chose : la justesse
fiscale**. La contribution la plus utile n'est donc pas forcément du code — c'est de **fiabiliser
les calculs et les taux** contre les sources officielles.

## La contribution la plus précieuse : signaler une erreur fiscale

Si une case, un taux ou un résultat vous semble faux :

1. Ouvrez une **issue** avec :
   - le cas concret (pays, type de revenu, montants) ;
   - la valeur attendue **et sa source officielle** — idéalement la [notice 2047](https://www.impots.gouv.fr/sites/default/files/formulaires/2047/2026/2047_5490.pdf), le [formulaire 2047](https://www.impots.gouv.fr/sites/default/files/formulaires/2047/2026/2047_5488.pdf) ou le BOFiP (citation précise).
2. Une affirmation fiscale **sans source officielle** ne pourra pas être intégrée : toute la valeur du projet tient à « le code est public, **vérifiez les cases** » — on ne devine pas, on cite.

Toutes les décisions et citations fiscales déjà actées sont dans
[`src/lib/tax-engine/SOURCES-2047.md`](src/lib/tax-engine/SOURCES-2047.md) — lisez-le avant de proposer un changement de logique.

## Corriger ou ajouter un taux par pays

1. Modifiez [`src/lib/tax-engine/rates.ts`](src/lib/tax-engine/rates.ts) (taux **sur le NET**, en points de base — ex. `1760` = 17,6 %).
2. **Ajoutez la citation** de la notice dans `SOURCES-2047.md`.
3. **Ajoutez un test** dans `src/lib/tax-engine/compute.test.ts` qui verrouille le résultat attendu.
4. `npm test` doit rester vert.

## Ajouter une page

Une page est un `.astro` dans `src/pages/`, mais deux fichiers doivent suivre,
sans quoi elle sera livrée incomplète **sans erreur ni avertissement** :

1. [`src/lib/site-nav.ts`](src/lib/site-nav.ts) — inscrivez-la dans `CALCULATEURS`,
   `SIMULATEUR` ou `GUIDES`. C'est la source unique de la navigation (header,
   footer, page d'accueil), et c'est aussi elle qui **type les données
   structurées** : un outil devient une `WebApplication`, un guide un `Article`.
   Une page absente de ce fichier retombe en `WebPage` générique.
2. [`src/lib/page-dates.ts`](src/lib/page-dates.ts) — ajoutez sa date de
   publication. Sans entrée, la page sort **sans date affichée, sans
   `dateModified` et sans `<lastmod>` au sitemap** (dégradation silencieuse,
   choisie pour ne jamais inventer de date).

Ensuite, ne faites bouger `modifiee` que lors d'une **révision de fond** — taux,
règle fiscale, correction, section ajoutée. Jamais pour une reformulation, un lien
ou un renommage de classe : annoncer une fraîcheur que le contenu n'a pas trompe
le lecteur autant que Google.

Si deux pages visent la même intention de recherche, ne les laissez pas
concourir : déclarez la délégation dans
[`src/lib/seo-canonical.ts`](src/lib/seo-canonical.ts) plutôt que d'en supprimer
une.

## Mise en route

Prérequis : **Node ≥ 22**.

```sh
npm install
npm test          # tests du moteur fiscal
npm run dev       # http://localhost:4321
npm run astro check
```

## Conventions de code

- **TypeScript strict** ; pas de `any` implicite.
- **Jamais de flottant pour de l'argent** : les montants circulent en **centimes entiers**, l'arrondi à l'euro se fait uniquement en sortie.
- Le **moteur fiscal** (`src/lib/tax-engine/`) reste **pur** : pas de dépendance, pas d'accès DOM/réseau, fonctions testables. Toute modification de logique vient avec des **tests** et une **source**.
- Nommage et commentaires **en français**, cohérents avec l'existant.
- Vie privée : aucune nouvelle collecte de données ni dépendance d'analytics/tracking.

## Pull requests

- Une PR = un sujet clair. Décrivez le **pourquoi** et, pour tout point fiscal, **la source**.
- Vérifiez que `npm test` et `npm run astro check` passent (la CI les rejoue).
- En contribuant, vous acceptez que votre contribution soit publiée sous **AGPLv3**.

## Portée

Le périmètre actuel est volontairement resserré : **dividendes et intérêts étrangers** (crédit
d'impôt, cases 2047 / 8VL / 8PL, report 2042). Les demandes hors de ce périmètre peuvent être
ouvertes en issue pour discussion, mais ne seront pas forcément retenues.

> Rappel : cet outil est une **aide informative** et ne constitue pas un conseil fiscal.
