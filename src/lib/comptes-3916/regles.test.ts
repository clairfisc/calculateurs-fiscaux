import { describe, it, expect } from "vitest";
import { evalueCompte, evalueDeclaration } from "./regles";
import type { Compte } from "./types";

/**
 * Cas-types = oracle de validation SOURCES-3916.md §8 (recherche multi-sources +
 * vérif adversariale, 25/25 confirmés). Ces tests GÈLENT les verdicts → toute
 * régression du moteur casse la CI (gate « valider avant déployer »,  notes internes).
 */

describe("moteur 3916/3916-bis — cas-types (oracle SOURCES-3916.md §8)", () => {
  it("1. compte bancaire étranger vide/dormant → à déclarer (existence)", () => {
    const r = evalueCompte({ type: "banque", pays: "DE" });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916");
  });

  it("2. compte Binance crypto sans activité → à déclarer (3916-bis)", () => {
    const r = evalueCompte({ type: "exchange_crypto", etablissementId: "binance" });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916-bis");
  });

  it("3. PayPal ventes de biens + adossé FR + 3 000 € → exonéré", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
      emoneyEncaissementsAnnuelsEur: 3000,
    });
    expect(r.verdict).toBe("exonere");
    expect(r.formulaire).toBeNull();
  });

  it("4. PayPal encaissements 15 000 € (> seuil) → à déclarer", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
      emoneyEncaissementsAnnuelsEur: 15000,
    });
    expect(r.verdict).toBe("a_declarer");
  });

  it("5. PayPal NON adossé à un compte FR → à déclarer", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageVentesBiens: true,
      emoneyAdosseCompteFrancais: false,
      emoneyEncaissementsAnnuelsEur: 2000,
    });
    expect(r.verdict).toBe("a_declarer");
  });

  it("5-bis. e-money conditions non renseignées → à vérifier (on ne tranche pas)", () => {
    const r = evalueCompte({ type: "paiement_emoney" });
    expect(r.verdict).toBe("a_verifier");
  });

  it("6. néobanque (Revolut/N26/bunq) → à déclarer", () => {
    const r = evalueCompte({ type: "neobanque", etablissementId: "revolut" });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916");
  });

  it("7. wallet auto-hébergé (Ledger/MetaMask) → à vérifier", () => {
    const r = evalueCompte({ type: "wallet_auto_heberge" });
    expect(r.verdict).toBe("a_verifier");
  });

  it("8. PEA chez Trade Republic (teneur étranger) → à vérifier", () => {
    const r = evalueCompte({ type: "pea", etablissementId: "trade-republic" });
    expect(r.verdict).toBe("a_verifier");
  });

  it("9. compte-titres ordinaire chez courtier étranger → à déclarer (déf. large)", () => {
    const r = evalueCompte({ type: "titres_cto", etablissementId: "trade-republic" });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916");
  });

  it("10. assurance-vie luxembourgeoise → à déclarer, régime DISTINCT (1649 AA, pas 3916 bancaire)", () => {
    const r = evalueCompte({ type: "assurance_vie", pays: "LU" });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("1649AA"); // surtout PAS "3916"
  });
});

describe("moteur 3916/3916-bis — agrégat", () => {
  it("ventile par verdict et par formulaire", () => {
    const comptes: Compte[] = [
      { type: "banque", pays: "DE" }, // à déclarer 3916
      { type: "exchange_crypto", etablissementId: "kraken" }, // à déclarer 3916-bis
      { type: "paiement_emoney", emoneyUsageVentesBiens: true, emoneyAdosseCompteFrancais: true, emoneyEncaissementsAnnuelsEur: 500 }, // exonéré
      { type: "pea", etablissementId: "trade-republic" }, // à vérifier
    ];
    const d = evalueDeclaration(comptes);
    expect(d.nbADeclarer).toBe(2);
    expect(d.nbADeclarer3916).toBe(1);
    expect(d.nbADeclarer3916bis).toBe(1);
    expect(d.nbExonere).toBe(1);
    expect(d.nbAVerifier).toBe(1);
  });
});
