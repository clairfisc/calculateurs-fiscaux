/**
 * Comparateur PFU vs barème progressif (case 2OP) — moteur de calcul.
 * Module pur. Mécanique et sources : SOURCES-PFU-BAREME.md (§5).
 *
 * RÈGLE D'OR : tout en centimes entiers ; arrondi à l'euro en sortie uniquement.
 */

import type { Cents, ComparateurInput, ComparaisonResult, RegimeGagnant } from "./types";
import {
  PFU_IR_BP,
  ABATTEMENT_DIVIDENDES_BP,
  CSG_DEDUCTIBLE_BP,
  PARAMETRES,
  BAREME_2025,
} from "./rates";

/**
 * Arrondi à l'euro le plus proche (0,5 → euro supérieur), depuis des centimes entiers ≥ 0.
 * Calcul entier pour éviter toute imprécision flottante (même convention que le moteur 2047).
 */
export function arrondiEuro(cents: Cents): number {
  return Math.trunc((cents + 50) / 100);
}

/** Applique un taux en bp à un montant en centimes (troncature entière). */
function appliqueBp(montantCents: Cents, bp: number): Cents {
  return Math.trunc((montantCents * bp) / 10_000);
}

/**
 * Impôt sur le revenu au barème progressif, par quotient familial, en centimes.
 *
 * `IR = barème(revenu imposable / parts) × parts`, calculé tranche par tranche sur les seuils
 * de `BAREME_2025`. ⚠️ Approximations assumées (cf. SOURCES-PFU-BAREME.md §6) : décote et
 * plafonnement du quotient familial **non modélisés** ; les seuils 2026 ne sont pas connus →
 * on applique le barème 2025 pour les deux millésimes.
 *
 * Exporté pour l'oracle de test (points de référence officiels des tranches).
 */
export function impotBareme(revenuImposableCents: Cents, parts: number): Cents {
  const nbParts = parts > 0 ? parts : 1;
  const quotient = Math.max(0, revenuImposableCents) / nbParts;
  let impotParPart = 0;
  let bas = 0;
  for (const tranche of BAREME_2025) {
    const plafondCents = tranche.plafondEur === null ? Infinity : tranche.plafondEur * 100;
    if (quotient > bas) {
      const assietteTranche = Math.min(quotient, plafondCents) - bas;
      impotParPart += (assietteTranche * tranche.tauxBp) / 10_000;
    }
    bas = plafondCents;
    if (quotient <= plafondCents) break;
  }
  return Math.round(impotParPart * nbParts);
}

/**
 * Compare le coût d'impôt total des revenus du capital sous PFU vs option barème (case 2OP).
 *
 * Prélèvements sociaux (PS) : identiques dans les deux régimes, sur le **brut** (D + I + PV).
 *
 * PFU :    IR = 12,8 % × (D + I + PV)                         [aucun abattement]
 * Barème : IR = TMI × (D×60 % + I + PV) − TMI × CSG_déductible
 *          avec CSG_déductible = 6,8 % × (D + I + PV), plancher IR à 0.
 *
 * L'abattement de 40 % ne porte que sur les dividendes éligibles et seulement sous barème ;
 * la CSG déductible n'existe que sous barème. cf. SOURCES-PFU-BAREME.md §4, §5.
 */
export function compareRegimes(input: ComparateurInput): ComparaisonResult {
  const { millesime } = input;
  const D = Math.max(0, input.dividendesCents);
  const I = Math.max(0, input.interetsCents);
  const PV = Math.max(0, input.plusValuesCents);
  const params = PARAMETRES[millesime];

  const brutTotal = D + I + PV;

  // Prélèvements sociaux : même base brute, même montant dans les deux régimes, MAIS le taux
  // dépend de la catégorie (fait générateur différencié, SOURCES §2bis) — les plus-values
  // mobilières (patrimoine) subissent la hausse 18,6 % dès 2025, pas les dividendes/intérêts.
  const psPlacementCents = appliqueBp(D + I, params.psPlacementBp);
  const psPatrimoineCents = appliqueBp(PV, params.psPatrimoineBp);
  const psCents = psPlacementCents + psPatrimoineCents;

  // --- PFU : IR forfaitaire 12,8 % sur le brut.
  const irPfuCents = appliqueBp(brutTotal, PFU_IR_BP);
  const totalPfuCents = irPfuCents + psCents;

  // --- Barème : abattement 40 % sur dividendes ÉLIGIBLES, abattement durée de détention sur les
  // PV pré-2018, CSG déductible.
  // Dividendes non éligibles (SIIC, certains ETF, jetons de présence…) → imposés à 100 %.
  const abattementBp =
    input.dividendesEligiblesAbattement40 === false ? 0 : ABATTEMENT_DIVIDENDES_BP;
  // Abattement pour durée de détention (titres pré-2018, CGI 150-0 D 1 ter) : réduit la SEULE part
  // IR du barème ; les PS et le PFU restent sur 100 % de la PV. Plafonné au montant de PV saisi.
  const pvAbattableCents = Math.min(Math.max(0, input.plusValuesAbattablesCents ?? 0), PV);
  const tauxAbDureeBp = input.tauxAbattementDureeDetentionBp ?? 6500;
  const abattementDureeCents = appliqueBp(pvAbattableCents, tauxAbDureeBp);
  const pvBaremeIrCents = PV - abattementDureeCents;
  const assietteIrCents = appliqueBp(D, 10_000 - abattementBp) + I + pvBaremeIrCents;
  const csgDeductibleCents = appliqueBp(brutTotal, CSG_DEDUCTIBLE_BP);

  // Deux modes de calcul de l'IR marginal du capital au barème :
  let irBaremeCents: Cents;
  let economieCsgCents: Cents;
  if (input.revenuImposableHorsCapitalCents !== undefined) {
    // MODE PRÉCIS : différence de deux impositions (gère le franchissement de tranche).
    const R = Math.max(0, input.revenuImposableHorsCapitalCents);
    const parts = input.parts && input.parts > 0 ? input.parts : 1;
    const irSans = impotBareme(R, parts);
    const irAvecSansCsg = impotBareme(R + assietteIrCents, parts);
    const irAvec = impotBareme(R + assietteIrCents - csgDeductibleCents, parts);
    irBaremeCents = Math.max(0, irAvec - irSans);
    // Valeur marginale de la CSG déductible = ce qu'elle fait gagner en franchissant les tranches.
    economieCsgCents = Math.max(0, irAvecSansCsg - irAvec);
  } else {
    // MODE RAPIDE : taux marginal plat (TMI fournie), approximation §6.
    const tmiBp = input.tmiBp ?? 0;
    const irBrutBaremeCents = appliqueBp(assietteIrCents, tmiBp);
    economieCsgCents = appliqueBp(csgDeductibleCents, tmiBp);
    irBaremeCents = Math.max(0, irBrutBaremeCents - economieCsgCents);
  }
  const totalBaremeCents = irBaremeCents + psCents;

  // Comparaison exacte au centime ; valeurs reportées arrondies à l'euro.
  let gagnant: RegimeGagnant;
  if (totalPfuCents < totalBaremeCents) gagnant = "pfu";
  else if (totalBaremeCents < totalPfuCents) gagnant = "bareme";
  else gagnant = "egalite";

  return {
    millesime,
    pfu: {
      irEur: arrondiEuro(irPfuCents),
      psEur: arrondiEuro(psCents),
      totalEur: arrondiEuro(totalPfuCents),
    },
    bareme: {
      irEur: arrondiEuro(irBaremeCents),
      psEur: arrondiEuro(psCents),
      totalEur: arrondiEuro(totalBaremeCents),
    },
    gagnant,
    ecartEur: arrondiEuro(Math.abs(totalPfuCents - totalBaremeCents)),
    economieCsgDeductibleEur: arrondiEuro(economieCsgCents),
    abattementDureeDetentionEur: arrondiEuro(abattementDureeCents),
  };
}
