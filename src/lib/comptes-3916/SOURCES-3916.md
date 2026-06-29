# Sources & règles — module checklist 3916 / 3916-bis (comptes étrangers)

> **Oracle de validation.** Établi le 2026-06-26 par recherche multi-sources +
> vérification adversariale 3 votes (**25/25 affirmations confirmées, 0 réfutée**),
> contre des sources **primaires** (Légifrance/CGI, BOFiP, formulaires & FAQ
> impots.gouv). Millésime **déclaration des revenus 2025 / 2026**.
>
> Ce module est un **moteur de règles juridiques** (verdict par compte :
> **à déclarer / exonéré / à vérifier**), pas un calcul. Il dérive de cet oracle.
> ⚠️ Les **cas ambigus (§9)** doivent être rendus « à vérifier + source », **jamais
> tranchés à tort** (= crédibilité, §15.3 de la base docs privée).

## 1. Sources officielles (à citer)

- **CGI art. 1649 A** (2e/3e al.) — obligation de déclarer les comptes ouverts/détenus/
  utilisés/clos hors de France. <Légifrance LEGIARTI000041592544 (version en vigueur)>
- **CGI art. 1649 bis C** — comptes d'**actifs numériques** (crypto) à l'étranger.
- **CGI art. 1649 AA** — **contrats de capitalisation / assurance-vie** souscrits hors de
  France (obligation **distincte**, sanction art. **1766**, pas 1736).
- **CGI art. 1736, IV-2** — sanctions comptes bancaires ; **art. 1736, X** — sanctions crypto.
- **CGI annexe III art. 344 A** (I : définition des comptes ; III : détention/usage),
  **344 G decies & undecies** (modalités actifs numériques).
- **Décret n° 2018-1267 du 26/12/2018** (ajout « détenus » → existence, en vigueur 1ᵉʳ janv. 2019) ;
  **décret n° 2020-118 du 12/02/2020** (art. 344 A I : « valeurs mobilières, titres ou **fonds** »).
- **BOFiP** : `BOI-CF-CPF-30-20` (obligation déclarative) ; `BOI-CF-INF-20-10-50` (sanctions).
- **Formulaire 3916-3916 bis** : millésime 2026 (réf. 5454), 2025 (réf. 5173) ;
  **FAQ PayPal** impots.gouv (exemption e-money).

## 2. Règle centrale — l'EXISTENCE, pas l'activité

Depuis le **1ᵉʳ janvier 2019**, **tout** compte étranger **ouvert, détenu, utilisé OU clos**
pendant tout ou partie de l'année est **à déclarer**, **y compris un compte vide / dormant**.
*(Avant 2019, seuls les comptes avec ≥ 1 opération étaient visés ; le mot « détenus » a élargi
à l'existence.)* Formulaire 3916 verbatim : « La déclaration concerne tout compte ouvert, détenu,
clôturé ou utilisé à l'étranger, pendant tout ou partie de l'année n. »

→ **Verdict moteur :** un compte étranger existant = **à déclarer**, sauf exemption e-money (§6).

## 3. Personnes concernées

Résidents fiscaux FR (personnes physiques, associations, sociétés non commerciales). Au-delà du
**titulaire** : **co-titulaire**, **bénéficiaire / ayant droit économique**, et **détenteur d'une
procuration** (dès qu'il l'utilise, pour lui-même ou un résident). *(Art. 344 A III ; BOFiP §50.)*

## 4. Comptes bancaires & titres (3916) — définition large

Art. 344 A I : comptes ouverts auprès de **toute personne (privée/publique) recevant
habituellement en dépôt des valeurs mobilières, titres ou fonds** → couvre **banques,
néobanques, comptes-titres/courtiers**. Inclut aussi les **contrats de capitalisation /
assurance-vie** souscrits hors de France (art. 1649 AA — *régime/sanction distincts*, §9).

## 5. Comptes d'actifs numériques (3916-bis)

Base : **art. 1649 bis C** (modalités 344 G decies/undecies). Comptes ouverts auprès de toute
personne **recevant habituellement en dépôt des actifs numériques** (PSAN / exchange, art. 150 VH
bis) → **à déclarer MÊME sans cession ni activité** (critère = existence). Le formulaire liste les
principaux PSAN par **code** (aide, liste non exhaustive) :

| Code | Établissement | Code | Établissement |
|---|---|---|---|
| 001 | Binance | 013 | eToro |
| 009 | Coinbase Exchange | 020 | Kraken |
| | | 029 | **Trade Republic** *(listé comme PSAN crypto)* |

⚠️ Le code **029 Trade Republic = volet PSAN/crypto** (3916-bis) — **ne préjuge PAS** du
traitement d'un **compte-titres / PEA** actions-ETF chez TR (§9).

## 6. Exemption monnaie électronique (e-money, type PayPal) — 3 conditions CUMULATIVES

1. le compte sert **uniquement** à réaliser **en ligne des paiements d'achats ou des
   encaissements afférents à des ventes de biens** *(« biens », pas « biens et services »)* ;
2. il est **adossé à un autre compte ouvert en France** ;
3. la **somme des encaissements annuels** crédités (afférents à ces ventes) **≤ 10 000 €**
   *(seuil apprécié globalement sur tous les comptes de même nature du titulaire)*.

**Si une seule condition manque → à déclarer.** *(BOFiP §85 ; FAQ PayPal impots.gouv.)*

## 7. Sanctions

- **Comptes bancaires** (art. 1736 IV-2) : **1 500 € / compte** non déclaré ; **10 000 €** si
  l'État n'a **pas** de convention d'assistance administrative avec la France.
- **Comptes d'actifs numériques** (art. 1736 X) : **750 € / compte** non déclaré **ou 125 € /
  omission**, plafond **10 000 € / déclaration** ; **doublés (1 500 € / 250 €)** si la **valeur
  vénale > 50 000 €** à un moment de l'année.
- *(Assurance-vie/capitalisation art. 1649 AA → sanction art. **1766**, hors barème ci-dessus.)*

## 8. Cas-types (oracle de test → tests unitaires)

| # | Entrée | Verdict attendu | Fondement |
|---|---|---|---|
| 1 | Compte bancaire étranger **vide / dormant** | **à déclarer** | existence (§2) |
| 2 | Compte **Binance** crypto, **aucune activité** | **à déclarer** (3916-bis) | 1649 bis C, existence (§5) |
| 3 | **PayPal** ventes de biens en ligne, adossé compte FR, encaissements **3 000 €/an** | **exonéré** | 3 conditions remplies (§6) |
| 4 | **PayPal** encaissements **15 000 €/an** | **à déclarer** | dépasse 10 000 € (§6-3) |
| 5 | **PayPal non adossé** à un compte FR | **à déclarer** | condition 2 manquante (§6-2) |
| 6 | Néobanque **Revolut (LT)** / **N26 (DE)** / **bunq (NL)** | **à déclarer** *(sauf exemption e-money applicable)* | compte tenu hors de France (§4) |
| 7 | **Wallet auto-hébergé** (Ledger/MetaMask, non custodial) | **à vérifier** *(lecture standard : non déclarable — pas de tiers teneur ; non confirmé par source primaire)* | §9 |
| 8 | **PEA chez Trade Republic** (enveloppe FR, teneur étranger) | **à vérifier** | non tranché par les sources (§9) |
| 9 | **Compte-titres ordinaire (CTO)** chez courtier étranger | **à déclarer** *(def. large 344 A I)* — afficher la nuance TR/PEA | §4 + §9 |
| 10 | **Assurance-vie luxembourgeoise** | **à déclarer — régime DISTINCT** (art. 1649 AA, sanction 1766), **pas** le barème 3916 bancaire | §4, §9 |

## 9. Cas « à vérifier » (NE PAS trancher) & questions ouvertes

- **PEA chez courtier étranger (Trade Republic)** : aucune source primaire ne tranche le sort d'un
  PEA « enveloppe FR » tenu par un établissement étranger → **« à vérifier » + renvoi doctrine**.
- **CTO non-crypto chez courtier étranger** : la def. large suggère « à déclarer », mais aucun claim
  explicite ; **ne pas confondre** avec le code PSAN 029 (crypto). Afficher à déclarer + note.
- **Néobanques UE** : principe général « tout compte hors de France, même UE/SEPA = à déclarer » ;
  afficher « à déclarer sauf exemption e-money » + renvoi aux 3 conditions. Non vérifié au cas par cas.
- **Assurance-vie luxembourgeoise** : obligation **distincte** (1649 AA / sanction 1766) — à traiter
  hors du régime « compte bancaire 3916 ».
- **Wallet auto-hébergé** : lecture standard = non déclarable (pas de tiers teneur), **non confirmée
  par source primaire ici** → « à vérifier ».
- *Ancrage réglementaire précis de l'exemption e-money (décret/article exact)* : non isolé — BOFiP §85
  + FAQ font foi pour le module ; à compléter si besoin.

## 10. Champs de la fiche par compte (à recopier sur impots.gouv)

Désignation + **adresse complète** de l'établissement · pays · n°/identifiant du compte · nature ·
usage (privé/professionnel) · dates d'**ouverture / clôture** dans l'année · marqueur **3916**
(bancaire/titres) vs **3916-bis** (actifs numériques). *(Identité du déclarant : saisie par l'usager
sur impots.gouv, **non stockée** — frontière §5.5.)*

---

*Caveats de millésime : doctrine BOFiP 2021-05-26 toujours en vigueur 2025/2026 ; formulaires 2025
(5173) & 2026 (5454) vérifiés ; codes PSAN = aide non exhaustive (à défaut : nom/adresse/URL). Pour
art. 344 A I, utiliser la version « valeurs mobilières, titres ou fonds » (décret 2020-118), pas la
version 2019 « espèces ». Re-vérifier chaque millésime (règle « valider avant de déployer »).*

## 11. Structures multi-comptes par établissement (validé 29/06/2026)

> Recherche multi-sources + vérif adversariale (104 agents). **Règle fondatrice (BOFiP
> BOI-CF-CPF-30-20 §180) : une déclaration PAR COMPTE distinct** (numéro/IBAN propre) ;
> la devise seule ne crée pas un compte. Critère de déclarabilité = **établissement teneur
> à l'étranger** ; un IBAN FR de succursale française ⇒ compte français (non déclarable).

| Établissement | Comptes déclarables | Auto-déplier ? | Conf. |
|---|---|---|---|
| **DEGIRO / flatexDEGIRO** | **2** : compte-titres (succursale NL, Amsterdam, 3916) + compte espèces **flatex** (Allemagne, IBAN DE, 3916) | **OUI (2)** | haute |
| **Revolut** | courant EUR/Épargne (succursale FR, IBAN FR) **NON déclarable** ; titres/Flexible Cash Funds (Lituanie, 3916) + crypto (Chypre, 3916-bis) **si détenus** | non (note) | haute |
| **eToro** | actions/CFD (3916) **et** crypto (3916-bis) = 2 comptes **si les deux** | non (note) | moy. |
| **Trade Republic** | espèces (IBAN FR récent = non déclarable / IBAN DE = 3916) + titres (3916) + crypto (3916-bis, PSAN 029) | non (note) | moy. |
| **N26** | 1 compte (IBAN **DE** → à déclarer ; « rumeur IBAN FR 2023 » **réfutée 0-3**) ; Espaces = même IBAN | non (note) | moy. |
| **PayPal** | 1 compte ; **exemption e-money** (3 conditions) prime — « toujours déclarable car Luxembourg » **réfuté 0-3** | non | haute |
| **Binance** | 1 compte 3916-bis ; **Binance France SAS (AMF) = compte FR non déclarable** sinon entité étrangère | non (note) | moy. |
| **Coinbase / Kraken** | 1 compte 3916-bis (entité Luxembourg / Payward Irlande) | non | moy. |
| **IBKR / bunq / Wise** | 1 compte par défaut ; sous-comptes (cash séparé, jars/IBAN devise) **non sourcés comme distincts** → note « à vérifier » | non (note) | basse |

**Sous-comptes NON auto-dépliés** (non fermement sourcés comme distincts) : devises AutoFX (DEGIRO),
Espaces (N26), vaults (Revolut), soldes multi-devises (Wise), sous-comptes (IBKR/Binance).
**Questions ouvertes** (reconfirmer par millésime) : IBAN exact Trade Republic/N26 ; entité Binance de
l'utilisateur ; soldes multi-devises Wise (1 vs N). Sources : impots.gouv.fr/notice 3916, BOFiP, pages
d'aide officielles (DEGIRO fiscalité, Revolut tax), guides FR (rotek, moneyvox, portfoliotracker).
