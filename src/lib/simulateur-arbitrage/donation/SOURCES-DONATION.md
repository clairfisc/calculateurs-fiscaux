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
> expose un **avertissement abus de droit non contournable**. Principe : valider avant de déployer.
>
> **Méthode (« valider avant déployer ») :** oracle établi par recherche multi-sources, **vérifié à
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

**Fondement précis (correction G10, audit du 19/09/2026).** La page/le code attribuaient parfois la
**non-imposition** de la plus-value au moment de la donation à l'art. **150-0 D, 1** ; c'est inexact
dans la lettre : c'est l'art. **150-0 A** qui **définit le champ** des plus-values imposables (les
**cessions à titre onéreux**) — la donation, mutation à titre gratuit, en est **hors champ**, d'où
l'absence d'imposition. L'art. **150-0 D, 1** intervient à l'**étape suivante** : il fixe la **base de
revient du donataire** en cas de revente ultérieure (valeur retenue pour les droits de mutation à
titre gratuit). Corrigé dans `compute.ts`, `types.ts` et la page.

### 1.1 Hors périmètre (G4) — ce qui N'EST PAS purgé par la donation

La purge de plus-value décrite ci-dessus vaut pour des **actions ordinaires détenues en pleine
propriété sur un compte-titres ordinaire (CTO)**. Elle **ne s'applique pas** à :

- **Actions gratuites** : la donation des actions gratuites **déclenche l'imposition du gain
  d'acquisition chez le DONATEUR**, au titre de l'année de la donation — un impôt **sans trésorerie**
  en face, puisque les titres sont donnés et non vendus. Sources : **CGI art. 80 quaterdecies** ;
  BOFiP **BOI-RSA-ES-20-20-20**, §§ 150 et 185.
- **Titres issus de BSPCE** : le prix d'acquisition retenu pour le calcul d'une plus-value ultérieure
  reste le **prix d'exercice** des bons, quel que soit le mode de transmission. Source : BOFiP
  **BOI-RPPM-PVBMI-20-10-20-30**, § 250.
- **Titres retirés d'un PEA**. Source : BOFiP **BOI-RPPM-PVBMI-20-10-20-30**, § 190. (Le PEA est de
  toute façon hors périmètre de ce levier, cf. encadré en tête de document.)
- **Titres placés en report d'imposition (CGI art. 150-0 B ter)** : en cas de donation par le titulaire
  du report, celui-ci est **transféré au donataire** si ce dernier **contrôle la société** bénéficiaire
  de l'apport, sous un **délai de conservation** des titres reçus par le donataire de **6 ans**, porté
  à **11 ans** dans certains cas (délais 5/10 ans portés à 6/11 par la **loi n° 2026-103 du
  19 février 2026, art. 11**, en vigueur le 21/02/2026). ⚠️ **Point d'application non tranché** : la
  clause d'entrée en vigueur (art. 11, III) vise « les cessions de titres apportés réalisées à
  compter du lendemain de la publication », **pas** la date de la donation (contrairement à la LF 2020) ;
  l'application aux donations antérieures au 21/02/2026 devra être confirmée par le BOFiP. Source :
  **CGI art. 150-0 B ter** (LEGIARTI000053542872).

Ce périmètre est reflété dans `GARDE_FOUS_DONATION` (dernier garde-fou) et dans un encadré dédié sur la
page.

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

### 2.2 Barème **entre époux et partenaires de PACS**

Tarif **propre**, distinct de la ligne directe (§2.1) à partir de la 2ᵉ tranche : les bornes
intermédiaires sont 15 932 € puis 31 865 € (au lieu de 12 109 € puis 15 932 €) ; les tranches hautes
(552 324 / 902 838 / 1 805 677 €) sont, elles, identiques aux deux tableaux.

| Fraction taxable (après abattement 80 724 €) | Taux |
|---|---|
| ≤ 8 072 € | 5 % |
| 8 072 → 15 932 € | 10 % |
| 15 932 → 31 865 € | 15 % |
| 31 865 → 552 324 € | 20 % |
| 552 324 → 902 838 € | 30 % |
| 902 838 → 1 805 677 € | 40 % |
| > 1 805 677 € | 45 % |

Source : **CGI art. 777**, tableau II. **Vérifié à la main** le 19/09/2026 sur deux sources
indépendantes : Légifrance (article consolidé, LEGIARTI000030061736,
https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000030061736) et service-public.gouv.fr
(fiche F14203, https://www.service-public.gouv.fr/particuliers/vosdroits/F14203) — bornes 30/40/45 %
identiques sur les deux sources.

> **Correction (audit du 19/09/2026).** Le moteur appliquait auparavant, par erreur, le barème
> **ligne directe** (§2.1) au lien conjoint/PACS — commentaire du code faux inclus. Corrigé :
> `compute.ts` route désormais le lien `conjoint-pacs` sur `BAREME_CONJOINT_PACS` (ce tableau II).
> Non-régression figée en test (`compute.test.ts`, cas h et h-bis) : 100 000 € taxables → 17 207 €.

### 2.3 Barème **entre frères et sœurs**

| Fraction taxable (après abattement 15 932 €) | Taux |
|---|---|
| ≤ 24 430 € | 35 % |
| > 24 430 € | 45 % |

Source : **CGI art. 777**, tableau III. (Corrigé le 19/09/2026 : cette page indiquait par erreur
« tableau II » ; les frères et sœurs relèvent du **tableau III**, aux côtés des taux proportionnels
ci-dessous §2.4.)

### 2.4 Taux **proportionnels** (autres liens)

- **Neveux / nièces** (et parents jusqu'au 4ᵉ degré) : **55 %** sur la part taxable.
- **Au-delà du 4ᵉ degré et non-parents / tiers / concubin** : **60 %**.

Source : **CGI art. 777**, tableau III. (impots.gouv.fr — F14203 / service-public.)

### 2.5 Abattements (CGI art. 779, 790 B–D, 790 E–F) — **se renouvellent tous les 15 ans**

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

### 2.6 Rappel fiscal des donations antérieures de **moins de 15 ans** (CGI art. 784)

**Règle.** Les donations consenties **depuis moins de 15 ans** entre les mêmes personnes **s'ajoutent**
pour le calcul de l'abattement **et** pour la progressivité du barème : l'abattement est **réputé déjà
consommé** à hauteur des donations antérieures, et les **tranches basses du barème** sont réputées déjà
utilisées (« rappel fiscal », **CGI art. 784, al. 2**). Au-delà de 15 ans, l'antériorité est purgée.

**Modélisation retenue (conservatrice, sourcée).** On expose un champ **« donations antérieures
< 15 ans (même donateur → même donataire) »** qui **réduit d'autant l'abattement disponible**. Le
rappel sur la **progressivité du barème** (réutilisation des tranches basses, CGI art. 784, al. 2) est,
en toute rigueur, plus complexe ; le moteur l'**approxime** en appliquant le barème à la part taxable
**du seul don courant** une fois l'abattement résiduel imputé. Ce point est marqué **« à vérifier »** :
pour un rappel important, les premiers euros taxables peuvent relever d'une tranche supérieure. Source :
**CGI art. 784**.

**Donations jamais enregistrées.** Indépendamment des 15 ans, une donation qui n'a **jamais été
déclarée** à l'administration reste rappelable **quelle que soit son ancienneté** — le délai de 15 ans
ne court qu'à compter de l'enregistrement ou de la déclaration du don. Source : notice
**n° 2735-NOT-SD**, cadre VI (« Rappel des donations antérieures »). Non chiffré par le moteur (aucun
champ ne distingue don déclaré / non déclaré) : marqué **« à vérifier »**, affiché en clair dans les
garde-fous et sur la page.

### 2.7 Don manuel — date de valorisation, tarif et abattements applicables (CGI art. 757)

**Règle.** Pour un **don manuel** révélé ou déclaré à l'administration, les droits sont liquidés sur la
valeur des biens **au jour de la déclaration** — sauf si leur valeur au jour du don était **supérieure**,
auquel cas c'est cette dernière qui est retenue. Le **tarif** et les **abattements** applicables sont,
eux, ceux **en vigueur au jour de la déclaration** (et non ceux du jour du don, s'ils diffèrent).
Source : **CGI art. 757**. Non modélisé par le moteur (qui ne prend qu'**une** valeur, sans distinguer
jour du don / jour de la déclaration) : point informatif affiché sur la page, marqué **« à vérifier au
cas par cas »** en présence d'un écart de valeur ou de millésime entre don et déclaration.

---

## 3. ABUS DE DROIT « donation-cession » — garde-fou central (LPF art. L64 ; CGI art. 150-0 A)

**Règle / jurisprudence.** La donation **avant** cession est **licite dans son principe** : le
contribuable peut **transmettre les titres puis les laisser céder** par le donataire plutôt que vendre
lui-même puis donner le prix (**CE, 30 déc. 2011, Motte-Sauvaige, n° 330940**). Le critère déterminant
est la **réalité** de la donation : un **dépouillement actuel et irrévocable** du donateur
(**art. 894 du code civil**) et une **antériorité opposable** de la donation sur le transfert de
propriété des titres. Cf. **CE, 30 déc. 2011, n° 330940** (précité) et **CE, 19 nov. 2014, n° 370564**.

**Deux voies de redressement, aux conséquences différentes** — audit du 19/09/2026, à distinguer sur
la page (précédemment amalgamées sous « abus de droit ») :

- **(a) La cession était déjà parfaite AVANT la donation** — le donateur était encore juridiquement
  propriétaire des titres au fait générateur de la vente (la donation porte alors, en réalité, sur le
  **prix**, non sur les titres). L'administration procède alors à une **rectification de droit
  commun** : la plus-value est réimposée chez le donateur **sans** passer par les garanties propres à
  la procédure d'abus de droit (pas de saisine du **comité de l'abus de droit fiscal**).
- **(b) La donation est réelle et antérieure, mais le donateur se réapproprie le prix** de cession,
  directement ou indirectement (absence de dépouillement). L'administration peut alors invoquer
  l'**abus de droit** (LPF art. L64), par sa **branche « fictivité »** uniquement (la donation est
  réputée fictive, l'opération requalifiée dans son ensemble). Cf. **CE, 9e-10e SSR, 9 avr. 2014,
  n° 353822** (dépouillement immédiat et irrévocable en donation-cession) ; jurisprudence constante
  (118ᵉ Congrès des notaires, 2022).

**Conséquence si requalification (les deux voies) :** la **purge de la plus-value est anéantie** — la
plus-value latente **redevient imposable** chez le donateur (comme s'il avait vendu), **en plus** des
droits de donation. **En cas d'abus de droit (voie b)** s'ajoutent une **majoration de 80 %** des
droits éludés, ramenée à **40 %** si le contribuable n'établit pas avoir eu l'initiative principale du
ou des actes constitutifs de l'abus de droit ou en être le principal bénéficiaire (**CGI art. 1729,
b**), ainsi que l'**intérêt de retard** (**CGI art. 1727**).

**Antériorité opposable — date certaine (G5).** Pour être opposable à l'administration, l'antériorité
de la donation doit reposer sur une **date certaine** : l'enregistrement ou la déclaration du don. Pour
un **don manuel**, cette date certaine résulte de la **déclaration** du don via le formulaire
**n° 2735** (« Déclaration de dons manuels et de sommes d'argent »). Attention au point de départ du
délai : la déclaration est à souscrire dans le **mois qui suit la révélation du don à
l'administration** (CGI art. 635 A), pas dans le mois du don lui-même — mais en donation-cession,
c'est la déclaration qui crée la date certaine : la prudence commande donc de déclarer **sans
attendre**, avant la cession. La démarche est possible **en ligne** (impots.gouv.fr, espace
particulier). Source : notice **n° 2735-NOT-SD** (« dans le délai d'un mois qui suit la date à
laquelle le donataire a révélé le don à l'administration »).

**Le don manuel de titres est valable sans notaire (G6).** Contrairement à une idée reçue, une donation
n'est **pas nécessairement un acte notarié** : le **don manuel** — remise directe des titres, via
virement de compte à compte — est un mode de donation **valable sans notaire**, formalisé par la
déclaration n° 2735 (cadre « Titres de sociétés »). Le passage par un **acte notarié** reste, dans ce
contexte, une garantie utile de **date certaine** et de sécurisation de la preuve, mais n'est **pas une
obligation légale** pour ce type de don ; c'est une précaution, pas un énoncé de droit. Sources : notice
n° 2735-NOT-SD ; formulaire Cerfa n° 2735.

> **Correction (audit du 19/09/2026).** La page et le composant affirmaient à tort, en 2 endroits (page
> `donner-ou-vendre-des-actions.astro`, composant `SimulateurDonation.tsx`), qu'« une donation est un
> acte notarié » — présenté comme un fait de droit. Un 3ᵉ endroit (garde-fou `GARDE_FOUS_DONATION[0]`,
> `types.ts`) affirmait de même que la mise en œuvre « relève d'un notaire », sans nuance. Les trois
> ont été reformulés : le don manuel est valable sans notaire ; le recours à un notaire reste une
> précaution conseillée, non une obligation.

**Garde-fou produit (mode A, non contournable) :** ce levier **ne présente jamais** la donation comme
une stratégie d'optimisation. L'avertissement abus de droit est **affiché dans le calcul (gardeFous) et
dans la page**, en clair : la donation doit être **réelle, antérieure et irrévocable**, sans
réappropriation du prix.

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
