# Déploiement — OVH (hébergement mutualisé, statique)

Le site est un **Astro statique** (`dist/`) — aucun backend, aucune Pages
Function. Il est servi par l'**hébergement web OVH** de `clairfisc.fr`
(datacenter France), et déployé automatiquement par **GitHub Actions en FTPS**.

## 1. Domaine de production

Centralisé dans `astro.config.mjs` :

```js
site: 'https://clairfisc.fr',
```

Tout en dérive au build (un seul endroit à changer) : `canonical` de chaque
page (via `Astro.url.pathname` → cohérent avec l'URL servie), URLs `og:image`/
`og:url` absolues, et `sitemap-index.xml` / `sitemap-0.xml` (`@astrojs/sitemap`).
`public/robots.txt` pointe vers `https://clairfisc.fr/sitemap-index.xml`.

## 2. Déploiement automatique (CI → OVH FTPS)

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) build
puis pousse `dist/` vers le dossier `www/` de l'hébergement à chaque push sur
`main`.

**Secrets à définir** (Settings → Secrets and variables → Actions) :

| Secret | Valeur |
| --- | --- |
| `FTP_SERVER` | hôte FTP OVH (ex. `ftp.clusterXXX.hosting.ovh.net`) |
| `FTP_USER` | identifiant FTP OVH |
| `FTP_PASSWORD` | mot de passe FTP OVH |

> Connexion en **FTPS explicite** (port 21 + TLS) → les identifiants ne
> transitent jamais en clair. Pensez à changer le mot de passe FTP par défaut
> dans l'espace client OVH.

## 3. Domaine, HTTPS, redirection

- **DNS** : géré chez OVH ; l'entrée A de `clairfisc.fr` pointe sur
  l'hébergement (propagation 24-48 h après activation).
- **HTTPS** : certificat Let's Encrypt gratuit fourni par OVH. Le
  [`public/.htaccess`](public/.htaccess) force HTTPS (pattern OVH
  `X-Forwarded-Proto`) et pose les en-têtes de sécurité/cache.
- **`clairfisc.com` → `clairfisc.fr`** : redirection 301 à configurer au niveau
  **domaine** dans le panel OVH (ne consomme pas le slot « 1 site »).

## 4. Accès temporaire (avant propagation DNS)

Tant que le DNS n'est pas propagé, le site est accessible via l'URL de cluster
OVH (`http://<login>.<cluster>.hosting.ovh.net`). Les `canonical` pointent déjà
sur `clairfisc.fr` → **ne pas soumettre à Search Console** avant que le domaine
réel soit en ligne.

## 5. Tester le build en local

```sh
npm install
npm run build
npm run preview   # sert dist/ localement
```
