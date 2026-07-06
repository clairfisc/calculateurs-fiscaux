import { describe, it, expect } from "vitest";
import { calculePurgeMv } from "./compute";
import type { PurgeMvInput } from "./types";

/**
 * Oracle dérivé des moteurs **déjà testés** (`cessions-2074` pour 3VG/3VH/report, `pfu-bareme` pour
 * impôt + PS). Valeurs vérifiées à la main dans les commentaires.
 *
 * Convention impôt + PS (PFU, plus-value mobilière = revenu du patrimoine) — `pfu-bareme` :
 *   IR PFU = 12,8 % × 3VG ; PS patrimoine = 18,6 % × 3VG dès 2025 (fait générateur différencié, §2bis).
 *   Sur 1 000 € de 3VG : IR 128 € + PS 186 € = 314 € (PFU) — proportionnel pour les autres montants.
 */
const eur = (n: number): number => Math.round(n * 100);

/** Construit un input avec des montants nuls par défaut, PFU/2025, TMI 30 %. */
const input = (over: Partial<PurgeMvInput> = {}): PurgeMvInput => ({
  plusValueNetteAnneeCents: 0,
  mvLatenteMobilisableCents: 0,
  mvLatenteARealiserCents: 0,
  imposition: { millesime: 2025, regime: "PFU", tmiBp: 3000 },
  ...over,
});

describe("L1 purge-MV — cas (a) : PV 10 k€ + MV latente 4 k€, purge partielle (PFU 2025)", () => {
  const r = calculePurgeMv(
    input({
      plusValueNetteAnneeCents: eur(10_000),
      mvLatenteMobilisableCents: eur(4_000),
      mvLatenteARealiserCents: eur(4_000),
    }),
  );

  it("scénario A (sans purge) : 3VG 10 000 €, impôt+PS = 3 140 € (1 280 IR + 1 860 PS)", () => {
    expect(r.details.case3vgAEur).toBe(10_000);
    expect(r.scenarioA.assietteImposableCents).toBe(eur(10_000));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(3_140));
    expect(r.details.mvReportableTotaleACents).toBe(0);
  });

  it("scénario B (purge 4 000) : 3VG 6 000 €, impôt+PS = 1 884 € (768 IR + 1 116 PS)", () => {
    expect(r.details.case3vgBEur).toBe(6_000);
    expect(r.scenarioB.assietteImposableCents).toBe(eur(6_000));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(1_884));
    expect(r.details.mvReportableTotaleBCents).toBe(0); // MV entièrement absorbée par la PV
  });

  it("différentiels : −1 256 € d'impôt+PS, −4 000 € de 3VG, report inchangé", () => {
    expect(r.deltaImpotEtPsCents).toBe(eur(1_884) - eur(3_140)); // −125 600 cents
    expect(r.details.deltaCase3vgEur).toBe(-4_000);
    expect(r.details.deltaMvReportableCents).toBe(0);
    expect(r.details.mvRealiseeCents).toBe(eur(4_000));
    expect(r.levier).toBe("purge-mv");
  });
});

describe("L1 purge-MV — cas (b) : PV nulle, purge inutile = simple report (PFU 2025)", () => {
  const r = calculePurgeMv(
    input({
      plusValueNetteAnneeCents: 0,
      mvLatenteMobilisableCents: eur(4_000),
      mvLatenteARealiserCents: eur(4_000),
    }),
  );

  it("impôt+PS identique (≈ 0) dans les deux scénarios : pas de PV à effacer", () => {
    expect(r.scenarioA.impotEtPsCents).toBe(0);
    expect(r.scenarioB.impotEtPsCents).toBe(0);
    expect(r.deltaImpotEtPsCents).toBe(0);
    expect(r.details.case3vgAEur).toBe(0);
    expect(r.details.case3vgBEur).toBe(0);
  });

  it("la moins-value réalisée est simplement reportée : report +4 000 € (3VH)", () => {
    expect(r.details.mvReportableTotaleACents).toBe(0);
    expect(r.details.mvReportableTotaleBCents).toBe(eur(4_000));
    expect(r.details.deltaMvReportableCents).toBe(eur(4_000)); // création de report, pas d'économie d'année
  });
});

describe("L1 purge-MV — cas (c) : MV antérieures 5 k€ + PV 10 k€, purge 3 k€ (ordre d'imputation)", () => {
  // Ordre 2074 : moins-values DE L'ANNÉE d'abord, puis ANTÉRIEURES, puis report.
  const r = calculePurgeMv(
    input({
      plusValueNetteAnneeCents: eur(10_000),
      mvLatenteMobilisableCents: eur(3_000),
      mvLatenteARealiserCents: eur(3_000),
      mvAnterieuresReportablesCents: eur(5_000),
    }),
  );

  it("scénario A : PV 10 000 − antérieures 5 000 → 3VG 5 000 €, impôt+PS 1 570 €", () => {
    // Aucune MV de l'année : les 5 000 € antérieurs s'imputent → 3VG 5 000.
    expect(r.details.case3vgAEur).toBe(5_000);
    expect(r.scenarioA.impotEtPsCents).toBe(eur(1_570)); // 640 IR + 930 PS
    expect(r.details.mvReportableTotaleACents).toBe(0); // antérieures entièrement consommées
  });

  it("scénario B : MV année 3 000 imputée AVANT antérieures → 3VG 2 000 €, impôt+PS 628 €", () => {
    // 10 000 − 3 000 (année) = 7 000 ; − min(7 000, 5 000)=5 000 (antérieures) = 2 000.
    expect(r.details.case3vgBEur).toBe(2_000);
    expect(r.scenarioB.impotEtPsCents).toBe(eur(628)); // 256 IR + 372 PS
    expect(r.details.mvReportableTotaleBCents).toBe(0); // tout absorbé, rien à reporter
  });

  it("différentiels : −942 € d'impôt+PS, −3 000 € de 3VG", () => {
    expect(r.deltaImpotEtPsCents).toBe(eur(628) - eur(1_570)); // −94 200 cents
    expect(r.details.deltaCase3vgEur).toBe(-3_000);
  });
});

describe("L1 purge-MV — cas (d) : régime barème (case 2OP), mode rapide TMI 30 %", () => {
  const r = calculePurgeMv(
    input({
      plusValueNetteAnneeCents: eur(10_000),
      mvLatenteMobilisableCents: eur(4_000),
      mvLatenteARealiserCents: eur(4_000),
      imposition: { millesime: 2025, regime: "BAREME", tmiBp: 3000 },
    }),
  );

  it("A : 3VG 10 000 € → IR barème 2 796 € + PS 1 860 € = 4 656 €", () => {
    // IR = 30 % × 10 000 − 30 % × (6,8 % × 10 000) = 3 000 − 204 = 2 796.
    expect(r.scenarioA.impotEtPsCents).toBe(eur(4_656));
  });

  it("B : 3VG 6 000 € → IR barème 1 678 € + PS 1 116 € = 2 794 €", () => {
    // IR = 30 % × 6 000 − 30 % × (6,8 % × 6 000) = 1 800 − 122,40 = 1 677,60 → 1 678.
    expect(r.scenarioB.impotEtPsCents).toBe(eur(2_794));
    expect(r.details.regime).toBe("BAREME");
  });
});

describe("L1 purge-MV — bornes & invariants", () => {
  it("le montant réalisé est borné au mobilisable (on ne réalise pas plus que disponible)", () => {
    const r = calculePurgeMv(
      input({
        plusValueNetteAnneeCents: eur(10_000),
        mvLatenteMobilisableCents: eur(2_000),
        mvLatenteARealiserCents: eur(9_999),
      }),
    );
    expect(r.details.mvRealiseeCents).toBe(eur(2_000));
    expect(r.details.case3vgBEur).toBe(8_000); // 10 000 − 2 000
  });

  it("réaliser 0 € → A et B identiques (différentiels nuls)", () => {
    const r = calculePurgeMv(
      input({ plusValueNetteAnneeCents: eur(10_000), mvLatenteMobilisableCents: eur(4_000) }),
    );
    expect(r.deltaImpotEtPsCents).toBe(0);
    expect(r.details.deltaCase3vgEur).toBe(0);
    expect(r.details.deltaMvReportableCents).toBe(0);
  });

  it("libellés de scénario neutres et descriptifs (audit lexical mode A)", () => {
    const r = calculePurgeMv(input());
    const interdits = /recommand|optimis|vous devriez|meilleure strat|conseil/i;
    expect(r.scenarioA.libelle).not.toMatch(interdits);
    expect(r.scenarioB.libelle).not.toMatch(interdits);
    for (const g of r.details.gardeFous) expect(g).not.toMatch(interdits);
  });
});
