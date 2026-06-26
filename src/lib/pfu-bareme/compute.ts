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
  const { millesime, tmiBp } = input;
  const D = Math.max(0, input.dividendesEligiblesCents);
  const I = Math.max(0, input.interetsCents);
  const PV = Math.max(0, input.plusValuesCents);
  const params = PARAMETRES[millesime];

  const brutTotal = D + I + PV;

  // Prélèvements sociaux : même base brute, même taux dans les deux régimes.
  const psCents = appliqueBp(brutTotal, params.prelevementsSociauxBp);

  // --- PFU : IR forfaitaire 12,8 % sur le brut.
  const irPfuCents = appliqueBp(brutTotal, PFU_IR_BP);
  const totalPfuCents = irPfuCents + psCents;

  // --- Barème : abattement 40 % sur dividendes, CSG déductible, IR à la TMI.
  const assietteIrCents = appliqueBp(D, 10_000 - ABATTEMENT_DIVIDENDES_BP) + I + PV;
  const irBrutBaremeCents = appliqueBp(assietteIrCents, tmiBp);
  const csgDeductibleCents = appliqueBp(brutTotal, CSG_DEDUCTIBLE_BP);
  const economieCsgCents = appliqueBp(csgDeductibleCents, tmiBp);
  const irBaremeCents = Math.max(0, irBrutBaremeCents - economieCsgCents);
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
  };
}
