# Clairfisc — calculateurs fiscaux open source pour l'investisseur

[![En ligne : clairfisc.fr](https://img.shields.io/badge/en%20ligne-clairfisc.fr-2ea44f)](https://clairfisc.fr)
[![CI](https://github.com/clairfisc/calculateurs-fiscaux/actions/workflows/ci.yml/badge.svg)](https://github.com/clairfisc/calculateurs-fiscaux/actions/workflows/ci.yml)
[![Licence : AGPL v3](https://img.shields.io/badge/licence-AGPL%20v3-blue.svg)](LICENSE)

Super-app **gratuite et open source** pour l'investisseur français : des **calculateurs** qui
produisent les bonnes cases (dividendes et plus-values étrangers, crypto, comptes à l'étranger,
choix PFU / barème) et un **simulateur d'arbitrage** qui compare deux scénarios chiffrés avant une
décision (purge de moins-values, timing de conversion crypto, PEA / compte-titres, donation).

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

## Le simulateur d'arbitrage

Des outils de décision « avant chaque choix » : ils **comparent deux scénarios chiffrés** (faire / ne
pas faire) sans jamais recommander. Ils ne réinventent aucun chiffre fiscal — ils **composent les
moteurs ci-dessus** et exposent le différentiel d'impôt + prélèvements sociaux.

- **Purge des moins-values** — réaliser ses moins-values latentes avant le 31/12 pour effacer ses plus-values de l'année : différentiel de case **3VG** et de report sur 10 ans.
- **Timing de conversion crypto** — convertir en une fois ou fractionner sur plusieurs années : effet du seuil 305 € et du régime (PFU / barème case 3CN).
- **PEA ou compte-titres** — coût fiscal de sortie d'une plus-value selon l'enveloppe et l'horizon (avant / après 5 ans : exonération d'IR, prélèvements sociaux).
- **Donation avant cession** — vendre puis donner le net (plus-value taxée) vs donner les titres appréciés (plus-value latente purgée) : droits de donation et avertissement abus de droit.

> Ces simulateurs sont en **mode informatif strict** : ils simulent et visualisent, ils ne
> conseillent pas. Les cas ambigus (abus de droit, éligibilité PEA…) sont **signalés et sourcés,
> jamais tranchés à tort**.

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
                simulateur-arbitrage/ : couche de composition (un sous-dossier par levier),
                  ne calcule rien en propre — appelle les moteurs et diffe les scénarios A/B
                site-nav.ts : source unique de la navigation (header, footer, hub)
src/components/ UI : îlots React des calculateurs et du simulateur, layout, disclaimer
src/pages/      pages calculateurs + simulateur + guides explicatifs (SEO) + hub d'accueil
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
