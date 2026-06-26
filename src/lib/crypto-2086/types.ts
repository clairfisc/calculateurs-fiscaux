/**
 * Moteur de calcul des plus-values sur actifs numériques (crypto) — formulaire 2086 FR.
 * Régime du **particulier** (cessions occasionnelles), méthode de la **valeur globale du
 * portefeuille**, CGI art. 150 VH bis. Report sur 2042-C : case 3AN (plus-value nette) /
 * 3BN (moins-value de l'année).
 *
 * ⚠️ Régime SANS RAPPORT avec les titres (2074-CMV) : module séparé, pas de PMP par ligne,
 * et surtout **pas de report pluriannuel des moins-values** (CGI 150 VH bis IV : MV imputables
 * uniquement sur PV de même nature de la même année — cf. SOURCES-2086.md §5).
 *
 * Module pur : aucune dépendance DOM/Astro/React, 100 % testable. Sources & oracle fiscal
 * (citations Legifrance / BOFiP / formulaire 2086) : voir SOURCES-2086.md.
 *
 * RÈGLE D'OR (cohérente avec le moteur 2047) : jamais de flottant pour de l'argent. Les
 * montants circulent en **centimes d'euro entiers** ; le SEUL ratio flottant est
 * `prix de cession / valeur globale`, appliqué puis arrondi au centime le plus proche.
 */

/** Montant en centimes d'euro (entier). */
export type Cents = number;

/** Seuil d'exonération annuel (CGI 150 VH bis, II-B) : 305 € = 30 500 centimes. */
export const SEUIL_EXONERATION_CENTS: Cents = 305_00;

/**
 * Nature de la contrepartie reçue lors de la cession — détermine si l'opération est un
 * **fait générateur imposable** (CGI 150 VH bis, I et II-A).
 *
 * - `fiat` : cession contre **monnaie ayant cours légal** (€, $…) → **imposable**.
 * - `bien-service` : achat d'un bien ou service réglé en crypto → **imposable**.
 * - `actif-numerique` : échange crypto → crypto **sans soulte** → **SURSIS d'imposition**
 *   (II-A), **non imposable**, exclu du calcul (cf. SOURCES-2086.md §4).
 */
export type Contrepartie = "fiat" | "bien-service" | "actif-numerique";

/**
 * Une opération de cession d'actifs numériques. Tous les montants sont déjà convertis en EUR
 * (centimes) — la conversion d'une valeur libellée en devise se fait en amont via
 * `tax-engine/fx`.
 *
 * Le moteur **filtre** les opérations non imposables (échange crypto→crypto sans soulte) :
 * l'appelant peut donc passer l'historique tel quel, seules les cessions imposables sont
 * calculées et comptées dans l'assiette du seuil 305 €.
 */
export interface Cession {
  /** Date de la cession (YYYY-MM-DD). Détermine l'ordre chronologique de l'imputation. */
  readonly date: string;
  /**
   * Nature de la contrepartie. Par défaut `fiat` (cession contre euros). `actif-numerique`
   * → échange en sursis, ignoré par le moteur (cf. SOURCES-2086.md §4).
   */
  readonly contrepartie?: Contrepartie;
  /**
   * Prix de cession brut en centimes d'euro (ligne 213 du 2086) : prix réel perçu / valeur de
   * la contrepartie obtenue, **avant** déduction des frais. Utilisé au numérateur du ratio.
   */
  readonly prixCessionCents: Cents;
  /**
   * Frais supportés à l'occasion de la cession (ligne 214), en centimes. Réduisent la
   * **plus-value** (minuende, ligne 218) mais **pas** la proportion cédée (le ratio utilise le
   * prix brut de frais, ligne 217) — cf. SOURCES-2086.md §2. Défaut : 0.
   */
  readonly fraisCessionCents?: Cents;
  /**
   * **Valeur globale du portefeuille** d'actifs numériques au moment de la cession (ligne 212),
   * en centimes : somme des valeurs vénales de TOUS les actifs détenus avant la cession (y
   * compris la fraction cédée). Doit être > 0. Cf. SOURCES-2086.md §2.
   */
  readonly valeurGlobalePortefeuilleCents: Cents;
}

/** Résultat d'UNE cession imposable, en centimes d'euro (précision maximale, pour l'audit). */
export interface ResultatCession {
  readonly date: string;
  readonly prixCessionCents: Cents;
  readonly fraisCessionCents: Cents;
  readonly valeurGlobalePortefeuilleCents: Cents;
  /** Prix total d'acquisition NET disponible avant cette cession (ligne 223) : initial − déjà imputé. */
  readonly prixAcquisitionNetCents: Cents;
  /**
   * Fraction de prix d'acquisition imputée à CETTE cession (le « capital initial » consommé) :
   *   `prixAcquisitionNet × (prixCession / valeurGlobale)`, arrondie au centime.
   */
  readonly fractionAcquisitionImputeeCents: Cents;
  /** Plus (>0) ou moins (<0) value de la cession = (prixCession − frais) − fraction imputée. */
  readonly plusValueCents: Cents;
}

/** Sortie agrégée du calcul 2086, prête à reporter sur la déclaration (valeurs en EUR). */
export interface Declaration2086 {
  /** Détail par cession imposable (les échanges crypto→crypto sont exclus). */
  readonly cessions: readonly ResultatCession[];
  /** Somme des prix de cession nets de frais (ligne 51) — assiette du seuil 305 €, en EUR. */
  readonly totalCessionsEur: number;
  /**
   * Vrai si le total des cessions imposables de l'année est ≤ 305 € → exonération totale
   * (CGI 150 VH bis, II-B). Quand exonéré : 3AN = 3BN = 0 (cf. SOURCES-2086.md §5).
   */
  readonly exonere305: boolean;
  /** Plus-value nette globale de l'année (somme algébrique des cessions) en EUR, signée. */
  readonly plusValueNetteEur: number;
  /** Case 2042-C 3AN : plus-value nette imposable (si > 0 et non exonéré), sinon 0. */
  readonly case3anEur: number;
  /** Case 2042-C 3BN : moins-value de l'année (valeur absolue, si net < 0 et non exonéré), sinon 0. */
  readonly case3bnEur: number;
}
