/**
 * Levier **L5 — Donation avant cession** (purge de plus-value latente), simulateur d'arbitrage mode A.
 * Cadrage : §X (L5),  (valider avant déployer). Oracle fiscal : SOURCES-DONATION.md.
 *
 * **RISQUE MODE A LE PLUS ÉLEVÉ** (frontière conseil patrimonial + abus de droit donation-cession).
 * Ce levier **compare**, sans jamais recommander :
 *   - **Scénario A** « vendre les titres puis donner le net » → la plus-value est **taxée** chez le
 *     cédant (composé via `cessions-2074` + `pfu-bareme`), puis on donne le net (droits de donation) ;
 *   - **Scénario B** « donner les titres appréciés » → la plus-value latente est **purgée** (non
 *     imposée à la donation, CGI 150-0 D 1) ; restent les **droits de donation** sur la valeur vénale.
 *
 * Seul calcul fiscal **neuf** de ce sous-module : les **droits de donation** (barème + abattement,
 * CGI 777/779/784), intégralement sourcés et gelés en tests. L'imposition de la PV est **composée**.
 */

import type { Cents } from "../types";

/** Régime retenu pour estimer l'impôt + PS sur la plus-value du scénario A. Repris de `pfu-bareme`. */
export type RegimeImposition = "PFU" | "BAREME";

/**
 * Lien de parenté donateur → donataire, qui détermine **abattement** et **barème** des droits de
 * donation (CGI 777/779/790). cf. SOURCES-DONATION.md §2.
 *  - `enfant` : ligne directe, abattement 100 000 € (CGI 779 I) ;
 *  - `petit-enfant` : abattement 31 865 € (CGI 790 B), barème ligne directe ;
 *  - `frere-soeur` : abattement 15 932 € (CGI 779 IV), barème 35/45 % ;
 *  - `neveu-niece` : abattement 7 967 € (CGI 779 V), taux proportionnel 55 % ;
 *  - `conjoint-pacs` : abattement 80 724 € (CGI 790 E/F), barème ligne directe ;
 *  - `tiers` : aucun abattement, taux proportionnel 60 %.
 */
export type LienDonataire =
  | "enfant"
  | "petit-enfant"
  | "frere-soeur"
  | "neveu-niece"
  | "conjoint-pacs"
  | "tiers";

/**
 * Paramètres d'imposition de la **plus-value** (scénario A), repris tels quels de `pfu-bareme`.
 * En PFU (défaut) la PV est imposée à 12,8 % IR + PS du millésime ; `tmiBp` ne joue qu'en barème.
 */
export interface ParametresImposition {
  /** Année de perception (taux PS). Repris de `pfu-bareme.Millesime`. */
  readonly millesime: 2025 | 2026;
  /** Régime retenu pour chiffrer l'impôt sur la plus-value. Défaut `PFU`. */
  readonly regime?: RegimeImposition;
  /** Mode rapide — TMI du foyer en points de base (0 / 1100 / 3000 / 4100 / 4500). */
  readonly tmiBp?: number;
  /** Mode précis — revenu net imposable du foyer **hors** la plus-value (centimes). */
  readonly revenuImposableHorsCapitalCents?: Cents;
  /** Mode précis — nombre de parts de quotient familial (défaut 1). */
  readonly parts?: number;
}

/**
 * Entrée du levier L5. Montants en **centimes entiers** (convention partagée).
 *
 * On transmet **les mêmes titres** dans les deux scénarios. Ce qui change : en A on **vend d'abord**
 * (PV taxée) puis on donne le **net** ; en B on **donne les titres** (PV purgée) puis le donataire
 * pourra revendre à sa nouvelle base.
 */
export interface DonationInput {
  /** Valeur vénale des titres au jour de la donation (centimes, ≥ 0). Assiette de la donation en B. */
  readonly valeurVenaleCents: Cents;
  /** Prix de revient des titres pour le donateur (centimes, ≥ 0). Sert à la PV du scénario A. */
  readonly prixRevientCents: Cents;
  /** Lien donateur → donataire (abattement + barème des droits de donation). */
  readonly lienDonataire: LienDonataire;
  /**
   * Donations **antérieures de moins de 15 ans** entre les mêmes personnes (centimes, ≥ 0). Réduisent
   * d'autant l'abattement disponible (rappel fiscal, CGI 784). Défaut 0. cf. SOURCES-DONATION.md §2.5.
   */
  readonly donationsAnterieures15ansCents?: Cents;
  /** Paramètres d'imposition de la plus-value du scénario A (régime + millésime + TMI/parts). */
  readonly imposition: ParametresImposition;
}

/**
 * Données propres au levier L5, en plus du comparatif neutre A/B. Tout est **descriptif** : on chiffre,
 * on **avertit** (abus de droit), on ne désigne **aucun** scénario à retenir (mode A — risque élevé).
 */
export interface DetailsDonation {
  readonly lienDonataire: LienDonataire;
  readonly regime: RegimeImposition;
  /** Abattement applicable au lien (centimes), avant rappel des donations antérieures. */
  readonly abattementBaseCents: Cents;
  /** Abattement effectivement disponible (centimes), après consommation par les donations < 15 ans. */
  readonly abattementDisponibleCents: Cents;

  /** Scénario A — plus-value de cession imposée chez le donateur (centimes). */
  readonly plusValueImposeeACents: Cents;
  /** Scénario A — impôt + PS sur cette plus-value (centimes). */
  readonly impotPlusValueACents: Cents;
  /** Scénario A — montant net donné après impôt sur la PV (centimes) = valeur − impôt PV. */
  readonly montantNetDonneACents: Cents;
  /** Scénario A — assiette taxable aux droits de donation (centimes) = net donné − abattement dispo. */
  readonly assietteDroitsACents: Cents;
  /** Scénario A — droits de donation dus (centimes). */
  readonly droitsDonationACents: Cents;

  /** Scénario B — plus-value latente **purgée** par la donation (centimes), informatif (non imposée). */
  readonly plusValueLatentePurgeeCents: Cents;
  /** Scénario B — assiette taxable aux droits de donation (centimes) = valeur vénale − abattement. */
  readonly assietteDroitsBCents: Cents;
  /** Scénario B — droits de donation dus sur la valeur vénale (centimes). */
  readonly droitsDonationBCents: Cents;

  /** Garde-fous L5 en texte neutre (mode A) — dont l'avertissement abus de droit. Non normatifs. */
  readonly gardeFous: readonly string[];
}

/**
 * Garde-fous L5 en **texte neutre** (mode A — risque le plus élevé). À afficher tels quels ; le premier
 * est l'**avertissement abus de droit donation-cession**, central et non contournable.
 * cf. SOURCES-DONATION.md §3.
 */
export const GARDE_FOUS_DONATION: readonly string[] = [
  "Abus de droit : la donation doit être réelle, antérieure et irrévocable. Si la vente est déjà " +
    "convenue avant la donation, ou si le donateur se réapproprie le prix de cession, l'administration " +
    "peut requalifier l'opération (LPF art. L64) : la plus-value latente redevient alors imposable " +
    "chez le donateur, en plus des droits de donation et de pénalités. La donation ne se présente pas " +
    "comme un montage : sa mise en œuvre relève d'un notaire, hors de ce calcul.",
  "Une donation est irrévocable : « donner et retenir ne vaut ». Vous vous dessaisissez définitivement " +
    "des titres ; le donataire en devient propriétaire et décide seul d'une revente ultérieure.",
  "Les droits de donation sont intégrés au coût comparé : ils s'ajoutent à l'impôt et sont calculés " +
    "sur la valeur vénale au jour de la donation (barème CGI art. 777, après abattement CGI art. 779). " +
    "L'abattement réduit les droits, pas le prix de revient transmis au donataire.",
  "Cette simulation ne chiffre ni les frais de notaire de l'acte, ni le démembrement (donation de la " +
    "nue-propriété avec réserve d'usufruit), ni la plus-value du donataire s'il revend à un cours " +
    "différent de la valeur de la donation. Le rappel des donations de moins de 15 ans (CGI art. 784) " +
    "est approximé sur l'abattement uniquement : faites vérifier un cas avec rappel important.",
];
