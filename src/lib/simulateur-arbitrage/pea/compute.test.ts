import { describe, it, expect } from "vitest";
import { calculePeaCto } from "./compute";
import { GARDE_FOUS_PEA_CTO } from "./types";
import type { PeaCtoInput } from "./types";

/**
 * Oracle **gelé AVANT le code** (VALIDATION-D'ABORD ; cas-types de SOURCES-PEA.md §8).
 * Valeurs vérifiées à la main dans les commentaires.
 *
 * Conventions (cf. SOURCES-PEA.md §7) :
 *   IR CTO/PEA<5ans = part IR de `pfu-bareme` (PFU 12,8 % ; barème : TMI − CSG déd. 6,8 %).
 *   PS CTO = patrimoine (18,6 % dès 2025) ; PS PEA = placement (17,2 % en 2025, 18,6 % en 2026).
 *   IR PEA ≥ 5 ans = 0 (exonéré, CGI 157 5° bis).
 */
const eur = (n: number): number => Math.round(n * 100);

/** Input par défaut : PFU/2025, sortie PEA après 5 ans, gain net nul. */
const input = (over: Partial<PeaCtoInput> = {}): PeaCtoInput => ({
  plusValueLatenteCents: 0,
  horizonPea: "APRES_5_ANS",
  imposition: { millesime: 2025, regime: "PFU", tmiBp: 3000 },
  ...over,
});

describe("L4 PEA/CTO — O1 : PV 10 k€, PFU 2025 (PS PEA 17,2 % vs PS CTO 18,6 %)", () => {
  it("CTO : IR 1 280 € + PS 1 860 € = 3 140 €", () => {
    const r = calculePeaCto(input({ plusValueLatenteCents: eur(10_000), horizonPea: "APRES_5_ANS" }));
    expect(r.details.irCtoCents).toBe(eur(1_280));
    expect(r.details.psCtoCents).toBe(eur(1_860)); // patrimoine 18,6 % dès 2025
    expect(r.scenarioA.impotEtPsCents).toBe(eur(3_140));
  });

  it("PEA < 5 ans : IR 1 280 € + PS 1 720 € (17,2 %) = 3 000 €", () => {
    const r = calculePeaCto(input({ plusValueLatenteCents: eur(10_000), horizonPea: "AVANT_5_ANS" }));
    expect(r.details.irPeaCents).toBe(eur(1_280)); // imposé comme une PV mobilière
    expect(r.details.psPeaCents).toBe(eur(1_720)); // placement 17,2 % en 2025
    expect(r.scenarioB.impotEtPsCents).toBe(eur(3_000));
    // < 5 ans − CTO = différence de PS seule (1 720 − 1 860 = −140)
    expect(r.deltaImpotEtPsCents).toBe(eur(1_720) - eur(1_860));
  });

  it("PEA ≥ 5 ans : IR 0 (exonéré) + PS 1 720 € = 1 720 € ; delta vs CTO = −1 420 €", () => {
    const r = calculePeaCto(input({ plusValueLatenteCents: eur(10_000), horizonPea: "APRES_5_ANS" }));
    expect(r.details.irPeaCents).toBe(0);
    expect(r.details.psPeaCents).toBe(eur(1_720));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(1_720));
    expect(r.deltaImpotEtPsCents).toBe(eur(1_720) - eur(3_140)); // −142 000 cents
    expect(r.levier).toBe("pea-cto");
  });
});

describe("L4 PEA/CTO — O2 : PV 10 k€, PFU 2026 (PS partout 18,6 %)", () => {
  const base = { plusValueLatenteCents: eur(10_000), imposition: { millesime: 2026 as const, regime: "PFU" as const } };

  it("CTO et PEA < 5 ans identiques (3 140 €) : PS PEA = PS CTO = 18,6 % en 2026", () => {
    const a = calculePeaCto(input({ ...base, horizonPea: "AVANT_5_ANS" }));
    expect(a.details.psPeaCents).toBe(eur(1_860)); // placement 18,6 % en 2026
    expect(a.scenarioA.impotEtPsCents).toBe(eur(3_140));
    expect(a.scenarioB.impotEtPsCents).toBe(eur(3_140));
    expect(a.deltaImpotEtPsCents).toBe(0); // < 5 ans ≡ CTO en 2026
  });

  it("PEA ≥ 5 ans : IR 0 + PS 1 860 € = 1 860 €", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "APRES_5_ANS" }));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(1_860));
    expect(r.deltaImpotEtPsCents).toBe(eur(1_860) - eur(3_140));
  });
});

describe("L4 PEA/CTO — O3 : PV 10 k€, barème TMI 30 % 2025", () => {
  const base = {
    plusValueLatenteCents: eur(10_000),
    imposition: { millesime: 2025 as const, regime: "BAREME" as const, tmiBp: 3000 },
  };
  // IR barème = 30 % × 10 000 − 30 % × (6,8 % × 10 000) = 3 000 − 204 = 2 796 €.

  it("CTO : IR barème 2 796 € + PS 1 860 € = 4 656 €", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "APRES_5_ANS" }));
    expect(r.details.irCtoCents).toBe(eur(2_796));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(4_656));
  });

  it("PEA < 5 ans : IR barème 2 796 € + PS 1 720 € = 4 516 €", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "AVANT_5_ANS" }));
    expect(r.details.irPeaCents).toBe(eur(2_796));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(4_516));
    expect(r.details.regime).toBe("BAREME");
  });

  it("PEA ≥ 5 ans : IR 0 + PS 1 720 € = 1 720 €", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "APRES_5_ANS" }));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(1_720));
  });
});

describe("L4 PEA/CTO — O4 : PV 50 k€, PFU 2026", () => {
  const base = { plusValueLatenteCents: eur(50_000), imposition: { millesime: 2026 as const, regime: "PFU" as const } };

  it("CTO : IR 6 400 € + PS 9 300 € = 15 700 €", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "APRES_5_ANS" }));
    expect(r.details.irCtoCents).toBe(eur(6_400)); // 12,8 % × 50 000
    expect(r.details.psCtoCents).toBe(eur(9_300)); // 18,6 % × 50 000
    expect(r.scenarioA.impotEtPsCents).toBe(eur(15_700));
  });

  it("PEA ≥ 5 ans : IR 0 + PS 9 300 € = 9 300 € ; delta vs CTO = −6 400 € (= IR économisé)", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "APRES_5_ANS" }));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(9_300));
    expect(r.deltaImpotEtPsCents).toBe(eur(9_300) - eur(15_700)); // −640 000 cents
  });
});

describe("L4 PEA/CTO — O6 : mode précis (barème par différence de tranches), PV 50 k€ 2025, avant 5 ans", () => {
  // Mode précis = revenu hors capital + parts (au lieu d'une TMI plate). Barème 2025 par part :
  // 0 % ≤ 11 600 · 11 % ≤ 29 579 · 30 % ≤ 84 577 · 41 % ≤ 181 917 · 45 % au-delà.
  // R = 40 000 € (parts 1), PV = 50 000 € :
  //   IR barème du capital = impôt(40 000 + 50 000 − CSGdéd 3 400) − impôt(40 000) = 19 306,52 − 5 103,99
  //     = 14 202,53 € → arrondi euro 14 203 € (part IR CTO, et PEA avant 5 ans = même IR).
  //   PS CTO (patrimoine 18,6 %) = 9 300 € ; PS PEA (placement 17,2 % en 2025) = 8 600 €.
  const base = {
    plusValueLatenteCents: eur(50_000),
    imposition: {
      millesime: 2025 as const,
      regime: "BAREME" as const,
      revenuImposableHorsCapitalCents: eur(40_000),
      parts: 1,
    },
  };

  it("CTO : IR barème précis 14 203 € + PS 9 300 € = 23 503 €", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "AVANT_5_ANS" }));
    expect(r.details.irCtoCents).toBe(eur(14_203));
    expect(r.details.psCtoCents).toBe(eur(9_300)); // patrimoine 18,6 %
    expect(r.scenarioA.impotEtPsCents).toBe(eur(23_503));
    expect(r.details.regime).toBe("BAREME");
  });

  it("PEA < 5 ans : IR précis 14 203 € (= IR CTO) + PS 8 600 € (17,2 %) ; delta = −700 € (PS seule)", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "AVANT_5_ANS" }));
    expect(r.details.irPeaCents).toBe(eur(14_203)); // avant 5 ans = IR CTO, via mode précis
    expect(r.details.psPeaCents).toBe(eur(8_600)); // placement 17,2 % en 2025
    expect(r.scenarioB.impotEtPsCents).toBe(eur(22_803));
    expect(r.deltaImpotEtPsCents).toBe(-eur(700)); // 1,4 pt de PS × 50 000 €
  });

  it("PEA ≥ 5 ans : IR 0 (exonéré) + PS 8 600 € ; delta vs CTO = −14 903 €", () => {
    const r = calculePeaCto(input({ ...base, horizonPea: "APRES_5_ANS" }));
    expect(r.details.irPeaCents).toBe(0);
    expect(r.scenarioB.impotEtPsCents).toBe(eur(8_600));
    expect(r.deltaImpotEtPsCents).toBe(eur(8_600) - eur(23_503)); // −14 903 €
  });
});

describe("L4 PEA/CTO — O5 & bornes : gain net nul, invariants, audit mode A", () => {
  it("O5 — PV 0 € → tous les coûts nuls", () => {
    for (const horizon of ["AVANT_5_ANS", "APRES_5_ANS"] as const) {
      const r = calculePeaCto(input({ plusValueLatenteCents: 0, horizonPea: horizon }));
      expect(r.scenarioA.impotEtPsCents).toBe(0);
      expect(r.scenarioB.impotEtPsCents).toBe(0);
      expect(r.deltaImpotEtPsCents).toBe(0);
    }
  });

  it("invariant : avant 5 ans, IR PEA = IR CTO (gain net imposé comme une PV mobilière)", () => {
    const r = calculePeaCto(input({ plusValueLatenteCents: eur(7_500), horizonPea: "AVANT_5_ANS" }));
    expect(r.details.irPeaCents).toBe(r.details.irCtoCents);
  });

  it("invariant : avant 5 ans, delta PEA−CTO = différence de PS seule (IR identique)", () => {
    const r = calculePeaCto(input({ plusValueLatenteCents: eur(7_500), horizonPea: "AVANT_5_ANS" }));
    expect(r.deltaImpotEtPsCents).toBe(r.details.psPeaCents - r.details.psCtoCents);
  });

  it("invariant : après 5 ans, IR PEA = 0 (exonération)", () => {
    const r = calculePeaCto(input({ plusValueLatenteCents: eur(7_500), horizonPea: "APRES_5_ANS" }));
    expect(r.details.irPeaCents).toBe(0);
  });

  it("le montant négatif est borné à 0 (pas de gain → pas d'impôt)", () => {
    const r = calculePeaCto(input({ plusValueLatenteCents: -5_000, horizonPea: "APRES_5_ANS" }));
    expect(r.scenarioA.impotEtPsCents).toBe(0);
    expect(r.scenarioB.impotEtPsCents).toBe(0);
  });

  it("audit lexical mode A : aucun terme normatif dans les libellés ni les garde-fous", () => {
    const r = calculePeaCto(input({ plusValueLatenteCents: eur(10_000) }));
    const interdits = /recommand|optimis|vous devriez|meilleure strat|conseil/i;
    expect(r.scenarioA.libelle).not.toMatch(interdits);
    expect(r.scenarioB.libelle).not.toMatch(interdits);
    for (const g of r.details.gardeFous) expect(g).not.toMatch(interdits);
  });

  it("les garde-fous couvrent les points structurants (éligibilité UE/EEE, 150 k€, < 5 ans)", () => {
    const joints = GARDE_FOUS_PEA_CTO.join(" ");
    expect(joints).toMatch(/UE|EEE/);
    expect(joints).toMatch(/150\s?000/);
    expect(joints).toMatch(/avant 5 ans/);
    expect(joints).toMatch(/historique/i); // cas ambigu signalé, non tranché
    expect(GARDE_FOUS_PEA_CTO[0]).toMatch(/conditionne/); // éligibilité en premier
  });

  it("cohérence d'arrondi : en 2026, PEA < 5 ans = CTO → delta EXACTEMENT 0, même sur assiette non ronde", () => {
    // En 2026, PS PEA (placement) et PS CTO (patrimoine) sont au même taux (18,6 %) et le PEA < 5 ans
    // est imposé comme une PV mobilière (= IR CTO) : les deux scénarios sont identiques. Régression du
    // mismatch d'arrondi (PS CTO arrondie à l'euro vs PS PEA en centimes) qui affichait un écart parasite.
    for (const pv of [9_999_99, 1_234_567, 33_333_33]) {
      const r = calculePeaCto({
        plusValueLatenteCents: pv,
        horizonPea: "AVANT_5_ANS",
        imposition: { millesime: 2026, regime: "PFU", tmiBp: 3000 },
      });
      expect(r.deltaImpotEtPsCents).toBe(0);
      expect(r.details.psPeaCents).toBe(r.details.psCtoCents);
      expect(r.scenarioA.impotEtPsCents).toBe(r.scenarioB.impotEtPsCents);
    }
  });
});
