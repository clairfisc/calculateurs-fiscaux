import { describe, it, expect } from "vitest";
import { calculeDonation } from "./compute";
import { GARDE_FOUS_DONATION, type DonationInput } from "./types";

/**
 * Oracle gelé du levier **L5 — donation avant cession**. Valeurs **vérifiées à la main** et sourcées
 * dans SOURCES-DONATION.md §4 (barème CGI 777, abattements CGI 779, purge CGI 150-0 D 1). cf. .
 *
 * Convention PV PFU 2025 (composée via `pfu-bareme`) : impôt + PS = **31,4 %** de la 3VG (12,8 % IR +
 * 18,6 % PS, fait générateur PS différencié — même base que l'oracle purge-mv : 10 000 € → 3 140 €).
 * Les droits de donation sont le seul calcul neuf, gelé ci-dessous (barème CGI 777, abattement CGI 779).
 */
const eur = (n: number): number => Math.round(n * 100);

/** Input par défaut : enfant, PFU 2025, pas de donation antérieure. */
const input = (over: Partial<DonationInput> = {}): DonationInput => ({
  valeurVenaleCents: 0,
  prixRevientCents: 0,
  lienDonataire: "enfant",
  imposition: { millesime: 2025, regime: "PFU" },
  ...over,
});

describe("L5 donation — cas (a) : enfant, valeur 200 k€, revient 50 k€, PV latente 150 k€", () => {
  const r = calculeDonation(
    input({ valeurVenaleCents: eur(200_000), prixRevientCents: eur(50_000) }),
  );

  it("scénario A (vendre puis donner) : PV 150 000 € → impôt PV 47 100 €, droits sur net 152 900 € = 8 774 €", () => {
    expect(r.details.plusValueImposeeACents).toBe(eur(150_000));
    expect(r.details.impotPlusValueACents).toBe(eur(47_100)); // 31,4 % × 150 000
    expect(r.details.montantNetDonneACents).toBe(eur(152_900)); // 200 000 − 47 100
    expect(r.details.assietteDroitsACents).toBe(eur(52_900)); // 152 900 − 100 000 abattement
    expect(r.details.droitsDonationACents).toBe(eur(8_774));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(55_874)); // 47 100 + 8 774
  });

  it("scénario B (donner les titres) : PV purgée, droits sur valeur 200 000 € = 18 194 €", () => {
    expect(r.details.plusValueLatentePurgeeCents).toBe(eur(150_000));
    expect(r.details.assietteDroitsBCents).toBe(eur(100_000)); // 200 000 − 100 000
    expect(r.details.droitsDonationBCents).toBe(eur(18_194));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(18_194)); // PV non imposée
  });

  it("différentiel (B − A) = −37 680 € ; abattement plein 100 000 €", () => {
    expect(r.deltaImpotEtPsCents).toBe(eur(18_194) - eur(55_874)); // −37 680 €
    expect(r.details.abattementBaseCents).toBe(eur(100_000));
    expect(r.details.abattementDisponibleCents).toBe(eur(100_000));
    expect(r.levier).toBe("donation");
  });
});

describe("L5 donation — cas (b) : enfant, valeur 80 k€, PV latente 80 k€ (sous l'abattement)", () => {
  const r = calculeDonation(input({ valeurVenaleCents: eur(80_000), prixRevientCents: 0 }));

  it("A : impôt PV 25 120 €, net donné 54 880 € < abattement → 0 € de droits", () => {
    expect(r.details.impotPlusValueACents).toBe(eur(25_120)); // 31,4 % × 80 000
    expect(r.details.montantNetDonneACents).toBe(eur(54_880));
    expect(r.details.assietteDroitsACents).toBe(0); // 54 880 − 100 000 < 0
    expect(r.details.droitsDonationACents).toBe(0);
    expect(r.scenarioA.impotEtPsCents).toBe(eur(25_120));
  });

  it("B : PV purgée, 80 000 € < abattement → 0 € de droits ; Δ = −25 120 €", () => {
    expect(r.details.assietteDroitsBCents).toBe(0);
    expect(r.details.droitsDonationBCents).toBe(0);
    expect(r.scenarioB.impotEtPsCents).toBe(0);
    expect(r.deltaImpotEtPsCents).toBe(-eur(25_120));
  });
});

describe("L5 donation — cas (c) : enfant, valeur 200 k€, PV 150 k€, donation antérieure 60 k€ (< 15 ans)", () => {
  const r = calculeDonation(
    input({
      valeurVenaleCents: eur(200_000),
      prixRevientCents: eur(50_000),
      donationsAnterieures15ansCents: eur(60_000),
    }),
  );

  it("abattement résiduel 40 000 € (100 000 − 60 000)", () => {
    expect(r.details.abattementDisponibleCents).toBe(eur(40_000));
  });

  it("A : droits sur 112 900 € = 20 774 € ; coût total 67 874 €", () => {
    expect(r.details.assietteDroitsACents).toBe(eur(112_900)); // 152 900 − 40 000
    expect(r.details.droitsDonationACents).toBe(eur(20_774));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(67_874)); // 47 100 + 20 774
  });

  it("B : droits sur 160 000 € = 30 194 € ; coût total 30 194 € ; Δ = −37 680 €", () => {
    expect(r.details.assietteDroitsBCents).toBe(eur(160_000)); // 200 000 − 40 000
    expect(r.details.droitsDonationBCents).toBe(eur(30_194));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(30_194));
    expect(r.deltaImpotEtPsCents).toBe(eur(30_194) - eur(67_874)); // −37 680 €
  });
});

describe("L5 donation — cas (d) : frère/sœur, valeur 100 k€, PV latente 40 k€ (barème 35/45 %)", () => {
  const r = calculeDonation(
    input({
      valeurVenaleCents: eur(100_000),
      prixRevientCents: eur(60_000),
      lienDonataire: "frere-soeur",
    }),
  );

  it("abattement 15 932 € ; A : impôt PV 12 560 €, droits sur 71 508 € = 29 736 €, coût total 42 296 €", () => {
    expect(r.details.abattementBaseCents).toBe(eur(15_932));
    expect(r.details.impotPlusValueACents).toBe(eur(12_560)); // 31,4 % × 40 000
    expect(r.details.montantNetDonneACents).toBe(eur(87_440)); // 100 000 − 12 560
    expect(r.details.assietteDroitsACents).toBe(eur(71_508)); // 87 440 − 15 932
    expect(r.details.droitsDonationACents).toBe(eur(29_736)); // 35 %×24 430 + 45 %×47 078
    expect(r.scenarioA.impotEtPsCents).toBe(eur(42_296)); // 12 560 + 29 736
  });

  it("B : droits sur 84 068 € = 35 388 € ; Δ = −6 908 €", () => {
    expect(r.details.assietteDroitsBCents).toBe(eur(84_068)); // 100 000 − 15 932
    expect(r.details.droitsDonationBCents).toBe(eur(35_388));
    expect(r.deltaImpotEtPsCents).toBe(eur(35_388) - eur(42_296)); // −6 908 €
  });
});

describe("L5 donation — cas (e) : tiers (60 %, aucun abattement), valeur 50 k€, PV latente 50 k€", () => {
  const r = calculeDonation(
    input({ valeurVenaleCents: eur(50_000), prixRevientCents: 0, lienDonataire: "tiers" }),
  );

  it("abattement nul ; A : impôt PV 15 700 € + droits 60 %×34 300 = 20 580 € → 36 280 €", () => {
    expect(r.details.abattementBaseCents).toBe(0);
    expect(r.details.impotPlusValueACents).toBe(eur(15_700)); // 31,4 % × 50 000
    expect(r.details.montantNetDonneACents).toBe(eur(34_300)); // 50 000 − 15 700
    expect(r.details.droitsDonationACents).toBe(eur(20_580)); // 60 % × 34 300
    expect(r.scenarioA.impotEtPsCents).toBe(eur(36_280));
  });

  it("B : droits 60 %×50 000 = 30 000 € ; Δ = −6 280 €", () => {
    expect(r.details.droitsDonationBCents).toBe(eur(30_000));
    expect(r.scenarioB.impotEtPsCents).toBe(eur(30_000));
    expect(r.deltaImpotEtPsCents).toBe(-eur(6_280));
  });
});

describe("L5 donation — cas (f) : petit-enfant (abattement 31 865 €, barème ligne directe)", () => {
  const r = calculeDonation(
    input({ valeurVenaleCents: eur(200_000), prixRevientCents: eur(50_000), lienDonataire: "petit-enfant" }),
  );

  it("A : PV 150 000 € → impôt 47 100 €, droits sur 121 035 € = 22 401 €, coût total 69 501 €", () => {
    expect(r.details.abattementBaseCents).toBe(eur(31_865));
    expect(r.details.impotPlusValueACents).toBe(eur(47_100));
    expect(r.details.assietteDroitsACents).toBe(eur(121_035)); // 152 900 − 31 865
    expect(r.details.droitsDonationACents).toBe(eur(22_401));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(69_501));
  });

  it("B : droits sur 168 135 € = 31 821 € ; Δ = −37 680 €", () => {
    expect(r.details.assietteDroitsBCents).toBe(eur(168_135)); // 200 000 − 31 865
    expect(r.details.droitsDonationBCents).toBe(eur(31_821));
    expect(r.deltaImpotEtPsCents).toBe(eur(31_821) - eur(69_501));
  });
});

describe("L5 donation — cas (g) : neveu/nièce (55 % proportionnel, abattement 7 967 €)", () => {
  const r = calculeDonation(
    input({ valeurVenaleCents: eur(100_000), prixRevientCents: eur(40_000), lienDonataire: "neveu-niece" }),
  );

  it("A : PV 60 000 € → impôt 18 840 €, droits 55 %×73 193 = 40 256 €, coût total 59 096 €", () => {
    expect(r.details.abattementBaseCents).toBe(eur(7_967));
    expect(r.details.impotPlusValueACents).toBe(eur(18_840));
    expect(r.details.assietteDroitsACents).toBe(eur(73_193)); // 81 160 − 7 967
    expect(r.details.droitsDonationACents).toBe(eur(40_256));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(59_096));
  });

  it("B : droits 55 %×92 033 = 50 618 € ; Δ = −8 478 €", () => {
    expect(r.details.droitsDonationBCents).toBe(eur(50_618));
    expect(r.deltaImpotEtPsCents).toBe(eur(50_618) - eur(59_096));
  });
});

describe("L5 donation — cas (h) : conjoint/PACS (abattement 80 724 €, barème ligne directe)", () => {
  const r = calculeDonation(
    input({ valeurVenaleCents: eur(200_000), prixRevientCents: eur(50_000), lienDonataire: "conjoint-pacs" }),
  );

  it("A : droits sur 72 176 € = 12 630 €, coût total 59 730 €", () => {
    expect(r.details.abattementBaseCents).toBe(eur(80_724));
    expect(r.details.assietteDroitsACents).toBe(eur(72_176)); // 152 900 − 80 724
    expect(r.details.droitsDonationACents).toBe(eur(12_630));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(59_730));
  });

  it("B : droits sur 119 276 € = 22 050 € ; Δ = −37 680 €", () => {
    expect(r.details.assietteDroitsBCents).toBe(eur(119_276)); // 200 000 − 80 724
    expect(r.details.droitsDonationBCents).toBe(eur(22_050));
    expect(r.deltaImpotEtPsCents).toBe(eur(22_050) - eur(59_730));
  });
});

describe("L5 donation — cas (j) : enfant, valeur 1,2 M€ (tranches hautes 20/30/40 %)", () => {
  const r = calculeDonation(
    input({ valeurVenaleCents: eur(1_200_000), prixRevientCents: 0, lienDonataire: "enfant" }),
  );

  it("A : impôt PV 376 800 €, droits sur 723 200 € = 159 922 € (jusqu'à la tranche 30 %)", () => {
    expect(r.details.impotPlusValueACents).toBe(eur(376_800)); // 31,4 % × 1 200 000
    expect(r.details.assietteDroitsACents).toBe(eur(723_200)); // net donné 823 200 − 100 000 abattement
    expect(r.details.droitsDonationACents).toBe(eur(159_922));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(536_722));
  });

  it("B : droits sur 1 100 000 € = 292 678 € (traverse 20/30/40 %) ; Δ = −244 044 €", () => {
    expect(r.details.assietteDroitsBCents).toBe(eur(1_100_000)); // 1 200 000 − 100 000
    expect(r.details.droitsDonationBCents).toBe(eur(292_678));
    expect(r.deltaImpotEtPsCents).toBe(eur(292_678) - eur(536_722));
  });
});

describe("L5 donation — cas (i) : impôt PV sous option barème (case 2OP), enfant 2025", () => {
  // regime BAREME + mode précis (R = 30 000 €, parts 1) : l'impôt sur la PV passe par la branche
  // barème de `pfu-bareme` (≠ PFU). PV 60 000 € → impôt + PS barème 28 084 € (vs 18 840 € en PFU).
  const r = calculeDonation(
    input({
      valeurVenaleCents: eur(60_000),
      prixRevientCents: 0,
      lienDonataire: "enfant",
      imposition: {
        millesime: 2025,
        regime: "BAREME",
        revenuImposableHorsCapitalCents: eur(30_000),
        parts: 1,
      },
    }),
  );

  it("l'impôt PV emprunte bien la branche barème (28 084 €, ≠ PFU 18 840 €)", () => {
    expect(r.details.regime).toBe("BAREME");
    expect(r.details.impotPlusValueACents).toBe(eur(28_084));
  });

  it("net donné < abattement 100 000 € → droits nuls des deux côtés ; Δ = −28 084 €", () => {
    expect(r.details.droitsDonationACents).toBe(0);
    expect(r.details.droitsDonationBCents).toBe(0);
    expect(r.deltaImpotEtPsCents).toBe(-eur(28_084));
  });
});

describe("L5 donation — cas (k) : base des droits arrondie à l'euro avant barème", () => {
  it("assiette 100,60 € (tiers, 60 %) → base arrondie à 101 € → droits 61 € (et non 60 €)", () => {
    // Saisie au centime : valeur vénale 100,60 €, tiers (abattement 0) → assiette droits B = 100,60 €.
    // Le barème s'applique sur la base arrondie à l'euro (101 €) : 60 % × 101 = 60,60 → 61 €.
    // Sans l'arrondi de base, 60 % × 100,60 = 60,36 → 60 € : ce test fige la convention (pratique CGI).
    const r = calculeDonation(input({ valeurVenaleCents: 100_60, prixRevientCents: 0, lienDonataire: "tiers" }));
    expect(r.details.assietteDroitsBCents).toBe(100_60);
    expect(r.details.droitsDonationBCents).toBe(eur(61));
  });
});

describe("L5 donation — bornes & invariants", () => {
  it("valeur = revient (pas de PV) : aucune purge, A et B ne diffèrent que par l'assiette des droits", () => {
    const r = calculeDonation(input({ valeurVenaleCents: eur(200_000), prixRevientCents: eur(200_000) }));
    expect(r.details.plusValueImposeeACents).toBe(0);
    expect(r.details.impotPlusValueACents).toBe(0);
    expect(r.details.plusValueLatentePurgeeCents).toBe(0);
    // Sans impôt PV, le net donné = valeur vénale → A et B ont la même assiette de droits → Δ = 0.
    expect(r.deltaImpotEtPsCents).toBe(0);
  });

  it("donations antérieures ≥ abattement : abattement disponible borné à 0", () => {
    const r = calculeDonation(
      input({ valeurVenaleCents: eur(100_000), donationsAnterieures15ansCents: eur(150_000) }),
    );
    expect(r.details.abattementDisponibleCents).toBe(0);
    expect(r.details.assietteDroitsBCents).toBe(eur(100_000));
  });

  it("audit lexical mode A : aucun terme normatif dans les libellés ni les garde-fous", () => {
    const r = calculeDonation(input({ valeurVenaleCents: eur(200_000), prixRevientCents: eur(50_000) }));
    const interdits = /recommand|optimis|vous devriez|meilleure strat|conseil/i;
    expect(r.scenarioA.libelle).not.toMatch(interdits);
    expect(r.scenarioB.libelle).not.toMatch(interdits);
    for (const g of r.details.gardeFous) expect(g).not.toMatch(interdits);
  });

  it("garde-fous L5 : l'avertissement abus de droit est présent et en tête", () => {
    expect(GARDE_FOUS_DONATION[0]).toMatch(/abus de droit/i);
    expect(GARDE_FOUS_DONATION.some((g) => /irréversibl|irrévocable|donner et retenir/i.test(g))).toBe(true);
    expect(GARDE_FOUS_DONATION.some((g) => /droits de donation/i.test(g))).toBe(true);
  });
});
