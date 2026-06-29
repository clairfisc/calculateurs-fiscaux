import { describe, it, expect } from "vitest";
import {
  calculeCession,
  calculeDeclaration,
  tauxAbattementDureeDetentionPct,
  QuantiteCedeeInvalideError,
  AbattementDateRequiseError,
  AbattementImputationNonSupporteError,
} from "./compute";
import type { Cession } from "./types";

/**
 * Oracle figé : valeurs calculées à la main et sourcées dans SOURCES-2074.md §8.
 * Cours USD = valeurs réelles du fichier BCE embarqué (ecb-rates.json) :
 *   2023-06-15 : 1 EUR = 1,0819 USD ; 2025-09-15 : 1 EUR = 1,1766 USD.
 * La CI gèle ces valeurs (gate du déploiement).
 */

describe("Cas A — vente simple post-2018, EUR, PFU (plus-value)", () => {
  const cession: Cession = {
    id: "A",
    dateISO: "2025-09-15",
    devise: "EUR",
    quantiteCedee: 100,
    prixUnitaireCents: 80_00, // 80,00 €
    fraisCents: 12_00, // 12,00 € de frais de cession
    acquisition: {
      type: "lots",
      lots: [
        {
          dateISO: "2024-01-02",
          devise: "EUR",
          quantite: 100,
          prixUnitaireCents: 50_00, // 50,00 €
          fraisCents: 10_00, // 10,00 € de frais d'acquisition
        },
      ],
    },
  };

  it("résultat = +2 978,00 €, 3VG = 2978", () => {
    const r = calculeCession(cession);
    expect(r.prixCessionNetEurCents).toBe(798_800); // 7 988,00 €
    expect(r.prixRevientAlloueEurCents).toBe(501_000); // 5 010,00 €
    expect(r.resultatEurCents).toBe(297_800); // +2 978,00 €
    expect(r.abattementPct).toBe(0);

    const d = calculeDeclaration({ cessions: [cession] });
    expect(d.case3VG).toBe(2978);
    expect(d.case3VH).toBe(0);
    expect(d.moinsValueReportableTotaleEurCents).toBe(0);
  });
});

describe("Cas B — plusieurs lots → PMP → cession partielle, EUR", () => {
  const cession: Cession = {
    id: "B",
    dateISO: "2025-09-15",
    devise: "EUR",
    quantiteCedee: 250,
    prixUnitaireCents: 120_00, // 120,00 €
    acquisition: {
      type: "lots",
      lots: [
        { dateISO: "2023-06-15", devise: "EUR", quantite: 100, prixUnitaireCents: 95_00 },
        { dateISO: "2024-01-02", devise: "EUR", quantite: 200, prixUnitaireCents: 105_00 },
        { dateISO: "2024-09-16", devise: "EUR", quantite: 100, prixUnitaireCents: 107_00 },
      ],
    },
  };

  it("PMP = 103,00 €, coût alloué 25 750,00 €, résultat +4 250,00 €, 3VG = 4250", () => {
    const r = calculeCession(cession);
    expect(r.pmpUnitaireEurCents).toBe(103_00); // 41 200 / 400 = 103,00 €
    expect(r.prixRevientAlloueEurCents).toBe(2_575_000); // 103,00 × 250
    expect(r.prixCessionNetEurCents).toBe(3_000_000); // 120,00 × 250
    expect(r.resultatEurCents).toBe(425_000); // +4 250,00 €

    const d = calculeDeclaration({ cessions: [cession] });
    expect(d.case3VG).toBe(4250);
    expect(d.case3VH).toBe(0);
  });
});

describe("Cas C — cession en USD, change par opération", () => {
  const cession: Cession = {
    id: "C",
    dateISO: "2025-09-15", // USD/EUR = 1,1766
    devise: "USD",
    quantiteCedee: 100,
    prixUnitaireCents: 130_00, // 130,00 USD
    fraisCents: 25_00, // 25,00 USD
    acquisition: {
      type: "lots",
      lots: [
        {
          dateISO: "2023-06-15", // USD/EUR = 1,0819
          devise: "USD",
          quantite: 100,
          prixUnitaireCents: 100_00, // 100,00 USD
          fraisCents: 20_00, // 20,00 USD
        },
      ],
    },
  };

  it("acquisition 9 261,48 €, cession 11 027,54 €, résultat +1 766,06 €, 3VG = 1766", () => {
    const r = calculeCession(cession);
    expect(r.prixRevientAlloueEurCents).toBe(926_148); // 1 002 000 / 1,0819
    expect(r.prixCessionNetEurCents).toBe(1_102_754); // 1 297 500 / 1,1766
    expect(r.resultatEurCents).toBe(176_606); // +1 766,06 €

    const d = calculeDeclaration({ cessions: [cession] });
    expect(d.case3VG).toBe(1766);
  });
});

describe("Cas D — moins-value de l'année imputée, reliquat reporté (3VH)", () => {
  const gain: Cession = {
    id: "D-gain",
    dateISO: "2025-04-01",
    devise: "EUR",
    quantiteCedee: 1,
    prixUnitaireCents: 8_000_00, // cession nette 8 000,00 €
    acquisition: { type: "pmp", pmpUnitaireEurCents: 5_000_00, quantiteTotale: 1 }, // revient 5 000 €
  };
  const perte: Cession = {
    id: "D-perte",
    dateISO: "2025-05-01",
    devise: "EUR",
    quantiteCedee: 1,
    prixUnitaireCents: 7_000_00, // cession nette 7 000,00 €
    acquisition: { type: "pmp", pmpUnitaireEurCents: 12_000_00, quantiteTotale: 1 }, // revient 12 000 €
  };

  it("PV 3 000 − MV 5 000 → 3VG = 0, 3VH = 2000, reportable 2 000 €", () => {
    const d = calculeDeclaration({ cessions: [gain, perte] });
    expect(d.plusValueBruteAnneeEurCents).toBe(300_000);
    expect(d.moinsValueAnneeEurCents).toBe(500_000);
    expect(d.case3VG).toBe(0);
    expect(d.case3VH).toBe(2000);
    expect(d.moinsValueAnneeReportableEurCents).toBe(200_000);
    expect(d.moinsValueReportableTotaleEurCents).toBe(200_000);
  });
});

describe("Cas E — moins-value antérieure imputée ; reliquat antérieur hors 3VH", () => {
  const gain: Cession = {
    id: "E",
    dateISO: "2025-04-01",
    devise: "EUR",
    quantiteCedee: 1,
    prixUnitaireCents: 6_000_00, // cession nette 6 000,00 €
    acquisition: { type: "pmp", pmpUnitaireEurCents: 0, quantiteTotale: 1 }, // revient 0 → gain 6 000 €
  };

  it("PV 6 000, MV antérieure 8 000 → 3VG = 0, 3VH = 0, antérieure restante 2 000 €", () => {
    const d = calculeDeclaration({
      cessions: [gain],
      moinsValuesAnterieuresCents: 8_000_00,
    });
    expect(d.case3VG).toBe(0);
    expect(d.case3VH).toBe(0); // pas de moins-value DE L'ANNÉE
    expect(d.moinsValuesAnterieuresImputeesEurCents).toBe(600_000);
    expect(d.moinsValuesAnterieuresRestantesEurCents).toBe(200_000); // reportable, hors 3VH
    expect(d.moinsValueReportableTotaleEurCents).toBe(200_000);
  });
});

describe("Cas F — abattement durée de détention (barème, titres pré-2018)", () => {
  // Acquisition 2014-03-10, cession 2025-06-02 → détention ≥ 8 ans → abattement 65 %.
  const cession: Cession = {
    id: "F",
    dateISO: "2025-06-02",
    devise: "EUR",
    quantiteCedee: 100,
    prixUnitaireCents: 100_00, // cession nette 10 000,00 €
    acquisition: {
      type: "lots",
      lots: [{ dateISO: "2014-03-10", devise: "EUR", quantite: 100, prixUnitaireCents: 40_00 }], // revient 4 000 €
    },
  };

  it("PFU (défaut) : aucun abattement → 3VG = 6000", () => {
    const r = calculeCession(cession, "PFU");
    expect(r.abattementPct).toBe(0);
    expect(r.resultatEurCents).toBe(600_000);
    const d = calculeDeclaration({ cessions: [cession] }); // PFU par défaut
    expect(d.case3VG).toBe(6000);
  });

  it("barème (2OP) : abattement 65 % → 3VG = 2100", () => {
    const r = calculeCession(cession, "BAREME");
    expect(r.abattementPct).toBe(65);
    expect(r.resultatApresAbattementEurCents).toBe(210_000); // 6 000 × 0,35
    const d = calculeDeclaration({ cessions: [cession], regime: "BAREME" });
    expect(d.case3VG).toBe(2100);
  });
});

describe("Cas F′ — abattement tranche 50 % (≥ 2 et < 8 ans, pré-2018, barème)", () => {
  // Acquisition 2017-12-15, cession 2025-06-02 → 7 ans pleins (< 8) → abattement 50 %.
  const cession: Cession = {
    id: "F-prime",
    dateISO: "2025-06-02",
    devise: "EUR",
    quantiteCedee: 100,
    prixUnitaireCents: 100_00, // cession nette 10 000,00 €
    acquisition: {
      type: "lots",
      lots: [{ dateISO: "2017-12-15", devise: "EUR", quantite: 100, prixUnitaireCents: 40_00 }], // revient 4 000 €
    },
  };

  it("barème : abattement 50 % → 3VG = 3000", () => {
    const r = calculeCession(cession, "BAREME");
    expect(r.abattementPct).toBe(50);
    expect(r.resultatApresAbattementEurCents).toBe(300_000); // 6 000 × 0,50
    const d = calculeDeclaration({ cessions: [cession], regime: "BAREME" });
    expect(d.case3VG).toBe(3000);
  });
});

describe("tauxAbattementDureeDetentionPct — bornes", () => {
  it("0 si < 2 ans, 50 si ≥ 2 et < 8, 65 si ≥ 8", () => {
    expect(tauxAbattementDureeDetentionPct(0)).toBe(0);
    expect(tauxAbattementDureeDetentionPct(1)).toBe(0);
    expect(tauxAbattementDureeDetentionPct(2)).toBe(50);
    expect(tauxAbattementDureeDetentionPct(7)).toBe(50);
    expect(tauxAbattementDureeDetentionPct(8)).toBe(65);
    expect(tauxAbattementDureeDetentionPct(20)).toBe(65);
  });
});

describe("Garde-fous", () => {
  it("titres acquis depuis 2018 : pas d'abattement même sous barème", () => {
    const cession: Cession = {
      id: "post2018",
      dateISO: "2025-06-02",
      devise: "EUR",
      quantiteCedee: 100,
      prixUnitaireCents: 100_00,
      acquisition: {
        type: "lots",
        lots: [{ dateISO: "2018-03-01", devise: "EUR", quantite: 100, prixUnitaireCents: 40_00 }],
      },
    };
    const r = calculeCession(cession, "BAREME");
    expect(r.abattementPct).toBe(0);
    expect(calculeDeclaration({ cessions: [cession], regime: "BAREME" }).case3VG).toBe(6000);
  });

  it("quantité cédée > quantité détenue → QuantiteCedeeInvalideError", () => {
    const cession: Cession = {
      id: "trop",
      dateISO: "2025-06-02",
      devise: "EUR",
      quantiteCedee: 150,
      prixUnitaireCents: 100_00,
      acquisition: { type: "pmp", pmpUnitaireEurCents: 40_00, quantiteTotale: 100 },
    };
    expect(() => calculeCession(cession)).toThrow(QuantiteCedeeInvalideError);
  });

  it("quantité cédée nulle → QuantiteCedeeInvalideError", () => {
    const cession: Cession = {
      id: "zero",
      dateISO: "2025-06-02",
      devise: "EUR",
      quantiteCedee: 0,
      prixUnitaireCents: 100_00,
      acquisition: { type: "pmp", pmpUnitaireEurCents: 40_00, quantiteTotale: 100 },
    };
    expect(() => calculeCession(cession)).toThrow(QuantiteCedeeInvalideError);
  });

  it("barème + plus-value sans date d'acquisition de référence → AbattementDateRequiseError", () => {
    const cession: Cession = {
      id: "sansdate",
      dateISO: "2025-06-02",
      devise: "EUR",
      quantiteCedee: 100,
      prixUnitaireCents: 100_00,
      acquisition: { type: "pmp", pmpUnitaireEurCents: 40_00, quantiteTotale: 100 }, // pas de dateAcquisitionRefISO
    };
    expect(() => calculeCession(cession, "BAREME")).toThrow(AbattementDateRequiseError);
  });

  it("barème + abattement actif + imputation de moins-values → AbattementImputationNonSupporteError", () => {
    const gainPre2018: Cession = {
      id: "g",
      dateISO: "2025-06-02",
      devise: "EUR",
      quantiteCedee: 100,
      prixUnitaireCents: 100_00,
      acquisition: {
        type: "lots",
        lots: [{ dateISO: "2014-03-10", devise: "EUR", quantite: 100, prixUnitaireCents: 40_00 }],
      },
    };
    const perte: Cession = {
      id: "p",
      dateISO: "2025-07-01",
      devise: "EUR",
      quantiteCedee: 1,
      prixUnitaireCents: 1_000_00,
      acquisition: { type: "pmp", pmpUnitaireEurCents: 3_000_00, quantiteTotale: 1 },
    };
    expect(() =>
      calculeDeclaration({ cessions: [gainPre2018, perte], regime: "BAREME" }),
    ).toThrow(AbattementImputationNonSupporteError);
  });
});
