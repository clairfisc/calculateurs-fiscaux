# SOURCES-2074 — Oracle fiscal du module « plus-values de cession » (2074 / 2074-CMV)

> **Périmètre :** plus ou moins-values de cession de **valeurs mobilières et droits sociaux**
> détenus sur un **compte-titres ordinaire** (typiquement chez un **courtier étranger**),
> **millésime de déclaration 2026 (revenus 2025)**. **PEA exclu** (régime propre). Partie
> **GRATUITE** de l'open core (§5.5 / §14.9 des docs) : **calcul + saisie manuelle**.
> L'import d'historique, les OST, le cerfa pré-rempli et le suivi pluriannuel du report
> sont **hors module** (payant).
>
> **Méthode (règle §8 « valider avant déployer ») :** cet oracle a été établi par recherche
> multi-sources + **vérification adversariale** (chaque règle confirmée par vote 3-0 contre
> la source primaire). Les valeurs des cas-types ci-dessous sont **calculées à la main** et
> figées en tests (`compute.test.ts`) ; la CI gèle l'oracle. Ce module **n'invente aucun
> taux ni aucune règle** : tout point non tranché par les sources est marqué **« à vérifier »**.

---

## 1. Assiette de la plus/moins-value (CGI art. 150-0 A et 150-0 D, 1)

**Règle.** Le gain net (ou la perte) est la **différence** entre :

```
résultat = prix de cession NET des frais et taxes du cédant  −  prix de revient (acquisition + frais)
```

- **Prix de cession** = prix proprement dit (pour la bourse : le **cours de transaction**),
  **diminué** des frais et taxes acquittés par le cédant à l'occasion de la cession
  (commissions de négociation, courtages, commissions).
- **Prix de revient** = prix d'acquisition (ensemble des contreparties mises à la charge de
  l'acquéreur), **majoré** des frais d'acquisition (courtages, commissions de négociation/
  souscription/attribution/SRD, rémunérations d'intermédiaires, honoraires d'expert, droits
  d'enregistrement, frais d'actes, impôts supportés lors de l'acquisition).

> **Frais de cession ⟶ se soustraient du prix de cession. Frais d'acquisition ⟶ s'ajoutent au prix d'acquisition.**

**Sources (vérifiées 3-0) :**
- CGI art. 150-0 D, 1 : « *Les gains nets […] sont constitués par la différence entre le prix
  effectif de cession des titres ou droits, net des frais et taxes acquittés par le cédant, et
  leur prix effectif d'acquisition par celui-ci […]* » (cité par CE 13 sept. 2021, n° 443914,
  via actu-juridique.fr ; texte Légifrance).
- BOFiP **BOI-RPPM-PVBMI-20-10-10-10** : « *le prix de cession s'entend du prix proprement dit
  et des charges qui peuvent s'y ajouter […] le prix de cession est diminué du montant des frais
  et taxes acquittés par le cédant à l'occasion de la cession* » ; frais = « *les commissions de
  négociation, les courtages et les commissions acquittées par le cédant* ».
- BOFiP **BOI-RPPM-PVBMI-20-10-20-10** (prix d'acquisition + frais) : « *les rémunérations
  d'intermédiaires, les honoraires d'expert, les courtages, les commissions de négociation, de
  souscription, d'attribution ou de service de règlement différé (SRD) et les impôts supportés
  […] lors de l'acquisition […] ainsi que, le cas échéant, les frais d'actes* ».
- **Formulaire 2074 (millésime 2026), cadre 5, lignes 512-524** (impots.gouv.fr) — la mécanique
  ligne à ligne, qui est notre modèle de calcul :

| Ligne | Libellé | Opération |
|------:|---------|-----------|
| 514 | Valeur unitaire de cession | |
| 515 | Nombre de titres cédés | |
| 516 | Montant global | `= 514 × 515` |
| 517 | Frais de cession | `−` |
| **518** | **Prix de cession net** | `= 516 − 517` |
| 521 | Prix d'acquisition global | |
| 522 | Frais d'acquisition | `+` |
| **523** | **Prix de revient** | `= 521 + 522` |
| **524** | **Résultat** (signe + ou −) | `= 518 − 523` |

---

## 2. Prix moyen pondéré — PMP (CGI art. 150-0 D, 3)

**Règle.** Pour une **série de titres de même nature** acquis à des prix différents, le prix
d'acquisition à retenir est la **valeur moyenne pondérée d'acquisition** :

```
PMP unitaire = (Σ coûts d'acquisition de tous les lots, frais inclus) / (quantité totale détenue)
```

- Les **frais d'acquisition de chaque lot entrent dans le coût** avant le calcul du PMP.
- Une **cession partielle** prélève `PMP × quantité cédée` et **laisse le PMP inchangé** sur le
  reliquat (le coût moyen ne « bouge » qu'à un nouvel achat).

**Source (vérifiée 3-0) :** CGI 150-0 D, 3 + BOFiP : « *lorsque […] une série de titres de même
nature acquis pour des prix différents, le prix d'acquisition à retenir est la valeur moyenne
pondérée d'acquisition* ». Exemple arithmétique confirmé :
`[(100×95) + (200×105) + (100×107)] / 400 = 41 200 / 400 = 103 €`.

---

## 3. Conversion de change — par opération (CE 13 sept. 2021, n° 443914)

**Règle.** Pour des opérations libellées en **devise étrangère**, on convertit en euros
**chaque prix au taux de change de SA PROPRE date** : le prix d'acquisition au cours du **jour
d'acquisition**, le prix de cession au cours du **jour de cession**. On **n'applique pas** un
taux unique à l'écart en devises ; le **gain/perte de change est une composante** de la
plus/moins-value imposable (art. 150-0 A).

> Conséquence directe : le PMP se calcule **après** conversion lot par lot (chaque lot à son
> cours d'acquisition). C'est exactement ce que fait le module `tax-engine/fx/`
> (`convertirEnEuros(cents, devise, dateISO)` → centimes EUR au **cours BCE du jour**, repli
> dernier jour ouvré).

**Source (vérifiée 3-0) :** CE 13 sept. 2021, n° 443914 : « *Il y a lieu de déterminer les prix
effectifs d'acquisition et de cession […] en euros, le cas échéant en convertissant […] sur la
base des taux de change applicables respectivement à la date d'acquisition ou de cession, les
prix qui ont été réglés au moment de ces opérations en devises* » ; et « *les gains ou pertes de
change […] constituent une composante des gains nets ou moins-values réalisés* ».

> **Point TRANCHÉ (recherche juin 2026) — la source du cours n'est pas imposée.** Le CE n° 443914
> impose le **moment** (cours du **jour de l'opération**, prix par prix) mais **aucune source de
> cours** : ni le CE, ni le BOFiP (**BOI-RPPM-PVBMI-20-10-10-10 §20** : « taux applicable à la date
> de l'opération », sans qualifier la source), ni la notice 2074 ne désignent un organisme
> obligatoire (BCE, Banque de France, courtier). Le seul critère réel est la **cohérence et la
> justifiabilité** (même méthode achat/vente, cours documentable). → Le **cours de référence BCE du
> jour** retenu par le module (repli dernier jour ouvré) est **conforme et le choix le plus
> défendable** (référence publique, vérifiable, cohérente avec le 2047). Seul écart possible : le
> **cours d'exécution du relevé courtier** (qui inclut la marge de change du courtier) diffère
> légèrement — l'un comme l'autre est admis, aucun n'est obligatoire. Confirmé par 2 commentaires
> doctrinaux (Banque Transatlantique, Deloitte) + DGFiP (taux du jour ou moyen annuel admis, si
> cohérent).

---

## 4. Régime d'imposition par défaut & cases 2042

**Règle.** Depuis le **1ᵉʳ janvier 2018**, les plus-values de cession de valeurs mobilières sont
imposées **de plein droit** (par défaut) au **PFU** : impôt sur le revenu au taux forfaitaire de
**12,8 %** (+ prélèvements sociaux 17,2 % = 30 % au global), **sans abattement**.

- Le module calcule l'**assiette** (résultat net, cases) — **pas l'impôt final** (12,8 % / 30 %
  appliqués par l'administration), comme le module 2047 produit des cases et non l'impôt dû.
- **Cases 2042 / 2042-C :**
  - **3VG** = **plus-value nette imposable** de l'année (après imputation des moins-values).
  - **3VH** = **moins-value de l'année non imputée** (la perte nette créée cette année,
    reportable 10 ans). cf. §6.
- **Rôle des formulaires :** la fiche **2074-CMV** / le **2074** déterminent le résultat par
  cession (cadre 5) et l'imputation (cadre 11) ; les totaux sont **reportés en 3VG / 3VH** sur la
  2042.

**Sources (vérifiées 3-0) :** « *Vos plus-values de cession […] réalisées depuis le 1er janvier
2018 sont soumises de plein droit à l'impôt sur le revenu au taux forfaitaire de 12,8 %* »
(fiche DGFiP 2074-CMV ; impots.gouv.fr). Cadre 11 du 2074 : col. A = PV avant abattement,
col. E nette → **3VG** ; « *Moins-values de l'année non imputées […] = case 3VH* ».

---

## 5. Abattement pour durée de détention — **CAS SECONDAIRE, flaggé** (CGI 150-0 D, 1 ter)

> ⚠️ **Secondaire / optionnel.** Ne s'active **jamais** par défaut (le défaut est le PFU sans
> abattement). N'a d'effet que si **les DEUX** conditions sont réunies.

**Règle.** L'abattement proportionnel pour durée de détention s'applique **uniquement** :
1. aux titres **acquis ou souscrits AVANT le 1ᵉʳ janvier 2018**, **et**
2. **sur option globale** pour le **barème progressif** de l'IR (case **2OP** cochée — option
   globale et irrévocable après la date limite de déclaration).

**Taux (abattement de droit commun) :**

| Durée de détention | Abattement |
|---|---|
| ≥ 2 ans et < 8 ans | **50 %** |
| ≥ 8 ans | **65 %** |

> Il existe un **abattement renforcé** (jusqu'à **85 %**, PME de moins de 10 ans, conditions
> strictes) — **non implémenté** ici (hors périmètre v0), mentionné pour mémoire.

- **Sous PFU (défaut) : aucun abattement.** Titres acquis **depuis le 1.1.2018 : exclus** de
  l'abattement, quel que soit le régime.
- L'imputation des moins-values se fait **avant** abattement (§6, « montant brut sur montant
  brut »).

**Sources (vérifiées 3-0) :** fiche 2074-CMV + BOFiP **BOI-RPPM-PVBMI-20-20-20-10** : « *50 % […]
détenus depuis au moins 2 ans et moins de 8 ans […] 65 % […] au moins 8 ans* » ; « *l'imposition
selon le barème progressif permet l'application des abattements […] sur les titres acquis ou
souscrits avant le 1er janvier 2018* » ; « *plus-values de cession de titres acquis […] après le
1.1.2018 […] exclues du champ d'application des abattements* ».

> **Limite assumée (documentée) :** le module applique l'abattement **par cession** (taux fonction
> de la durée de détention de la ligne). L'interaction fine **abattement × imputation de
> moins-values sur un portefeuille à durées mixtes** sous barème (mécanique cadre 3 / 2074-ABT)
> n'est **pas** modélisée dans la partie gratuite — c'est un coin d'un chemin déjà secondaire, qui
> relève de l'outillage pluriannuel (payant). Marqué **« à vérifier »** pour toute extension.

---

## 6. Imputation et report des moins-values (CGI art. 150-0 D, 11)

**Règle.**
- Les **moins-values** s'imputent **exclusivement** sur les **plus-values de même nature**
  réalisées la **même année** ou les **dix années suivantes**.
- L'imputation est **obligatoire et plafonnée aux plus-values** : on réduit les plus-values de la
  **totalité** des moins-values disponibles **dans la limite de ces plus-values**. Le contribuable
  **ne peut pas** choisir de conserver une partie des moins-values de l'année pour plus tard.
- Imputation **montant brut sur montant brut** (= **avant** abattement durée de détention).
- **Ordre retenu (mécanique cadre 11 du 2074) :** (1) imputer les **moins-values de l'année**
  (col. B), puis (2) imputer les **moins-values antérieures** (col. D) sur le reliquat.
- **3VH = moins-value de l'ANNÉE non imputée uniquement** (`ligne 1163 = ligne 946 − ligne 1162`).
  Le **reliquat de moins-values ANTÉRIEURES** non utilisé **n'apparaît PAS en 3VH** : il reste
  suivi dans le stock de report (suivi pluriannuel = payant ; ici seul le **montant restant** est
  affiché).
- Reliquat reportable : **10 années suivantes**.

**Sources (vérifiées 3-0) :** « *Les moins-values subies au cours d'une année sont imputables
exclusivement sur les plus-values de même nature […] de la même année, ou des dix années
suivantes […] Vous ne pouvez pas choisir de conserver une partie des moins-values de l'année* » ;
« *l'imputation […] est effectuée montant brut sur montant brut, c'est-à-dire avant application
[…] de l'abattement* » (BOFiP **BOI-RPPM-PVBMI-20-10-40**) ; « *le reliquat de moins-values non
imputé est reporté et imputé dans les mêmes conditions au titre des dix années suivantes* » ;
« *Reportez le total des moins-values […] case 3VH. Cette moins-value globale réalisée en 2025
pourra s'imputer […] des 10 années suivantes* » (fiche 2074-CMV).

---

## 6bis. Aller-retour « vente puis rachat » & absence de wash-sale (licéité de la purge)

> **Question :** est-il licite de vendre des titres à perte pour réaliser une moins-value, puis de
> **racheter les mêmes titres aussitôt** (« purge » / *tax-loss harvesting* de fin d'année) ?
> Sert d'oracle au garde-fou du simulateur d'arbitrage (levier L1, `GARDE_FOUS_PURGE_MV`).

**Conclusion (tranchée, vérifiée multi-sources) : OUI, c'est licite sur un compte-titres ordinaire.**

- **Pas de règle « wash-sale » en droit français.** À la différence des États-Unis (IRS : moins-value
  neutralisée en cas de rachat sous 30 jours), la France — comme la quasi-totalité des pays européens —
  **n'a aucune disposition équivalente**. **Aucun délai minimum** entre la vente et le rachat n'est
  imposé. La presse financière et les banques recommandent ouvertement de réaliser ses pertes avant le
  31/12 (ex. LCL, Zonebourse).
- **Réaliser et imputer une moins-value est l'usage *prévu* par le législateur** (CGI art. **150-0 D, 11**,
  §6 ci-dessus) : ce n'est pas un détournement de la loi.
- **L'abus de droit (LPF art. L64, et « mini-abus » L64 A depuis le 1ᵉʳ janv. 2020) ne mord pas** sur un
  aller-retour **réel** : ses deux branches supposent soit un **acte fictif / artificiel** (or une vraie
  cession de marché transfère réellement la propriété au prix de marché → non fictive), soit un bénéfice
  **contraire à l'intention du législateur** (or imputer une moins-value est l'usage voulu du régime).

**Seule limite = la réalité de l'opération.** Le risque réapparaît uniquement si la transaction n'est
**pas réelle** : vente à **soi-même** ou à une **personne/société liée**, **croisement d'ordres**
organisé, **prix hors marché**, opération sans réel transfert ni exposition au marché → la moins-value
peut alors être écartée (acte fictif). *Distinct :* il existe une règle anti-abus sur les moins-values,
mais **uniquement entre entreprises liées** (BIC/IS) — **sans objet** pour le particulier sur un CTO.
*Hors périmètre :* le **PEA** a ses propres règles (moins-values utilisables seulement à la clôture).

**Sources (vérifiées) :** LPF art. **L64** (BOFiP **BOI-CF-IOR-30-10**) et **L64 A** (BOFiP
**BOI-CF-IOR-30-20**) — deux branches : acte fictif / but exclusivement (L64) ou principalement (L64 A)
fiscal contraire à l'objectif du législateur ; CGI art. **150-0 D, 11** (régime d'imputation/report,
BOFiP **BOI-RPPM-PVBMI-20-10-40**) ; absence de wash-sale FR / pratique de la purge avant le 31/12
(LCL « fiscalité des plus-values sur compte-titres » ; Zonebourse « ne laissez pas vos moins-values se
perdre »). Recherche web juin 2026.

**Opportunité ≠ licéité — limite du modèle.** *Licite* ne veut pas dire *toujours avantageux*.
Réaliser une moins-value latente n'a d'intérêt **immédiat** que s'il existe une **plus-value de l'année**
(même nature) à effacer ; sinon elle ne crée qu'un **report** (valeur-temps moindre, **expire à 10 ans**,
même nature). Surtout, si l'investisseur **rachète** les titres (aller-retour pour garder la position),
le rachat se fait au **prix de marché courant** → le **PMP baisse** → la **plus-value imposable future
augmente** d'autant : la purge **décale** l'impôt, elle ne le supprime pas (sauf usage de la perte contre
une PV de l'année, ou conservation jusqu'à la **transmission**, qui purge la PV latente au décès).
**Le module L1 ne chiffre que l'année en cours** : il ne modélise ni cet **effet de base différé** (PMP
abaissé), ni les **frais de courtage**. C'est l'objet d'un garde-fou neutre (`GARDE_FOUS_PURGE_MV`),
non d'un calcul.

---

## 7. Conventions de calcul du module (implémentation)

- **Argent en centimes d'euro entiers** ; arrondi à l'euro **seulement en sortie** (valeurs des
  cases), via `arrondiEuro` (réutilisé du `tax-engine` : `trunc((cents+50)/100)`). Règle d'or
  identique au 2047 : jamais de flottant qui traîne dans un résultat stocké.
- **FX par opération** via `tax-engine/fx` : un montant en **centimes de la devise** est converti
  au cours BCE du jour de l'opération (repli dernier jour ouvré).
- **PMP** : on conserve le **coût total** (centimes EUR, lots déjà convertis) et la quantité ;
  pour une cession de `q` titres sur `Q` détenus, le coût d'acquisition alloué
  `= round(coûtTotal × q / Q)` (entier de centimes). Le PMP unitaire reste inchangé sur le
  reliquat.
- **Sortie** : résultat par cession (signe), totaux PV/MV de l'année, imputation, **3VG**, **3VH**,
  et **moins-value reportable restante** (année + antérieures, montant affiché — non persisté).
- **Garde-fous** : **PEA exclu** (le module refuse / ne traite pas un compte PEA) ; FX obligatoire
  si devise ≠ EUR ; cas ambigus jamais tranchés à tort.
- **Hors module (payant) :** import historique/OST, cerfa pré-rempli, persistance pluriannuelle
  du report. **Hors v0 :** produits dérivés/options, apport-cession 150-0 B ter, abattement
  renforcé PME, crypto (→ module 2086).

---

## 8. Cas-types (entrées → sorties attendues, **calculés à la main**)

> Tous en compte-titres ordinaire, courtier étranger, revenus 2025 (millésime 2026). Montants
> internes en centimes ; cases en euros (`arrondiEuro`). Les valeurs sont **gelées dans
> `compute.test.ts`**. Cours USD = valeurs **réelles** du fichier BCE embarqué (`ecb-rates.json`).

### Cas A — Vente simple post-2018, EUR, PFU (plus-value)
- Acquisition 2024-01-02 : 100 titres @ 50,00 € + 10,00 € de frais → prix de revient **5 010,00 €**.
- Cession 2025-09-15 : 100 titres @ 80,00 € − 12,00 € de frais → prix de cession net **7 988,00 €**.
- **Résultat = 7 988,00 − 5 010,00 = +2 978,00 €.** → **3VG = 2 978 €**, 3VH = 0, reportable 0.

### Cas B — Plusieurs lots → PMP → cession partielle, EUR
- Lots : 100 @ 95,00 € (2023-06-15) ; 200 @ 105,00 € (2024-01-02) ; 100 @ 107,00 € (2024-09-16),
  frais nuls → coût total **41 200,00 €** sur **400 titres** → **PMP = 103,00 €/titre**.
- Cession 2025-09-15 : **250** titres @ 120,00 € (frais nuls) → cession nette **30 000,00 €**.
- Coût alloué = 103,00 × 250 = **25 750,00 €** → **Résultat = +4 250,00 €.** → **3VG = 4 250 €**.
- Reliquat : **150 titres**, PMP **inchangé** à 103,00 €.

### Cas C — Cession en USD, change **par opération** (le FX modifie le résultat EUR)
- Acquisition 2023-06-15 (USD/EUR BCE = **1,0819**) : 100 titres @ 100,00 USD + 20,00 USD frais
  = 10 020,00 USD → **9 261,48 €** (`1 002 000 c / 1,0819`).
- Cession 2025-09-15 (USD/EUR BCE = **1,1766**) : 100 titres @ 130,00 USD − 25,00 USD frais
  = 12 975,00 USD → **11 027,54 €** (`1 297 500 c / 1,1766`).
- **Résultat = 11 027,54 − 9 261,48 = +1 766,06 €** → **3VG = 1 766 €**. (Le dollar s'est affaibli
  → l'écart en USD de +2 955 USD se réduit en euros : le change est bien une composante du gain.)

### Cas D — Moins-value de l'année imputée, reliquat reporté (3VH)
- Cession 1 (EUR) : revient 5 000 € → cession nette 8 000 € → **+3 000,00 €**.
- Cession 2 (EUR) : revient 12 000 € → cession nette 7 000 € → **−5 000,00 €**.
- PV année = 3 000 ; MV année = 5 000. Imputation : 3 000 − 5 000 → PV imposable **0**, MV année
  non imputée **2 000,00 €**. → **3VG = 0**, **3VH = 2 000 €**, **reportable = 2 000 €** (10 ans).

### Cas E — Moins-value **antérieure** imputée ; reliquat antérieur **NON** porté en 3VH
- Année : 1 cession, **+6 000,00 €** de plus-value ; **aucune** MV de l'année.
- Stock de MV antérieure (saisie manuelle) : **8 000,00 €** (origine 2022).
- Imputation antérieure : min(6 000, 8 000) = 6 000 → PV imposable **0**.
- → **3VG = 0** ; **3VH = 0** (pas de MV *de l'année*) ; **MV antérieure restante = 2 000 €**
  (toujours reportable, **pas** en 3VH — point de correction clé).

### Cas F — Abattement durée de détention, titres pré-2018, **option barème 2OP** (secondaire)
- Acquisition 2014-03-10 (avant 2018) ; cession 2025-06-02 : 100 titres, revient 4 000 €,
  cession nette 10 000 € → gain **brut 6 000,00 €**. Détention ≥ 8 ans → **abattement 65 %**.
- **Sous PFU (défaut) : pas d'abattement → 3VG = 6 000 €.**
- **Sous barème (2OP) : 6 000 × (1 − 0,65) = 2 100,00 € → 3VG = 2 100 €.**

### Cas F′ — Variante tranche 50 % (≥ 2 et < 8 ans, pré-2018 + barème)
- Acquisition 2017-12-15 ; cession 2025-06-02 → détention 7 ans (≥ 2 et < 8) → **abattement 50 %**.
- Gain brut 6 000 € → barème : 6 000 × 0,50 = **3 000 €**. (PFU : 6 000 €.)

---

## 9. Caveats / points « à vérifier »
- **Millésime :** structure du 2074 millésime 2026 + fiche 2074-CMV (la fiche échantillonnée était
  le millésime 2024/revenus 2023, mais la mécanique cadre 5/cadre 11 est stable). Re-vérifier les
  **numéros de lignes** à chaque nouveau millésime.
- **Cours de change :** TRANCHÉ (cf. §3) — le CE impose le cours du **jour de l'opération**, mais
  **aucune source** n'est imposée (BOFiP BOI-RPPM-PVBMI-20-10-10-10 §20). Le **cours BCE du jour**
  retenu par le module est conforme ; seul écart possible = le cours d'exécution du relevé courtier,
  toléré sans être obligatoire. Plus un point « à vérifier ».
- **Abattement × imputation portefeuille mixte sous barème :** non modélisé (cf. §5).
- **Prélèvements sociaux / impôt final :** hors module (on produit l'assiette et les cases).
- **OST (splits, fusions, spin-offs), dérivés, apport-cession, abattement renforcé PME, PEA,
  crypto :** hors périmètre.
