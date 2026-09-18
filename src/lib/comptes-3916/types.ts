/**
 * Module checklist 3916 / 3916-bis — modèle de données.
 *
 * Moteur de RÈGLES juridiques (pas de calcul) : pour chaque compte étranger saisi,
 * rend un verdict + le formulaire concerné + le motif sourcé. Règles & cas-types :
 * voir SOURCES-3916.md (oracle validé 26/06/2026, révisé 18/09/2026).
 *
 * Principe directeur (SOURCES §2) : l'obligation porte sur l'EXISTENCE du compte, pas
 * sur son activité — un compte vide/dormant détenu hors de France est à déclarer.
 *
 * Principe directeur n°2 (SOURCES §11, révision du 18/09/2026) : le discriminant n'est
 * ni la nationalité de la marque, ni la nature de l'enveloppe (un PEA n'est PAS une
 * catégorie à part), c'est le LIEU D'ÉTABLISSEMENT DU TENEUR de compte. D'où le champ
 * unique `teneurHorsDeFrance`, qui remplace les hedges par type de compte.
 */

/** Nature du compte saisi par l'utilisateur. */
export type TypeCompte =
  | "banque" // banque classique étrangère
  | "neobanque" // néobanque (Revolut, N26, bunq…)
  | "paiement_emoney" // compte de paiement / monnaie électronique (PayPal…) — dispense possible
  | "titres_cto" // compte-titres ordinaire chez un courtier étranger
  | "pea" // PEA — déclarable ou non selon le lieu de tenue, comme tout compte
  | "exchange_crypto" // compte d'actifs numériques chez un PSAN/PSCA
  | "wallet_auto_heberge" // wallet non custodial (Ledger, MetaMask…) — hors champ
  | "assurance_vie"; // contrat d'assurance-vie / capitalisation hors de France

/**
 * Verdict rendu par le moteur.
 *
 * Cinq états, et non trois : la révision du 18/09/2026 a montré qu'un état unique
 * « à vérifier » mentait par amalgame. Il recouvrait trois incertitudes de natures
 * différentes — « le droit ne tranche pas », « il vous manque une information » et
 * « ce cas n'a jamais été dans le champ » — que l'utilisateur ne doit pas confondre,
 * et qu'AUCUN libellé partagé ne peut décrire sans être faux pour l'un des trois.
 *
 * - `a_declarer`     : dans le champ, obligation effective.
 * - `hors_champ`     : n'entre PAS dans le champ (auto-détention, compte tenu en France).
 *                      À ne pas confondre avec `dispense` : ici il n'y a jamais eu
 *                      d'obligation à neutraliser.
 * - `dispense`       : dans le champ, mais dispensé (dispense doctrinale BOFiP §85,
 *                      opposable sur le fondement du LPF art. L. 80 A).
 * - `info_manquante` : le droit tranche ; c'est une donnée utilisateur qui manque.
 * - `non_tranche`    : les textes ne tranchent pas. Conduite à tenir : déclarer.
 */
export type Verdict = "a_declarer" | "hors_champ" | "dispense" | "info_manquante" | "non_tranche";

/**
 * Formulaire / régime de rattachement.
 * - `3916`      : comptes bancaires & comptes-titres (CGI art. 1649 A).
 * - `3916-bis`  : comptes / portefeuilles de crypto-actifs (CGI art. 1649 bis C).
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

  /**
   * L'établissement qui TIENT ce compte est-il situé hors de France ?
   *
   * C'est le discriminant unique des comptes sensibles au lieu de tenue (`banque`,
   * `neobanque`, `titres_cto`, `pea`, `exchange_crypto`). `undefined` = non su →
   * verdict `info_manquante` assorti des deux branches, JAMAIS une affirmation par
   * défaut : une néobanque à succursale française (N26, Revolut, Trade Republic) tient
   * des comptes français pour une partie de ses clients et des comptes étrangers pour
   * l'autre — trancher au hasard produirait une réponse ferme et fausse une fois sur deux.
   *
   * Prérempli depuis `etablissements.ts` quand la base le sait de façon sourcée
   * (ex. DEGIRO : succursale NL + flatex DE ⇒ `true` sur les deux comptes).
   */
  readonly teneurHorsDeFrance?: boolean;

  // — Champs de la dispense des comptes de paiement/encaissement en ligne (SOURCES §6) —
  // BOFiP BOI-CF-CPF-30-20 §85. `undefined` sur le montant = non renseigné.
  /**
   * (1) Objet du compte : réaliser en ligne des paiements d'ACHATS **OU** des
   * encaissements afférents à des VENTES DE BIENS.
   *
   * Le « ou » est celui du BOFiP et il est porteur : nommer la seule branche « ventes »
   * (rédaction d'avant le 18/09/2026) envoyait en `a_declarer` l'utilisateur qui ne fait
   * que payer ses achats en ligne, alors que sa condition (1) est remplie.
   * Les prestations de SERVICES, en revanche, ne sont pas couvertes.
   */
  readonly emoneyUsageAchatsOuVentesBiens?: boolean;
  /** (2) Adossé à un autre compte ouvert en France. */
  readonly emoneyAdosseCompteFrancais?: boolean;
  /**
   * (3) Encaissements annuels (€) afférents à ces ventes, **SUR CE COMPTE UNIQUEMENT**.
   *
   * Renommé le 19/09/2026 (I4-b, contre-vérification post-revue) : le champ s'appelait
   * `emoneyEncaissementsAnnuelsTousComptesEur` et demandait déjà le cumul à l'utilisateur
   * — mais le seuil du BOFiP §85 s'apprécie « en faisant la somme de tous les
   * encaissements effectués sur l'ensemble des comptes détenus par le même titulaire »,
   * et c'est `evalueDeclaration` (pas l'utilisateur) qui doit faire cette somme : lui
   * seul voit toutes les lignes. Demander le cumul par ligne faisait DOUBLE-COMPTER dès
   * que le titulaire, en toute bonne foi, obéissait au libellé et ressaisissait le même
   * total sur chaque compte (2 lignes × 8 000 € de cumul déclaré ⇒ 16 000 € sommés à
   * tort ⇒ `a_declarer` alors que le vrai cumul était 8 000 €). Chaque ligne porte
   * maintenant SON PROPRE montant ; `evalueDeclaration` fait la somme sur les lignes
   * éligibles avant de trancher (voir `regles.ts`).
   */
  readonly emoneyEncaissementsAnnuelsEur?: number;

  /**
   * Wallet auto-hébergé (`wallet_auto_heberge`) : détenez-vous des crypto-actifs uniques et
   * non fongibles (NFT) que vous conservez vous-même, hors plateforme ?
   *
   * Discriminant introduit le 19/09/2026 (revue adversariale) : sans lui, la réserve NFT du
   * moteur ne se déclenchait JAMAIS (le verdict `non_tranche` était du code mort), alors que
   * l'art. 1649 bis C vise depuis le 01/07/2026 les NFT « détenus ou utilisés à l'étranger »
   * sans condition de dépositaire tiers — un cas distinct du wallet « classique », qui reste
   * hors champ. `undefined` = non renseigné → `hors_champ` assorti de la réserve courte (le
   * cas général : la plupart des détenteurs de wallet n'ont pas de NFT auto-conservés, mais
   * on ne l'affirme pas à leur place) ; `false` = renseigné, pas de NFT → `hors_champ` sans
   * réserve ; `true` → `non_tranche`.
   */
  readonly detientNftAutoConserves?: boolean;
}

/** Verdict détaillé pour un compte. */
export interface ResultatCompte {
  readonly verdict: Verdict;
  /** Formulaire / régime concerné (null si aucun : hors champ, dispensé). */
  readonly formulaire: Formulaire | null;
  /** Explication lisible du verdict. */
  readonly motif: string;
  /** Référence à la source (article CGI / BOFiP) — traçabilité = crédibilité. */
  readonly source: string;
}

/** Plafond de la dispense (SOURCES §6) : encaissements annuels, tous comptes confondus. */
export const SEUIL_EMONEY_EUR = 10_000;
