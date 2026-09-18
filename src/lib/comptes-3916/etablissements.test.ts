import { describe, it, expect } from "vitest";
import { ETABLISSEMENTS } from "./etablissements";
import { evalueCompte } from "./regles";

/**
 * Invariants sur les surcharges SEO (`nomCourt`, `descriptionSeo`) des fiches
 * établissement. Gèle les garde-fous manquants lors de la 1ʳᵉ version de la fiche
 * Revolut (revue adversariale du 18/09/2026) : une description sur mesure ne doit
 * jamais contredire le verdict par défaut du moteur, ni dépasser la longueur d'une
 * meta description, et un nom court inutile (identique à la raison sociale) est du
 * bruit dans le modèle.
 */
describe("etablissements — invariants des surcharges SEO", () => {
  it("descriptionSeo ≤ 160 caractères (contrainte meta description)", () => {
    for (const etab of ETABLISSEMENTS) {
      if (etab.descriptionSeo === undefined) continue;
      expect(etab.descriptionSeo.length, `descriptionSeo trop longue pour ${etab.id}`).toBeLessThanOrEqual(160);
    }
  });

  it("descriptionSeo ne contredit pas le verdict par défaut du moteur", () => {
    for (const etab of ETABLISSEMENTS) {
      if (etab.descriptionSeo === undefined) continue;
      const r = evalueCompte({ type: etab.typeParDefaut, etablissementId: etab.id });
      if (r.verdict !== "a_declarer") continue;
      // Heuristique volontairement simple : une description qui OUVRE sur « non déclarable »
      // affirme sans nuance le contraire du verdict par défaut affiché dans l'encadré de la
      // fiche (cf. contradiction Revolut encadré « Oui » / section « Non » en dessous).
      // Une mention de « non déclarable » plus loin dans le texte, encadrée par un « : » ou
      // une parenthèse qualifiant un cas particulier (ex. sous-compte IBAN FR), reste admise.
      expect(
        /^non déclarable/i.test(etab.descriptionSeo.trim()),
        `descriptionSeo de ${etab.id} commence par « non déclarable » alors que le verdict par défaut est « à déclarer »`,
      ).toBe(false);
    }
  });

  it("nomCourt, quand défini, diffère de designation (sinon champ mort)", () => {
    for (const etab of ETABLISSEMENTS) {
      if (etab.nomCourt === undefined) continue;
      expect(etab.nomCourt, `nomCourt inutile pour ${etab.id} (identique à designation)`).not.toBe(etab.designation);
    }
  });
});
