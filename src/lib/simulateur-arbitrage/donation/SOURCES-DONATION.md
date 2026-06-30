# SOURCES-DONATION — Oracle fiscal du levier **L5 « donation avant cession »** (simulateur d'arbitrage)

> **Périmètre :** comparatif **neutre A vs B** entre, d'une part, **vendre des titres puis donner le
> net** (la plus-value est taxée chez le cédant) et, d'autre part, **donner les titres appréciés** (la
> plus-value latente n'est **pas** imposée à la donation ; le donataire prend pour prix de revient la
> **valeur vénale au jour de la donation** ; restent dus les **droits de donation**). **Millésime de
> perception 2025 (déclaration 2026) et 2026.** Compte-titres ordinaire ; PEA, assurance-vie,
> démembrement/quasi-usufruit et holding **hors périmètre**.
>
> **RISQUE MODE A LE PLUS ÉLEVÉ** (frontière conseil patrimonial + **abus de droit donation-cession**).
> Ce levier **ne présente JAMAIS un montage comme avantageux** : il chiffre deux scénarios décrits et
> expose un **avertissement abus de droit non contournable**. cf. réf. §X (L5) et  (valider
> avant déployer).
>
> **Méthode ( « valider avant déployer ») :** oracle établi par recherche multi-sources, **vérifié à
> la main**, figé en tests (`compute.test.ts`). Seul calcul fiscal **neuf** autorisé : les **droits de
> donation** (barème + abattement). L'imposition de la plus-value du scénario « vendre puis donner »
> est **composée** des moteurs déjà sous test (`cessions-2074`, `pfu-bareme`). Tout point non tranché
> par les sources est marqué **« à vérifier »**.

---

## 1. Purge de la plus-value latente par la donation (CGI art. 150-0 A, 150-0 D, 1)

**Règle.** La **donation** (mutation à titre gratuit) **n'est pas une cession à titre onéreux** : elle
**ne déclenche aucune imposition de la plus-value latente** au titre de l'art. 150-0 A. La plus-value
accumulée entre l'acquisition par le donateur et le jour de la donation est **purgée fiscalement** pour
la fraction transmise. Le **donataire** prend alors pour **prix de revient** la **valeur retenue pour la
détermination des droits de mutation à titre gratuit** — en pratique la **valeur vénale (cours ou valeur
réelle) au jour de la donation**. S'il revend ensuite, sa plus-value se calcule **à partir de cette
nouvelle base**, et non du prix d'acquisition d'origine du donateur.

**Conséquence chiffrée.** Sur les titres **donnés** : aucune PV de cession n'est due par le donateur ;
si le donataire revend **immédiatement** au cours du jour de la donation, sa propre plus-value est
**≈ 0** (prix de cession ≈ valeur de la donation = son prix de revient).

**Sources (texte de loi + doctrine) :**

- **CGI art. 150-0 D, 1** : le gain net est la différence entre le prix de cession et « *leur prix
  effectif d'acquisition par celui-ci ou, en cas d'acquisition à titre gratuit, leur valeur retenue
  pour la détermination des droits de mutation à titre gratuit* ».
- **BOFiP BOI-RPPM-PVBMI-20-10-20-30** (§ « Prix d'acquisition à titre gratuit », maj 20/12/2019),
  **verbatim** : « *Lorsque les valeurs mobilières et les droits sociaux ont été acquis par le
  contribuable par voie de mutation à titre gratuit (succession, donation simple ou donation-partage),
  le second terme de la différence est constitué par la valeur retenue pour la détermination des droits
  de mutation à titre gratuit (en pratique, il s'agit, le plus souvent, du cours ou de la valeur réelle
  du titre au jour de la mutation à titre gratuit). La circonstance que le déclarant bénéficie d'une
  exonération ou d'un abattement de droits de mutation à titre gratuit est, à cet égard, sans
  incidence.* »
  → Point capital : la **base de revient du donataire est la valeur vénale entière**, **même si** la
  donation a bénéficié d'un abattement (ex. 100 000 €) ou d'une exonération : l'abattement réduit les
  **droits de donation**, **pas** le prix de revient.

---

## 2. Droits de donation — barème et abattements (CGI art. 777, 779, 784, 790 G)

### 2.1 Barème progressif en **ligne directe** (parent → enfant / enfant → parent), inchangé depuis 2011

Appliqué à la part **taxable** = valeur transmise **après** abattement.

| Fraction taxable (après abattement) | Taux |
|---|---|
| ≤ 8 072 € | 5 % |
| 8 072 → 12 109 € | 10 % |
| 12 109 → 15 932 € | 15 % |
| 15 932 → 552 324 € | 20 % |
| 552 324 → 902 838 € | 30 % |
| 902 838 → 1 805 677 € | 40 % |
| > 1 805 677 € | 45 % |

Source : **CGI art. 777**, tableau I (tarif en ligne directe). Barème repris par impots.gouv.fr,
service-public.gouv.fr (F14203), toutsurmesfinances, corrigetonimpot (millésimes 2025/2026).

### 2.2 Barème **entre frères et sœurs**

| Fraction taxable (après abattement 15 932 €) | Taux |
|---|---|
| ≤ 24 430 € | 35 % |
| > 24 430 € | 45 % |

Source : **CGI art. 777**, tableau II.

### 2.3 Taux **proportionnels** (autres liens)

- **Neveux / nièces** (et parents jusqu'au 4ᵉ degré) : **55 %** sur la part taxable.
- **Au-delà du 4ᵉ degré et non-parents / tiers / concubin** : **60 %**.

Source : **CGI art. 777**, tableau III. (impots.gouv.fr — F14203 / service-public.)

### 2.4 Abattements (CGI art. 779, 790 B–D, 790 E–F) — **se renouvellent tous les 15 ans**

| Bénéficiaire | Abattement | Source |
|---|---|---|
| **Enfant** (chaque parent → chaque enfant) | **100 000 €** | **CGI art. 779, I** |
| Petit-enfant | 31 865 € | CGI art. 790 B |
| Arrière-petit-enfant | 5 310 € | CGI art. 790 D |
| Frère / sœur | 15 932 € | CGI art. 779, IV |
| Neveu / nièce | 7 967 € | CGI art. 779, V |
| Conjoint / partenaire PACS (donation) | 80 724 € | CGI art. 790 E / 790 F |
| Personne handicapée (cumulable, tout lien) | 159 325 € | CGI art. 779, II |
| Tiers / sans lien | 0 € (aucun) | — |

> **NB.** L'abattement enfant de 100 000 € est **par parent et par enfant**, et **rechargeable tous les
> 15 ans** (CGI art. 784). Il existe en sus un don **familial de sommes d'argent** de 31 865 €
> (CGI art. 790 G) **réservé aux espèces** : **hors périmètre** ici (on transmet des **titres**, pas des
> espèces) — marqué **« à vérifier au cas par cas »** dans l'UI, non chiffré.

### 2.5 Rappel fiscal des donations antérieures de **moins de 15 ans** (CGI art. 784)

**Règle.** Les donations consenties **depuis moins de 15 ans** entre les mêmes personnes **s'ajoutent**
pour le calcul de l'abattement **et** pour la progressivité du barème : l'abattement est **réputé déjà
consommé** à hauteur des donations antérieures, et les **tranches basses du barème** sont réputées déjà
utilisées (« rappel fiscal »). Au-delà de 15 ans, l'antériorité est purgée.

**Modélisation retenue (conservatrice, sourcée).** On expose un champ **« donations antérieures
< 15 ans (même donateur → même donataire) »** qui **réduit d'autant l'abattement disponible**. Le
rappel sur la **progressivité du barème** (réutilisation des tranches basses) est, en toute rigueur,
plus complexe ; le moteur l'**approxime** en appliquant le barème à la part taxable **du seul don
courant** une fois l'abattement résiduel imputé. Ce point est marqué **« à vérifier »** : pour un
rappel important, les premiers euros taxables peuvent relever d'une tranche supérieure. Source :
**CGI art. 784**.

---

## 3. ABUS DE DROIT « donation-cession » — garde-fou central (LPF art. L64 ; CGI art. 150-0 A)

**Règle / jurisprudence.** La donation **avant** cession est **licite dans son principe** : le
contribuable peut **transmettre les titres puis les laisser céder** par le donataire plutôt que vendre
lui-même puis donner le prix (**CE, 30 déc. 2011, Motte-Sauvaige, n° 330940**). **MAIS** l'opération est
**requalifiable en abus de droit** (LPF art. L64, et art. L64 A « principalement fiscal ») lorsque :

- la **cession était déjà convenue / parfaite AVANT la donation** (la donation porte alors en réalité
  **sur le prix**, non sur les titres), **ou**
- le **donateur se réapproprie le prix** de cession, directement ou indirectement
  (réappropriation des fonds). Cf. **CE, 9 avr. 2014, n° 23872** ; **CE, 5 févr. 2018** ; jurisprudence
  constante (118ᵉ Congrès des notaires, 2022).

**Conséquence si requalification :** la **purge de la plus-value est anéantie** — la plus-value latente
**redevient imposable** chez le donateur (comme s'il avait vendu), **en plus** des droits de donation
et de **pénalités** (majoration pour abus de droit, intérêts de retard).

**Garde-fou produit (mode A, non contournable) :** ce levier **ne présente jamais** la donation comme
une stratégie d'optimisation. L'avertissement abus de droit est **affiché dans le calcul (gardeFous) et
dans la page**, en clair : la donation doit être **réelle, antérieure et irrévocable**, sans
réappropriation du prix ; la mise en œuvre relève d'un **notaire / conseil patrimonial**, hors de cette
simulation.

---

## 4. Cas-types chiffrés vérifiés à la main (oracle gelé en tests)

Hypothèses communes : titres cotés, **PFU 2025** pour la PV, donataire **enfant** sauf mention contraire.

> **Convention PV PFU (composée, non recalculée ici) :** sur une plus-value nette `PV`, impôt + PS PFU
> = **31,4 % × PV** en 2025 (12,8 % IR + **18,6 % PS**, fait générateur PS différencié). Vérifié via
> `compareRegimes` (même base que l'oracle purge-mv : 10 000 € de 3VG → 3 140 €).

### Cas (a) — Enfant, valeur 200 000 €, prix de revient 50 000 € (PV latente 150 000 €), pas de don antérieur

- **Scénario A « vendre puis donner le net »** :
  - PV de cession = 200 000 − 50 000 = **150 000 €** → impôt PV (PFU) = 31,4 % × 150 000 = **47 100 €**.
    Net disponible donné = 200 000 − 47 100 = **152 900 €**.
  - Droits de donation sur 152 900 € (enfant) : taxable = 152 900 − 100 000 = **52 900 €**.
    Barème ligne directe : 5 %×8 072 + 10 %×(12 109−8 072) + 15 %×(15 932−12 109) + 20 %×(52 900−15 932)
    = 403,60 + 403,70 + 573,45 + 7 393,60 = **8 774,35 € → 8 774 €**.
  - **Coût fiscal total A = 47 100 + 8 774 = 55 874 €.**
- **Scénario B « donner les titres appréciés »** :
  - PV latente **purgée** : 0 € d'impôt PV. Le donataire reçoit une base de revient de 200 000 €.
  - Droits sur **200 000 €** : taxable = 200 000 − 100 000 = **100 000 €**.
    Barème : 403,60 + 403,70 + 573,45 + 20 %×(100 000−15 932)=16 813,60 = **18 194,35 € → 18 194 €**.
  - **Coût fiscal total B = 0 + 18 194 = 18 194 €.**
- **Δ (B − A) = 18 194 − 55 874 = −37 680 €** (B coûte 37 680 € de moins, **mais** purge conditionnée à
  l'absence d'abus de droit — affiché, non recommandé).

> Note : en A, l'assiette des droits de donation est **plus petite** (on donne le **net d'impôt PV**),
> ce qui illustre que la donation porte sur des montants différents dans les deux scénarios.

### Cas (b) — Enfant, valeur 80 000 €, PV latente 80 000 € (revient 0), pas de don antérieur

- **A** : PV = 80 000 → impôt PV = 31,4 % × 80 000 = **25 120 €**. Net donné = 54 880 €.
  Droits : 54 880 − 100 000 < 0 → taxable 0 → **0 € de droits**. **Total A = 25 120 €.**
- **B** : PV purgée = 0. Droits sur 80 000 : 80 000 − 100 000 < 0 → **0 € de droits**. **Total B = 0 €.**
- **Δ = −25 120 €.** (Donation sous l'abattement : aucun droit dans les deux cas ; tout l'écart vient de
  la purge de la PV.)

### Cas (c) — Enfant, valeur 200 000 €, PV latente 150 000 €, **donation antérieure 60 000 € il y a 5 ans**

- Abattement résiduel = 100 000 − 60 000 = **40 000 €**.
- **A** : impôt PV = 47 100 € ; net donné 152 900 €. Taxable droits = 152 900 − 40 000 = **112 900 €**.
  Barème : 403,60 + 403,70 + 573,45 + 20 %×(112 900−15 932)=19 393,60 → total **20 774,35 → 20 774 €**.
  **Total A = 47 100 + 20 774 = 67 874 €.**
- **B** : PV purgée = 0. Taxable droits = 200 000 − 40 000 = **160 000 €**.
  Barème : 403,60 + 403,70 + 573,45 + 20 %×(160 000−15 932)=28 813,60 → **30 194,35 → 30 194 €**.
  **Total B = 0 + 30 194 = 30 194 €.**
- **Δ = 30 194 − 67 874 = −37 680 €.**

### Cas (d) — **Frère/sœur**, valeur 100 000 €, PV latente 40 000 € (revient 60 000 €), pas de don antérieur

- Abattement frère/sœur = **15 932 €**.
- **A** : impôt PV = 31,4 % × 40 000 = **12 560 €** ; net donné = 87 440 €.
  Taxable = 87 440 − 15 932 = **71 508 €**. Barème frère/sœur : 35 %×24 430 + 45 %×(71 508−24 430)
  = 8 550,50 + 21 185,10 = **29 735,60 → 29 736 €**. **Total A = 12 560 + 29 736 = 42 296 €.**
- **B** : PV purgée = 0. Taxable = 100 000 − 15 932 = **84 068 €**.
  35 %×24 430 + 45 %×(84 068−24 430) = 8 550,50 + 26 837,10 = **35 387,60 → 35 388 €**.
  **Total B = 0 + 35 388 = 35 388 €.**
- **Δ = 35 388 − 42 296 = −6 908 €.**

### Cas (e) — **Tiers** (aucun abattement, 60 %), valeur 50 000 €, PV latente 50 000 €

- **A** : impôt PV = 31,4 % × 50 000 = **15 700 €** ; net donné = 34 300 €. Droits = 60 % × 34 300 =
  **20 580 €**. **Total A = 36 280 €.**
- **B** : PV purgée = 0. Droits = 60 % × 50 000 = **30 000 €**. **Total B = 30 000 €.**
- **Δ = −6 280 €.**

> Dans tous les cas, **Δ négatif n'est PAS une recommandation** : il suppose une **donation réelle,
> antérieure et sans réappropriation du prix**. À défaut → **abus de droit**, la PV redevient imposable
> **plus** pénalités (cf. §3). Mode A : on chiffre, on **avertit**, on ne conseille pas.

---

## 5. Points marqués « à vérifier » (non tranchés / hors périmètre)

- **Rappel fiscal sur la progressivité du barème** (CGI 784) : le moteur réduit l'**abattement** mais
  approxime la réutilisation des **tranches basses**. Pour un rappel important → faire vérifier.
- **Démembrement / quasi-usufruit** (donation de la nue-propriété, réserve d'usufruit, art. 669 CGI) :
  **hors périmètre** — modifie l'assiette des droits et la base de revient.
- **Don familial de sommes d'argent** (CGI 790 G, 31 865 €) : réservé aux **espèces**, non applicable à
  une donation de **titres**.
- **Frais de notaire** de l'acte de donation : non chiffrés (l'UI le signale).
- **Plus-value du donataire à la revente** si la cession n'est **pas** immédiate (le cours a bougé entre
  donation et revente) : non chiffrée ; on retient l'hypothèse d'une revente au cours de la donation.
