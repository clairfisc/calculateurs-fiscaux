// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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

  integrations: [react(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});