import { describe, it, expect } from "vitest";
import { calculeDeclaration } from "../../lib/cessions-2074";
import { convertitCession, toQuantite } from "./saisie";
import type { CessionSaisie } from "./types";

/**
 * Tests de la couche de saisie (parsing/validation) de l'UI 2074-CMV, branchée sur le moteur.
 * Reprend des cas-types de SOURCES-2074.md §8 pour prouver le câblage saisie → moteur.
 */

function cessionBase(p: Partial<CessionSaisie> = {}): CessionSaisie {
  return {
    id: "c1",
    libelle: "",
    dateISO: "",
    devise: "EUR",
    quantiteCedee: "",
    prixUnitaire: "",
    frais: "",
    baseMode: "lots",
    lots: [{ id: "l1", dateISO: "", quantite: "", prixUnitaire: "", frais: "" }],
    pmpUnitaire: "",
    quantiteTotale: "",
    dateAcquisitionRef: "",
    ...p,
  };
}

describe("toQuantite", () => {
  it("parse les décimales et l'espace ; rejette ≤ 0 et le non-numérique", () => {
    expect(toQuantite("10")).toBe(10);
    expect(toQuantite("10,5")).toBe(10.5);
    expect(toQuantite("1 000")).toBe(1000);
    expect(toQuantite("0")).toBeNull();
    expect(toQuantite("-3")).toBeNull();
    expect(toQuantite("abc")).toBeNull();
    expect(toQuantite("")).toBeNull();
  });
});

describe("convertitCession — Cas C (USD, change par opération) via la saisie", () => {
  const saisie = cessionBase({
    libelle: "Apple",
    dateISO: "2025-09-15",
    devise: "USD",
    quantiteCedee: "100",
    prixUnitaire: "130",
    frais: "25",
    lots: [{ id: "l1", dateISO: "2023-06-15", quantite: "100", prixUnitaire: "100", frais: "20" }],
  });

  it("construit la Cession et donne 3VG = 1766", () => {
    const conv = convertitCession(saisie, 0);
    expect(conv.erreurs).toEqual([]);
    expect(conv.cession).not.toBeNull();
    expect(conv.libelle).toBe("Apple");

    const d = calculeDeclaration({ cessions: [conv.cession!] });
    expect(d.case3VG).toBe(1766);
  });
});

describe("convertitCession — base PMP direct", () => {
  it("PMP connu → résultat correct (3VG)", () => {
    const saisie = cessionBase({
      dateISO: "2025-04-01",
      devise: "EUR",
      quantiteCedee: "1",
      prixUnitaire: "8000",
      baseMode: "pmp",
      pmpUnitaire: "5000",
      quantiteTotale: "1",
    });
    const conv = convertitCession(saisie, 0);
    expect(conv.erreurs).toEqual([]);
    const d = calculeDeclaration({ cessions: [conv.cession!] });
    expect(d.case3VG).toBe(3000); // 8000 − 5000
  });
});

describe("convertitCession — validation", () => {
  it("lot incomplet → erreur, pas de cession", () => {
    const saisie = cessionBase({
      dateISO: "2025-09-15",
      quantiteCedee: "100",
      prixUnitaire: "120",
      lots: [{ id: "l1", dateISO: "", quantite: "", prixUnitaire: "", frais: "" }],
    });
    const conv = convertitCession(saisie, 0);
    expect(conv.cession).toBeNull();
    expect(conv.erreurs.length).toBeGreaterThan(0);
  });

  it("quantité cédée manquante → erreur", () => {
    const saisie = cessionBase({
      dateISO: "2025-09-15",
      prixUnitaire: "120",
      lots: [{ id: "l1", dateISO: "2024-01-02", quantite: "100", prixUnitaire: "50", frais: "" }],
    });
    const conv = convertitCession(saisie, 0);
    expect(conv.cession).toBeNull();
    expect(conv.erreurs.some((e) => e.includes("Quantité cédée"))).toBe(true);
  });
});
