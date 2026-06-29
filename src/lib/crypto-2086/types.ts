/**
 * Moteur de calcul des plus-values sur actifs numériques (crypto) — formulaire 2086 FR.
 * Régime du **particulier** (cessions occasionnelles), méthode de la **valeur globale du
 * portefeuille**, CGI art. 150 VH bis. Report sur 2042-C : case 3AN (plus-value nette) /
 * 3BN (moins-value de l'année).
 *
 * Modèle « JOURNAL CHRONOLOGIQUE » : on traite une suite d'opérations datées — des **achats**
 * (acquisitions en monnaie ayant cours légal) et des **ventes** (cessions imposables). Ainsi un
 * rachat de crypto *entre deux ventes* augmente bien le prix d'acquisition disponible pour les
 * ventes suivantes (cerfa ligne 220 = acquisitions réalisées avant la cession). Cf. SOURCES-2086.md §3.
 *
 * ⚠️ Régime SANS RAPPORT avec les titres (2074-CMV) : module séparé, pas de PMP par ligne,
 * et surtout **pas de report pluriannuel des moins-values** (CGI 150 VH bis IV : MV imputables
 * uniquement sur PV de même nature de la même année — cf. SOURCES-2086.md §5).
 *
 * Les échanges **crypto → crypto** sans soulte (sursis II-A) ne sont PAS des opérations du
 * journal : ils ne sont pas imposables et n'affectent ni le prix d'acquisition (actif reçu = 0)
 * ni la plus-value. Inutile de les saisir (cf. SOURCES-2086.md §4).
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
 * Une **acquisition** d'actifs numériques en monnaie ayant cours légal (cerfa ligne 220).
 * Vient augmenter le prix total d'acquisition du portefeuille (CGI 150 VH bis, III-B).
 * Les frais d'acquisition ne sont pas déductibles à part : `montantCents` = montant payé.
 * Les cryptos reçues par échange crypto→crypto (sursis) comptent pour 0 → ne pas les saisir.
 */
export interface Achat {
  readonly type: "achat";
  /** Date de l'acquisition (YYYY-MM-DD). */
  readonly date: string;
  /** Prix effectivement payé en € (centimes) pour cette acquisition. */
  readonly montantCents: Cents;
}

/**
 * Une **vente** = cession imposable (crypto → monnaie ayant cours légal, ou → bien/service).
 * Tous les montants sont déjà convertis en EUR (centimes) — conversion en amont via `tax-engine/fx`.
 */
export interface Vente {
  readonly type: "vente";
  /** Date de la cession (YYYY-MM-DD). Détermine l'ordre chronologique de l'imputation. */
  readonly date: string;
  /**
   * Prix de cession brut en centimes (ligne 213) : prix réel perçu / valeur de la contrepartie,
   * avant déduction des frais. Utilisé au numérateur du ratio (ligne 217).
   */
  readonly prixCessionCents: Cents;
  /**
   * Frais supportés à l'occasion de la cession (ligne 214), en centimes. Réduisent la
   * plus-value (minuende, ligne 218) mais PAS la proportion cédée (ligne 217) — SOURCES §2. Défaut 0.
   */
  readonly fraisCessionCents?: Cents;
  /**
   * Valeur globale du portefeuille au moment de la cession (ligne 212), en centimes : somme des
   * valeurs vénales de TOUS les actifs détenus avant la cession. Doit être > 0. Cf. SOURCES §2.
   */
  readonly valeurGlobalePortefeuilleCents: Cents;
}

/** Une opération du journal : achat (acquisition) ou vente (cession imposable). */
export type Operation = Achat | Vente;

/** Résultat d'UNE vente imposable, en centimes d'euro (précision maximale, pour l'audit). */
export interface ResultatVente {
  readonly date: string;
  readonly prixCessionCents: Cents;
  readonly fraisCessionCents: Cents;
  readonly valeurGlobalePortefeuilleCents: Cents;
  /** Prix total d'acquisition NET disponible avant cette vente (ligne 223). */
  readonly prixAcquisitionNetCents: Cents;
  /**
   * Fraction de prix d'acquisition imputée à CETTE vente (le « capital initial » consommé) :
   *   `prixAcquisitionNet × (prixCession / valeurGlobale)`, arrondie au centime.
   */
  readonly fractionAcquisitionImputeeCents: Cents;
  /** Plus (>0) ou moins (<0) value de la vente = (prixCession − frais) − fraction imputée. */
  readonly plusValueCents: Cents;
}

/** Sortie agrégée du calcul 2086, prête à reporter sur la déclaration (valeurs en EUR). */
export interface Declaration2086 {
  /** Détail par vente imposable, dans l'ordre chronologique. */
  readonly ventes: readonly ResultatVente[];
  /** Somme des prix de cession nets de frais (ligne 51) — assiette du seuil 305 €, en EUR. */
  readonly totalCessionsEur: number;
  /**
   * Vrai si le total des cessions imposables de l'année est ≤ 305 € → exonération totale
   * (CGI 150 VH bis, II-B). Quand exonéré : 3AN = 3BN = 0 (cf. SOURCES-2086.md §5).
   */
  readonly exonere305: boolean;
  /** Plus-value nette globale de l'année (somme algébrique des ventes) en EUR, signée. */
  readonly plusValueNetteEur: number;
  /** Case 2042-C 3AN : plus-value nette imposable (si > 0 et non exonéré), sinon 0. */
  readonly case3anEur: number;
  /** Case 2042-C 3BN : moins-value de l'année (valeur absolue, si net < 0 et non exonéré), sinon 0. */
  readonly case3bnEur: number;
  /** Prix total d'acquisition restant après toutes les opérations (centimes), pour l'audit. */
  readonly prixAcquisitionRestantCents: Cents;
}
