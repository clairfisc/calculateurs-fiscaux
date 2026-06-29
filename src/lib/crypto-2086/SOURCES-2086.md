# Sources & décision fiscale — moteur plus-values crypto 2086 (CGI art. 150 VH bis)

> Validation effectuée le **2026-06-26** contre les sources **primaires officielles**
> (Legifrance, BOFiP, formulaire + notice 2086 millésime 2026), via trois recherches
> indépendantes recoupées (CGI / BOFiP / formulaire). L'**exemple chiffré officiel de la
> notice 2086** (75 € puis 675 €) est reproduit verbatim et sert d'oracle-pivot
> (`compute.test.ts`, cas B). Tout point non confirmé par une source est marqué
> `⚠️ à vérifier`.
>
> **Périmètre du module (cadrage §14.10, gratuit) :** saisie manuelle des cessions
> *imposables*, calcul de l'assiette à l'écran. Hors périmètre : import d'exchanges,
> cerfa pré-rempli, DeFi complexe, soultes d'échange, revenus (staking/lending/mining/
> airdrops). Le module produit l'**assiette** (PV/MV nette), pas l'impôt.

## 1. Sources consultées

- **CGI art. 150 VH bis** (Legifrance) — régime des plus-values de cession d'actifs
  numériques des particuliers. Structure réelle : **I** champ d'application · **II** exclusions
  (**A** échanges sans soulte = sursis · **B** seuil 305 €) · **III** assiette (**A** PV/MV brute +
  définitions · **B** prix total d'acquisition) · **IV** moins-values · **V** PV nette/obligations.
  <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612228>
- **BOFiP BOI-RPPM-PVBMC-30-10** — champ d'application (sursis crypto→crypto, seuil 305 €).
  <https://bofip.impots.gouv.fr/bofip/11967-PGP.html/identifiant=BOI-RPPM-PVBMC-30-10-20190902>
- **BOFiP BOI-RPPM-PVBMC-30-20** — base d'imposition (formule, imputation, exemples chiffrés).
  <https://bofip.impots.gouv.fr/bofip/11968-PGP.html/identifiant=BOI-RPPM-PVBMC-30-20-20190902>
- **BOFiP BOI-RPPM-PVBMC-30-30** — modalités d'imposition (PFU 30 %, option barème) — v. 23/04/2024.
  <https://bofip.impots.gouv.fr/bofip/11969-PGP.html/identifiant=BOI-RPPM-PVBMC-30-30-20240423>
- **Formulaire + notice 2086 (CERFA 16043\*07, millésime 2026, revenus 2025)** — structure des
  lignes, formule imprimée, report 2042-C, exemple chiffré.
  <https://www.impots.gouv.fr/sites/default/files/formulaires/2086/2026/2086_5515.pdf>
- **Déclaration 2042-C 2026** — cases 3AN/3BN (report), 3CN (option barème).
  <https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/2042-C.pdf>

## 2. La formule (CGI 150 VH bis, III-A — confirmée verbatim)

> « La plus ou moins-value brute réalisée lors de la cession […] est égale à la différence
> entre, d'une part, le prix de cession et, d'autre part, le produit du prix total d'acquisition
> de l'ensemble du portefeuille d'actifs numériques par le quotient du prix de cession sur la
> valeur globale de ce portefeuille. » — *CGI 150 VH bis, III-A (Legifrance)*

```
PV brute = prix de cession − [ prix total d'acquisition × (prix de cession / valeur globale du portefeuille) ]
```

- **Prix de cession** (III-A) : prix réel perçu / valeur de la contrepartie, **minoré des frais**
  supportés à l'occasion de la cession (sur justificatifs), et ajusté des soultes (reçue = +,
  versée = −).
- **Valeur globale du portefeuille** (III-A) : « somme des valeurs, évaluées **au moment de la
  cession** […] des différents actifs numériques […] détenus par le cédant avant de procéder à la
  cession ». Recalculée à chaque cession.
- **Prix total d'acquisition** (III-B) : somme des prix effectivement acquittés **en monnaie ayant
  cours légal** pour acquérir les actifs détenus. ⚠️ Les actifs **reçus par échange crypto→crypto
  en sursis** entrent pour une valeur d'acquisition **nulle** (exclus explicitement du prix total
  d'acquisition).

### Correspondance avec les lignes du formulaire 2086 (cadre Déclarant 1)

| Ligne | Contenu | Dans le moteur |
|---|---|---|
| 212 | Valeur globale du portefeuille au moment de la cession | `valeurGlobalePortefeuilleCents` |
| 213 | Prix de cession | `prixCessionCents` |
| 214 | Frais de cession | `fraisCessionCents` |
| 217 | Prix de cession **net des soultes** (= 213, hors soulte) | numérateur du ratio |
| 218 | Prix de cession **net des frais et soultes** (213 − 214) | minuende de la PV |
| 220 | Prix total d'acquisition | `prixTotalAcquisitionCents` (initial) |
| 221 | Fractions de capital initial déjà imputées (cessions antérieures) | Σ fractions imputées |
| 223 | Prix total d'acquisition **net** (220 − 221 − 222) | `ptaNet` courant |
| — | **PV = 218 − [223 × (217 / 212)]** (signe + ou −) | cf. §3 |
| 224/52 | PV ou MV globale (somme algébrique) → report | cf. §5 |

> ⚠️ **Subtilité confirmée sur le PDF officiel** : la minuende est la **ligne 218** (nette des
> frais), mais le **numérateur du ratio est la ligne 217** (brute de frais). Les frais réduisent
> donc le **gain**, mais **pas la proportion** de portefeuille cédée. Le moteur respecte cette
> distinction (cf. cas D).

## 3. Imputation progressive du prix total d'acquisition (CGI 150 VH bis, III-B)

> « Le prix total d'acquisition […] est réduit de la somme des fractions de capital initial
> contenues dans la valeur ou le prix de chacune des différentes cessions […] antérieurement
> réalisées. » — *CGI 150 VH bis, III-B ; BOFiP BOI-RPPM-PVBMC-30-20 §100*

Pour la cession *n* (cessions imposables ordonnées chronologiquement) :

```
ptaNet(n)      = prixTotalAcquisitionInitial − Σ_{k<n} fractionImputée(k)
fractionImputée(n) = ptaNet(n) × ( prixCession(n) / valeurGlobale(n) )      ← (ligne 217 / ligne 212)
PV(n)          = ( prixCession(n) − frais(n) ) − fractionImputée(n)         ← (ligne 218 − …)
```

La `fractionImputée` est le « capital initial » consommé par la cession ; elle vient diminuer le
prix d'acquisition disponible pour les cessions suivantes (ligne 221 du formulaire). Démonstration
sur l'exemple officiel (§ ci-dessous, cas B).

**Acquisitions en cours d'année (rachats entre deux ventes).** Le prix total d'acquisition n'est
pas figé : il **intègre toute acquisition réalisée avant chaque cession** (III-B : « somme des
prix… de **l'ensemble des acquisitions… réalisées avant la cession** » ; cerfa ligne 220 = prix
total d'acquisition *cumulé* à la date de la cession, ligne 221 = fractions déjà imputées, ligne
223 = 220 − 221). Donc un **rachat de crypto entre deux ventes augmente** le prix d'acquisition
disponible pour les ventes postérieures. Modélisation : le moteur traite un **journal
chronologique d'opérations** (achats + ventes) ; à chaque **achat**, `prixAcquisitionNet += montant
payé` ; à chaque **vente**, imputation puis `prixAcquisitionNet -= fractionImputée`. C'est
équivalent à la ligne 223 du cerfa : `ptaNet(vente n) = Σ achats avant n − Σ fractions imputées
avant n`. Voir cas H. *(Les frais d'**acquisition** ne sont pas déductibles du prix d'acquisition —
seuls les frais de **cession** réduisent le prix de cession, BOFiP ; un « achat » = le montant payé.)*

> **Soultes d'échanges antérieurs (ligne 222)** : non modélisées en v0 (hors périmètre DeFi,
> §14.10.3). Le moteur ne gère pas les soultes ; les cessions à soulte sont signalées « à vérifier »
> côté UI.

## 4. Crypto → crypto = sursis d'imposition (CGI 150 VH bis, II-A)

> « Les dispositions du I […] ne sont pas applicables, au titre de l'année d'échange, aux
> opérations d'échange **sans soulte** entre actifs numériques […]. » — *CGI 150 VH bis, II-A*
> « les opérations d'échanges sans soulte entre actifs numériques […] bénéficient d'un **sursis
> d'imposition**. » — *BOFiP BOI-RPPM-PVBMC-30-10 §80*

→ **Garde-fou (essentiel pour la crédibilité, cadrage §14.10.2)** : seules les cessions **crypto →
monnaie ayant cours légal** et **crypto → bien/service** sont imposables. Les échanges
crypto→crypto sans soulte ne sont **pas** un fait générateur : ils n'entrent **pas** dans le calcul
(ni dans la PV, ni dans l'assiette du seuil 305 €) et n'affectent pas le prix total d'acquisition
(actif reçu valorisé à 0, cf. §2). Dans le modèle « journal », ils ne sont donc **pas des
opérations** (ni achat, ni vente) : l'utilisateur ne les saisit pas (UI : encart d'aide).

## 5. Seuil 305 €, compensation PV/MV, report (II-B, IV, V) + routage 2042-C

**Seuil d'exonération (II-B)** — confirmé verbatim :

> « Les personnes réalisant des cessions dont la somme des prix, tels que définis au A du III,
> n'excède pas **305 €** au cours de l'année d'imposition hors opérations [d'échange sans soulte],
> sont exonérées. » — *CGI 150 VH bis, II-B*
> « Si le total est supérieur à ce montant, vos cessions sont alors imposables, **dès le premier
> euro de plus-value**. » — *Notice 2086, ligne 51*

- **Assiette du seuil** = somme des **prix de cession** imposables de l'année. Le formulaire
  l'apprécie sur la **ligne 218** (prix net des frais et soultes) — ligne 51 = Σ 218 du foyer. Le
  moteur suit le formulaire : seuil sur Σ (prixCession − frais) des cessions imposables.
- **Tout ou rien** : ≤ 305 € → **toutes** les PV exonérées (3AN = 3BN = 0) ; > 305 € → imposable
  dès le 1ᵉʳ euro. Ce n'est **pas** un abattement.

**Compensation et moins-values (IV)** — confirmé verbatim :

> « Les moins-values brutes […] sont imputées **exclusivement** sur les plus-values brutes de même
> nature, réalisées au titre de **cette même année**. » — *CGI 150 VH bis, IV*
> « une moins-value nette […] ne peut être **ni reportée les années suivantes**, ni imputée sur une
> plus-value de cession d'un bien d'une autre nature. » — *BOFiP BOI-RPPM-PVBMC-30-20 §170*

→ Le moteur fait la **somme algébrique** de toutes les cessions imposables de l'année (PV − MV) =
résultat net unique. **Aucun report pluriannuel** des moins-values (différence majeure avec les
titres / 2074-CMV). Une MV nette annuelle est définitivement perdue.

**Routage 2042-C** (notice 2086, ligne 52) :

> « le total des plus ou moins-values […] : à reporter ligne **3AN** […] en cas de plus-value
> globale ou […] ligne **3BN** […] en cas de moins-value globale. »

- net > 0 → **case 3AN** (plus-value nette) ; net < 0 → **case 3BN** (moins-value de l'année,
  valeur absolue) ; exonéré → 3AN = 3BN = 0.
- Option barème progressif = **case 3CN** à cocher (hors moteur : choix du contribuable).

## 6. Hors périmètre (régimes distincts) — à signaler, pas à calculer

- **Minage** : régime **BNC** (BOFiP, ACTU-2019-00174), hors 150 VH bis.
- **Staking / lending / airdrops** : revenus (BNC, ou RCM pour certaines mises à disposition de
  capital), **hors 2086**. La ventilation exacte BNC/RCM reste `⚠️ à vérifier` (pas de citation
  primaire dédiée obtenue) — mais leur **exclusion du 2086** est certaine (le 2086 ne couvre que
  les *cessions*). Le module les signale « hors périmètre », ne les calcule pas.

## 7. Taux (BOI-RPPM-PVBMC-30-30 §10) — pour information

> « […] taux forfaitaire de 12,8 % ainsi qu'aux prélèvements sociaux […] au taux global de 17,2 %.
> […] imposées à un taux global de **30 %**. » Option barème (cessions ≥ 01/01/2023), case 3CN.

Le moteur **ne liquide pas l'impôt** : il produit l'assiette (PV/MV nette → 3AN/3BN). Le PFU 30 %
est appliqué par l'administration.

## 8. Cas-types oracle (gelés en tests — `compute.test.ts`)

Tous montants en euros ; le moteur travaille en **centimes entiers** (× 100). Cas choisis à
division exacte pour un oracle non ambigu.

| Cas | Entrées (PTA init ; cessions [VGP, prix, frais]) | Calcul | Sortie attendue |
|---|---|---|---|
| **A** simple gain | PTA 1000 ; [2000, 1000, 0] | 1000 − 1000×(1000/2000) = 1000 − 500 | PV 500 ; **3AN 500** |
| **B** notice officielle | PTA 1000 ; [1200, 450, 0] puis [1300, 1300, 0] | 75 puis 1300 − (1000−375)×(1300/1300) = 675 | PV 75 + 675 = 750 ; **3AN 750** |
| **C** ≤ 305 € exonéré | PTA 1000 ; [1500, 300, 0] | total cessions 300 ≤ 305 | exonéré ; **3AN 0 / 3BN 0** |
| **D** frais (217 vs 218) | PTA 1000 ; [2000, 1000, 50] | 950 − 1000×(1000/2000) = 950 − 500 | PV 450 ; **3AN 450** |
| **F** moins-value | PTA 2000 ; [1000, 500, 0] | 500 − 2000×(500/1000) = 500 − 1000 | MV −500 ; **3BN 500** |
| **G** compensation → MV nette | PTA 1000 ; [2000, 200, 0] puis [500, 400, 0] | +100 puis 400 − (1000−100)×(400/500) = 400 − 720 = −320 | net −220 ; **3BN 220** |
| **H** rachat entre 2 ventes | achat 1000 ; vente [1200, 450, 0] ; achat 500 ; vente [2000, 1000, 0] | 75 ; ptaNet 625+500=1125 ; 1000 − 1125×(1000/2000) = 437,50 | net 512,50 ; **3AN ~513** |
| **report N-1** | report 1000 ; vente [1200, 450, 0] (aucune ligne Achat) | 450 − 1000×(450/1200) = 75 | identique à B-cession-1 |

*(Notation : « PTA n » / « report n » = prix d'acquisition de départ (achat initial ou report
N-1) ; ventes notées [VGP, prix, frais]. Modèle « journal » : suite d'opérations achat/vente
datées + un report N-1 optionnel. Le crypto→crypto n'est pas une opération (§4) — pas de cas-type.
Tests additionnels : ordre chronologique, « achats seuls », « vente sans achat », VGP ≤ 0.)*

**Détail cas B (exemple officiel, notice 2086 / BOFiP §110)** :
- Cession 1 (mars) : `450 − (1000 × 450/1200) = 450 − 375 = 75 €`. Fraction imputée = 375 €.
- Cession 2 (août) : PTA net = 1000 − 375 = 625 ; `1300 − (625 × 1300/1300) = 1300 − 625 = 675 €`.
- PV nette = 75 + 675 = **750 €** → 3AN.

**Détail cas H (rachat entre deux ventes — dérivé, recoupé cerfa ligne 220/221/223)** :
- Achat 01 : 1000 → ptaNet 1000.
- Vente 03 : `450 − (1000 × 450/1200) = 75 €` ; fraction 375 ; ptaNet 625.
- Achat 06 : 500 (rachat) → ptaNet **1125**.
- Vente 09 : `1000 − (1125 × 1000/2000) = 1000 − 562,50 = 437,50 €` ; ptaNet 562,50.
- Recoupe cerfa (vente 09) : ligne 220 = 1000+500 = 1500 ; 221 = 375 ; 223 = 1125 ; PV = 1000 − 1125×(1000/2000) = 437,50 ✓
- PV nette = 75 + 437,50 = **512,50 €** → 3AN (≈ 513 € après arrondi à l'euro).

## 9. Caveats / à vérifier

- **Millésime** : oracle calé sur **revenus 2025 / déclaration 2026**. Une version Legifrance
  « crypto-actifs » (terminologie MiCA) entre en vigueur **01/07/2026** ; elle renomme « actifs
  numériques » → « crypto-actifs » sans modifier a priori le mécanisme de calcul. À revérifier pour
  les revenus 2026+.
- **Numéros de § BOFiP** : extraits via lecture WebFetch ; à revérifier visuellement avant toute
  publication d'une page citant un § précis (le BOFiP renumérote).
- **Soultes** (lignes 216/222) : non modélisées en v0 (hors périmètre). Cessions à soulte = signaler
  « à vérifier ».
- **Frais sur le seuil 305 €** : le moteur suit la ligne 51 du formulaire (Σ ligne 218, nette de
  frais). Lecture conforme au formulaire officiel ; conservée comme telle.
- **Ventilation BNC/RCM** des revenus staking/lending : `⚠️ à vérifier` (hors périmètre 2086 de
  toute façon).
