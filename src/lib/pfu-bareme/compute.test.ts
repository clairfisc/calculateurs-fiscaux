import { describe, it, expect } from "vitest";
import { compareRegimes, arrondiEuro, impotBareme } from "./compute";
import { PARAMETRES, TMI_DISPONIBLES_BP } from "./rates";
import type { ComparateurInput } from "./types";

/** Helper fixtures : euros → centimes entiers. */
const eur = (n: number): number => Math.round(n * 100);

/** Construit un input avec des assiettes nulles par défaut. */
const input = (over: Partial<ComparateurInput>): ComparateurInput => ({
  millesime: 2025,
  tmiBp: 3000,
  dividendesCents: 0,
  interetsCents: 0,
  plusValuesCents: 0,
  ...over,
});

describe("comparateur PFU vs barème — oracle (SOURCES-PFU-BAREME.md §7)", () => {
  it("O1 — TMI 0 %, 10 000 € de dividendes : barème gagne de 1 280 € (millésime 2025)", () => {
    const r = compareRegimes(input({ tmiBp: 0, dividendesCents: eur(10_000) }));
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
    const r = compareRegimes(input({ tmiBp: 1100, dividendesCents: eur(10_000) }));
    // Barème IR = 11 % × 6 000 − 11 % × 680 = 660 − 74,80 = 585,20 → 585 €.
    expect(r.bareme.irEur).toBe(585);
    expect(r.economieCsgDeductibleEur).toBe(75); // 74,80 → 75
    expect(r.pfu.irEur).toBe(1280);
    expect(r.gagnant).toBe("bareme");
  });

  it("O3 — TMI 30 %, 10 000 € dividendes : PFU gagne (IR barème 1 596 € > PFU 1 280 €)", () => {
    const r = compareRegimes(input({ tmiBp: 3000, dividendesCents: eur(10_000) }));
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

  it("O5 — TMI 41 %, 10 000 € de plus-values 2025 (PS 18,6 % rétroactif) : PFU gagne", () => {
    const r = compareRegimes(input({ tmiBp: 4100, plusValuesCents: eur(10_000) }));
    // Plus-value = revenu du patrimoine → PS 18,6 % dès 2025 (§2bis), pas 17,2 %.
    expect(r.pfu.psEur).toBe(1860);
    // Barème IR = 41 % × 10 000 − 41 % × 680 = 4 100 − 278,80 = 3 821,20 → 3 821 €.
    expect(r.bareme.irEur).toBe(3821);
    expect(r.pfu.irEur).toBe(1280);
    expect(r.gagnant).toBe("pfu");
  });

  it("O6 — millésime 2026 (PS 18,6 %), TMI 30 %, 10 000 € dividendes : PFU total 3 140 €", () => {
    const r = compareRegimes(input({ millesime: 2026, tmiBp: 3000, dividendesCents: eur(10_000) }));
    // PS 2026 = 18,6 % = 1 860 € ; PFU total = 1 280 + 1 860 = 3 140 €.
    expect(r.pfu.psEur).toBe(1860);
    expect(r.pfu.totalEur).toBe(3140);
    // Barème : IR 1 596 € + PS 1 860 € = 3 456 €.
    expect(r.bareme.totalEur).toBe(3456);
    expect(r.gagnant).toBe("pfu");
    expect(r.ecartEur).toBe(316);
  });

  it("O8 — millésime 2025, 10 000 € de plus-values : PS 18,6 % (rétroactif), PFU total 3 140 €", () => {
    // Fait générateur différencié (§2bis) : les plus-values mobilières 2025 sont DÉJÀ à 18,6 %.
    const r = compareRegimes(input({ millesime: 2025, tmiBp: 3000, plusValuesCents: eur(10_000) }));
    expect(r.pfu.psEur).toBe(1860);
    expect(r.pfu.totalEur).toBe(3140); // 1 280 IR + 1 860 PS
  });

  it("O9 — millésime 2025, 10 000 € de dividendes : PS 17,2 %, PFU total 3 000 €", () => {
    // Les dividendes 2025 (produits de placement) restent à 30 %.
    const r = compareRegimes(input({ millesime: 2025, tmiBp: 3000, dividendesCents: eur(10_000) }));
    expect(r.pfu.psEur).toBe(1720);
    expect(r.pfu.totalEur).toBe(3000); // 1 280 IR + 1 720 PS
  });

  it("O8/O9 croisé — même montant, plus-value 2025 coûte plus cher que dividende 2025 en PS", () => {
    const pv = compareRegimes(input({ millesime: 2025, plusValuesCents: eur(10_000) }));
    const div = compareRegimes(input({ millesime: 2025, dividendesCents: eur(10_000) }));
    expect(pv.pfu.psEur).toBeGreaterThan(div.pfu.psEur); // 1 860 > 1 720
  });

  it("O10 — TMI 30 %, 10 000 € dividendes NON éligibles : barème sans abattement (IR 2 796 €)", () => {
    const r = compareRegimes(
      input({ tmiBp: 3000, dividendesCents: eur(10_000), dividendesEligiblesAbattement40: false }),
    );
    // Pas d'abattement 40 % → assiette 100 %, comme des intérêts : 30 % × 10 000 − 30 % × 680 = 2 796 €.
    expect(r.bareme.irEur).toBe(2796);
    // Le PFU est inchangé (jamais d'abattement).
    expect(r.pfu.irEur).toBe(1280);
    expect(r.pfu.psEur).toBe(1720); // dividende = produit de placement
    expect(r.gagnant).toBe("pfu");
  });

  it("O10bis — éligibilité par défaut (true) : l'abattement s'applique sans passer le drapeau", () => {
    const sansDrapeau = compareRegimes(input({ tmiBp: 3000, dividendesCents: eur(10_000) }));
    const eligibleExplicite = compareRegimes(
      input({ tmiBp: 3000, dividendesCents: eur(10_000), dividendesEligiblesAbattement40: true }),
    );
    expect(sansDrapeau.bareme.irEur).toBe(1596); // avec abattement
    expect(eligibleExplicite.bareme.irEur).toBe(1596);
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
      input({ tmiBp: 4500, dividendesCents: eur(5_000), interetsCents: eur(3_000), plusValuesCents: eur(2_000) }),
    );
    expect(r.pfu.psEur).toBe(r.bareme.psEur);
  });

  it("l'IR barème ne descend jamais sous 0 (plancher CSG déductible)", () => {
    // TMI 0 : l'économie CSG ne peut pas rendre l'IR négatif.
    const r = compareRegimes(input({ tmiBp: 0, dividendesCents: eur(50_000) }));
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
  it("2025 : placement 17,2 % (PFU 30 %), patrimoine 18,6 % (PFU 31,4 %), 2OP irrévocable", () => {
    expect(PARAMETRES[2025]).toEqual({
      psPlacementBp: 1720,
      psPatrimoineBp: 1860,
      option2opRevocable: false,
    });
  });

  it("2026 : tout à 18,6 % (PFU 31,4 %), option 2OP révocable", () => {
    expect(PARAMETRES[2026]).toEqual({
      psPlacementBp: 1860,
      psPatrimoineBp: 1860,
      option2opRevocable: true,
    });
  });

  it("part IR du PFU = 12,8 % implicite (PFU placement 2025 = 30 % → 30 − 17,2)", () => {
    expect(3000 - PARAMETRES[2025].psPlacementBp).toBe(1280);
    expect(3140 - PARAMETRES[2025].psPatrimoineBp).toBe(1280);
    expect(3140 - PARAMETRES[2026].psPlacementBp).toBe(1280);
  });

  it("les TMI proposables couvrent les 5 tranches du barème", () => {
    expect(TMI_DISPONIBLES_BP).toEqual([0, 1100, 3000, 4100, 4500]);
  });
});

describe("impotBareme — oracle tranches officielles (revenus 2025, 1 part)", () => {
  it("revenu sous le seuil de 11 600 € → IR 0", () => {
    expect(impotBareme(eur(11_600), 1)).toBe(0);
  });

  it("haut de la tranche à 11 % (29 579 €) → 11 % × (29 579 − 11 600) = 1 978 €", () => {
    // 17 979 × 11 % = 1 977,69 → 1 978 €.
    expect(arrondiEuro(impotBareme(eur(29_579), 1))).toBe(1978);
  });

  it("50 000 € (1 part) → 1 977,69 + 30 % × (50 000 − 29 579) = 8 104 €", () => {
    // 1 977,69 + 6 126,30 = 8 103,99 → 8 104 €.
    expect(arrondiEuro(impotBareme(eur(50_000), 1))).toBe(8104);
  });

  it("quotient familial : 100 000 € sur 2 parts = barème de 50 000 €/part × 2 = 16 208 €", () => {
    expect(arrondiEuro(impotBareme(eur(100_000), 2))).toBe(8104 * 2);
  });

  it("parts ≤ 0 ou absent → traité comme 1 part", () => {
    expect(impotBareme(eur(50_000), 0)).toBe(impotBareme(eur(50_000), 1));
  });
});

describe("comparateur PFU vs barème — mode précis (revenu + parts)", () => {
  it("PP1 — capital qui reste dans la tranche : mode précis ≈ mode rapide à la même TMI", () => {
    // R = 40 000 € (1 part) → TMI 30 %. +1 000 € d'intérêts reste dans la tranche à 30 %.
    const precis = compareRegimes(
      input({ tmiBp: undefined, revenuImposableHorsCapitalCents: eur(40_000), parts: 1, interetsCents: eur(1_000) }),
    );
    const rapide = compareRegimes(input({ tmiBp: 3000, interetsCents: eur(1_000) }));
    expect(precis.bareme.irEur).toBe(rapide.bareme.irEur); // 280 € de part et d'autre
  });

  it("PP2 — franchissement de tranche : le mode précis coûte PLUS que la TMI plate", () => {
    // R = 28 000 € (TMI 11 %) ; +10 000 € d'intérêts poussent dans la tranche à 30 %.
    const precis = compareRegimes(
      input({ tmiBp: undefined, revenuImposableHorsCapitalCents: eur(28_000), parts: 1, interetsCents: eur(10_000) }),
    );
    const rapide = compareRegimes(input({ tmiBp: 1100, interetsCents: eur(10_000) }));
    // Le revenu franchit 11 %→30 % : l'IR réel (≈2 496 €) dépasse largement la TMI plate (≈1 025 €).
    expect(precis.bareme.irEur).toBeGreaterThan(rapide.bareme.irEur);
    expect(precis.bareme.irEur).toBe(2496);
  });

  it("PP3 — le mode précis prend le pas sur tmiBp s'il est fourni", () => {
    const r = compareRegimes(
      input({ tmiBp: 4500, revenuImposableHorsCapitalCents: eur(40_000), parts: 1, interetsCents: eur(1_000) }),
    );
    // tmiBp 45 % ignoré : on reste sur le barème réel (TMI effective 30 %) → 280 €, pas 450 €.
    expect(r.bareme.irEur).toBe(280);
  });

  it("PP4 — abattement 40 % pris en compte en mode précis", () => {
    // 10 000 € de dividendes éligibles, R = 40 000 € (30 %). Assiette = 6 000 € − CSG déductible.
    const elig = compareRegimes(
      input({ tmiBp: undefined, revenuImposableHorsCapitalCents: eur(40_000), parts: 1, dividendesCents: eur(10_000) }),
    );
    const nonElig = compareRegimes(
      input({ tmiBp: undefined, revenuImposableHorsCapitalCents: eur(40_000), parts: 1, dividendesCents: eur(10_000), dividendesEligiblesAbattement40: false }),
    );
    expect(elig.bareme.irEur).toBeLessThan(nonElig.bareme.irEur);
  });
});

describe("abattement durée de détention (titres pré-2018, barème seul) — CGI 150-0 D 1 ter", () => {
  it("AD1 — 65 % sur 10 000 € de PV au barème (TMI 30 %) : assiette IR ramenée à 3 500 €", () => {
    const r = compareRegimes(input({ tmiBp: 3000, plusValuesCents: eur(10_000), plusValuesAbattablesCents: eur(10_000) }));
    // PFU inchangé : 12,8 % × 10 000 + PS 18,6 % = 1 280 + 1 860 = 3 140 €.
    expect(r.pfu.totalEur).toBe(3140);
    // Barème : assiette IR = 10 000 − 65 % = 3 500 € ; IR 30 % = 1 050 − CSG déd. (204) = 846 € ; PS 1 860.
    expect(r.bareme.irEur).toBe(846);
    expect(r.bareme.totalEur).toBe(2706);
    expect(r.abattementDureeDetentionEur).toBe(6500);
  });

  it("AD2 — l'abattement RENVERSE le verdict (PFU sans → barème avec)", () => {
    const sans = compareRegimes(input({ tmiBp: 3000, plusValuesCents: eur(10_000) }));
    const avec = compareRegimes(input({ tmiBp: 3000, plusValuesCents: eur(10_000), plusValuesAbattablesCents: eur(10_000) }));
    // Sans abattement, le barème (PV à 100 %) perd ; avec l'abattement 65 %, il gagne.
    expect(sans.gagnant).toBe("pfu");
    expect(avec.gagnant).toBe("bareme");
    // L'abattement ne touche QUE l'IR du barème : PFU et PS du barème inchangés.
    expect(avec.pfu.totalEur).toBe(sans.pfu.totalEur);
    expect(avec.bareme.psEur).toBe(sans.bareme.psEur);
    expect(avec.bareme.irEur).toBeLessThan(sans.bareme.irEur);
    expect(sans.abattementDureeDetentionEur).toBe(0);
  });

  it("AD3 — abattement partiel : seule une fraction des PV est pré-2018", () => {
    const r = compareRegimes(input({ tmiBp: 3000, plusValuesCents: eur(10_000), plusValuesAbattablesCents: eur(4_000) }));
    // 65 % × 4 000 = 2 600 € retranchés de l'assiette IR.
    expect(r.abattementDureeDetentionEur).toBe(2600);
  });

  it("AD4 — la part abattable est plafonnée au montant de PV saisi", () => {
    const clamp = compareRegimes(input({ tmiBp: 3000, plusValuesCents: eur(10_000), plusValuesAbattablesCents: eur(20_000) }));
    const full = compareRegimes(input({ tmiBp: 3000, plusValuesCents: eur(10_000), plusValuesAbattablesCents: eur(10_000) }));
    expect(clamp.abattementDureeDetentionEur).toBe(6500);
    expect(clamp.bareme.totalEur).toBe(full.bareme.totalEur);
  });

  it("AD5 — taux 50 % (tranche 2-8 ans) si explicitement fourni", () => {
    const r = compareRegimes(input({ tmiBp: 3000, plusValuesCents: eur(10_000), plusValuesAbattablesCents: eur(10_000), tauxAbattementDureeDetentionBp: 5000 }));
    expect(r.abattementDureeDetentionEur).toBe(5000);
  });

  it("AD6 — sans abattement saisi, comportement et résultat strictement inchangés (régression)", () => {
    const r = compareRegimes(input({ tmiBp: 3000, plusValuesCents: eur(10_000) }));
    expect(r.abattementDureeDetentionEur).toBe(0);
    expect(r.bareme.totalEur).toBe(4656); // PV à 100 % : 30 % × 10 000 − CSG déd. + PS = 2 796 + 1 860.
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
