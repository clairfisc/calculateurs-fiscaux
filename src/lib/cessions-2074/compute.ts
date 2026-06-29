import { arrondiEuro } from "../tax-engine/compute";
import { convertirEnEuros } from "../tax-engine/fx/index";
import type {
  Cents,
  Cession,
  Declaration2074,
  Lot,
  Regime,
  ResultatCession,
} from "./types";

/**
 * Calcul du résultat de cession (formulaire 2074, cadre 5, lignes 512-524) avec PMP, frais et
 * **conversion de change par opération**, puis imputation/report des moins-values (cadre 11) et
 * abattement durée de détention sous barème (cas secondaire). Module pur : aucune I/O, aucune
 * dépendance DOM. Sources et cas-types : voir SOURCES-2074.md.
 */

const DEBUT_PFU_SANS_ABATTEMENT = "2018-01-01";

/** Erreur : la quantité cédée est invalide (≤ 0, ou supérieure à la quantité détenue). */
export class QuantiteCedeeInvalideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuantiteCedeeInvalideError";
  }
}

/**
 * Erreur : sous barème, l'abattement durée de détention exige une date d'acquisition de référence
 * que la base (lots multiples ou PMP direct) ne fournit pas. On refuse plutôt que de trancher à
 * tort (garde-fou, SOURCES-2074.md §5).
 */
export class AbattementDateRequiseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbattementDateRequiseError";
  }
}

/**
 * Erreur : combinaison non modélisée par la Périmètre — abattement durée de détention (barème,
 * titres pré-2018) **et** imputation de moins-values sur un portefeuille à durées potentiellement
 * mixtes. L'interaction fine (cadre 3 / 2074-ABT) relève de l'traitement hors périmètre .
 * cf. SOURCES-2074.md §5 (limite assumée). On refuse explicitement plutôt que de calculer faux.
 */
export class AbattementImputationNonSupporteError extends Error {
  constructor() {
    super(
      "Abattement durée de détention + imputation de moins-values : combinaison non supportée " +
        "par la Périmètre (cf. SOURCES-2074.md §5). Relève de l'traitement hors périmètre .",
    );
    this.name = "AbattementImputationNonSupporteError";
  }
}

/** Coût d'acquisition d'un lot en **centimes d'EUR**, frais inclus, converti au cours du jour. */
function coutLotEurCents(lot: Lot): Cents {
  const fraisCents = lot.fraisCents ?? 0;
  // Montant en centimes de la devise = prix unitaire × quantité (arrondi au centime de devise),
  // majoré des frais d'acquisition (CGI 150-0 D ; SOURCES-2074.md §1).
  const montantDeviseCents = Math.round(lot.prixUnitaireCents * lot.quantite) + fraisCents;
  return convertirEnEuros(montantDeviseCents, lot.devise, lot.dateISO);
}

/**
 * Nombre d'années pleines de détention entre acquisition et cession (calendaire, sans dépendance).
 * « ≥ 2 et < 8 ans » → 50 % ; « ≥ 8 ans » → 65 % (SOURCES-2074.md §5).
 */
function anneesDetention(acqISO: string, cesISO: string): number {
  const [ay, am, ad] = acqISO.split("-").map(Number);
  const [cy, cm, cd] = cesISO.split("-").map(Number);
  let annees = cy - ay;
  // Si on n'a pas encore atteint l'anniversaire d'acquisition dans l'année de cession, on retire 1.
  if (cm < am || (cm === am && cd < ad)) annees -= 1;
  return annees;
}

/** Taux d'abattement de droit commun pour `annees` pleines de détention (0 / 50 / 65). */
export function tauxAbattementDureeDetentionPct(annees: number): 0 | 50 | 65 {
  if (annees >= 8) return 65;
  if (annees >= 2) return 50;
  return 0;
}

/**
 * Date d'acquisition de référence utilisable pour l'abattement (lot unique → sa date ;
 * `dateAcquisitionRefISO` sinon). `undefined` si on ne peut pas la déterminer sans ambiguïté.
 */
function dateAcquisitionReference(cession: Cession): string | undefined {
  if (cession.dateAcquisitionRefISO) return cession.dateAcquisitionRefISO;
  const acq = cession.acquisition;
  if (acq.type === "lots" && acq.lots.length === 1) return acq.lots[0]!.dateISO;
  if (acq.type === "pmp") return acq.dateAcquisitionRefISO;
  return undefined;
}

/**
 * Taux d'abattement applicable à une cession sous un régime donné. Hors barème, ou pour des titres
 * acquis depuis le 1.1.2018, le taux est toujours 0 (SOURCES-2074.md §5). Sous barème, sur une
 * plus-value de titres pré-2018, le taux dépend de la durée de détention.
 *
 * @throws AbattementDateRequiseError si, sous barème, une plus-value ne fournit pas de date
 *         d'acquisition de référence exploitable (lots multiples / PMP direct sans date).
 */
function abattementPct(
  cession: Cession,
  resultatEurCents: Cents,
  regime: Regime,
): 0 | 50 | 65 {
  if (regime !== "BAREME") return 0;
  // L'abattement ne joue que sur une plus-value (les moins-values s'imputent brut sur brut).
  if (resultatEurCents <= 0) return 0;

  const dateAcq = dateAcquisitionReference(cession);
  if (dateAcq === undefined) {
    throw new AbattementDateRequiseError(
      `Cession « ${cession.id ?? cession.dateISO} » : sous barème, l'abattement durée de détention ` +
        "exige une date d'acquisition de référence (dateAcquisitionRefISO).",
    );
  }
  // Titres acquis depuis le 1.1.2018 : exclus du champ de l'abattement.
  if (dateAcq >= DEBUT_PFU_SANS_ABATTEMENT) return 0;

  return tauxAbattementDureeDetentionPct(anneesDetention(dateAcq, cession.dateISO));
}

/**
 * Calcule le résultat d'une **cession** (cadre 5 du 2074) : PMP via les lots (chacun converti à son
 * cours d'acquisition) ou PMP direct, prix de cession net de frais converti au cours de cession,
 * puis résultat signé et abattement éventuel.
 *
 *   ligne 518 = (prix unitaire × quantité − frais de cession), converti en EUR au cours de cession
 *   ligne 523 = PMP unitaire × quantité cédée (coût alloué, le PMP reste inchangé sur le reliquat)
 *   ligne 524 = 518 − 523                                       ← résultat signé
 *
 * cf. SOURCES-2074.md §1-3, §5.
 */
export function calculeCession(cession: Cession, regime: Regime = "PFU"): ResultatCession {
  const q = cession.quantiteCedee;
  if (!(q > 0)) {
    throw new QuantiteCedeeInvalideError(
      `Quantité cédée invalide (${q}) pour la cession « ${cession.id ?? cession.dateISO} ».`,
    );
  }

  // --- Prix de revient alloué + PMP unitaire (EUR centimes) ---
  let pmpUnitaireEurCents: number;
  let prixRevientAlloueEurCents: number;
  const acq = cession.acquisition;
  if (acq.type === "pmp") {
    if (q > acq.quantiteTotale) {
      throw new QuantiteCedeeInvalideError(
        `Quantité cédée (${q}) > quantité détenue (${acq.quantiteTotale}) ` +
          `pour la cession « ${cession.id ?? cession.dateISO} ».`,
      );
    }
    pmpUnitaireEurCents = acq.pmpUnitaireEurCents;
    prixRevientAlloueEurCents = Math.round(acq.pmpUnitaireEurCents * q);
  } else {
    const quantiteTotale = acq.lots.reduce((s, l) => s + l.quantite, 0);
    if (q > quantiteTotale) {
      throw new QuantiteCedeeInvalideError(
        `Quantité cédée (${q}) > quantité détenue (${quantiteTotale}) ` +
          `pour la cession « ${cession.id ?? cession.dateISO} ».`,
      );
    }
    // PMP = coût total (lots convertis chacun à leur cours) / quantité totale (CGI 150-0 D 3 ;
    // SOURCES-2074.md §2-3). Allocation = coût total × q / Q (le PMP reste inchangé sur le reliquat).
    const coutTotalEurCents = acq.lots.reduce((s, l) => s + coutLotEurCents(l), 0);
    pmpUnitaireEurCents = Math.round(coutTotalEurCents / quantiteTotale);
    prixRevientAlloueEurCents = Math.round((coutTotalEurCents * q) / quantiteTotale);
  }

  // --- Prix de cession net de frais, converti au cours du jour de cession (EUR centimes) ---
  const fraisCessionDeviseCents = cession.fraisCents ?? 0;
  const montantCessionDeviseCents =
    Math.round(cession.prixUnitaireCents * q) - fraisCessionDeviseCents;
  const prixCessionNetEurCents = convertirEnEuros(
    montantCessionDeviseCents,
    cession.devise,
    cession.dateISO,
  );

  const resultatEurCents = prixCessionNetEurCents - prixRevientAlloueEurCents;

  // --- Abattement durée de détention (barème, titres pré-2018, plus-value uniquement) ---
  const pct = abattementPct(cession, resultatEurCents, regime);
  const resultatApresAbattementEurCents =
    pct === 0 ? resultatEurCents : Math.round((resultatEurCents * (100 - pct)) / 100);

  return {
    id: cession.id,
    prixCessionNetEurCents,
    prixRevientAlloueEurCents,
    pmpUnitaireEurCents,
    resultatEurCents,
    abattementPct: pct,
    resultatApresAbattementEurCents,
  };
}

/** Entrée de la déclaration : cessions de l'année + régime + stock de moins-values antérieures. */
export interface Declaration2074Input {
  readonly cessions: readonly Cession[];
  /** Régime d'imposition. Défaut PFU. */
  readonly regime?: Regime;
  /**
   * Stock de moins-values **antérieures** reportées (saisie manuelle ; le suivi pluriannuel
   * persistant n'est pas conservé par cet outil), en EUR centimes. Imputées après les moins-values de l'année.
   */
  readonly moinsValuesAnterieuresCents?: Cents;
}

/**
 * Agrège les cessions de l'année en valeurs de cases (3VG / 3VH) et calcule l'imputation et le
 * report des moins-values (CGI 150-0 D 11 ; SOURCES-2074.md §6).
 *
 * Imputation **montant brut sur montant brut** (avant abattement), dans l'ordre du cadre 11 :
 *   1. moins-values **de l'année** sur les plus-values brutes de l'année ;
 *   2. moins-values **antérieures** sur le reliquat.
 * 3VH = moins-value **de l'année** non imputée uniquement ; le reliquat de moins-values antérieures
 * reste reportable mais **hors 3VH**.
 *
 * @throws AbattementImputationNonSupporteError si régime barème avec abattement actif ET
 *         imputation de moins-values (combinaison non modélisée — cf. SOURCES-2074.md §5).
 */
export function calculeDeclaration(input: Declaration2074Input): Declaration2074 {
  const regime: Regime = input.regime ?? "PFU";
  const moinsValuesAnterieuresCents = input.moinsValuesAnterieuresCents ?? 0;

  const cessions = input.cessions.map((c) => calculeCession(c, regime));

  // Plus-values brutes (avant abattement) et moins-values de l'année (valeur positive).
  let plusValueBruteAnneeEurCents = 0;
  let moinsValueAnneeEurCents = 0;
  let plusValueApresAbattementEurCents = 0; // somme des résultats positifs après abattement
  let abattementActif = false;
  for (const r of cessions) {
    if (r.resultatEurCents > 0) {
      plusValueBruteAnneeEurCents += r.resultatEurCents;
      plusValueApresAbattementEurCents += r.resultatApresAbattementEurCents;
      if (r.abattementPct > 0) abattementActif = true;
    } else if (r.resultatEurCents < 0) {
      moinsValueAnneeEurCents += -r.resultatEurCents;
    }
  }

  const aImputation = moinsValueAnneeEurCents > 0 || moinsValuesAnterieuresCents > 0;
  if (abattementActif && aImputation) {
    // Interaction abattement × imputation sur durées mixtes : non modélisée (cf. SOURCES §5).
    throw new AbattementImputationNonSupporteError();
  }

  // --- Imputation brut sur brut (cf. §6) ---
  // 1. Moins-values de l'année sur plus-values brutes de l'année.
  const mvAnneeImputee = Math.min(plusValueBruteAnneeEurCents, moinsValueAnneeEurCents);
  const moinsValueAnneeReportableEurCents = moinsValueAnneeEurCents - mvAnneeImputee;
  const reliquatApresAnnee = plusValueBruteAnneeEurCents - mvAnneeImputee; // ≥ 0
  // 2. Moins-values antérieures sur le reliquat.
  const moinsValuesAnterieuresImputeesEurCents = Math.min(
    reliquatApresAnnee,
    moinsValuesAnterieuresCents,
  );
  const plusValueNetteBruteEurCents = reliquatApresAnnee - moinsValuesAnterieuresImputeesEurCents;
  const moinsValuesAnterieuresRestantesEurCents =
    moinsValuesAnterieuresCents - moinsValuesAnterieuresImputeesEurCents;

  // --- Case 3VG ---
  // Sous PFU (ou barème sans abattement), 3VG = plus-value nette après imputation (pas d'abattement).
  // Sous barème AVEC abattement, on est nécessairement sans imputation (sinon on a levé plus haut) :
  // 3VG = somme des plus-values après abattement.
  const case3VG = arrondiEuro(
    abattementActif ? plusValueApresAbattementEurCents : plusValueNetteBruteEurCents,
  );

  return {
    cessions,
    regime,
    plusValueBruteAnneeEurCents,
    moinsValueAnneeEurCents,
    moinsValuesAnterieuresImputeesEurCents,
    case3VG,
    case3VH: arrondiEuro(moinsValueAnneeReportableEurCents),
    moinsValueAnneeReportableEurCents,
    moinsValuesAnterieuresRestantesEurCents,
    moinsValueReportableTotaleEurCents:
      moinsValueAnneeReportableEurCents + moinsValuesAnterieuresRestantesEurCents,
  };
}
