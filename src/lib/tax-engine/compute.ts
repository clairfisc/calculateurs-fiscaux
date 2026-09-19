import type { Cents, Ligne, ResultatLigne, Declaration2047, Case2042 } from "./types";

/**
 * Arrondi à l'euro le plus proche (0,5 → euro supérieur), depuis des centimes entiers ≥ 0.
 * Calcul entier pour éviter toute imprécision flottante.
 */
export function arrondiEuro(cents: Cents): number {
  return Math.trunc((cents + 50) / 100);
}

/**
 * Taux notice applicable (sur net, en bp) selon le type de revenu.
 * Dividendes → `forfaitSurNetBp`. Intérêts → `forfaitInteretSurNetBp` si défini,
 * sinon on retombe sur `forfaitSurNetBp` (rétrocompat : ancien `Pays` sans champ intérêts).
 */
function tauxNoticeBp(ligne: Ligne): number {
  if (ligne.type === "interet") {
    return ligne.pays.forfaitInteretSurNetBp ?? ligne.pays.forfaitSurNetBp;
  }
  return ligne.pays.forfaitSurNetBp;
}

/**
 * Détermine la case du 2042 / 2042C où reporter le montant BRUT de la ligne (routage post-2047,
 * notice 2047-NOT rev. 2025 ; cf. SOURCES-2047.md §5). Le montant reporté (calculeDeclaration)
 * est le brut (net + crédit retenu), pas le net — cette fonction ne fait que choisir la case.
 *
 *   intérêt                              → 2TR  (« intérêts et autres produits de placement à revenu fixe »)
 *   dividende éligible abattement 40 %   → 2DC  (« revenus d'actions et parts de sociétés ayant leur siège
 *                                                 dans un État de l'UE ou à convention avec clause d'assistance »)
 *   dividende NON éligible (ETF, etc.)   → 2TS  (« autres revenus distribués […] non susceptibles de
 *                                                 bénéficier de l'abattement de 40 % »)
 *
 * Par défaut un dividende est réputé éligible (2DC) : tous les `Pays` de notre table sont UE ou
 * à convention avec clause d'assistance. Le routage en 2TS est explicite via `eligibleAbattement40:
 * false` sur la ligne (autres revenus distribués / fonds distribuants).
 *
 * NOTE incertaine (non tranchée ici, défaut = 2DC) : la qualification fine 2DC/2TS d'un fonds ou ETF
 * donné dépend de sa nature juridique et de son IFU, pas seulement du pays — le moteur s'en remet à
 * l'indicateur `eligibleAbattement40` fourni par l'appelant plutôt que de l'inventer.
 */
function case2042(ligne: Ligne): Case2042 {
  if (ligne.type === "interet") return "2TR";
  // Dividende : 2DC par défaut, 2TS si explicitement non éligible à l'abattement de 40 %.
  return ligne.eligibleAbattement40 === false ? "2TS" : "2DC";
}

/**
 * Calcule une ligne du cadre 2 du 2047 (sources : SOURCES-2047.md).
 *
 *   ligne 203 = montant NET encaissé (déjà fourni, en centimes)
 *   ligne 204 = taux notice applicable SUR LE NET (dividendes ou intérêts)
 *   ligne 205 = 203 × 204                                  ← « Résultat »
 *   ligne 206 = impôt réellement supporté à l'étranger
 *   ligne 207 = min(205, 206)                              ← crédit retenu (plafond conventionnel)
 *
 * Le taux notice s'applique au NET, jamais au brut : la notice a déjà converti la
 * convention (15 % brut → 17,6 % net = 15/85). Le `min(205, 206)` traite à lui seul
 * le cas « retenue étrangère > convention » (DE 26,375 %, CH 35 %) : on retient 205,
 * l'excédent (206 − 207) n'est pas récupérable côté FR. cf. SOURCES-2047.md §2.
 *
 * Une ligne n'ouvre droit à crédit que si (a) le pays a un forfait > 0 pour ce type de
 * revenu (pas `c/` dans la notice) ET (b) un impôt étranger a réellement été supporté
 * (sinon pas de double imposition à éliminer — ex. dividendes UK retenus à 0 %).
 * cf. SOURCES-2047.md §3.
 *
 * Le second plafond (impôt français, via 8VL/8PL) est appliqué par l'administration.
 */
export function calculeLigne(ligne: Ligne): ResultatLigne {
  const tauxBp = tauxNoticeBp(ligne);
  const ligne205Cents = Math.trunc((ligne.netEncaisseCents * tauxBp) / 10_000);
  const ligne205Eur = arrondiEuro(ligne205Cents);
  const ligne206Eur = arrondiEuro(ligne.impotEtrangerCents);
  const ligne207Eur = Math.min(ligne205Eur, ligne206Eur);
  const excedentNonRecuperableEur = Math.max(ligne206Eur - ligne207Eur, 0);
  // Le pays ouvre conventionnellement droit à crédit (forfait > 0) ET un impôt étranger
  // a effectivement été retenu : sans retenue, rien à éliminer (ex. dividendes UK à 0 %).
  const ouvreDroitCredit = tauxBp > 0 && ligne206Eur > 0;
  return {
    ligne205Eur,
    ligne206Eur,
    ligne207Eur,
    excedentNonRecuperableEur,
    ouvreDroitCredit,
    case2042: case2042(ligne),
  };
}

/** Agrège plusieurs lignes en valeurs de cases (8VL = crédits, 8PL = bases nettes ouvrant droit). */
export function calculeDeclaration(lignes: readonly Ligne[]): Declaration2047 {
  const resultats = lignes.map(calculeLigne);
  let case8vlEur = 0;
  let case8plEur = 0;
  // Routage 2042 (2DC/2TS/2TR) : on reporte le BRUT, pas le net, quelle que soit
  // l'ouverture du crédit (le revenu reste imposable même sans crédit).
  // Ligne 208 du 2047 : « Revenus crédit d'impôt inclus total lignes 203 + 207 ».
  // La notice 2047-NOT 2026 (« Modalités déclaratives ») exige de reporter « le
  // revenu brut sans déduction de l'impôt étranger » ; Brochure IR 2026 p.126 :
  // « montant brut, majoré du crédit d'impôt conventionnel ». Brut = net encaissé
  // (203) + crédit RETENU (207, pas le 205 théorique — c'est ce qui est effectivement
  // ajouté au net sur la ligne 208). cf. SOURCES-2047.md §5.
  const report2042: Record<Case2042, number> = { "2DC": 0, "2TS": 0, "2TR": 0 };
  lignes.forEach((ligne, i) => {
    const r = resultats[i]!;
    if (r.ouvreDroitCredit) {
      case8vlEur += r.ligne207Eur;
      case8plEur += arrondiEuro(ligne.netEncaisseCents);
    }
    report2042[r.case2042] += arrondiEuro(ligne.netEncaisseCents) + r.ligne207Eur;
  });
  return { lignes: resultats, case8vlEur, case8plEur, report2042 };
}
