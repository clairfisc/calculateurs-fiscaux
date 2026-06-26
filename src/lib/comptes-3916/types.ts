/**
 * Module checklist 3916 / 3916-bis — modèle de données.
 *
 * Moteur de RÈGLES juridiques (pas de calcul) : pour chaque compte étranger saisi,
 * rend un verdict « à déclarer / exonéré / à vérifier » + le formulaire concerné + le
 * motif sourcé. Règles & cas-types : voir SOURCES-3916.md (oracle validé 26/06/2026).
 *
 * Principe directeur (SOURCES §2) : l'obligation porte sur l'EXISTENCE du compte, pas
 * sur son activité — un compte vide/dormant détenu hors de France est à déclarer.
 */

/** Nature du compte saisi par l'utilisateur. */
export type TypeCompte =
  | "banque" // banque classique étrangère
  | "neobanque" // néobanque (Revolut, N26, bunq…)
  | "paiement_emoney" // compte de paiement / monnaie électronique (PayPal…) — exemption possible
  | "titres_cto" // compte-titres ordinaire chez un courtier étranger
  | "pea" // PEA logé chez un teneur de compte étranger (cas ambigu)
  | "exchange_crypto" // compte d'actifs numériques chez un PSAN/exchange
  | "wallet_auto_heberge" // wallet non custodial (Ledger, MetaMask…) — cas ambigu
  | "assurance_vie"; // contrat d'assurance-vie / capitalisation hors de France

/** Verdict rendu par le moteur. */
export type Verdict = "a_declarer" | "exonere" | "a_verifier";

/**
 * Formulaire / régime de rattachement.
 * - `3916`      : comptes bancaires & comptes-titres (CGI art. 1649 A).
 * - `3916-bis`  : comptes d'actifs numériques (CGI art. 1649 bis C).
 * - `1649AA`    : assurance-vie / capitalisation hors de France — obligation DISTINCTE
 *                 (CGI art. 1649 AA, sanction art. 1766), à ne pas traiter en 3916 bancaire.
 */
export type Formulaire = "3916" | "3916-bis" | "1649AA";

/** Un compte étranger tel que saisi (entrée du moteur). */
export interface Compte {
  readonly type: TypeCompte;
  /** Référence à la base d'établissements (`etablissements.ts`), si connu. */
  readonly etablissementId?: string;
  /** Sinon, désignation libre saisie par l'utilisateur. */
  readonly etablissementLibre?: string;
  /** Pays de tenue du compte (code ISO ou nom) — pour la fiche & le barème de sanction. */
  readonly pays?: string;

  // — Champs spécifiques à l'exemption monnaie électronique (type `paiement_emoney`) —
  // Les 3 conditions cumulatives (SOURCES §6). `undefined` = non renseigné → « à vérifier ».
  /** (1) Usage = paiements d'achats / encaissements de **ventes de biens** en ligne. */
  readonly emoneyUsageVentesBiens?: boolean;
  /** (2) Adossé à un autre compte ouvert en France. */
  readonly emoneyAdosseCompteFrancais?: boolean;
  /** (3) Encaissements annuels (€) crédités au titre de ces ventes. */
  readonly emoneyEncaissementsAnnuelsEur?: number;
}

/** Verdict détaillé pour un compte. */
export interface ResultatCompte {
  readonly verdict: Verdict;
  /** Formulaire / régime concerné (null si indéterminé tant que verdict = à_verifier). */
  readonly formulaire: Formulaire | null;
  /** Explication lisible du verdict. */
  readonly motif: string;
  /** Référence à la source (article CGI / BOFiP) — traçabilité = crédibilité. */
  readonly source: string;
}

/** Plafond e-money (SOURCES §6) : encaissements annuels au-delà desquels le compte est déclarable. */
export const SEUIL_EMONEY_EUR = 10_000;
