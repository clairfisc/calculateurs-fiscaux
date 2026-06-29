# Déploiement

Le site est un **Astro statique** (`dist/`) — aucun backend, aucune fonction
serveur. Il se déploie donc sur **n'importe quel hébergeur statique** (Netlify,
Cloudflare Pages, GitHub Pages, Nginx, un mutualisé en SFTP…).

Les sections 1 à 3 sont **génériques** (utiles pour auto-héberger un fork). La
section 4 documente **notre** production (OVH) — spécifique, donnée à titre
d'exemple.

## 1. Build & test en local

```sh
npm install
npm run build      # sortie statique dans dist/
npm run preview    # sert dist/ localement
```

Le contenu de `dist/` est tout ce qu'il faut servir.

## 2. Domaine de production

Centralisé dans `astro.config.mjs` (un seul endroit à changer) :

```js
site: 'https://clairfisc.fr',
```

Tout en dérive au build : `canonical` de chaque page (via `Astro.url.pathname`),
URLs absolues `og:image` / `og:url`, et `sitemap-index.xml` / `sitemap-0.xml`
(`@astrojs/sitemap`). `public/robots.txt` pointe vers le sitemap correspondant.
Pour un fork auto-hébergé, remplacez cette valeur par votre domaine.

## 3. Déploiement automatique (CI → SFTP)

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
**build + teste**, puis pousse `dist/` vers le dossier `www/` du serveur **à
chaque push sur `main`** (et via *workflow_dispatch*). Il fonctionne avec
**tout hébergeur joignable en SFTP**, pas seulement OVH.

**Secrets à définir** (Settings → Secrets and variables → Actions) :

| Secret         | Valeur                                   |
| -------------- | ---------------------------------------- |
| `FTP_SERVER`   | hôte SFTP                                |
| `FTP_USER`     | identifiant SFTP                         |
| `FTP_PASSWORD` | mot de passe SFTP                        |

**Méthode (et pourquoi).** Le transfert se fait via `sshpass -e sftp` (port 22),
avec un **batch généré à la volée : une commande `put` par entrée** de `dist/`.
Deux choix non évidents, utiles à connaître si vous adaptez le workflow :

- **SFTP, pas FTPS** — transfert chiffré via SSH, largement disponible sur les
  mutualisés (port 22). `sshpass + sftp` s'est révélé **plus fiable** que
  `sshpass + lftp` (qui se bloquait) ; on évite aussi `put -r *` (ambigu en
  multi-argument côté `sftp`).
- **`rm` avant `put`** pour les fichiers de premier niveau — certains hébergeurs
  (dont l'OVH mutualisé) **échouent à écraser** un fichier existant ; le `-rm`
  préalable (le `-` ignore l'absence) rend le redéploiement idempotent. Les
  dotfiles (`.htaccess`) sont inclus explicitement.

## 4. Notre production : OVH mutualisé (exemple spécifique)

La prod de `clairfisc.fr` tourne sur l'**hébergement web OVH mutualisé**
(datacenter France). Détails propres à cette offre :

- **DNS** : géré chez OVH ; l'entrée A de `clairfisc.fr` pointe sur
  l'hébergement (propagation 24-48 h après activation). Avant propagation, le
  site est joignable via l'URL de cluster OVH (`http://<login>.<cluster>.hosting.ovh.net`) ;
  les `canonical` pointant déjà sur le domaine réel, **ne pas soumettre à Search
  Console** avant la mise en ligne du domaine.
- **HTTPS** : certificat Let's Encrypt gratuit fourni par OVH. Le
  [`public/.htaccess`](public/.htaccess) force HTTPS (pattern OVH
  `X-Forwarded-Proto`) et pose les en-têtes de sécurité/cache.
- **Quirks de l'offre gratuite** (à l'origine des choix de la section 3) : pas de
  FTPS (port 21 en clair uniquement) → on passe en **SFTP port 22** ; écrasement
  de fichier impossible → **`rm` avant `put`**. Pensez à changer le mot de passe
  par défaut dans l'espace client.
- **`clairfisc.com` → `clairfisc.fr`** : redirection 301 au niveau **domaine**
  dans le panel OVH (ne consomme pas le slot « 1 site »).
