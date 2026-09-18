import { describe, it, expect } from "vitest";
import { evalueCompte, evalueDeclaration } from "./regles";
import type { Compte } from "./types";

/**
 * Cas-types = oracle de validation SOURCES-3916.md §8 (recherche multi-sources +
 * vérif adversariale, 25/25 confirmés ; révisé le 18/09/2026). Ces tests GÈLENT les
 * verdicts → toute régression du moteur casse la CI (gate « valider avant déployer »).
 *
 * Révision du 18/09/2026 : les cas 1, 6, 7, 8 et 9 ont changé d'expression ou de
 * verdict. Le fait déclencheur n'est pas un changement de droit mais la correction de
 * deux erreurs (PEA et wallet auto-hébergé rendus « à vérifier » alors que les textes
 * les tranchent) et l'introduction du discriminant `teneurHorsDeFrance` : l'adjectif
 * « étranger » de l'oracle doit désormais être EXPRIMÉ, il n'est plus supposé.
 */

describe("moteur 3916/3916-bis — cas-types (oracle SOURCES-3916.md §8)", () => {
  it("1. compte bancaire étranger vide/dormant → à déclarer (existence)", () => {
    const r = evalueCompte({ type: "banque", pays: "DE", teneurHorsDeFrance: true });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916");
  });

  it("1-bis. même compte, mais tenu par une succursale française (IBAN FR) → hors champ", () => {
    const r = evalueCompte({ type: "banque", pays: "FR", teneurHorsDeFrance: false });
    expect(r.verdict).toBe("hors_champ");
    expect(r.formulaire).toBeNull();
  });

  it("1-ter. lieu de tenue non renseigné → info_manquante, JAMAIS une affirmation par défaut", () => {
    const r = evalueCompte({ type: "banque" });
    expect(r.verdict).toBe("info_manquante");
    // Le formulaire reste indiqué : c'est celui qui s'appliquera si le compte est étranger.
    expect(r.formulaire).toBe("3916");
  });

  it("2. compte Binance crypto sans activité → à déclarer (3916-bis)", () => {
    const r = evalueCompte({ type: "exchange_crypto", etablissementId: "binance", teneurHorsDeFrance: true });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916-bis");
  });

  it("3. PayPal ventes de biens + adossé FR + 3 000 € → dispensé", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageAchatsOuVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
      emoneyEncaissementsAnnuelsEur: 3000,
    });
    expect(r.verdict).toBe("dispense");
    expect(r.formulaire).toBeNull();
  });

  it("4. PayPal encaissements 15 000 € (> seuil) → à déclarer", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageAchatsOuVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
      emoneyEncaissementsAnnuelsEur: 15000,
    });
    expect(r.verdict).toBe("a_declarer");
  });

  it("5. PayPal NON adossé à un compte FR → à déclarer", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageAchatsOuVentesBiens: true,
      emoneyAdosseCompteFrancais: false,
      emoneyEncaissementsAnnuelsEur: 2000,
    });
    expect(r.verdict).toBe("a_declarer");
  });

  it("5-bis. e-money, conditions répondues NON → à déclarer (dispense non revendiquée)", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageAchatsOuVentesBiens: false,
      emoneyAdosseCompteFrancais: false,
    });
    expect(r.verdict).toBe("a_declarer");
  });

  it("5-ter. e-money : un montant seul, sans les 2 conditions → à déclarer", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageAchatsOuVentesBiens: false,
      emoneyAdosseCompteFrancais: false,
      emoneyEncaissementsAnnuelsEur: 3000,
    });
    expect(r.verdict).toBe("a_declarer");
  });

  it("5-quater. e-money : 2 conditions remplies, montant non renseigné → info_manquante (et PAS non_tranche : les textes tranchent, c'est l'utilisateur qui n'a pas répondu)", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageAchatsOuVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
    });
    expect(r.verdict).toBe("info_manquante");
  });

  it("5-quinquies. e-money : aucune condition renseignée (fiche statique, sans case à cocher) → info_manquante, pas une affirmation", () => {
    const r = evalueCompte({ type: "paiement_emoney" });
    expect(r.verdict).toBe("info_manquante");
  });

  it("5-sexies. la condition d'usage couvre les ACHATS seuls (« ou » du BOFiP §85), pas seulement les ventes", () => {
    // Un compte servant uniquement à payer ses achats en ligne remplit la condition (1).
    // L'ancienne rédaction (« ventes de biens » seules) le renvoyait à tort en a_declarer.
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageAchatsOuVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
      emoneyEncaissementsAnnuelsEur: 0,
    });
    expect(r.verdict).toBe("dispense");
  });

  it("5-septies. la dispense est ouverte aux néobanques (fondée sur l'usage, pas sur le statut du prestataire)", () => {
    const r = evalueCompte({
      type: "neobanque",
      teneurHorsDeFrance: true,
      emoneyUsageAchatsOuVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
      emoneyEncaissementsAnnuelsEur: 500,
    });
    expect(r.verdict).toBe("dispense");
  });

  it("5-octies [B1]. lieu de tenue = France (false) prime sur la dispense e-money : hors_champ même 2 conditions cochées + cumul > seuil", () => {
    // Régression du 19/09/2026 : un compte tenu en France est hors champ PAR CONSTRUCTION
    // (la dispense e-money ne concerne que les comptes détenus à l'étranger, préambule du
    // BOFiP §85). Avant correction, ce croisement retombait à tort en `a_declarer` via
    // `evalueDispensePaiementEnLigne` (cumul 12 000 € > seuil), alors que le compte n'est
    // même pas dans le champ du 3916.
    const r = evalueCompte({
      type: "neobanque",
      teneurHorsDeFrance: false,
      emoneyUsageAchatsOuVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
      emoneyEncaissementsAnnuelsEur: 12000,
    });
    expect(r.verdict).toBe("hors_champ");
    expect(r.formulaire).toBeNull();
  });

  it("6. néobanque tenue hors de France (bunq NL) → à déclarer", () => {
    const r = evalueCompte({ type: "neobanque", etablissementId: "bunq", teneurHorsDeFrance: true });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916");
  });

  it("7. wallet auto-hébergé (Ledger/MetaMask), statut NFT non renseigné → HORS CHAMP avec réserve courte (art. 344 G decies, I : un compte déclarable est « ouvert auprès de » un dépositaire)", () => {
    const r = evalueCompte({ type: "wallet_auto_heberge" });
    expect(r.verdict).toBe("hors_champ");
    expect(r.formulaire).toBeNull();
    // La réserve NFT doit rester visible : depuis le 01/07/2026 l'art. 1649 bis C vise
    // les crypto-actifs non fongibles « détenus ou utilisés à l'étranger » SANS condition
    // de dépositaire tiers. Ne pas la supprimer sans source qui tranche.
    expect(r.motif).toMatch(/non fongibles/);
  });

  it("7-bis [I1]. wallet auto-hébergé, NFT auto-conservés confirmés (true) → NON_TRANCHE (la réserve devient le verdict, plus du code mort)", () => {
    const r = evalueCompte({ type: "wallet_auto_heberge", detientNftAutoConserves: true });
    expect(r.verdict).toBe("non_tranche");
    expect(r.motif).toMatch(/non fongibles/);
  });

  it("7-ter [I1]. wallet auto-hébergé, absence de NFT confirmée (false) → HORS CHAMP sans la réserve NFT", () => {
    const r = evalueCompte({ type: "wallet_auto_heberge", detientNftAutoConserves: false });
    expect(r.verdict).toBe("hors_champ");
    expect(r.formulaire).toBeNull();
    expect(r.motif).not.toMatch(/non fongibles/);
  });

  it("8. PEA tenu par la succursale française (Trade Republic depuis le 09/01/2025) → hors champ", () => {
    const r = evalueCompte({ type: "pea", etablissementId: "trade-republic", teneurHorsDeFrance: false });
    expect(r.verdict).toBe("hors_champ");
    expect(r.formulaire).toBeNull();
  });

  it("8-bis. PEA tenu depuis l'étranger (libre prestation de services) → à déclarer : rien n'exempte le PEA", () => {
    const r = evalueCompte({ type: "pea", teneurHorsDeFrance: true });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916");
  });

  it("8-ter. PEA, lieu de tenue inconnu → info_manquante énonçant les deux branches", () => {
    const r = evalueCompte({ type: "pea" });
    expect(r.verdict).toBe("info_manquante");
  });

  it("9. compte-titres ordinaire chez courtier étranger → à déclarer (déf. large, PSI inclus)", () => {
    const r = evalueCompte({ type: "titres_cto", etablissementId: "ibkr", teneurHorsDeFrance: true });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("3916");
  });

  it("10. assurance-vie luxembourgeoise → à déclarer, régime DISTINCT (1649 AA, pas 3916 bancaire)", () => {
    const r = evalueCompte({ type: "assurance_vie", pays: "LU" });
    expect(r.verdict).toBe("a_declarer");
    expect(r.formulaire).toBe("1649AA"); // surtout PAS "3916"
  });
});

describe("moteur 3916/3916-bis — seuil de dispense apprécié globalement (SOURCES §6, cond. 3)", () => {
  /**
   * Régression du 18/09/2026, la seule du module qui allait dans le sens de la
   * SOUS-déclaration : le seuil du BOFiP §85 s'apprécie « en faisant la somme de tous
   * les encaissements effectués sur l'ensemble des comptes détenus par le même
   * titulaire ». Deux comptes à 6 000 € étaient rendus dispensés tous les deux.
   */
  it("[I4] deux comptes distincts saisis à 6 000 € CHACUN (pas le cumul pré-calculé) : le moteur doit sommer lui-même et rendre les DEUX déclarables", () => {
    // Piège du 18/09/2026 : un test qui pré-calcule `6000 + 6000` et injecte le résultat
    // dans les deux lignes ne vérifie que `12000 > 10000`, pas que `evalueDeclaration`
    // agrège quoi que ce soit. Ici chaque ligne porte SA PROPRE saisie (6 000 €, le
    // montant que verrait un titulaire regardant seulement ce compte-là) ; c'est à
    // `evalueDeclaration` de reconstituer le cumul réel (12 000 €) et de l'appliquer aux
    // deux lignes avant de trancher.
    const comptes: Compte[] = [
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 6000,
      },
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 6000,
      },
    ];
    const d = evalueDeclaration(comptes);
    expect(d.nbADeclarer).toBe(2);
    expect(d.nbDispense).toBe(0);
    // I4-a (contre-vérification du 19/09/2026) : ce n'est pas seulement le COMPTEUR qui
    // doit refléter le cumul, c'est le résultat PAR LIGNE dans `d.resultats` — c'est lui
    // que la checklist doit maintenant afficher pour chaque badge (plus jamais un
    // `evalueCompte` local sur la valeur brute de la ligne). Les deux lignes, alignées
    // par index sur le tableau d'entrée, doivent donc individuellement porter
    // `a_declarer`, pas seulement la somme des compteurs.
    expect(d.resultats.map((r) => r.verdict)).toEqual(["a_declarer", "a_declarer"]);
  });

  it("[I4] les deux mêmes comptes saisis à 4 000 € chacun (cumul réel 8 000 € ≤ seuil) restent dispensés", () => {
    const comptes: Compte[] = [
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 4000,
      },
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 4000,
      },
    ];
    const d = evalueDeclaration(comptes);
    expect(d.nbDispense).toBe(2);
    expect(d.nbADeclarer).toBe(0);
    expect(d.resultats.map((r) => r.verdict)).toEqual(["dispense", "dispense"]);
  });

  it("[I4-c] deux comptes à montants DIFFÉRENTS (4 000 € + 7 000 €) : cumul réel 11 000 € → les DEUX déclarables", () => {
    // Le cumul n'est pas un simple doublement d'un montant identique : deux lignes à
    // des montants distincts doivent être SOMMÉES (pas moyennées, pas prises au plus
    // haut) pour retrouver le cumul réel de 11 000 €, qui dépasse le seuil.
    const comptes: Compte[] = [
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 4000,
      },
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 7000,
      },
    ];
    const d = evalueDeclaration(comptes);
    expect(d.nbADeclarer).toBe(2);
    expect(d.nbDispense).toBe(0);
    expect(d.resultats.map((r) => r.verdict)).toEqual(["a_declarer", "a_declarer"]);
  });

  it("[I4-c] ligne A (4 000 €) + ligne B SANS montant : B reste info_manquante, A n'est PAS affirmée « dispensée » sur un cumul incomplet", () => {
    // Avant I4-c : la ligne B (sans montant) héritait du cumul des lignes connues
    // (4 000 €, qui n'est même pas SON cumul) et ressortait « dispensée » — un verdict
    // rassurant sur une donnée absente, dans le sens de la sous-déclaration.
    //
    // Choix de comportement pour la ligne A (documenté ici, cf. commentaire de
    // `evalueDeclaration`) : tant qu'une ligne sœur éligible n'a pas répondu ET que la
    // somme déjà connue ne dépasse pas SEULE le seuil, le cumul réel est indéterminé —
    // il pourrait aussi bien rester ≤ 10 000 € que le dépasser une fois B renseignée. A
    // ne doit donc pas plus être affirmée « dispensée » que « à déclarer » sur cette
    // base : elle retombe elle aussi en `info_manquante`, comme B, plutôt que de trancher
    // arbitrairement dans un sens ou dans l'autre.
    const comptes: Compte[] = [
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 4000,
      },
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        // Pas de montant saisi sur cette ligne.
      },
    ];
    const d = evalueDeclaration(comptes);
    expect(d.resultats[1].verdict).toBe("info_manquante"); // B : son propre montant manque
    expect(d.resultats[0].verdict).not.toBe("dispense"); // A : pas de dispense sur cumul incomplet
    expect(d.resultats[0].verdict).toBe("info_manquante");
    expect(d.nbDispense).toBe(0);
  });

  it("[I4-c] known partiel déjà supérieur au seuil : la ligne sans montant ne bloque pas la conclusion a_declarer des lignes connues", () => {
    // Corollaire de monotonie : si la somme des montants déjà CONNUS dépasse à elle
    // seule le seuil, ajouter le montant manquant ne peut que confirmer le dépassement
    // — les lignes renseignées peuvent donc être tranchées `a_declarer` sans attendre.
    const comptes: Compte[] = [
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 6000,
      },
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 6000,
      },
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        // Pas de montant saisi sur cette 3e ligne.
      },
    ];
    const d = evalueDeclaration(comptes);
    expect(d.resultats[0].verdict).toBe("a_declarer");
    expect(d.resultats[1].verdict).toBe("a_declarer");
    expect(d.resultats[2].verdict).toBe("info_manquante"); // son propre montant manque toujours
  });

  it("le seuil est inclusif : exactement 10 000 € → dispensé", () => {
    const r = evalueCompte({
      type: "paiement_emoney",
      emoneyUsageAchatsOuVentesBiens: true,
      emoneyAdosseCompteFrancais: true,
      emoneyEncaissementsAnnuelsEur: 10000,
    });
    expect(r.verdict).toBe("dispense");
  });
});

describe("moteur 3916/3916-bis — agrégat", () => {
  it("ventile par verdict et par formulaire", () => {
    const comptes: Compte[] = [
      { type: "banque", pays: "DE", teneurHorsDeFrance: true }, // à déclarer 3916
      { type: "exchange_crypto", etablissementId: "kraken", teneurHorsDeFrance: true }, // à déclarer 3916-bis
      {
        type: "paiement_emoney",
        emoneyUsageAchatsOuVentesBiens: true,
        emoneyAdosseCompteFrancais: true,
        emoneyEncaissementsAnnuelsEur: 500,
      }, // dispensé
      { type: "wallet_auto_heberge" }, // hors champ
      { type: "pea" }, // info manquante (lieu de tenue non renseigné)
    ];
    const d = evalueDeclaration(comptes);
    expect(d.nbADeclarer).toBe(2);
    expect(d.nbADeclarer3916).toBe(1);
    expect(d.nbADeclarer3916bis).toBe(1);
    expect(d.nbDispense).toBe(1);
    expect(d.nbHorsChamp).toBe(1);
    expect(d.nbInfoManquante).toBe(1);
    expect(d.nbNonTranche).toBe(0);
  });
});
