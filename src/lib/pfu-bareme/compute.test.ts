import { describe, it, expect } from "vitest";
import { compareRegimes, arrondiEuro } from "./compute";
import { PARAMETRES, TMI_DISPONIBLES_BP } from "./rates";
import type { ComparateurInput } from "./types";

/** Helper fixtures : euros → centimes entiers. */
const eur = (n: number): number => Math.round(n * 100);

/** Construit un input avec des assiettes nulles par défaut. */
const input = (over: Partial<ComparateurInput>): ComparateurInput => ({
  millesime: 2025,
  tmiBp: 3000,
  dividendesEligiblesCents: 0,
  interetsCents: 0,
  plusValuesCents: 0,
  ...over,
});

describe("comparateur PFU vs barème — oracle (SOURCES-PFU-BAREME.md §7)", () => {
  it("O1 — TMI 0 %, 10 000 € de dividendes : barème gagne de 1 280 € (millésime 2025)", () => {
    const r = compareRegimes(input({ tmiBp: 0, dividendesEligiblesCents: eur(10_000) }));
    // PFU : IR 12,8 % = 1 280 € ; PS 17,2 % = 1 720 € ; total 3 000 €.
    expect(r.pfu.irEur).toBe(1280);
    expect(r.pfu.psEur).toBe(1720);
    expect(r.pfu.totalEur).toBe(3000);
    // Barème : IR 0 (TMI 0) ; PS 1 720 € ; total 1 720 €.
    expect(r.bareme.irEur).toBe(0);
    expect(r.bareme.totalEur).toBe(1720);
    expect(r.gagnant).toBe("bareme");
    expect(r.ecartEur).toBe(1280);
  });

  it("O2 — TMI 11 %, 10 000 € dividendes : barème gagne (IR barème 585 € < PFU 1 280 €)", () => {
    const r = compareRegimes(input({ tmiBp: 1100, dividendesEligiblesCents: eur(10_000) }));
    // Barème IR = 11 % × 6 000 − 11 % × 680 = 660 − 74,80 = 585,20 → 585 €.
    expect(r.bareme.irEur).toBe(585);
    expect(r.economieCsgDeductibleEur).toBe(75); // 74,80 → 75
    expect(r.pfu.irEur).toBe(1280);
    expect(r.gagnant).toBe("bareme");
  });

  it("O3 — TMI 30 %, 10 000 € dividendes : PFU gagne (IR barème 1 596 € > PFU 1 280 €)", () => {
    const r = compareRegimes(input({ tmiBp: 3000, dividendesEligiblesCents: eur(10_000) }));
    // Barème IR = 30 % × 6 000 − 30 % × 680 = 1 800 − 204 = 1 596 €.
    expect(r.bareme.irEur).toBe(1596);
    expect(r.economieCsgDeductibleEur).toBe(204);
    expect(r.pfu.irEur).toBe(1280);
    expect(r.gagnant).toBe("pfu");
    expect(r.ecartEur).toBe(316); // 1 596 − 1 280
  });

  it("O4 — TMI 30 %, 10 000 € d'intérêts (pas d'abattement) : PFU gagne nettement", () => {
    const r = compareRegimes(input({ tmiBp: 3000, interetsCents: eur(10_000) }));
    // Barème IR = 30 % × 10 000 − 30 % × 680 = 3 000 − 204 = 2 796 € (aucun abattement 40 %).
    expect(r.bareme.irEur).toBe(2796);
    expect(r.pfu.irEur).toBe(1280);
    expect(r.gagnant).toBe("pfu");
  });

  it("O5 — TMI 41 %, 10 000 € de plus-values (pas d'abattement v0) : PFU gagne", () => {
    const r = compareRegimes(input({ tmiBp: 4100, plusValuesCents: eur(10_000) }));
    // Barème IR = 41 % × 10 000 − 41 % × 680 = 4 100 − 278,80 = 3 821,20 → 3 821 €.
    expect(r.bareme.irEur).toBe(3821);
    expect(r.pfu.irEur).toBe(1280);
    expect(r.gagnant).toBe("pfu");
  });

  it("O6 — millésime 2026 (PS 18,6 %), TMI 30 %, 10 000 € dividendes : PFU total 3 140 €", () => {
    const r = compareRegimes(input({ millesime: 2026, tmiBp: 3000, dividendesEligiblesCents: eur(10_000) }));
    // PS 2026 = 18,6 % = 1 860 € ; PFU total = 1 280 + 1 860 = 3 140 €.
    expect(r.pfu.psEur).toBe(1860);
    expect(r.pfu.totalEur).toBe(3140);
    // Barème : IR 1 596 € + PS 1 860 € = 3 456 €.
    expect(r.bareme.totalEur).toBe(3456);
    expect(r.gagnant).toBe("pfu");
    expect(r.ecartEur).toBe(316);
  });
});

describe("comparateur PFU vs barème — bornes & invariants", () => {
  it("assiettes nulles → tous les totaux à 0, égalité", () => {
    const r = compareRegimes(input({}));
    expect(r.pfu.totalEur).toBe(0);
    expect(r.bareme.totalEur).toBe(0);
    expect(r.gagnant).toBe("egalite");
    expect(r.ecartEur).toBe(0);
  });

  it("les PS sont identiques PFU et barème (même base brute, même taux)", () => {
    const r = compareRegimes(
      input({ tmiBp: 4500, dividendesEligiblesCents: eur(5_000), interetsCents: eur(3_000), plusValuesCents: eur(2_000) }),
    );
    expect(r.pfu.psEur).toBe(r.bareme.psEur);
  });

  it("l'IR barème ne descend jamais sous 0 (plancher CSG déductible)", () => {
    // TMI 0 : l'économie CSG ne peut pas rendre l'IR négatif.
    const r = compareRegimes(input({ tmiBp: 0, dividendesEligiblesCents: eur(50_000) }));
    expect(r.bareme.irEur).toBe(0);
    expect(r.bareme.irEur).toBeGreaterThanOrEqual(0);
  });

  it("les montants négatifs en entrée sont neutralisés (clamp à 0)", () => {
    const r = compareRegimes(input({ tmiBp: 3000, plusValuesCents: -eur(10_000) }));
    expect(r.pfu.totalEur).toBe(0);
    expect(r.bareme.totalEur).toBe(0);
  });
});

describe("comparateur PFU vs barème — paramètres millésimes (oracle taux)", () => {
  it("2025 : PS 17,2 %, PFU 30 %, option 2OP irrévocable", () => {
    expect(PARAMETRES[2025]).toEqual({
      prelevementsSociauxBp: 1720,
      pfuTotalBp: 3000,
      option2opRevocable: false,
    });
  });

  it("2026 : PS 18,6 %, PFU 31,4 %, option 2OP révocable", () => {
    expect(PARAMETRES[2026]).toEqual({
      prelevementsSociauxBp: 1860,
      pfuTotalBp: 3140,
      option2opRevocable: true,
    });
  });

  it("part IR du PFU = 12,8 % implicite dans les deux millésimes (pfuTotal − PS)", () => {
    expect(PARAMETRES[2025].pfuTotalBp - PARAMETRES[2025].prelevementsSociauxBp).toBe(1280);
    expect(PARAMETRES[2026].pfuTotalBp - PARAMETRES[2026].prelevementsSociauxBp).toBe(1280);
  });

  it("les TMI proposables couvrent les 5 tranches du barème", () => {
    expect(TMI_DISPONIBLES_BP).toEqual([0, 1100, 3000, 4100, 4500]);
  });
});

describe("arrondiEuro", () => {
  it("arrondit au plus proche, 0,5 → euro supérieur", () => {
    expect(arrondiEuro(0)).toBe(0);
    expect(arrondiEuro(49)).toBe(0);
    expect(arrondiEuro(50)).toBe(1);
    expect(arrondiEuro(149)).toBe(1);
    expect(arrondiEuro(150)).toBe(2);
  });
});
