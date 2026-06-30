# Sources & décision fiscale — levier L4 « arbitrage PEA / CTO »

> Validation effectuée le **2026-06-30** (recherche multi-sources + vérification croisée)
> contre sources **gouvernementales et primaires** : impots.gouv.fr, economie.gouv.fr,
> service-public.gouv.fr, BOFiP (BOI-RPPM-RCM-40-50), CGI / Code monétaire et financier.
> Toute valeur ou règle non confirmée par une source primaire est marquée `⚠️ à vérifier`
> ici **et** signalée dans les garde-fous du moteur (`GARDE_FOUS_PEA_CTO`).
>
> **VALIDATION-D'ABORD (méthode  )** : ce levier introduit un **sous-moteur fiscal
> neuf** (la part PEA, non encore modélisée dans le repo). On a donc **établi et gelé l'oracle
> chiffré AVANT d'écrire le calcul** ( ci-dessous → tests `compute.test.ts`).
>
> Périmètre : **Périmètre** (frontière périmètre). Comparatif **neutre A vs B** (mode A,
> §X ) : on **décrit** le coût fiscal de loger/sortir un titre en PEA vs en CTO
> selon l'horizon de détention. **Aucune recommandation** (« recommandé / optimisez / vous
> devriez / meilleure stratégie » bannis ; vocabulaire : simuler / estimer / comparer).

## 0. Ce que le module calcule (et ce qu'il ne calcule PAS)

**Calcule :** pour une **plus-value latente** donnée (gain net depuis l'ouverture/l'acquisition),
le **coût fiscal de sortie** sous trois angles d'horizon, et le **différentiel** entre :

- **Scénario A — sortie en CTO** (compte-titres ordinaire) **maintenant** : plus-value mobilière
  de droit commun, imposée via le moteur `pfu-bareme` (PFU 30 %/31,4 % ou option barème) ;
- **Scénario B — sortie en PEA**, selon que le retrait intervient **avant 5 ans** (clôture +
  imposition du gain net : IR au PFU/barème **+ PS**) ou **après 5 ans** (**exonération d'IR**,
  **PS seuls dus**).

Le sous-moteur `pea/` calcule **uniquement la part PEA** (exo IR après 5 ans, PS dus avant comme
après). C'est le **seul** calcul fiscal neuf de ce levier. Pour le CTO **et** pour l'IR de la part
PEA avant 5 ans, on **compose** `pfu-bareme.compareRegimes` — on ne recalcule jamais l'IR/PS du CTO
soi-même.

**Ne calcule PAS :**
- l'impôt complet du foyer (décote, plafonnement du quotient familial : cf. limites de `pfu-bareme`) ;
- le **rendement** ou la performance d'un placement (ce n'est pas un comparateur d'investissement) ;
- le cas du **« taux historique »** des PEA ouverts **avant 2018** (cf. §6 — `⚠️ hors périmètre`) ;
- les **dividendes encaissés dans le PEA** (capitalisés en franchise tant que le plan vit) : le
  module raisonne sur le **gain net de sortie**, pas sur les flux annuels.

## 1. Sources consultées

- **impots.gouv.fr — « J'ai un Plan d'épargne en actions (PEA), les retraits sont-ils
  imposables ? »** : retrait avant 5 ans = PFU 31,4 % (12,8 % IR + 18,6 % PS) ; après 5 ans = exo
  IR, **PS 18,6 % dus**. <https://www.impots.gouv.fr/particulier/questions/jai-un-plan-depargne-en-actions-pea-les-retraits-sont-ils-imposables>
- **economie.gouv.fr — « Qu'est-ce que le plan d'épargne en actions (PEA) ? »** : plafond de
  versements **150 000 €**, titres éligibles. <https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/quest-ce-que-le-plan-depargne-en-actions-pea>
- **BOFiP BOI-RPPM-RCM-40-50** (régime fiscal du PEA, v. 30/07/2024) — retrait avant 5 ans =
  **clôture** + imposition du **gain net réalisé depuis l'ouverture** dans les conditions des
  plus-values de cession de valeurs mobilières ; après 5 ans, les retraits partiels ne ferment
  pas le plan. <https://bofip.impots.gouv.fr/bofip/3786-PGP.html/identifiant=BOI-RPPM-RCM-40-50-20240730>
- **BOFiP BOI-RPPM-RCM-40-50-20-20** — modalités de fonctionnement / gestion du PEA (plafond,
  éligibilité). <https://bofip.impots.gouv.fr/bofip/1556-PGP.html/identifiant=BOI-RPPM-RCM-40-50-20-20-20240730>
- **CGI art. 157, 5° bis** — **exonération d'impôt sur le revenu** des produits et plus-values du
  PEA, sous condition de durée de détention (≥ 5 ans en l'état du droit).
- **Code monétaire et financier, art. L221-30 à L221-32** (PEA) et **L221-31** (titres éligibles :
  sociétés ayant leur siège dans l'**UE / EEE** avec convention d'assistance administrative ;
  OPCVM/ETF investis à ≥ 75 % en actions UE/EEE). <https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006170310/>
- **CSS art. L136-6** (CSG sur les revenus du patrimoine) — fait générateur des PS du PEA = **retrait**.
- **Entreprendre.Service-Public (A18796)** (déjà retenu pour `pfu-bareme`) : PS du capital portés
  à **18,6 %** au 1ᵉʳ janvier 2026 (12,8 % IR + 18,6 % PS = PFU **31,4 %**). Le PEA suit la même
  hausse de CSG. <https://entreprendre.service-public.gouv.fr/actualites/A18796>
- **lesclesdelabanque.com / lafinancepourtous.com / moneyvox.fr** (sources secondaires de
  contrôle) — confirment : PEA ouvert **depuis 2018** → gain net soumis **intégralement** aux PS
  **au taux en vigueur à la date du retrait** (pas de couches « taux historiques »).

## 2. LA décision structurante : le PEA croise le seuil des 5 ans

| Évènement de sortie | Impôt sur le revenu | Prélèvements sociaux | Effet sur le plan |
|---|---|---|---|
| **Retrait / clôture AVANT 5 ans** | **dû** — gain net imposé comme une plus-value mobilière : **PFU 12,8 %** (ou option **barème**) | **dus** — 17,2 % (2025) / **18,6 %** (2026) | **clôture** du plan (sauf exceptions) |
| **Retrait APRÈS 5 ans** | **exonéré** (CGI 157, 5° bis) | **dus** — 17,2 % (2025) / **18,6 %** (2026) | retrait **partiel** ne ferme pas le plan |
| **Sortie en CTO (référence)** | **dû** — plus-value mobilière, PFU/barème (moteur `pfu-bareme`) | **dus** — 17,2 % (placement 2025) / **18,6 %** (patrimoine) | sans objet |

### Citations

**impots.gouv.fr (retraits PEA) :**
> « Avant 5 ans : les gains sont soumis à un impôt appelé Prélèvement Forfaitaire Unique » (12,8 %
> IR + 18,6 % PS = 31,4 %, sauf option pour le barème).
> « Après 5 ans : vos gains ne sont pas soumis à l'impôt sur le revenu, mais vous restez redevable
> des prélèvements sociaux. »

**BOFiP BOI-RPPM-RCM-40-50 :**
> « Le retrait ou rachat entraînant la clôture du plan avant l'expiration de la cinquième année [...]
> le gain net réalisé depuis l'ouverture du plan est soumis à l'impôt sur le revenu et aux
> prélèvements sociaux dans les conditions prévues pour les plus-values de cession de valeurs
> mobilières. »
> « Après l'expiration de la cinquième année [...] les retraits partiels [...] n'entraînent pas la
> clôture du plan. »

→ **Conséquence de modélisation.** La part PEA (`pea/`) calcule **les PS** elle-même (assiette =
gain net, taux du millésime) ; pour **l'IR** elle **compose** `pfu-bareme` : 0 € après 5 ans
(exonéré), et l'IR d'une plus-value mobilière avant 5 ans. Le CTO compose intégralement `pfu-bareme`.

## 3. Prélèvements sociaux du PEA — assiette, taux, fait générateur

- **Assiette** : **gain net total réalisé depuis l'ouverture** du plan (différence entre la valeur
  liquidative au retrait et le total des versements), au prorata pour un retrait partiel. Dans le
  module, l'utilisateur saisit directement la **plus-value latente / gain net** concerné par la
  sortie → c'est l'assiette PS **et** l'assiette IR (avant 5 ans).
- **Taux** : ensemble des PS du capital = **17,2 % (millésime 2025)** / **18,6 % (millésime 2026)**.
  Repris à l'identique de `pfu-bareme.PARAMETRES[millesime]` — **on ne duplique pas le taux**, on le
  lit dans le moteur déjà sous test (catégorie « patrimoine », cf. SOURCES-PFU-BAREME §2bis).
- **Fait générateur** : le **retrait** (CSS L136-6, recouvrement par voie de rôle). Les PS ne sont
  **pas** prélevés tant que le plan vit et capitalise.
- **Pas d'abattement** : ni l'abattement de 40 % (réservé aux dividendes au barème), ni l'abattement
  pour durée de détention (titres acquis avant 2018, CTO uniquement) ne s'appliquent au PEA. La base
  PS = 100 % du gain net.

> ⚠️ **« Taux historique » — `à vérifier`, hors périmètre v0.** Pour un PEA **ouvert avant le
> 1ᵉʳ janvier 2018**, la fraction de gain **acquise avant 2018** peut rester soumise aux PS aux
> **taux historiques** (par couches), tandis que la fraction acquise à compter de 2018 suit le taux
> en vigueur au retrait. Mécanisme complexe (date d'ouverture × millésime des gains), litigieux
> (obligation des intermédiaires financiers), **non modélisé**. Le module suppose un **taux unique
> au retrait** (cas des PEA ouverts depuis 2018, ou approximation conservatrice). Signalé dans
> `GARDE_FOUS_PEA_CTO`. Source : Deloitte Société d'Avocats / L'Agefi (juin 2026).

## 4. CTO — réutilisation du moteur `pfu-bareme` (aucun recalcul propre)

La sortie en CTO d'un titre est une **plus-value mobilière de droit commun**. Le module **compose**
`pfu-bareme.compareRegimes({ plusValuesCents })` :

- **PFU** : IR 12,8 % + PS (catégorie patrimoine : **18,6 % dès 2025**, fait générateur différencié
  §2bis de SOURCES-PFU-BAREME) ;
- **barème** (option 2OP) : IR à la TMI + PS, avec, le cas échéant, l'abattement durée de détention
  (titres pré-2018) et la CSG déductible — **gérés par `pfu-bareme`**, pas ici.

> **Note de cohérence des PS, point vérifié.** Côté **CTO**, la plus-value mobilière est un
> **revenu du patrimoine** → PS **18,6 % dès le millésime 2025** (rétroactivité §2bis SOURCES-PFU-BAREME).
> Côté **PEA**, le millésime 2025 reste à **17,2 %** (la hausse CSG ne frappe le PEA qu'au
> **1ᵉʳ janvier 2026**, fait générateur au retrait, pas de rétroactivité 2025). → Le moteur applique
> **`psPatrimoine` (via `pfu-bareme`) pour le CTO** et **le taux PEA propre du millésime** pour la
> part PEA. Pour 2025 : CTO 18,6 %, PEA 17,2 % ; pour 2026 : les deux à 18,6 %.

## 5. Plafond de versements & éligibilité — garde-fous (signalés, jamais tranchés à la place de l'utilisateur)

- **Plafond de versements : 150 000 €** (PEA classique ; 225 000 € cumulé avec un PEA-PME).
  C'est un plafond de **versements**, pas de **valorisation** : le plan peut dépasser 150 000 € par
  capitalisation. Signalé comme garde-fou ; le module ne vérifie pas le plafond (saisie libre).
- **Éligibilité des titres (UE/EEE)** : seules les actions de sociétés ayant leur siège dans l'**UE
  ou l'EEE** (convention d'assistance administrative), et les OPCVM/ETF investis à ≥ 75 % en telles
  actions, sont **éligibles** au PEA. **Un titre non éligible ne peut tout simplement pas être logé
  en PEA** — le comparatif PEA n'a alors **pas d'objet**. C'est un garde-fou **conditionnant tout**
  le levier (signalé en premier).
- **Retrait avant 5 ans = clôture + imposition** : conséquence structurante à rappeler (un retrait
  anticipé n'est pas neutre, il ferme le plan).

## 6. Garde-fous & hypothèses v0 (= `GARDE_FOUS_PEA_CTO`, texte neutre mode A)

1. **Éligibilité UE/EEE conditionne tout** : un titre non éligible au PEA (hors UE/EEE, ou OPCVM/ETF
   < 75 % actions UE/EEE) ne peut pas y être logé — la comparaison PEA n'a alors pas d'objet
   (C. mon. fin. art. L221-31).
2. **Plafond de versements 150 000 €** (225 000 € avec un PEA-PME) : plafond de versements, pas de
   valorisation. Le module ne le contrôle pas.
3. **Retrait avant 5 ans = clôture du plan + imposition** du gain net depuis l'ouverture (IR au
   PFU/barème + PS) : un retrait anticipé n'est pas neutre.
4. **« Taux historique » des PEA ouverts avant 2018** non modélisé (`à vérifier`) : le module
   suppose un taux de PS unique au retrait (cas des PEA ouverts depuis 2018).
5. **Hors périmètre** : dividendes capitalisés dans le plan, frais de courtage/garde, rendement du
   placement, exceptions de déblocage anticipé sans clôture (création d'entreprise, décès, etc.).
6. **Aide informative, pas un conseil** : comparatif chiffré de scénarios, ni conseil fiscal ni
   conseil en investissement.

## 7. Mécanique de calcul retenue par le moteur

Soit, pour un millésime donné, la **plus-value latente de sortie** `PV` (gain net, centimes ≥ 0),
le **taux PS PEA** `tPS_pea` (17,2 % en 2025, 18,6 % en 2026, lu via `pfu-bareme.PARAMETRES`),
les paramètres d'imposition `imposition` (régime, TMI/parts, millésime).

**Part CTO (scénario A — composition pure `pfu-bareme`) :**
- `cto = compareRegimes({ millesime, tmiBp/parts, plusValuesCents: PV })`
- `coutCto = (régime PFU) cto.pfu.totalEur*100 | (barème) cto.bareme.totalEur*100`

**Part PEA (scénario B — sous-moteur `pea/`) :**
- **PS PEA** : `psPea = round(PV × tPS_pea)` *(taux du millésime, base = gain net entier)*
- **IR PEA**, selon l'horizon :
  - **≥ 5 ans** : `irPea = 0` *(exonéré, CGI 157 5° bis)*
  - **< 5 ans** : `irPea = part IR de compareRegimes({ plusValuesCents: PV })`
    = `cto.<regime>.irEur*100` *(même IR qu'une plus-value mobilière en CTO)*
- `coutPea = irPea + psPea`

> **Pourquoi décomposer IR / PS au lieu de réutiliser `compareRegimes` en bloc pour le PEA ?**
> Parce que le PEA et le CTO **divergent sur le taux de PS au millésime 2025** (PEA 17,2 %, CTO
> 18,6 %) **et** sur l'IR après 5 ans (PEA exonéré). Réutiliser `compareRegimes.totalEur` pour le
> PEA appliquerait le PS « patrimoine » (18,6 % dès 2025) et l'IR — ce qui serait faux dans les deux
> cas. On **emprunte donc à `pfu-bareme` uniquement la composante IR** (`irEur`, identique au CTO
> avant 5 ans, déjà sous test) et on **calcule la composante PS PEA** dans le sous-moteur neuf.

**Différentiel exposé :** `deltaImpotEtPsCents = coutPea − coutCto` (signé, centimes). Négatif = la
sortie en PEA allège l'imposition par rapport au CTO ; positif = elle l'alourdit. Présenté tel quel,
sans interprétation normative (mode A).

## 8. Oracle de test (GELÉ dans `compute.test.ts` — établi AVANT le code)

Cas-types vérifiés à la main. Convention : `PV` = gain net de sortie ; PFU IR = 12,8 % ; barème IR
à la TMI ; PS CTO (patrimoine) = **18,6 % dès 2025** ; PS PEA = **17,2 % (2025)** / **18,6 % (2026)**.

| # | Entrée | CTO (réf.) | PEA < 5 ans | PEA ≥ 5 ans | Vérification |
|---|--------|-----------|-------------|-------------|--------------|
| **O1** | PV 10 000 €, **PFU 2025** | IR 1 280 + PS 1 860 = **3 140 €** | IR 1 280 + PS **1 720** (17,2 %) = **3 000 €** | IR **0** + PS 1 720 = **1 720 €** | PEA ≥ 5 ans − CTO = **−1 420 €** |
| **O2** | PV 10 000 €, **PFU 2026** | IR 1 280 + PS 1 860 = **3 140 €** | IR 1 280 + PS 1 860 (18,6 %) = **3 140 €** | IR 0 + PS **1 860** = **1 860 €** | 2026 : PS PEA = PS CTO ; < 5 ans ≡ CTO |
| **O3** | PV 10 000 €, **barème TMI 30 % 2025** | IR 2 796 + PS 1 860 = **4 656 €** | IR 2 796 + PS 1 720 = **4 516 €** | IR 0 + PS 1 720 = **1 720 €** | barème : IR = 30 %×10 000 − 30 %×680 (CSG déd.) = 2 796 |
| **O4** | PV 50 000 €, **PFU 2026** | IR 6 400 + PS 9 300 = **15 700 €** | IR 6 400 + PS 9 300 = **15 700 €** | IR 0 + PS **9 300** = **9 300 €** | PS = 18,6 %×50 000 = 9 300 ; PEA ≥ 5 ans − CTO = **−6 400 €** |
| **O5** | PV **0 €** | 0 | 0 | 0 | tous les coûts = 0 (bornes) |

Détails de calcul vérifiés à la main :

- **O1 (PFU 2025)** — CTO : 12,8 %×10 000 = 1 280 (IR) ; PS patrimoine 18,6 %×10 000 = 1 860 → 3 140.
  PEA < 5 ans : même IR 1 280 ; **PS PEA 17,2 %**×10 000 = **1 720** → 3 000. PEA ≥ 5 ans : IR exonéré
  0 ; PS 1 720 → **1 720**. Différentiel PEA≥5 − CTO = 1 720 − 3 140 = **−1 420**.
- **O2 (PFU 2026)** — PS partout 18,6 % : CTO et PEA < 5 ans identiques (3 140) ; PEA ≥ 5 ans = PS
  seuls 1 860.
- **O3 (barème 30 % 2025)** — IR barème = 30 %×10 000 − 30 %×(6,8 %×10 000) = 3 000 − 204 = **2 796**
  (CSG déductible, via `pfu-bareme`). CTO PS 18,6 % = 1 860 → 4 656 ; PEA < 5 ans PS 17,2 % = 1 720
  → 4 516 ; PEA ≥ 5 ans = 1 720.
- **O4 (PFU 2026, 50 k€)** — IR 12,8 %×50 000 = 6 400 ; PS 18,6 %×50 000 = 9 300. PEA ≥ 5 ans = 9 300.
- **O5** — assiette nulle → 0 partout.

Bornes de cohérence gelées : `psPea = tPS_pea × PV` ; `irPea(≥5 ans) = 0` ; `irPea(<5 ans) = irCto` ;
`coutPea(<5 ans) − coutCto = psPea − psCto` (différence de **PS seule**, 0 € en 2026) ; `PV=0 → tout 0`.
