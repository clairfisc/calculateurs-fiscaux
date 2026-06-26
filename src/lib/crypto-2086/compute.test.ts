import { describe, it, expect } from "vitest";
import { calculeDeclaration2086, estImposable, ValeurGlobaleInvalideError } from "./compute";
import type { Cession } from "./types";

/** Helper fixtures : euros → centimes entiers. */
const eur = (n: number): number => Math.round(n * 100);

/**
 * Oracle 2086 — cas-types gelés contre les sources officielles (CGI 150 VH bis, BOFiP
 * BOI-RPPM-PVBMC-30, formulaire + notice 2086 millésime 2026). Détail et citations :
 * SOURCES-2086.md §8. Tous les cas sont à division exacte (oracle non ambigu).
 */
describe("2086 — méthode de la valeur globale du portefeuille (CGI 150 VH bis)", () => {
  it("cas A — cession simple crypto→fiat : PV = prix − pta×(prix/VGP)", () => {
    // PTA 1000 ; cession VGP 2000, prix 1000 → 1000 − 1000×(1000/2000) = 1000 − 500 = 500.
    const decl = calculeDeclaration2086(
      [{ date: "2025-05-10", prixCessionCents: eur(1000), valeurGlobalePortefeuilleCents: eur(2000) }],
      eur(1000),
    );
    expect(decl.cessions[0].fractionAcquisitionImputeeCents).toBe(eur(500));
    expect(decl.cessions[0].plusValueCents).toBe(eur(500));
    expect(decl.exonere305).toBe(false); // total cessions 1000 € > 305 €
    expect(decl.case3anEur).toBe(500);
    expect(decl.case3bnEur).toBe(0);
  });

  it("cas B — EXEMPLE OFFICIEL de la notice 2086 (75 € puis 675 €, imputation progressive)", () => {
    // Notice 2086 / BOFiP §110 : PTA 1000 ; mars VGP 1200 cession 450 → 75 ;
    // août VGP 1300 cession totale 1300, PTA net = 1000−375 = 625 → 1300 − 625 = 675.
    const decl = calculeDeclaration2086(
      [
        { date: "2025-03-15", prixCessionCents: eur(450), valeurGlobalePortefeuilleCents: eur(1200) },
        { date: "2025-08-20", prixCessionCents: eur(1300), valeurGlobalePortefeuilleCents: eur(1300) },
      ],
      eur(1000),
    );
    expect(decl.cessions[0].fractionAcquisitionImputeeCents).toBe(eur(375));
    expect(decl.cessions[0].plusValueCents).toBe(eur(75));
    expect(decl.cessions[1].prixAcquisitionNetCents).toBe(eur(625)); // 1000 − 375
    expect(decl.cessions[1].plusValueCents).toBe(eur(675));
    expect(decl.plusValueNetteEur).toBe(750); // 75 + 675
    expect(decl.case3anEur).toBe(750);
  });

  it("cas C — total des cessions ≤ 305 € → exonération totale (tout ou rien, II-B)", () => {
    // PTA 1000 ; cession prix 300 (≤ 305), VGP 1500. PV brute serait 300−200 = 100, mais exonéré.
    const decl = calculeDeclaration2086(
      [{ date: "2025-06-01", prixCessionCents: eur(300), valeurGlobalePortefeuilleCents: eur(1500) }],
      eur(1000),
    );
    expect(decl.exonere305).toBe(true);
    expect(decl.case3anEur).toBe(0);
    expect(decl.case3bnEur).toBe(0);
    expect(decl.plusValueNetteEur).toBe(0);
  });

  it("cas C′ — exactement 305 € → encore exonéré (« n'excède pas 305 € »)", () => {
    const decl = calculeDeclaration2086(
      [{ date: "2025-06-01", prixCessionCents: eur(305), valeurGlobalePortefeuilleCents: eur(1500) }],
      eur(1000),
    );
    expect(decl.exonere305).toBe(true);
  });

  it("cas C″ — 305,01 € → imposable dès le 1er euro de plus-value", () => {
    const decl = calculeDeclaration2086(
      [{ date: "2025-06-01", prixCessionCents: eur(305.01), valeurGlobalePortefeuilleCents: eur(1500) }],
      eur(1000),
    );
    expect(decl.exonere305).toBe(false);
  });

  it("cas D — frais : réduisent la PV (ligne 218) mais PAS le ratio (ligne 217)", () => {
    // PTA 1000 ; VGP 2000, prix 1000, frais 50. Minuende 950 ; ratio utilise 1000/2000.
    // PV = 950 − 1000×(1000/2000) = 950 − 500 = 450.
    const decl = calculeDeclaration2086(
      [{
        date: "2025-04-01",
        prixCessionCents: eur(1000),
        fraisCessionCents: eur(50),
        valeurGlobalePortefeuilleCents: eur(2000),
      }],
      eur(1000),
    );
    expect(decl.cessions[0].fractionAcquisitionImputeeCents).toBe(eur(500)); // ratio brut de frais
    expect(decl.cessions[0].plusValueCents).toBe(eur(450)); // 950 − 500
    expect(decl.totalCessionsEur).toBe(950); // ligne 51 = prix net de frais
    expect(decl.case3anEur).toBe(450);
  });

  it("cas E — crypto→crypto (échange sans soulte) : ignoré (II-A), n'altère pas le calcul", () => {
    // Identique au cas A, mais avec un échange actif→actif intercalé : il est filtré.
    const avecEchange: Cession[] = [
      { date: "2025-02-01", contrepartie: "actif-numerique", prixCessionCents: eur(5000), valeurGlobalePortefeuilleCents: eur(8000) },
      { date: "2025-05-10", contrepartie: "fiat", prixCessionCents: eur(1000), valeurGlobalePortefeuilleCents: eur(2000) },
    ];
    const decl = calculeDeclaration2086(avecEchange, eur(1000));
    expect(decl.cessions).toHaveLength(1); // l'échange crypto→crypto n'apparaît pas
    expect(decl.cessions[0].plusValueCents).toBe(eur(500));
    expect(decl.totalCessionsEur).toBe(1000); // l'échange ne compte pas dans l'assiette 305 €
    expect(decl.case3anEur).toBe(500);
  });

  it("estImposable — garde-fou crypto→crypto", () => {
    expect(estImposable("fiat")).toBe(true);
    expect(estImposable("bien-service")).toBe(true);
    expect(estImposable(undefined)).toBe(true); // défaut = fiat
    expect(estImposable("actif-numerique")).toBe(false);
  });

  it("cas F — moins-value : prix < quote-part d'acquisition → MV → 3BN", () => {
    // PTA 2000 ; VGP 1000, prix 500 → 500 − 2000×(500/1000) = 500 − 1000 = −500.
    const decl = calculeDeclaration2086(
      [{ date: "2025-09-01", prixCessionCents: eur(500), valeurGlobalePortefeuilleCents: eur(1000) }],
      eur(2000),
    );
    expect(decl.cessions[0].plusValueCents).toBe(eur(-500));
    expect(decl.case3anEur).toBe(0);
    expect(decl.case3bnEur).toBe(500); // valeur absolue de la MV
    expect(decl.plusValueNetteEur).toBe(-500);
  });

  it("cas G — compensation PV/MV de l'année → moins-value nette → 3BN", () => {
    // PTA 1000 ; C1 VGP 2000 prix 200 → +100 ; C2 VGP 500 prix 400, PTA net 900 →
    // 400 − 900×(400/500) = 400 − 720 = −320 ; net = 100 − 320 = −220.
    const decl = calculeDeclaration2086(
      [
        { date: "2025-03-01", prixCessionCents: eur(200), valeurGlobalePortefeuilleCents: eur(2000) },
        { date: "2025-07-01", prixCessionCents: eur(400), valeurGlobalePortefeuilleCents: eur(500) },
      ],
      eur(1000),
    );
    expect(decl.cessions[0].plusValueCents).toBe(eur(100));
    expect(decl.cessions[1].prixAcquisitionNetCents).toBe(eur(900)); // 1000 − 100
    expect(decl.cessions[1].plusValueCents).toBe(eur(-320));
    expect(decl.plusValueNetteEur).toBe(-220);
    expect(decl.case3bnEur).toBe(220);
    expect(decl.case3anEur).toBe(0);
  });

  it("ordre chronologique : l'imputation suit les dates, pas l'ordre de saisie", () => {
    // Mêmes cessions que le cas B mais saisies à l'envers → résultat identique (tri par date).
    const decl = calculeDeclaration2086(
      [
        { date: "2025-08-20", prixCessionCents: eur(1300), valeurGlobalePortefeuilleCents: eur(1300) },
        { date: "2025-03-15", prixCessionCents: eur(450), valeurGlobalePortefeuilleCents: eur(1200) },
      ],
      eur(1000),
    );
    expect(decl.cessions[0].date).toBe("2025-03-15");
    expect(decl.cessions[0].plusValueCents).toBe(eur(75));
    expect(decl.cessions[1].plusValueCents).toBe(eur(675));
    expect(decl.case3anEur).toBe(750);
  });

  it("valeur globale ≤ 0 → erreur explicite", () => {
    expect(() =>
      calculeDeclaration2086(
        [{ date: "2025-01-01", prixCessionCents: eur(100), valeurGlobalePortefeuilleCents: 0 }],
        eur(1000),
      ),
    ).toThrow(ValeurGlobaleInvalideError);
  });

  it("aucune cession imposable (que des échanges) → déclaration vide, exonérée", () => {
    const decl = calculeDeclaration2086(
      [{ date: "2025-01-01", contrepartie: "actif-numerique", prixCessionCents: eur(9000), valeurGlobalePortefeuilleCents: eur(9000) }],
      eur(1000),
    );
    expect(decl.cessions).toHaveLength(0);
    expect(decl.totalCessionsEur).toBe(0);
    expect(decl.exonere305).toBe(true);
    expect(decl.case3anEur).toBe(0);
    expect(decl.case3bnEur).toBe(0);
  });
});
