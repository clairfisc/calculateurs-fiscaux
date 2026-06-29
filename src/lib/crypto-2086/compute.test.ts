import { describe, it, expect } from "vitest";
import { calculeDeclaration2086, ValeurGlobaleInvalideError } from "./compute";
import type { Operation } from "./types";

/** Helpers fixtures : euros → centimes entiers, et constructeurs d'opérations. */
const eur = (n: number): number => Math.round(n * 100);
const achat = (date: string, montant: number): Operation => ({ type: "achat", date, montantCents: eur(montant) });
const vente = (date: string, prix: number, vgp: number, frais = 0): Operation => ({
  type: "vente",
  date,
  prixCessionCents: eur(prix),
  fraisCessionCents: eur(frais),
  valeurGlobalePortefeuilleCents: eur(vgp),
});

/**
 * Oracle 2086 — cas-types gelés contre les sources officielles (CGI 150 VH bis, BOFiP
 * BOI-RPPM-PVBMC-30, formulaire + notice 2086 millésime 2026). Détail et citations :
 * SOURCES-2086.md §8. Modèle « journal chronologique » : achats + ventes datés.
 */
describe("2086 — méthode de la valeur globale du portefeuille (CGI 150 VH bis)", () => {
  it("cas A — vente simple crypto→fiat : PV = prix − pta×(prix/VGP)", () => {
    // Achat 1000 ; vente VGP 2000, prix 1000 → 1000 − 1000×(1000/2000) = 500.
    const decl = calculeDeclaration2086([achat("2025-01-01", 1000), vente("2025-05-10", 1000, 2000)]);
    expect(decl.ventes[0].fractionAcquisitionImputeeCents).toBe(eur(500));
    expect(decl.ventes[0].plusValueCents).toBe(eur(500));
    expect(decl.exonere305).toBe(false); // total cessions 1000 € > 305 €
    expect(decl.case3anEur).toBe(500);
    expect(decl.case3bnEur).toBe(0);
  });

  it("cas B — EXEMPLE OFFICIEL de la notice 2086 (75 € puis 675 €, imputation progressive)", () => {
    // Notice 2086 / BOFiP §110 : achat 1000 ; mars VGP 1200 vente 450 → 75 ;
    // août VGP 1300 vente 1300, PTA net = 1000−375 = 625 → 1300 − 625 = 675.
    const decl = calculeDeclaration2086([
      achat("2025-01-10", 1000),
      vente("2025-03-15", 450, 1200),
      vente("2025-08-20", 1300, 1300),
    ]);
    expect(decl.ventes[0].fractionAcquisitionImputeeCents).toBe(eur(375));
    expect(decl.ventes[0].plusValueCents).toBe(eur(75));
    expect(decl.ventes[1].prixAcquisitionNetCents).toBe(eur(625)); // 1000 − 375
    expect(decl.ventes[1].plusValueCents).toBe(eur(675));
    expect(decl.plusValueNetteEur).toBe(750); // 75 + 675
    expect(decl.case3anEur).toBe(750);
  });

  it("cas C — total des cessions ≤ 305 € → exonération totale (tout ou rien, II-B)", () => {
    // Achat 1000 ; vente prix 300 (≤ 305), VGP 1500. PV brute serait 300−200 = 100, mais exonéré.
    const decl = calculeDeclaration2086([achat("2025-01-01", 1000), vente("2025-06-01", 300, 1500)]);
    expect(decl.exonere305).toBe(true);
    expect(decl.case3anEur).toBe(0);
    expect(decl.case3bnEur).toBe(0);
    expect(decl.plusValueNetteEur).toBe(0);
  });

  it("cas C′ — exactement 305 € → encore exonéré (« n'excède pas 305 € »)", () => {
    const decl = calculeDeclaration2086([achat("2025-01-01", 1000), vente("2025-06-01", 305, 1500)]);
    expect(decl.exonere305).toBe(true);
  });

  it("cas C″ — 305,01 € → imposable dès le 1er euro de plus-value", () => {
    const decl = calculeDeclaration2086([achat("2025-01-01", 1000), vente("2025-06-01", 305.01, 1500)]);
    expect(decl.exonere305).toBe(false);
  });

  it("cas D — frais : réduisent la PV (ligne 218) mais PAS le ratio (ligne 217)", () => {
    // Achat 1000 ; VGP 2000, prix 1000, frais 50. Minuende 950 ; ratio utilise 1000/2000.
    // PV = 950 − 1000×(1000/2000) = 950 − 500 = 450.
    const decl = calculeDeclaration2086([achat("2025-01-01", 1000), vente("2025-04-01", 1000, 2000, 50)]);
    expect(decl.ventes[0].fractionAcquisitionImputeeCents).toBe(eur(500)); // ratio brut de frais
    expect(decl.ventes[0].plusValueCents).toBe(eur(450)); // 950 − 500
    expect(decl.totalCessionsEur).toBe(950); // ligne 51 = prix net de frais
    expect(decl.case3anEur).toBe(450);
  });

  it("cas F — moins-value : prix < quote-part d'acquisition → MV → 3BN", () => {
    // Achat 2000 ; VGP 1000, prix 500 → 500 − 2000×(500/1000) = 500 − 1000 = −500.
    const decl = calculeDeclaration2086([achat("2025-01-01", 2000), vente("2025-09-01", 500, 1000)]);
    expect(decl.ventes[0].plusValueCents).toBe(eur(-500));
    expect(decl.case3anEur).toBe(0);
    expect(decl.case3bnEur).toBe(500); // valeur absolue de la MV
    expect(decl.plusValueNetteEur).toBe(-500);
  });

  it("cas G — compensation PV/MV de l'année → moins-value nette → 3BN", () => {
    // Achat 1000 ; V1 VGP 2000 prix 200 → +100 ; V2 VGP 500 prix 400, PTA net 900 →
    // 400 − 900×(400/500) = 400 − 720 = −320 ; net = 100 − 320 = −220.
    const decl = calculeDeclaration2086([
      achat("2025-01-01", 1000),
      vente("2025-03-01", 200, 2000),
      vente("2025-07-01", 400, 500),
    ]);
    expect(decl.ventes[0].plusValueCents).toBe(eur(100));
    expect(decl.ventes[1].prixAcquisitionNetCents).toBe(eur(900)); // 1000 − 100
    expect(decl.ventes[1].plusValueCents).toBe(eur(-320));
    expect(decl.plusValueNetteEur).toBe(-220);
    expect(decl.case3bnEur).toBe(220);
    expect(decl.case3anEur).toBe(0);
  });

  it("cas H — RACHAT entre deux ventes : l'achat intercalaire augmente le prix d'acquisition", () => {
    // Achat 1000 ; vente 450/1200 → 75 (ptaNet 625) ; RACHAT 500 (ptaNet 1125) ;
    // vente 1000/2000 → 1000 − 1125×(1000/2000) = 1000 − 562,50 = 437,50.
    const decl = calculeDeclaration2086([
      achat("2025-01-01", 1000),
      vente("2025-03-01", 450, 1200),
      achat("2025-06-01", 500),
      vente("2025-09-01", 1000, 2000),
    ]);
    expect(decl.ventes[0].plusValueCents).toBe(eur(75));
    expect(decl.ventes[1].prixAcquisitionNetCents).toBe(eur(1125)); // 625 + 500 (rachat)
    expect(decl.ventes[1].fractionAcquisitionImputeeCents).toBe(eur(562.5));
    expect(decl.ventes[1].plusValueCents).toBe(eur(437.5));
    // Net = 75 + 437,50 = 512,50 € → arrondi euro 513 (Math.round(512.5)).
    expect(decl.case3anEur).toBe(513);
    expect(decl.case3bnEur).toBe(0);
  });

  it("ordre chronologique : opérations saisies à l'envers → tri par date → résultat identique (cas H)", () => {
    const decl = calculeDeclaration2086([
      vente("2025-09-01", 1000, 2000),
      achat("2025-06-01", 500),
      vente("2025-03-01", 450, 1200),
      achat("2025-01-01", 1000),
    ]);
    expect(decl.ventes[0].date).toBe("2025-03-01");
    expect(decl.ventes[0].plusValueCents).toBe(eur(75));
    expect(decl.ventes[1].plusValueCents).toBe(eur(437.5));
    expect(decl.case3anEur).toBe(513);
  });

  it("edge — que des achats, aucune vente → déclaration vide, exonérée", () => {
    const decl = calculeDeclaration2086([achat("2025-01-01", 1000), achat("2025-02-01", 500)]);
    expect(decl.ventes).toHaveLength(0);
    expect(decl.totalCessionsEur).toBe(0);
    expect(decl.exonere305).toBe(true);
    expect(decl.case3anEur).toBe(0);
    expect(decl.prixAcquisitionRestantCents).toBe(eur(1500));
  });

  it("edge — vente sans achat préalable → prix d'acquisition 0 → PV = prix de cession", () => {
    const decl = calculeDeclaration2086([vente("2025-05-01", 1000, 2000)]);
    expect(decl.ventes[0].prixAcquisitionNetCents).toBe(0);
    expect(decl.ventes[0].plusValueCents).toBe(eur(1000)); // 1000 − 0
    expect(decl.case3anEur).toBe(1000);
  });

  it("report N-1 — le prix d'acquisition net reporté initialise le calcul (sans ligne Achat)", () => {
    // Équivaut à « achat 1000 puis vente 450/1200 » mais via le report : fraction 375, PV 75.
    const decl = calculeDeclaration2086([vente("2025-03-15", 450, 1200)], eur(1000));
    expect(decl.ventes[0].prixAcquisitionNetCents).toBe(eur(1000));
    expect(decl.ventes[0].fractionAcquisitionImputeeCents).toBe(eur(375));
    expect(decl.ventes[0].plusValueCents).toBe(eur(75));
  });

  it("report N-1 + rachat de l'année : le report et les achats s'additionnent", () => {
    // Report 625 (net N-1) + achat 500 dans l'année = ptaNet 1125 ; vente 1000/2000 → 437,50.
    const decl = calculeDeclaration2086(
      [achat("2025-06-01", 500), vente("2025-09-01", 1000, 2000)],
      eur(625),
    );
    expect(decl.ventes[0].prixAcquisitionNetCents).toBe(eur(1125));
    expect(decl.ventes[0].plusValueCents).toBe(eur(437.5));
  });

  it("valeur globale ≤ 0 → erreur explicite", () => {
    expect(() =>
      calculeDeclaration2086([
        achat("2025-01-01", 1000),
        { type: "vente", date: "2025-02-01", prixCessionCents: eur(100), valeurGlobalePortefeuilleCents: 0 },
      ]),
    ).toThrow(ValeurGlobaleInvalideError);
  });
});
