import { describe, it, expect } from "vitest";
import { calculeTimingCrypto } from "./compute";
import type { TimingCryptoInput } from "./types";

/**
 * Oracle dérivé des moteurs **déjà testés** (`crypto-2086` pour la case 3AN / le seuil 305 €,
 * `pfu-bareme` pour impôt + PS). Valeurs vérifiées à la main dans les commentaires.
 *
 * Méthode de la valeur globale (150 VH bis) : pour une cession de prix `M` sur un portefeuille de
 * valeur globale `V` avec un prix d'acquisition total `P`, la quote-part imputée vaut `round(P·M/V)`
 * et la plus-value `M − round(P·M/V)`. Le moteur 2086 reporte le prix d'acquisition net restant
 * d'une année à l'autre (ligne 223), ce que le levier exploite pour le fractionnement.
 *
 * Convention impôt + PS (PFU, plus-value crypto = plus-value mobilière) — `pfu-bareme` :
 *   sur 80 000 € de 3AN : IR 12,8 % = 10 240 € + PS 18,6 % = 14 880 € → 25 120 € (PFU 2025).
 *   sur 600 € de 3AN : IR 77 € + PS 112 € = 188 €.
 */
const eur = (n: number): number => Math.round(n * 100);

/** Construit un input avec des montants nuls par défaut, PFU/2025, TMI 30 %. */
const input = (over: Partial<TimingCryptoInput> = {}): TimingCryptoInput => ({
  montantTotalAConvertirCents: 0,
  prixAcquisitionTotalCents: 0,
  valeurGlobalePortefeuilleCents: 0,
  nbFractions: 1,
  imposition: { millesime: 2025, regime: "PFU", tmiBp: 3000 },
  ...over,
});

describe("L3 timing-crypto — cas (a) : grosse conversion, le fractionnement ne change RIEN", () => {
  // Convertir 100 000 € d'un portefeuille de 200 000 € (acquis 40 000 €) :
  // A (1 fois) : 3AN = 100 000 − round(40 000·100 000/200 000) = 100 000 − 20 000 = 80 000 €.
  // B (2 ans)  : an 1 : 50 000 − round(40 000·50 000/200 000)=10 000 → 40 000 ; report acq = 30 000.
  //              an 2 : 50 000 − round(30 000·50 000/150 000)=10 000 → 40 000. Σ = 80 000 €.
  // Aucune année sous 305 € → même assiette, même impôt : le timing est neutre ici.
  const r = calculeTimingCrypto(
    input({
      montantTotalAConvertirCents: eur(100_000),
      prixAcquisitionTotalCents: eur(40_000),
      valeurGlobalePortefeuilleCents: eur(200_000),
      nbFractions: 2,
    }),
  );

  it("A : 3AN cumulée 80 000 €, impôt+PS = 25 120 €", () => {
    expect(r.details.case3anAEur).toBe(80_000);
    expect(r.scenarioA.assietteImposableCents).toBe(eur(80_000));
    expect(r.scenarioA.impotEtPsCents).toBe(eur(25_120));
    expect(r.details.exonere305A).toBe(false);
  });

  it("B (2 ans) : 3AN cumulée identique 80 000 €, impôt+PS = 25 120 €", () => {
    expect(r.details.case3anBEur).toBe(80_000);
    expect(r.scenarioB.impotEtPsCents).toBe(eur(25_120));
    expect(r.details.nbAnneesExonerees305B).toBe(0);
  });

  it("différentiels nuls : le fractionnement ne modifie ni l'assiette ni l'impôt", () => {
    expect(r.deltaImpotEtPsCents).toBe(0);
    expect(r.details.deltaCase3anEur).toBe(0);
    expect(r.details.nbFractions).toBe(2);
    expect(r.levier).toBe("timing-crypto");
  });
});

describe("L3 timing-crypto — cas (b) : effet du seuil 305 € (fractionner passe sous le seuil)", () => {
  // Convertir 600 € (prix d'acquisition 0, portefeuille 600 €) :
  // A (1 fois)  : total cessions 600 € > 305 € → imposable. 3AN = 600 €, impôt+PS = 188 €.
  // B (2 ans)   : 300 € par an ≤ 305 € → CHAQUE année exonérée (II-B). 3AN = 0, impôt+PS = 0.
  const r = calculeTimingCrypto(
    input({
      montantTotalAConvertirCents: eur(600),
      prixAcquisitionTotalCents: 0,
      valeurGlobalePortefeuilleCents: eur(600),
      nbFractions: 2,
    }),
  );

  it("A : cession unique 600 € imposable → 3AN 600 €, impôt+PS 188 €", () => {
    expect(r.details.case3anAEur).toBe(600);
    expect(r.details.exonere305A).toBe(false);
    expect(r.scenarioA.impotEtPsCents).toBe(eur(188));
  });

  it("B : 2 × 300 € → chaque année exonérée (305 €) → 3AN 0, impôt+PS 0", () => {
    expect(r.details.case3anBEur).toBe(0);
    expect(r.details.nbAnneesExonerees305B).toBe(2);
    expect(r.scenarioB.impotEtPsCents).toBe(0);
  });

  it("différentiel : le fractionnement annule l'assiette et l'impôt (−188 €)", () => {
    expect(r.deltaImpotEtPsCents).toBe(-eur(188));
    expect(r.details.deltaCase3anEur).toBe(-600);
  });
});

describe("L3 timing-crypto — cas (c) : nbFractions = 1 → B identique à A", () => {
  const r = calculeTimingCrypto(
    input({
      montantTotalAConvertirCents: eur(50_000),
      prixAcquisitionTotalCents: eur(10_000),
      valeurGlobalePortefeuilleCents: eur(100_000),
      nbFractions: 1,
    }),
  );

  it("A et B coïncident : différentiels nuls", () => {
    // 3AN = 50 000 − round(10 000·50 000/100 000)=5 000 → 45 000 € (même valeur pour A et B).
    expect(r.details.case3anAEur).toBe(45_000);
    expect(r.details.case3anBEur).toBe(45_000);
    expect(r.deltaImpotEtPsCents).toBe(0);
    expect(r.details.deltaCase3anEur).toBe(0);
    expect(r.details.nbFractions).toBe(1);
  });
});

describe("L3 timing-crypto — cas (d) : barème (case 3CN) et millésime 2026", () => {
  // Même assiette qu'en (a) — on vérifie juste que le régime/millésime se propagent au chiffrage.
  const r2026 = calculeTimingCrypto(
    input({
      montantTotalAConvertirCents: eur(100_000),
      prixAcquisitionTotalCents: eur(40_000),
      valeurGlobalePortefeuilleCents: eur(200_000),
      nbFractions: 2,
      imposition: { millesime: 2026, regime: "PFU", tmiBp: 3000 },
    }),
  );

  it("millésime 2026, PFU : 3AN 80 000 € → impôt+PS 25 120 € (timing neutre, B sur 2 ans)", () => {
    expect(r2026.details.case3anBEur).toBe(80_000);
    expect(r2026.scenarioB.impotEtPsCents).toBe(eur(25_120));
    expect(r2026.deltaImpotEtPsCents).toBe(0);
  });

  it("régime barème (case 3CN) se propage dans les détails", () => {
    const rBareme = calculeTimingCrypto(
      input({
        montantTotalAConvertirCents: eur(100_000),
        prixAcquisitionTotalCents: eur(40_000),
        valeurGlobalePortefeuilleCents: eur(200_000),
        nbFractions: 2,
        imposition: { millesime: 2025, regime: "BAREME", tmiBp: 3000 },
      }),
    );
    expect(rBareme.details.regime).toBe("BAREME");
    // Barème : IR = 30 % × 80 000 − abattement CSG ; on vérifie seulement la neutralité du timing.
    expect(rBareme.deltaImpotEtPsCents).toBe(0);
    expect(rBareme.details.deltaCase3anEur).toBe(0);
  });
});

describe("L3 timing-crypto — bornes, invariants & audit lexical (mode A)", () => {
  it("nbFractions est borné à MAX_FRACTIONS (20)", () => {
    const r = calculeTimingCrypto(
      input({ montantTotalAConvertirCents: eur(10_000), nbFractions: 999 }),
    );
    expect(r.details.nbFractions).toBe(20);
  });

  it("valeur globale absente / inférieure au montant → ramenée au montant converti (quote-part = prix d'acquisition)", () => {
    // On convertit tout le portefeuille : V = M → quote-part = P, 3AN = M − P.
    const r = calculeTimingCrypto(
      input({
        montantTotalAConvertirCents: eur(10_000),
        prixAcquisitionTotalCents: eur(4_000),
        nbFractions: 1,
      }),
    );
    expect(r.details.case3anAEur).toBe(6_000); // 10 000 − 4 000
  });

  it("découpe non entière (3 ans) : timing EXACTEMENT neutre, aucun drift d'arrondi", () => {
    // 100 000 € / 3 ans → la quote-part par année ne tombe pas juste (33 333,33 €). Le calcul cumule
    // l'assiette en centimes et n'arrondit qu'une fois : delta assiette ET delta impôt = 0 pile
    // (régression du bug « assiette 9 999 € mais impôt +1 € » dû au cumul d'euros arrondis).
    const r = calculeTimingCrypto(
      input({
        montantTotalAConvertirCents: eur(100_000),
        prixAcquisitionTotalCents: eur(40_000),
        valeurGlobalePortefeuilleCents: eur(200_000),
        nbFractions: 3,
      }),
    );
    expect(r.details.deltaCase3anEur).toBe(0);
    expect(r.deltaImpotEtPsCents).toBe(0);
    expect(r.details.case3anAEur).toBe(r.details.case3anBEur);
    expect(r.details.nbAnneesExonerees305B).toBe(0);
  });

  it("régression directe du cas signalé : 10 000 € / 3 ans, acquisition 0 → A et B identiques", () => {
    // Cas exact de la capture utilisateur : 10 000 € convertis, prix d'acquisition 0, 3 ans, PFU.
    // Avant correctif : B affichait 3AN 9 999 € mais impôt 3 141 € (vs A 10 000 € / 3 140 €). Désormais
    // assiette 10 000 €, impôt identique, delta nul.
    const r = calculeTimingCrypto(
      input({ montantTotalAConvertirCents: eur(10_000), nbFractions: 3 }),
    );
    expect(r.details.case3anAEur).toBe(10_000);
    expect(r.details.case3anBEur).toBe(10_000);
    expect(r.scenarioA.impotEtPsCents).toBe(r.scenarioB.impotEtPsCents);
    expect(r.deltaImpotEtPsCents).toBe(0);
  });

  it("libellés de scénario neutres et descriptifs (audit lexical mode A)", () => {
    const r = calculeTimingCrypto(input({ montantTotalAConvertirCents: eur(10_000), nbFractions: 3 }));
    const interdits = /recommand|optimis|vous devriez|meilleure strat|conseil/i;
    expect(r.scenarioA.libelle).not.toMatch(interdits);
    expect(r.scenarioB.libelle).not.toMatch(interdits);
    for (const g of r.details.gardeFous) expect(g).not.toMatch(interdits);
  });
});
