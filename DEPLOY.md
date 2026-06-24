# Déploiement — Cloudflare Pages

Le site est un **Astro statique** (`dist/`) — **aucune Pages Function, aucun
adaptateur SSR, aucun binding**. Il se déploie sur n'importe quel hébergeur
statique ; ci-dessous la configuration Cloudflare Pages.

> Le déploiement effectif nécessite un **compte Cloudflare** (action manuelle de
> votre part). Les étapes ci-dessous décrivent la configuration à réaliser une
> seule fois.

## 1. Build

| Réglage | Valeur |
| --- | --- |
| Commande de build | `npm run build` |
| Répertoire de sortie | `dist` |
| Version de Node | `>= 22.12.0` (cf. `package.json`) |
| Branche de production | `main` |

Sur Pages : **Workers & Pages → Create application → Pages → Connect to Git**,
sélectionnez le dépôt, puis renseignez la commande et le répertoire ci-dessus.

## 2. Placeholders à renseigner

Chaque page définit une URL `canonical` en `https://example.com/…` — à remplacer par le domaine de production :

| Emplacement | Placeholder (`canonical`) |
| --- | --- |
| `src/pages/index.astro` | `https://example.com/` |
| `src/pages/case-8pl-8vl-2026.astro` | `https://example.com/case-8pl-8vl-2026` |
| `src/pages/guide-credit-impot-dividendes-etrangers.astro` | `https://example.com/guide-credit-impot-dividendes-etrangers` |

## 3. Tester le build en local

```sh
npm run build
npm run preview
```

`npm run preview` sert `dist/` localement — équivalent du rendu de production
statique.
