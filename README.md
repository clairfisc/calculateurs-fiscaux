# Clairfisc — calculateurs fiscaux open source pour l'investisseur

Super-app **gratuite et open source** de calculateurs fiscaux pour l'investisseur français :
dividendes et plus-values étrangers, crypto, comptes à l'étranger, choix PFU / barème.

Le calcul s'exécute **entièrement dans votre navigateur** — sans compte, sans tracker, sans envoi de données.
En ligne : **[clairfisc.fr](https://clairfisc.fr)**.

## Pourquoi

La fiscalité de l'investisseur (crédit d'impôt sur revenus étrangers, plus-values de cession, crypto,
déclaration des comptes étrangers, arbitrage PFU/barème) est mal documentée et source d'erreurs. Ces
outils produisent les bonnes cases, gratuitement — et **leur code est public pour que chacun puisse
vérifier les calculs**. C'est le cœur du projet : la justesse fiscale **auditable**.

## Les calculateurs

- **Dividendes étrangers (2047)** — crédit d'impôt sur dividendes et intérêts étrangers : cases 205/206/207, agrégats **8VL / 8PL** (2026), report 2042 (2DC / 2TS / 2TR).
- **Plus-values de cession de titres (2074-CMV)** — compte-titres étranger : prix moyen pondéré, change par opération, imputation/report des moins-values, cases **3VG / 3VH**.
- **Plus-values crypto (2086)** — méthode de la valeur globale du portefeuille (CGI 150 VH bis), exonération 305 €, cases **3AN / 3BN**.
- **Comptes étrangers (3916 / 3916-bis)** — checklist « quels comptes déclarer » (banque, néobanque, courtier, exchange crypto, PayPal…) + fiche à recopier, compte par compte.
- **PFU ou barème (case 2OP)** — comparateur flat tax (30 % / 31,4 % en 2026) vs barème progressif : abattement 40 %, CSG déductible.

Chaque calculateur est accompagné de **guides explicatifs** (contenu pédagogique sourcé) — voir [`src/pages/`](src/pages/).

## Vie privée

- **Le calcul est 100 % local.** Vos montants ne quittent jamais le navigateur : aucun envoi, aucun compte, aucune analytics tierce, aucun tracker.
- **Site entièrement statique, aucune requête runtime.** Les taux de change BCE sont **embarqués au build** ([`ecb-rates.json`](src/lib/tax-engine/fx/)) — le navigateur ne contacte aucun serveur, même pour le change.

## Licence

**GNU AGPLv3** ([`LICENSE`](LICENSE)) — le code est public et le reste. Vous pouvez l'auditer, le corriger,
proposer une amélioration ou l'héberger vous-même.

## Stack

- **Astro** (sortie statique, SEO) + des **îlots React** pour les calculateurs, **TypeScript strict**, **Tailwind**.
- Chaque **moteur fiscal** est un module **pur, sans dépendance, testé** (Vitest). Montants en **centimes entiers** (jamais de flottant pour de l'argent).
- **Validation-d'abord** : chaque module gèle un oracle fiscal sourcé (`SOURCES-*.md`, citations Legifrance / BOFiP / notices officielles) dans ses tests. Voir par exemple [`src/lib/tax-engine/SOURCES-2047.md`](src/lib/tax-engine/SOURCES-2047.md).

## Développement

Prérequis : **Node ≥ 22**.

| Commande              | Action                                       |
| :-------------------- | :------------------------------------------- |
| `npm install`         | Installe les dépendances                     |
| `npm run dev`         | Serveur de dev sur `localhost:4321`          |
| `npm test`            | Lance les tests des moteurs fiscaux (Vitest) |
| `npm run build`       | Build statique dans `./dist/`                |
| `npm run astro check` | Vérification de types                        |

## Structure

```text
src/lib/        moteurs fiscaux purs, un dossier par module (tax-engine, cessions-2074,
                crypto-2086, comptes-3916, pfu-bareme), chacun avec ses tests + SOURCES-*.md
                site-nav.ts : source unique de la navigation (header, footer, hub)
src/components/ UI : îlots React des calculateurs, layout, disclaimer
src/pages/      pages calculateurs + guides explicatifs (SEO) + hub d'accueil
```

## Déploiement

Site **100 % statique** (`dist/`), déployable sur n'importe quel hébergeur statique. La production
tourne sur l'**hébergement OVH** de `clairfisc.fr`, déployé automatiquement à chaque push sur `main`
par **GitHub Actions** (transfert SFTP). Détails et secrets dans [`DEPLOY.md`](DEPLOY.md).

## Statut & avertissement

Projet **en cours (v0)**. Les taux, règles et cases sont **validés contre les sources officielles**
(notices, BOFiP, CGI) et gelés en tests, mais restent **à recouper** avant tout usage engageant.

> **Aide informative — ne constitue pas un conseil fiscal.** Vérifiez chaque montant avec la notice
> officielle du formulaire concerné ou un professionnel.
