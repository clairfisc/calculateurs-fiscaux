/**
 * Contrat partagé du **simulateur d'arbitrage** (mode A, year-round — réf. §X ).
 *
 * Principe invariant, valable pour TOUS les leviers (L1 purge-MV, L2 PFU/barème, L3 timing crypto,
 * L4 PEA/CTO, L5 donation) : on expose un **comparatif neutre A vs B**, jamais une recommandation.
 * Le simulateur **n'invente aucun chiffre fiscal** — chaque levier **compose** un moteur déjà sous
 * test (`cessions-2074`, `pfu-bareme`, `crypto-2086`…) et **diffe** ses sorties (scénario A / B).
 *
 * ⚠️ Mode A (réglementaire) : aucune chaîne de ce module ne doit suggérer une action préférable
 * (« recommandé », « optimisez », « vous devriez », « meilleure stratégie »). Vocabulaire imposé :
 * « simuler / estimer / visualiser / comparer ». Les libellés de scénario sont descriptifs et neutres.
 */

/** Montant en centimes d'euro, entier signé (convention partagée avec les moteurs composés). */
export type Cents = number;

/**
 * Un scénario chiffré : une situation **décrite** (jamais « la meilleure »). `A` = statu quo
 * (« je ne fais rien »), `B` = arbitrage envisagé (« si je fais X »).
 */
export interface ScenarioChiffre {
  readonly id: "A" | "B";
  /** Libellé descriptif et neutre, ex. « Je ne réalise pas mes moins-values ». */
  readonly libelle: string;
  /** Assiette imposable retenue dans ce scénario, après le levier (centimes). */
  readonly assietteImposableCents: Cents;
  /** Impôt sur le revenu + prélèvements sociaux estimés pour ce scénario (centimes). */
  readonly impotEtPsCents: Cents;
}

/**
 * Comparatif neutre A vs B pour un levier donné. `details` porte les éléments **propres au levier**
 * (ex. différentiel de case 3VG et de moins-value reportable pour L1 ; régime gagnant pour L2).
 * On expose le différentiel ; l'utilisateur décide. Aucun champ ne désigne un scénario « à retenir ».
 */
export interface ComparatifArbitrage<TDetails = unknown> {
  /** Identifiant du levier, ex. "purge-mv". */
  readonly levier: string;
  readonly scenarioA: ScenarioChiffre;
  readonly scenarioB: ScenarioChiffre;
  /**
   * impotEtPs(B) − impotEtPs(A), **signé** (centimes). Négatif = le scénario B allège l'imposition
   * de l'année ; positif = il l'alourdit. Présenté tel quel, sans interprétation normative.
   */
  readonly deltaImpotEtPsCents: Cents;
  /** Données spécifiques au levier (voir le `types.ts` de chaque sous-module). */
  readonly details: TDetails;
}
