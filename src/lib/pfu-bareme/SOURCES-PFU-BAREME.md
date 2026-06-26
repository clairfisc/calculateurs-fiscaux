# Sources & décision fiscale — comparateur PFU vs barème progressif

> Validation effectuée le **2026-06-26** (recherche multi-sources + vérification croisée)
> contre sources **gouvernementales et primaires** : service-public.gouv.fr,
> entreprendre.service-public.gouv.fr, BOFiP, CGI. Toute valeur ou règle non confirmée par
> une source primaire est marquée `⚠️ à vérifier` ici et dans `rates.ts`.
>
> Périmètre : **partie GRATUITE** (frontière open core §5.5) — calcul comparatif à l'écran,
> saisie manuelle, aucun pré-remplissage cerfa, aucune persistance. Module **P2** (§14.6) :
> feature SEO / crédibilité, **pas** une porte du bundle payant.

## 0. Ce que le module calcule (et ce qu'il ne calcule PAS)

**Calcule :** pour un foyer dont on connaît la **TMI** (taux marginal d'imposition) et les
**revenus du capital** de l'année (dividendes éligibles, intérêts/autres RCM, plus-values
mobilières), le **coût d'impôt total** sous chacun des deux régimes — (1) **PFU** (flat tax)
et (2) **option barème** (case 2OP) — puis désigne le **moins-disant** et l'**écart en €**.

**Ne calcule PAS :** l'impôt complet du foyer. Le comparateur applique la **TMI fournie**
comme taux marginal sur l'assiette des revenus du capital (hypothèse v0, §6). Il ne reconstitue
pas le quotient familial, ni le barème tranche par tranche, ni le RFR. C'est l'approche standard
des comparateurs PFU/barème ; elle est **exacte tant que les revenus du capital ne font pas
changer de tranche** (garde-fou affiché).

## 1. Sources consultées

- **Service-Public — « Impôt sur le revenu - Revenus d'épargne et de placement » (F34913)**
  (revenus 2026). <https://www.service-public.gouv.fr/particuliers/vosdroits/F34913>
- **Entreprendre.Service-Public — « Évolution du taux du Prélèvement Forfaitaire Unique (PFU) »**
  (actualité A18796) : PFU porté à **31,4 %** au 1ᵉʳ janvier 2026, composition 12,8 % IR +
  18,6 % PS. <https://entreprendre.service-public.gouv.fr/actualites/A18796>
- **BOFiP BOI-RPPM-RCM-20-10-30-10** — conditions d'éligibilité à l'**abattement de 40 %** des
  revenus distribués (réservé au barème, case 2OP).
  <https://bofip.impots.gouv.fr/bofip/2218-PGP.html>
- **BOFiP BOI-RPPM-RCM-20-15** — modalités d'imposition à l'IR des RCM (PFU art. 200 A vs barème).
  <https://bofip.impots.gouv.fr/bofip/11224-PGP.html>
- **CGI art. 200 A** — taux forfaitaire IR du PFU = **12,8 %** (1-B-1°) et option globale barème (2).
- **CGI art. 158, 3-2°** — abattement de **40 %** sur dividendes éligibles (barème uniquement).
- **CGI art. 154 quinquies, II** — **CSG déductible** du revenu global (revenus du patrimoine soumis
  au barème), fraction maintenue à **6,8 %**.
- **Barème IR** : Service-Public F1419 + LF du 19 février 2026, art. 4 (indexation +0,9 %).
  <https://www.service-public.gouv.fr/particuliers/vosdroits/F1419>

## 2. LA décision structurante : le PFU change de taux selon le millésime

Le comparateur est **paramétré par année de perception** des revenus. Deux millésimes coexistent
en juin 2026 (saison déclarative 2026 = revenus 2025 ; revenus 2026 déclarés en 2027). ⚠️ Le PFU
total **dépend aussi de la nature du revenu** pour le millésime 2025 (voir §2bis) :

| Année · nature | PFU total | Part IR | Part PS | CSG déductible (barème) | 2OP révocable ? |
|---|---|---|---|---|---|
| **2025** dividendes / intérêts | **30,0 %** | 12,8 % | **17,2 %** | 6,8 % | **Non** (irrévocable) |
| **2025** plus-values mobilières | **31,4 %** | 12,8 % | **18,6 %** | 6,8 % | **Non** (irrévocable) |
| **2026** (tous revenus) | **31,4 %** | 12,8 % | **18,6 %** | 6,8 % | **Oui** (révocable) |

### Citations

**Entreprendre.Service-Public (A18796) :**
> « Le taux de la CSG ayant évolué de 1,4 point au 1ᵉʳ janvier 2026, le PFU se compose depuis
> cette date comme suit : 12,8 % au titre de l'impôt sur le revenu + 18,6 % de prélèvements
> sociaux = **31,4 %**. »

→ La hausse vient **uniquement** des prélèvements sociaux : la **CSG sur les revenus du capital
passe de 9,2 % à 10,6 %** (+1,4 pt), portant les PS de 17,2 % à 18,6 %. La part IR (12,8 %,
art. 200 A) est **inchangée depuis 2018**.

## 2bis. Fait générateur différencié — les plus-values 2025 sont DÉJÀ à 18,6 % (point vérifié)

La date d'effet de la hausse CSG **dépend de la catégorie de prélèvements sociaux** du revenu
(mécanisme classique CSS) — vérifié contre cabinet CMS + Actu-Juridique + doctrine 2026 :

- **Produits de placement** (dividendes, intérêts) — PS **prélevés à la source** au moment du
  versement (CSS art. L136-7). Fait générateur = **date de versement**. La hausse ne frappe que
  les revenus **versés à compter du 1ᵉʳ janvier 2026** → un **dividende versé en 2025 reste à
  17,2 %** (PFU 30 %).
- **Revenus du patrimoine** (plus-values mobilières de cession de valeurs mobilières — CGI
  150-0 A) — PS recouvrés **par voie de rôle** l'année suivante (CSS art. L136-6). La mesure
  s'applique **« à compter de l'imposition des revenus de l'année 2025 »** → une **plus-value
  mobilière réalisée en 2025 est déjà à 18,6 %** (PFU 31,4 %), bien qu'antérieure à la loi.

> Citation (cabinet CMS) : « Une cession de titres en janvier 2025 supporte le nouveau taux de
> 18,6 % (appliqué rétroactivement aux revenus 2025). À l'inverse, un dividende de décembre 2025
> reste à 17,2 % jusqu'aux distributions de 2026. »

→ **Conséquence de modélisation** : le moteur applique le taux PS **par catégorie** :
`psPlacement` (D + I) et `psPatrimoine` (PV), chacun paramétré par millésime (`rates.ts`,
`PARAMETRES`). Pour 2025 : placement 17,2 %, patrimoine 18,6 %. Pour 2026 : tout à 18,6 %.

> ⚠️ Hors périmètre du module mais à connaître : revenus fonciers, plus-values **immobilières**,
> assurance-vie, livrets réglementés, PEL/CEL **restent à CSG 9,2 %** (PS 17,2 %) — non concernés
> par la hausse. Le module ne traite que RCM + plus-values **mobilières** de droit commun.

> Sources : <https://cms.law/fr/fra/news-information/revenus-du-patrimoine-et-revenus-de-placement-attention-a-la-hausse-de-la-csg> ·
> <https://www.actu-juridique.fr/fiscalite/fiscal-finances/la-csg-en-hausse-sur-les-revenus-du-capital/> ·
> LégiFiscal « PLFSS 2026 flat tax 31,4 % adopté ».

## 3. La fraction de CSG déductible reste 6,8 % (piège vérifié)

La hausse de CSG (9,2 % → 10,6 %) sur les revenus du capital est **entièrement non déductible** :
le taux de **CSG déductible reste figé à 6,8 %** pour les deux millésimes (CGI art. 154 quinquies, II).

> Source : la fraction déductible de 6,8 % n'évolue pas avec la hausse de 1,4 pt ; les +1,4 pt
> sont non déductibles (confirmé service-public / doctrine 2026). À NE PAS faire évoluer à 8,2 %.

**Effet sur le calcul :** la CSG déductible n'existe **que sous le régime barème** (option 2OP).
Elle réduit le revenu global imposable de l'année → économie d'impôt ≈ `CSG_déductible × TMI`.
Assiette de la CSG déductible = **revenu brut soumis aux PS** (la totalité, y compris la part
de dividende abattue de 40 % côté IR).

## 4. L'abattement de 40 % : barème uniquement, dividendes éligibles uniquement

**CGI art. 158, 3-2° / BOI-RPPM-RCM-20-10-30-10.** L'abattement de 40 % :
- s'applique **exclusivement** en cas d'**option pour le barème** (case 2OP cochée) — **jamais**
  sous PFU ;
- ne porte que sur les **revenus distribués éligibles** (dividendes d'actions de sociétés
  soumises à l'IS, françaises ou UE/convention, distribution régulière en AG) ;
- **ne s'applique PAS** aux intérêts, ni aux plus-values mobilières, ni aux « autres revenus
  distribués » (jetons de présence, distributions non éligibles, certains ETF/fonds).

> Citation BOI-RPPM-RCM-20-10-30-10 : « L'abattement de 40 % prévu à l'article 158, 3-2° du CGI
> s'applique aux seuls revenus distribués pris en compte dans le revenu net global soumis au
> barème progressif de l'impôt sur le revenu dans les conditions prévues à l'article 200 A, 2. »

**Effet :** sous barème, assiette IR des dividendes éligibles = `dividendes × (1 − 40 %)` =
`dividendes × 60 %`. L'abattement **ne réduit pas** l'assiette des prélèvements sociaux
(les PS portent toujours sur le **brut**).

## 5. Mécanique de calcul retenue par le moteur

Soit, pour un millésime donné, `tIR_pfu = 12,8 %`, `tPS` (17,2 % ou 18,6 %), `tCSGd = 6,8 %`,
`tmi` (∈ {0, 11, 30, 41, 45 %}), et les assiettes brutes en euros : `D` (dividendes éligibles),
`I` (intérêts/autres RCM), `PV` (plus-values mobilières). Tout en **centimes** en interne.

**Prélèvements sociaux (identiques dans les deux régimes, sur le brut, taux par catégorie §2bis) :**
- `PS = tPS_placement × (D + I) + tPS_patrimoine × PV`
  (2025 : placement 17,2 %, patrimoine 18,6 % ; 2026 : tout 18,6 %)

**Régime PFU :**
- `IR_pfu = tIR_pfu × (D + I + PV)` *(brut, aucun abattement)*
- `total_pfu = IR_pfu + PS`

**Régime barème (option 2OP) :**
- assiette IR = `D × 60 % + I + PV` *(abattement 40 % sur dividendes seulement)*
- `IR_brut = tmi × (D × 60 % + I + PV)`
- CSG déductible = `tCSGd × (D + I + PV)` ; économie associée = `tmi × CSG_déductible`
- `IR_bareme = IR_brut − tmi × CSG_déductible`  *(jamais < 0)*
- `total_bareme = IR_bareme + PS`

**Comparaison :** `moinsDisant = min(total_pfu, total_bareme)` ; `ecart = |total_pfu − total_bareme|`.

> Note : `PS` est **identique** dans les deux régimes (même taux, même base brute), donc l'écart
> PFU/barème se joue **uniquement** sur la composante IR + l'effet de la CSG déductible. Le moteur
> calcule néanmoins les totaux complets car c'est ce que l'utilisateur veut voir.

## 6. Garde-fous & hypothèses v0 (= crédibilité, §5.5)

- **TMI marginale (hypothèse v0)** : `IR_bareme` est calculé à la **TMI fournie**, comme si toute
  l'assiette restait dans cette tranche. **Faux si** les revenus du capital font franchir une
  tranche supérieure → résultat à affiner via le simulateur officiel. À afficher comme hypothèse.
- **CSG déductible décalée (N+1)** : la déduction joue sur le revenu **de l'année du paiement des
  PS** (en pratique N+1 pour les RCM/PV recouvrés par voie de rôle). Le moteur l'impute **en année
  courante** pour la comparaison (simplification documentée).
- **Option 2OP globale** : l'option barème vaut pour **tous** les revenus du capital du foyer —
  on ne peut pas choisir PFU sur une ligne et barème sur une autre. Le comparateur raisonne donc
  sur le **total**, jamais ligne par ligne.
- **Révocabilité** : pour les **revenus 2026** (décl. 2027) l'option 2OP devient **révocable** ;
  pour les **revenus 2025** elle reste **irrévocable** → afficher l'avertissement selon le millésime.
- **Plus-values pré-2018 (abattement durée de détention)** : `⚠️ à vérifier / OUT v0`. Sous
  barème, les titres acquis **avant 2018** peuvent ouvrir un abattement pour durée de détention
  (50 %/65 %) — **non modélisé** ; les PV sont prises à 100 % d'assiette. Cas signalé, non tranché.
- **PEA / assurance-vie / PEL** : régimes propres, **hors périmètre** (PS parfois à 9,2 %, pas
  31,4 %). Le module ne traite que les RCM et PV mobilières de droit commun.
- **Le module produit une aide à la décision, pas l'impôt dû** ; disclaimer « aide informative,
  pas conseil fiscal ».

## 7. Oracle de test (gelé dans `compute.test.ts`)

Cas-types vérifiés à la main avec la mécanique du §5 (millésime 2025, PS 17,2 %, sauf mention) :

| # | Entrée | Régime gagnant attendu | Valeurs clés |
|---|--------|------------------------|--------------|
| O1 | TMI 0 %, D=10 000 € | **Barème** | barème IR = 0 ; PFU IR = 1 280 € → barème gagne de 1 280 € |
| O2 | TMI 11 %, D=10 000 € | **Barème** | barème IR = 11 % × 6 000 − 11 % × 680 = 660 − 74,80 = 585,20 € ; PFU IR = 1 280 € |
| O3 | TMI 30 %, D=10 000 € | **PFU** | barème IR = 30 % × 6 000 − 30 % × 680 = 1 800 − 204 = 1 596 € ; PFU IR = 1 280 € |
| O4 | TMI 30 %, I=10 000 € (intérêts) | **PFU** | barème IR = 30 % × 10 000 − 30 % × 680 = 3 000 − 204 = 2 796 € ; PFU IR = 1 280 € |
| O5 | TMI 41 %, PV=10 000 € (millésime 2025) | **PFU** | PS **18,6 %** = 1 860 € (patrimoine, rétroactif §2bis) ; barème IR = 41 % × 10 000 − 41 % × 680 = 3 821,20 € ; PFU IR = 1 280 € |
| O6 | millésime **2026**, TMI 30 %, D=10 000 € | **PFU** | PS = 1 860 € (18,6 %) ; PFU total = 1 280 + 1 860 = 3 140 € ; barème total = 1 596 + 1 860 = 3 456 € |
| O7 | TMI 11 %, D=10 000 € — point de bascule | **Barème** | confirme que la bascule dividendes est entre TMI 11 % et 30 % |
| O8 | millésime **2025**, PV=10 000 € (plus-value) | — | **PS = 1 860 € (18,6 %)** dès 2025 (patrimoine), PFU total = 1 280 + 1 860 = **3 140 €** — la plus-value 2025 n'est PAS à 30 % |
| O9 | millésime **2025**, D=10 000 € (dividende) | — | **PS = 1 720 € (17,2 %)**, PFU total = 1 280 + 1 720 = **3 000 €** — le dividende 2025 reste à 30 % |

Bornes de cohérence vérifiées : `PS` identique PFU/barème ; `IR_bareme ≥ 0` ; pour `D=I=PV=0`
tous les totaux = 0.
