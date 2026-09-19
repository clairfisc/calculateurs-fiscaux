/**
 * Levier **L3 — Timing / fractionnement de la conversion fiat (crypto)**, simulateur d'arbitrage
 * mode A. Périmètre 150 VH bis.
 *
 * Question utilisateur : « Convertir X € de crypto en une fois cette année, ou en N fois sur
 * plusieurs années, change-t-il l'impôt total ? ». Ce sous-module n'invente **aucune** règle
 * fiscale : il **compose** `crypto-2086.calculeDeclaration2086` (méthode de la valeur globale,
 * seuil d'exonération 305 €, case 3AN) **une fois par année** — en reportant d'année en année le
 * prix d'acquisition net restant (ligne 223) — puis estime l'impôt sur la plus-value nette crypto
 * via `pfu-bareme.compareRegimes` (même source de taux que la page /plus-values-crypto-2086), et
 * **diffe** le scénario A (« tout convertir maintenant ») et le scénario B (« fractionner sur N
 * années »). On expose le différentiel ; aucune chaîne ne désigne un scénario préférable (mode A).
 */

import type { Cents } from "../types";

/**
 * Régime d'imposition retenu pour estimer l'impôt sur la plus-value nette crypto (case 3AN).
 * Défaut **PFU** : la plus-value de cession d'actifs numériques est, comme les plus-values
 * mobilières, soumise au PFU (12,8 % IR + PS) ; `BAREME` = option globale pour le barème (case 3CN,
 * cessions depuis le 01/01/2023, distincte de la 2OP des titres ; LF 2022 art. 79). Repris de
 * `pfu-bareme` (même source de taux que la page /plus-values-crypto-2086).
 *
 * ⚠️ `BAREME` n'est **plus exposé côté UI** (`SimulateurTimingCrypto`) : en mode rapide (`tmiBp`
 * seul, sans `revenuImposableHorsCapitalCents`), `compareRegimes` applique un taux marginal fixe à
 * toute l'assiette — la progressivité réelle du barème n'est pas modélisée, ce qui rend le
 * différentiel A/B structurellement nul (delta nul par construction, indépendamment de la réalité
 * fiscale). Le type reste disponible pour un usage programmatique/tests avec le mode précis.
 */
export type RegimeImposition = "PFU" | "BAREME";

/**
 * Paramètres d'imposition, repris tels quels de `pfu-bareme.ComparateurInput` (cohérence avec L1).
 *  - **mode rapide** : `tmiBp` (taux marginal en points de base : 0 / 1100 / 3000 / 4100 / 4500) ;
 *  - **mode précis** : `revenuImposableHorsCapitalCents` + `parts` (franchissement de tranche).
 * Sous PFU ces paramètres n'influent pas sur l'impôt (forfaitaire) mais sont conservés pour
 * permettre la bascule de régime sans changer la forme de l'entrée. Le `millesime` fixe le taux PS
 * et, en barème, la CSG déductible.
 */
export interface ParametresImposition {
  /** Année de perception (taux PS, CSG déductible). Repris de `pfu-bareme.Millesime`. */
  readonly millesime: 2025 | 2026;
  /** Régime retenu pour chiffrer l'impôt sur la plus-value nette crypto. Défaut `PFU`. */
  readonly regime?: RegimeImposition;
  /** Mode rapide — TMI du foyer en points de base. Ignoré si le mode précis est fourni. */
  readonly tmiBp?: number;
  /** Mode précis — revenu net imposable du foyer **hors** la plus-value comparée (centimes). */
  readonly revenuImposableHorsCapitalCents?: Cents;
  /** Mode précis — nombre de parts de quotient familial (défaut 1). */
  readonly parts?: number;
}

/**
 * Entrée du levier L3. Tous les montants en **centimes entiers** (convention partagée).
 *
 * Modélisation neutre : on suppose que l'utilisateur veut convertir en euros un même montant total
 * de crypto (`montantTotalAConvertirCents`), dont le **prix d'acquisition** d'origine est
 * `prixAcquisitionTotalCents`. La plus-value latente sur la portion convertie est donc
 * `montantTotalAConvertir − (prixAcquisitionTotal × montantTotalAConvertir / valeurPortefeuille)`,
 * répartie au prorata du montant cédé chaque année (méthode de la valeur globale, 150 VH bis).
 *
 * - Scénario A : une seule cession de `montantTotalAConvertirCents`, **l'année courante**.
 * - Scénario B : `nbFractions` cessions égales de `montantTotalAConvertirCents / nbFractions`,
 *   une par année (années consécutives), le prix d'acquisition net restant étant **reporté**
 *   d'année en année (ligne 223 du 2086).
 *
 * Hypothèse explicite et neutre : la **valeur globale du portefeuille** et le **prix d'acquisition**
 * sont supposés **identiques** entre A et B (pas d'évolution de cours simulée — on isole le seul
 * effet du timing/fractionnement, pas un pari sur le marché). Les autres cessions de l'année ne
 * sont pas modélisées ici (le levier compare l'effet marginal du fractionnement de CETTE conversion).
 */
export interface TimingCryptoInput {
  /**
   * Montant **total** de crypto que l'on souhaite convertir en euros (centimes, ≥ 0) : la valeur de
   * cession totale, identique dans les deux scénarios (seul le découpage dans le temps diffère).
   */
  readonly montantTotalAConvertirCents: Cents;
  /**
   * Prix **total d'acquisition** du portefeuille (centimes, ≥ 0) : somme payée en € pour acquérir
   * les cryptos détenues (ligne 220 / 223). Sert de base à la quote-part imputée (150 VH bis III-B).
   */
  readonly prixAcquisitionTotalCents: Cents;
  /**
   * Valeur globale du **portefeuille entier** au moment de la conversion (centimes, > 0) : somme des
   * valeurs vénales de tous les actifs numériques détenus (ligne 212). Doit être ≥ au montant
   * converti. Si absente ou ≤ au montant converti, on retient `montantTotalAConvertirCents` (cas où
   * l'on convertit l'intégralité du portefeuille → quote-part = prix d'acquisition total).
   */
  readonly valeurGlobalePortefeuilleCents?: Cents;
  /**
   * Nombre de fractions (années) du scénario B (entier ≥ 1). Borné à `MAX_FRACTIONS`. `1` rend B
   * identique à A (différentiel nul). Une fraction = une cession, une par année consécutive.
   */
  readonly nbFractions: number;
  /** Paramètres d'imposition (régime + TMI/parts/millésime), repris de `pfu-bareme`. */
  readonly imposition: ParametresImposition;
}

/**
 * Données propres au levier L3, en plus du comparatif neutre A/B. Tout est **descriptif** : on
 * chiffre le différentiel, on ne désigne pas de scénario à retenir (mode A).
 */
export interface DetailsTimingCrypto {
  readonly regime: RegimeImposition;
  /** Nombre de fractions effectivement appliqué en scénario B (après bornage). */
  readonly nbFractions: number;
  /** Plus-value nette crypto imposable (case 3AN cumulée, euros) du scénario A. */
  readonly case3anAEur: number;
  /** Plus-value nette crypto imposable (case 3AN cumulée sur les N années, euros) du scénario B. */
  readonly case3anBEur: number;
  /**
   * case3an(B) − case3an(A), signé (euros). Négatif = le fractionnement réduit l'assiette imposable
   * cumulée (typiquement via le seuil 305 €) ; 0 = même assiette (le timing ne change rien).
   */
  readonly deltaCase3anEur: number;
  /** Nombre d'années (sur N) exonérées au titre du seuil 305 € en scénario B. */
  readonly nbAnneesExonerees305B: number;
  /** Vrai si la cession unique du scénario A est exonérée au titre du seuil 305 €. */
  readonly exonere305A: boolean;
  /** Garde-fous propres au levier L3, en texte neutre (mode A) — non normatifs. */
  readonly gardeFous: readonly string[];
}

/** Borne de sûreté sur le nombre de fractions (années) du scénario B. */
export const MAX_FRACTIONS = 20;

/**
 * Garde-fous L3 en **texte neutre** (mode A). Points propres au timing de conversion crypto, dans
 * l'ordre : hors-périmètre NFT (150 VH ter depuis le 01/01/2026), faits générateurs de l'imposition
 * (crypto→crypto non imposable, ne pas inciter au churn), revenus (staking/lending/airdrops) hors
 * périmètre mais à inclure dans la valeur du portefeuille, seuil 305 € présenté comme un fait au
 * niveau du foyer fiscal — pas comme un levier à exploiter de façon répétée (vendre réellement moins
 * n'est pas un montage ; seuls des procédés artificiels exposent à requalification), et les limites
 * de la neutralité PFU (option barème, CEHR/CDHR). L'UI peut les porter à la place ; on les expose
 * ici pour qu'ils voyagent avec le calcul.
 */
export const GARDE_FOUS_TIMING_CRYPTO: readonly string[] = [
  "Les NFT ne relèvent plus de ce régime : pour les cessions réalisées depuis le 1ᵉʳ janvier 2026, les " +
    "crypto-actifs uniques et non fongibles sont imposés selon le régime du bien qu'ils représentent " +
    "(CGI art. 150 VH ter, loi n° 2026-534 du 25 juin 2026, art. 91) — ni méthode du portefeuille " +
    "global, ni seuil 305 €, ni cases 3AN/3BN. Cette page ne couvre que les crypto-actifs fongibles.",
  "Seule la conversion en une monnaie ayant cours légal (euro, dollar, franc suisse…), l'achat d'un " +
    "bien ou d'un service, ou un échange crypto → crypto avec soulte rendent la plus-value imposable " +
    "(BOI-RPPM-PVBMC-30-10, §70). Un échange crypto → crypto sans soulte — y compris vers un " +
    "stablecoin, qui reste un crypto-actif et non une monnaie ayant cours légal — bénéficie d'un " +
    "sursis (CGI art. 150 VH bis, II-A) : il n'est pas imposable et n'a pas à être déclaré. Multiplier " +
    "les échanges crypto → crypto ne change donc rien à l'impôt et n'est pas une façon de le réduire.",
  "La fiscalité des revenus de staking, de lending, du minage ou des airdrops (BNC ou RCM) est hors " +
    "périmètre de cette simulation, qui ne porte que sur la plus-value de cession (formulaire 2086, " +
    "150 VH bis). Les jetons ainsi reçus doivent néanmoins être comptés dans la valeur globale du " +
    "portefeuille saisie ici, avec un prix d'acquisition nul : les exclure minore la plus-value " +
    "déclarée et expose à un redressement.",
  "Le seuil d'exonération de 305 € s'apprécie sur le total des prix de cession imposables d'une même " +
    "année, au niveau du foyer fiscal tout entier — un couple ne dispose pas de 2 × 305 € " +
    "(BOI-RPPM-PVBMC-30-10, §90). Tant que ce total n'excède pas 305 € (305,00 € compris), les " +
    "plus-values de l'année sont exonérées. Il est rappelé ici comme un fait du calcul, et non comme " +
    "un montant à viser : étaler ses ventes dans le seul but de passer sous 305 € chaque année n'est " +
    "pas une démarche que ce simulateur propose. Vendre réellement moins n'est pas un montage ; seuls " +
    "des procédés artificiels (cessions fictives, interposition de comptes) exposent à une " +
    "requalification. Ce simulateur ne connaît pas vos autres cessions de l'année : le total réel à " +
    "comparer au seuil peut différer de celui affiché ici.",
  "Cette simulation isole le seul effet du timing sous PFU : elle suppose la valeur du portefeuille et " +
    "le prix d'acquisition identiques d'une année à l'autre, sans autre cession dans l'année et sans " +
    "franchissement des seuils CEHR (CGI art. 223 sexies) ou CDHR (CGI art. 224). Sous option barème " +
    "(case 3CN), ou au-delà de ces seuils, le fractionnement peut réellement changer l'impôt dû — non " +
    "modélisé ici. Elle ne prédit ni l'évolution du cours, ni un changement futur de barème ou de " +
    "taux, qui peuvent modifier le résultat réel.",
];
