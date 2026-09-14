// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { datesPour } from './src/lib/page-dates.ts';
import { delegueSonCanonical, estHorsSitemap } from './src/lib/seo-canonical.ts';

// https://astro.build/config
export default defineConfig({
  // Domaine de production — source unique pour le canonical des pages,
  // le sitemap et les URLs Open Graph. À ne changer qu'ici.
  site: 'https://clairfisc.fr',

  // Convention d'URL unique : slash final partout (canonical, sitemap, liens internes).
  // Évite le motif « Page avec redirection » de la Search Console : un lien interne
  // vers /page (sans slash) provoque un 301 vers /page/ et Google indexe la redirection.
  trailingSlash: 'always',
  build: { format: 'directory' },

  integrations: [
    react(),
    sitemap({
      // Une page qui délègue son canonical à une autre URL n'a rien à faire dans le
      // sitemap : ce serait demander à Google d'indexer ce qu'on lui dit d'ignorer.
      // Idem pour les pages listées dans PAGES_HORS_SITEMAP (formulaire de contact,
      // confirmation) : elles portent un noindex et n'ont pas vocation à être trouvées.
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !delegueSonCanonical(pathname) && !estHorsSitemap(pathname);
      },

      // `<lastmod>` adossé aux dates éditoriales (src/lib/page-dates.ts), et non à
      // la date de build : republier le site ne doit pas signaler à Google que
      // toutes les pages ont changé. Une page non répertoriée sort sans lastmod,
      // ce qui est préférable à une date fausse.
      serialize(item) {
        const dates = datesPour(new URL(item.url).pathname);
        if (dates) item.lastmod = dates.modifiee;
        return item;
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});