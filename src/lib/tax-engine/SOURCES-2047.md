# Sources & décision fiscale — moteur crédit d'impôt 2047

> Vérification effectuée le 2026-06-22 contre les sources **officielles** (formulaire +
> notice 2047 rev. 2025, BOFiP). Toute valeur non confirmée par une source est marquée
> `⚠️ à vérifier` dans `rates.ts`.
>
> ✅ **Re-validation indépendante le 2026-06-25** (recherche multi-sources + vérification
> adversariale 3 votes). **Les 10 taux pays de `rates.ts` correspondent verbatim à la notice
> 2047-NOT 2026** (`2047_5490.pdf`), et la mécanique `205 = 203×204`, `207 = min(205,206)`
> est confirmée mot pour mot. Oracle gelé en tests (`compute.test.ts`, describe « oracle taux
> notice »). Voir §6 pour 8VL/8PL et les caveats datés.

## 1. Sources consultées

- **Formulaire 2047 (rev. 2025, revenus 2025, N°11226\*28)** — cadre 2, lignes 200-208 et 230-238.
  <https://www.impots.gouv.fr/sites/default/files/formulaires/2047/2026/2047_5488.pdf>
- **Notice 2047-NOT (rev. 2025, N°50545\*28)** — « TAUX APPLICABLES AUX REVENUS NETS DE
  L'IMPÔT PRÉLEVÉ À LA SOURCE » + table des taux par pays.
  <https://www.impots.gouv.fr/sites/default/files/formulaires/2047/2026/2047_5490.pdf>
- **BOFiP BOI-INT-DG-20-20-100** — élimination de la double imposition (méthode du crédit
  d'impôt égal à l'impôt étranger, plafonné au taux conventionnel).
  <https://bofip.impots.gouv.fr/bofip/4877-PGP.html>

## 2. LA décision : base NET, pas brut × convention (hypothèse de mission INFIRMÉE)

La mission posait l'hypothèse « crédit = `min(taux_conventionnel × BRUT, retenue réelle)` »,
qui donnerait pour DE (brut 1000 €, retenue 26,375 %) un crédit de **150 €**.

**Cette hypothèse est INFIRMÉE par les sources officielles.** Le bon modèle est `net × forfait`.

### Citations littérales

**Formulaire 2047, cadre 2, ligne 200 (texte imprimé) :**

> « Lorsque la convention fiscale prévoit l'élimination de la double imposition par un crédit
> d'impôt égal à l'impôt étranger, indiquez le montant des revenus perçus **(après déduction
> de l'impôt supporté à l'étranger)**, le taux applicable indiqué dans la notice et le montant
> de l'impôt supporté à l'étranger. Le crédit d'impôt à retenir est égal au montant de l'impôt
> supporté à l'étranger **sauf lorsque le produit du montant net du revenu par le taux applicable
> est inférieur. Dans ce cas, il convient de retenir ce dernier montant** (suivre lignes 203 à
> 208 ou 233 à 238). »

Détail des lignes du formulaire :
- **203** = « Montant **net** encaissé » (après retenue étrangère)
- **204** = « Taux applicable » (celui de la notice)
- **205** = « Résultat » = 203 × 204
- **206** = « Impôt supporté à l'étranger »
- **207** = « Crédit d'impôt retenu », avec l'instruction imprimée :
  > « si ligne 205 < ligne 206, retenir la ligne 205 ; si ligne 206 < ligne 205, retenir la ligne 206. »
  → soit **207 = min(205, 206)**.

**Notice 2047-NOT, en-tête de la table des taux :**

> « **TAUX APPLICABLES AUX REVENUS NETS DE L'IMPÔT PRÉLEVÉ À LA SOURCE** »

> « Les taux par pays fournis à titre indicatif dans cette notice sont ceux communément
> applicables **au montant net des dividendes ou intérêts, c'est-à-dire après déduction de
> l'impôt payé à l'étranger**. »

> « Sauf mention contraire, le crédit d'impôt imputable en France est égal à l'impôt
> effectivement supporté à l'étranger, sous réserve que celui-ci n'excède pas le taux
> applicable aux revenus mentionnés ci-après, et dans la limite de l'impôt français afférent
> à ces mêmes revenus. »

### Pourquoi 17,6 % et pas 15 %

Le taux notice est un **forfait sur le NET** équivalent à 15 % du brut **quand la retenue
étrangère = 15 %** : `15 / (100 − 15) = 15 / 85 = 17,647 % ≈ 17,6 %`. La notice a déjà
fait cette conversion ; on applique donc directement le forfait au net déclaré. Il ne faut
**pas** reconstruire le brut ni appliquer 15 % au brut.

### Le cas DE 26,375 % / CH 35 % — tranché

Quand l'étranger prélève **plus** que la convention, la mécanique form-littérale `min(205, 206)`
gère le cas **sans rien changer** : le forfait notice 17,6 % (calé sur 15 % de la convention)
reste appliqué au net, et il est *inférieur* à l'impôt réellement supporté → on retient 205.

- **DE** : net 736,25 €, impôt 263,75 € → 205 = 736,25 × 17,6 % = 129,58 → **130 €** ;
  206 = 264 € ; 207 = **min(130, 264) = 130 €**. L'excédent (264 − 130 = 134 €) **n'est pas
  récupérable côté FR** : il doit être réclamé à l'Allemagne (taux réduit conventionnel /
  remboursement de la part au-delà de 15 %). → **130 €, et NON 150 €.**
- **CH** : net 650 €, impôt 350 € → 205 = 650 × 17,6 % = 114,40 → **114 €** ;
  206 = 350 € ; 207 = **min(114, 350) = 114 €**. Excédent 236 € non récupérable côté FR
  (réclamable à la Suisse, formulaire 83 / imputation forfaitaire).

> Le forfait sur net 17,6 % n'est **pas** « un raccourci qui casse dès que la retenue dépasse
> 15 % ». C'est le **taux officiel de la ligne 204**, appliqué tel quel au net, par construction
> du formulaire. L'idée « repasser par le brut × taux conventionnel » contredit le texte imprimé.

## 3. Cas particulier du Royaume-Uni (et des pays sans retenue effective)

La notice donne **UK dividendes = 17,6 %** (la convention *autorise* jusqu'à 15 % de retenue à
la source). Mais en pratique le UK ne prélève **aucune** retenue sur les dividendes → ligne 206 = 0
→ 207 = min(205, 0) = **0**. Il n'y a donc aucun crédit, non parce que le forfait serait nul,
mais parce qu'**il n'y a pas de double imposition à éliminer** (rien n'a été retenu à l'étranger).

→ Conséquence de modélisation : `ouvreDroitCredit` ne dépend PAS seulement du pays, mais aussi
de l'existence d'un impôt étranger réellement supporté. Une ligne n'ouvre droit à crédit que si
(a) le pays a un forfait notice > 0 (pas `c/`) **et** (b) un impôt étranger > 0 a été retenu.
La base 8PL (revenus nets ouvrant droit) suit la même condition.

## 4. Table des taux dividendes (notice 2047-NOT rev. 2025) — pays MVP

Tous **sur le NET**, en points de base. `c/` = imposable exclusivement au lieu de résidence
→ aucun crédit (forfait 0).

| Pays | Code | Div. notice | bp | Source |
|------|------|-------------|----|--------|
| États-Unis | US | 17,6 % | 1760 | notice « ÉTATS-UNIS div. 17,6 % » (crédit = impôt US plafonné 15 % brut) |
| Allemagne | DE | 17,6 % | 1760 | notice « ALLEMAGNE div. 17,6 %, int. c/ » |
| Suisse | CH | 17,6 % | 1760 | notice « SUISSE div. 17,6 %, int. c/ » |
| Royaume-Uni | GB | 17,6 % | 1760 | notice « ROYAUME-UNI div. 17,6 %, int. c/ » |
| Irlande | IE | `c/` (0) | 0 | notice « IRLANDE div., int. c/ » → aucun crédit |
| Pays-Bas | NL | 17,6 % | 1760 | notice « PAYS-BAS div. 17,6 %, int. 11,1 % » |
| Espagne | ES | 17,6 % | 1760 | notice « ESPAGNE div. 17,6 %, int. 11,1 % » |
| Italie | IT | 17,6 % | 1760 | notice « ITALIE div. 17,6 %, int. 11,1 % » |
| Canada | CA | 17,6 % | 1760 | notice « CANADA (QUÉBEC COMPRIS) div. 17,6 %, int. 11,1 % » |
| Belgique | BE | 17,6 % | 1760 | notice « BELGIQUE div. 17,6 %, int. 17,6 % » |

Taux **intérêts** (ligne 234), même mécanique, renseignés quand la notice les donne ;
`c/` (DE, CH, GB, IE) = pas de crédit sur intérêts.

## 5. Routage 2042 (report des revenus du cadre 2 du 2047 vers la 2042 / 2042C)

Après calcul du crédit sur le 2047, le **montant BRUT** de chaque revenu (net encaissé +
crédit retenu, voir §5.3) doit être reporté dans la case du 2042 / 2042C correspondant à sa
nature. La notice 2047-NOT rev. 2025 donne le routage de manière littérale, sous le titre
**« N'oubliez pas de reporter le montant de ces revenus sur votre déclaration no 2042 »**.

### 5.1 Source — citations littérales

Le **formulaire 2047 lui-même** (cadre 2, lignes 221 à 224) est la source la plus directe :
le total du cadre 2 (ligne 221) est ventilé en ligne 222 (« dont dividendes éligibles à
l'abattement de 40 % uniquement en cas d'option pour l'imposition au barème » — le formulaire
lui-même ne dit pas « progressif », c'est la notice qui ajoute ce qualificatif, cf. citation
notice ci-dessous — → 2DC), ligne 223 (« dont autres revenus distribués » → 2TS) et ligne 224 (« dont
dividendes imposables des titres non cotés détenus dans le PEA ou le PEA-PME » → 2FU, hors
périmètre du moteur). Cela fonde en dur, sur le texte même du formulaire, la présomption
« par défaut 2DC » pour une action détenue en direct dans un pays UE/convention.

La notice 2047-NOT rev. 2025 (2047_5490.pdf) précise ensuite, ligne par ligne :

> « – **ligne 2DC** les revenus d'actions et parts de sociétés ayant leur siège dans un État
> de l'Union européenne ou dans un État ou territoire ayant conclu avec la France une
> convention en vue d'éviter les doubles impositions contenant une clause d'assistance
> administrative en vue de lutter contre la fraude et l'évasion fiscales. Ces revenus sont
> susceptibles de bénéficier de l'**abattement de 40 %** uniquement en cas d'option globale
> pour l'imposition au barème progressif […] (case 2OP cochée sur la déclaration no 2042) ; »

> « – **ligne 2TS** les autres revenus distribués (notamment les revenus d'actions et parts
> de sociétés ayant leur siège dans un État autre que ceux indiqués ci-dessus, **non
> susceptibles de bénéficier de l'abattement de 40 %**) et les jetons de présence ; »

> « – **ligne 2TR** les intérêts et autres produits de placement à revenu fixe ; »

Le **cadre 260** du 2047 (« revenus de valeurs mobilières émises en France […] encaissés à
l'étranger », p. ex. via un courtier étranger) est régi par la même liste de report : la
notice précise que ce bloc couvre « les revenus **de valeurs et capitaux mobiliers de source
française ou étrangère encaissés hors de France** ». Les dividendes de valeurs **françaises**
encaissés via un courtier étranger suivent donc le même routage → **2DC** (actions/parts de
sociétés UE/à convention).

> Hors périmètre 2047 (à NE PAS router ici) : la notice rappelle que les revenus de valeurs
> mobilières étrangères encaissés **en France** par un dépositaire français, et les revenus
> déjà soumis à **prélèvement libératoire**, sont à porter **directement sur la 2042 sans
> passer par le 2047**. Le moteur ne traite que les revenus encaissés à l'étranger / via
> intermédiaire étranger (périmètre du 2047).

### 5.2 Mapping retenu par le moteur

| Nature du revenu (entrée moteur)                          | Case 2042 | Justification notice |
|-----------------------------------------------------------|-----------|----------------------|
| Dividende, **éligible** abattement 40 % (UE / convention) | **2DC**   | « revenus d'actions et parts de sociétés ayant leur siège dans un État de l'UE… » |
| Dividende, **non éligible** (autres revenus distribués, ETF/fonds distribuants) | **2TS** | « autres revenus distribués […] non susceptibles de bénéficier de l'abattement de 40 % » |
| Intérêt / produit à revenu fixe                           | **2TR**   | « intérêts et autres produits de placement à revenu fixe » |
| Dividende de valeur **française** via courtier étranger (cadre 260) | **2DC** | actions/parts de sociétés ; cadre 260 = valeurs « de source française ou étrangère encaissés hors de France » |

**Défaut & cas incertains :**

- Tous les `Pays` de la table `rates.ts` sont UE ou à convention avec clause d'assistance →
  un dividende y est **par défaut réputé éligible** à l'abattement de 40 % → **2DC**.
- Le routage **2TS** est explicite : l'appelant passe `eligibleAbattement40: false` sur la
  ligne. C'est le cas des « autres revenus distribués » et de certains **ETF/fonds
  distribuants** dont les distributions ne bénéficient pas de l'abattement de 40 %.
- ⚠️ **Cas incertain non tranché dans le moteur** : la qualification fine 2DC vs 2TS d'un fonds
  ou ETF donné dépend de sa nature juridique et des indications de son **IFU** (imprimé fiscal
  unique), pas seulement du pays d'émission. Le moteur ne devine pas : à défaut d'indicateur,
  il route en 2DC (par défaut raisonnable pour un **titre vif** UE/convention) et laisse l'appelant
  forcer 2TS via `eligibleAbattement40: false` plutôt que d'inventer une règle de détection.
- ✅ **Règle sourcée (recherche sept. 2026, plus une hypothèse) : un ETF/fonds distribuant est
  présumé NON éligible.** Un OPC (SICAV/FCP/ETF, y compris UCITS établi dans l'UE/EEE) ne
  transmet l'abattement 40 % **que** s'il pratique le **couponnage** (ventilation des
  distributions par nature/origine, BOI-RPPM-RCM-20-10-30-10 § 560 « à la condition expresse »),
  et **seulement** sur la fraction « dividendes éligibles » indiquée par l'**IFU**. Le mécanisme
  de transparence lui-même est borné à l'**UE/EEE** (BOI-RPPM-RCM-20-10-30-10 § 520) : un fonds établi hors UE/EEE (ex.
  ETF américain) est exclu **en totalité**, couponnage ou non. Sources : CGI 158-3-3° b et
  158-3-4° ; **BOI-RPPM-RCM-20-10-30-10**.
  → Le moteur n'a pas de notion de « type de ligne » (ETF vs titre vif) distincte du pays et de
  `eligibleAbattement40` : il n'existe donc pas de défaut par type de ligne à inverser côté
  calcul. La charge de cette règle est portée par l'**UI** — la case à cocher de
  `LigneFormulaire.tsx` est explicitement libellée pour inviter à la décocher pour « un
  ETF/fonds, une foncière cotée (SIIC, SPPICAV, REIT) ou un jeton de présence ».
- 📋 **Exclusions de l'abattement 40 % → ne JAMAIS router en 2DC** (CGI art. 158-3-2° ; BOFiP
  **BOI-RPPM-RCM-20-10-30-10**) : sociétés/organismes **exonérés d'IS** (SICAV, OPC exonérés) ;
  **SIIC / SPPICAV-OPCI** (fraction de bénéfices exonérés — foncières cotées) ; **sociétés de
  capital-risque** ; **sociétés hors UE sans convention** à clause d'assistance ; **jetons de
  présence** (administrateurs / conseil de surveillance) ; distributions **sans décision régulière**
  d'un organe compétent ; **revenus réputés distribués** (art. 111, 111 bis, 123 bis CGI). Ces cas
  relèvent de **2TS** (ou 2TR pour la part intérêts) — responsabilité de l'appelant.
- ☑️ **Rappel (lien avec §6.3)** : l'abattement 40 % ne joue **que sous barème** (2OP cochée). Au
  PFU, aucune réduction — la distinction 2DC/2TS reste utile pour le report mais n'ouvre pas
  d'abattement.
- Le report 2042 porte sur le **montant BRUT**, pas le net, et il a lieu **même si la ligne
  n'ouvre pas droit à crédit** (forfait `c/` ou retenue nulle) : le revenu reste imposable en
  France. La condition `ouvreDroitCredit` ne concerne que 8VL/8PL.

### 5.3 Le montant reporté est le BRUT, pas le net (correction — sept. 2026)

⚠️ Le moteur reportait auparavant le **net encaissé** (ligne.netEncaisseCents) sur les cases
2DC/2TS/2TR. **C'est faux.** Trois sources convergent sur le brut :

- **Notice 2047-NOT 2026**, « Modalités déclaratives » : « reportez obligatoirement le revenu
  **brut sans déduction de l'impôt étranger** ».
- **Brochure pratique IR 2026**, p. 125 : « montant **brut**, majoré du crédit d'impôt
  conventionnel ». (Correction 19/09/2026 : cette citation était précédemment attribuée à la
  p. 126 — la pagination de ce chapitre de la brochure était décalée de +1 dans nos notes.)
- **Arithmétique du formulaire 2047** : ligne **208** (« Revenus crédit d'impôt inclus total
  lignes 203 + 207 ») = ligne 203 (net) + ligne 207 (crédit **retenu**, pas le 205 théorique).

Le moteur (`calculeDeclaration`, `compute.ts`) reporte donc désormais `netEncaisseCents` (203)
**+ `ligne207Eur`** (207, le crédit effectivement retenu après plafonnement) sur la case
2042 concernée — pas `ligne205Eur` (205, le crédit théorique avant plafonnement).

❓ **Divergence non tranchée (surprélèvement étranger)** : quand la retenue étrangère dépasse
le taux conventionnel (Allemagne 26,375 %, Suisse 35 %), la notice (« brut sans déduction de
l'impôt étranger », qui suggère de reconstituer le vrai brut économique) et l'arithmétique du
formulaire (208 = 203 + 207, où 207 est plafonné au taux conventionnel, donc inférieur à la
retenue réelle) ne donnent pas le même montant. Le moteur applique la règle arithmétique du
formulaire (203 + 207) faute de trancher entre les deux lectures — **volontairement non
arbitré** (recherche sourcée sept. 2026).

⚠️ **Cas résiduel non résolu par la correction net→brut (revue adversariale sept. 2026)** :
pour un pays à forfait notice nul (Irlande, ou intérêts DE/CH/GB/CH marqués `c/`) mais où un
impôt étranger a néanmoins été réellement prélevé (`impotEtrangerCents > 0`), `ligne207Eur`
vaut 0 (`ouvreDroitCredit` faux, cf. §3) — le brut reporté (203 + 207) retombe alors
mécaniquement au **net**, ce qui contredit en apparence « jamais le net encaissé ». **Aucune
mécanique n'est inventée côté moteur** pour ce cas : le formulaire 2047 ne prévoit pas de
variante « 203 + 206 » pour la ligne 220, et rien ne permet d'affirmer que le vrai brut
économique doive être reconstitué autrement. Le moteur reste sur 203 + 207 (= net ici) et
l'UI (`Resultats.tsx`) affiche une réserve dès que `ligne206Eur > 0` et `ligne207Eur === 0`,
invitant l'utilisateur à faire confirmer le montant exact plutôt que de lui laisser croire que
le montant affiché intègre déjà l'impôt étranger réellement supporté.

## 6. Cases 8VL / 8PL et caveats datés (re-validation 2026-06-25)

### 6.1 Mécanique 8VL / 8PL

- **8VL** = total des crédits d'impôt retenus (somme des lignes 207 + 237 + 276), reporté en
  2042C. C'est le **crédit plafonné** (`min(205,206)`), **pas** la retenue brute. Notice :
  « Le crédit d'impôt indiqué en 8VL est égal à l'impôt effectivement supporté à l'étranger,
  dans la limite des taux prévus par les conventions, sans pouvoir excéder l'impôt français
  afférent à ce revenu. »
- **8PL (nouveau en 2026)** = **base NETTE** des revenus/plus-values ouvrant droit à crédit
  (« Montant des plus-values et revenus de capitaux mobiliers **nets** ouvrant droit à crédit
  d'impôt étranger »), aussi reportée en 2042C. L'administration s'en sert pour calculer
  l'impôt français théorique et plafonner le crédit.
  → ⚠️ « nets » recouvre **deux axes distincts** à ne pas confondre (détail §6.3) : (a) net
  **d'impôt étranger** — le libellé du formulaire en ligne dit en réalité « **sans déduction** de
  l'impôt étranger » (≈ brut de retenue), point resté **ouvert** ; (b) **avant/après abattement
  40 %** — le libellé « après abattement éventuel » penche pour **après** (sous barème seulement).
  Le moteur porte aujourd'hui le net encaissé, **avant** abattement ; toute correction est
  conditionnée à une confirmation chiffrée officielle (§6.3).
- **Anomalie « ligne 8VL sans code 8PL » (code 833)** : déclencher en ligne un 8VL sans 8PL
  associé lève une incohérence signalée par le contrôle. Son caractère **bloquant** n'est établi
  par aucune source officielle publique, mais les témoignages usagers (Services Publics +,
  fil 7326751 : « impossibilité de valider ma déclaration ») pointent vers un **blocage effectif**
  de la validation — revue du 19/09/2026 ; la qualification « non bloquante » retenue auparavant
  ne reposait sur rien de sourçable. D'où l'intérêt de toujours produire les deux lignes.
- Sources : notice 2047-NOT 2026 (`2047_5490.pdf`, section « 8VL et 8PL ») ; formulaire 2026
  (`2047_5488.pdf`, légende cadre 7) ; forum DGFiP `plus.transformation.gouv.fr` (anomalie).

### 6.2 Caveats datés (à re-vérifier chaque millésime)

- ⏱️ **Millésime** : tous les taux et le champ 8PL sont **spécifiques à revenus 2025 / décl. 2026**.
  À re-vérifier contre la nouvelle notice chaque année.
- 🇧🇪 **Belgique** : le plafond conventionnel **15 %** (→ forfait net 17,6 %) est correct pour ce
  millésime. La **convention de 2021** (qui abaisserait le plafond à **12,8 %**) **n'était pas en
  vigueur en juin 2026** → recalibrer si l'on cible un millésime ultérieur.
- 🇺🇸 **W-8BEN** : un W-8BEN valide sécurise la retenue conventionnelle US à **15 %** ; sans lui,
  retenue statutaire de 30 % mais **seuls 15 % crédités** côté FR (l'excédent n'est pas récupérable
  via le 2047 — à régulariser auprès de l'IRS). Le moteur reçoit le **net réellement encaissé** et
  l'**impôt réellement supporté**, donc gère les deux cas via `min(205,206)`.
- 🐛 **Coquille repérée dans la notice (mesure de fiabilité, audit du 19/09/2026)** : la notice
  2047-NOT, p. 1, section « 8VM, 8WM, 8UM et 8PM », écrit que le montant concerné « doit être
  indiqué en 8PL » — c'est manifestement une erreur de frappe : le formulaire lui-même et la
  Brochure IR 2026 (p. 366) désignent bien la case **8PM** pour cette rubrique (8PL est réservée
  aux plus-values et revenus de capitaux mobiliers du cadre 70, pas aux revenus du cadre 71). À
  retenir comme indice que la notice n'est pas totalement fiable au mot près, y compris sur les
  points qui semblent les plus mécaniques.

### 6.3 8PL × abattement 40 % — tranché (audit adversarial du 19/09/2026), calcul NON modifié

- ✅ **Verdict révisé : 8PL = montants BRUTS, AVANT abattement de 40 %.** L'ancien verdict de ce
  paragraphe (« probable : après abattement ») reposait sur le seul libellé de l'outil de
  déclaration en ligne relayé par deux guides — un niveau de preuve « praticien », pas une source
  primaire. Il est **infirmé** par une réponse publique de la DGFiP, de meilleur rang que ce
  relais : le 28/05/2026, sur la plateforme **Services Publics+** (fil « Nouveau champ 8PL du
  formulaire 2047 », <https://www.plus.transformation.gouv.fr/experiences/7376169_nouveau-champ-8pl-du-formulaire-2047>),
  un agent DGFiP (pseudonyme « Tristan ») répond à un usager qui demandait explicitement s'il
  fallait porter le brut, le net d'impôt étranger, ou le montant après abattement de 40 % :
  > « Généralement, cette case se réfère aux montants bruts (avant abattement) des plus-values et
  > revenus de capitaux mobiliers nets »
  La réponse commence par « Généralement » et renvoie elle-même à la notice officielle : ce n'est
  pas une affirmation catégorique, à traiter avec la prudence que cela implique. À la parenthèse
  « (avant abattement) » près, la réponse **recopie le libellé imprimé de la ligne 8PL**
  (« Montant des plus-values et revenus de capitaux mobiliers nets ») — le seul apport informatif
  réel de cette réponse est donc cette parenthèse.
  Réserve sur la force probante de cette source : réponse de forum d'entraide (58 % générée par
  IA puis vérifiée par un agent, d'après la plateforme elle-même), jugée « pas utile » par 28
  usagers, **pas une doctrine BOFiP** ; le simulateur officiel n'intègre toujours pas la 8PL. C'est
  néanmoins la meilleure source publique disponible à ce jour, et elle est cohérente avec le sens
  de lecture le plus naturel du mot « bruts » qu'elle emploie elle-même.
- ✅ **`compute.ts` est CONFORME au nouveau verdict, sans modification.** Le moteur porte déjà le
  net encaissé **avant** abattement dans `case8plEur` (`case8plEur += arrondiEuro(ligne.netEncaisseCents)`,
  compute.ts) — exactement ce que confirme la réponse DGFiP. L'ancienne préoccupation (« le moteur
  sera surévalué si la bonne réponse est après abattement ») est donc caduque : aucun changement
  de code requis.
- ✅ **Sous-question de l'axe brut/net D'IMPÔT ÉTRANGER (distinct de l'abattement) : étayée
  (audit adversarial du 19/09/2026).** La formulation initiale de ce point (« le formulaire 2047
  se contredit ») reposait sur un artefact de lecture : les lignes 8VL et 8PL du cadre 70 sont des
  lignes de **total pleine largeur**, hors des colonnes de saisie du cadre — il n'y a donc pas de
  contradiction formelle de mise en page. Un flou textuel réel, mais plus modeste, subsiste
  néanmoins : les lignes de détail du cadre 70 (page 4, `2047_5488.pdf`) se renseignent dans une
  colonne intitulée « REVENU AVANT DÉDUCTION DE L'IMPÔT ÉTRANGER » (donc **brut** de la retenue
  étrangère), alors que la ligne de total 8PL parle, elle, de revenus « **nets** ». Les deux
  formulations coexistent dans le même cadre. La réponse DGFiP du 28/05/2026 reprend d'ailleurs la
  même formulation ambiguë (« montants bruts … de capitaux mobiliers **nets** »), sans lever ce
  point.
  Ce qui tranche réellement cet axe, c'est la notice 2047-NOT (p. 1, NOTA final) :
  > « les taux indiqués pour chaque pays dans cette notice sont déterminés par rapport au revenu
  > net perçu (après déduction de l'impôt étranger) alors que les taux prévus dans la convention
  > sont les taux applicables au revenu brut. »
  Combinée à la ligne 203 (« Montant net encaissé ») et à la légende du cadre 20 (revenus « après
  déduction de l'impôt supporté à l'étranger »), cette précision établit que la chaîne 203→8PL
  travaille sur le **net d'impôt étranger** — conforme à `compute.ts`, qui porte le net encaissé
  (`netEncaisseCents`) dans `case8plEur`. L'axe « avant/après abattement 40 % » (traité au point
  précédent) reste, lui, indépendant de cette conclusion.
- Sources consultées pour cette révision : formulaire 2047 rev. 2025 (`2047_5488.pdf`, cadre 7 /
  cadre 70, p. 4) et notice 2047-NOT rev. 2025 (`2047_5490.pdf`, p. 1-2) lus directement ; fil
  Services Publics+ cité ci-dessus, consulté et lu le 19/09/2026.
