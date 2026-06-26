/**
 * Moteur de règles 3916 / 3916-bis.
 * Module pur, 100 % testable. Toutes les règles sont sourcées (cf. SOURCES-3916.md).
 *
 * RÈGLE D'OR : ne jamais trancher un cas ambigu → verdict `a_verifier` + renvoi source.
 * La crédibilité (justesse auditable) prime sur l'exhaustivité des réponses fermes.
 */

import type { Compte, ResultatCompte } from "./types";
import { SEUIL_EMONEY_EUR } from "./types";

/**
 * Exemption monnaie électronique (SOURCES §6) — 3 conditions CUMULATIVES :
 *  (1) usage = paiements/encaissements de **ventes de biens** en ligne ;
 *  (2) adossé à un compte ouvert en France ;
 *  (3) encaissements annuels ≤ 10 000 €.
 * Une seule condition qui manque → à déclarer. Information incomplète → à vérifier.
 */
function evalueEmoney(c: Compte): ResultatCompte {
  const src = "CGI art. 1649 A ; BOFiP BOI-CF-CPF-30-20 §85 ; FAQ PayPal impots.gouv";
  const { emoneyUsageVentesBiens: usage, emoneyAdosseCompteFrancais: adosse, emoneyEncaissementsAnnuelsEur: enc } = c;

  // Une condition explicitement non remplie → à déclarer.
  if (usage === false || adosse === false || (enc !== undefined && enc > SEUIL_EMONEY_EUR)) {
    return {
      verdict: "a_declarer",
      formulaire: "3916",
      motif:
        "Compte de monnaie électronique ne remplissant pas les 3 conditions cumulatives d'exemption " +
        `(usage ventes de biens en ligne + adossé à un compte en France + encaissements ≤ ${SEUIL_EMONEY_EUR} €) → à déclarer.`,
      source: src,
    };
  }
  // Les 3 conditions clairement remplies → exonéré.
  if (usage === true && adosse === true && enc !== undefined && enc <= SEUIL_EMONEY_EUR) {
    return {
      verdict: "exonere",
      formulaire: null,
      motif:
        "Compte de monnaie électronique remplissant les 3 conditions cumulatives d'exemption " +
        "(ventes de biens en ligne, adossé à un compte en France, encaissements ≤ 10 000 €) → dispensé de déclaration.",
      source: src,
    };
  }
  // Information incomplète → on ne tranche pas.
  return {
    verdict: "a_verifier",
    formulaire: "3916",
    motif:
      "Compte de monnaie électronique : renseignez les 3 conditions d'exemption (usage ventes de biens, " +
      "adossement à un compte en France, montant des encaissements annuels) pour déterminer s'il est dispensé.",
    source: src,
  };
}

/** Évalue un compte → verdict + formulaire + motif sourcé. */
export function evalueCompte(c: Compte): ResultatCompte {
  switch (c.type) {
    case "exchange_crypto":
      return {
        verdict: "a_declarer",
        formulaire: "3916-bis",
        motif:
          "Compte d'actifs numériques ouvert auprès d'un PSAN/exchange étranger : à déclarer MÊME sans " +
          "cession ni activité (critère = existence du compte).",
        source: "CGI art. 1649 bis C ; ann. III art. 344 G decies/undecies",
      };

    case "wallet_auto_heberge":
      return {
        verdict: "a_verifier",
        formulaire: "3916-bis",
        motif:
          "Wallet auto-hébergé (non custodial, type Ledger/MetaMask) : lecture standard = NON déclarable " +
          "(pas de tiers teneur de compte), mais non confirmée par une source primaire → à vérifier.",
        source: "CGI art. 1649 bis C (a contrario) ; à confirmer (BOFiP/rescrit)",
      };

    case "pea":
      return {
        verdict: "a_verifier",
        formulaire: "3916",
        motif:
          "PEA logé chez un teneur de compte étranger : le sort d'une enveloppe fiscale française tenue à " +
          "l'étranger n'est pas tranché par les sources officielles → à vérifier (renvoi doctrine).",
        source: "Aucune source primaire dédiée (cf. SOURCES-3916.md §9)",
      };

    case "titres_cto":
      return {
        verdict: "a_declarer",
        formulaire: "3916",
        motif:
          "Compte-titres ordinaire chez un établissement étranger : à déclarer (définition large — dépôt de " +
          "valeurs mobilières, titres ou fonds). Vérifiez qu'il ne s'agit pas d'un PEA (cas distinct, à vérifier).",
        source: "CGI art. 1649 A ; ann. III art. 344 A I",
      };

    case "assurance_vie":
      return {
        verdict: "a_declarer",
        formulaire: "1649AA",
        motif:
          "Contrat d'assurance-vie / de capitalisation souscrit hors de France : obligation déclarative " +
          "DISTINCTE (sanction art. 1766), à ne pas traiter sous le régime du compte bancaire 3916.",
        source: "CGI art. 1649 AA ; sanction art. 1766",
      };

    case "paiement_emoney":
      return evalueEmoney(c);

    case "banque":
    case "neobanque":
      return {
        verdict: "a_declarer",
        formulaire: "3916",
        motif:
          "Compte bancaire détenu à l'étranger : à déclarer MÊME vide / dormant (l'obligation porte sur " +
          "l'existence du compte, pas sur son activité).",
        source: "CGI art. 1649 A ; ann. III art. 344 A ; BOFiP BOI-CF-CPF-30-20",
      };
  }
}

/** Agrège une liste de comptes → résultats + compteurs par verdict / formulaire. */
export function evalueDeclaration(comptes: readonly Compte[]): {
  resultats: ResultatCompte[];
  nbADeclarer: number;
  nbADeclarer3916: number;
  nbADeclarer3916bis: number;
  nbExonere: number;
  nbAVerifier: number;
} {
  const resultats = comptes.map(evalueCompte);
  return {
    resultats,
    nbADeclarer: resultats.filter((r) => r.verdict === "a_declarer").length,
    nbADeclarer3916: resultats.filter((r) => r.verdict === "a_declarer" && r.formulaire === "3916").length,
    nbADeclarer3916bis: resultats.filter((r) => r.verdict === "a_declarer" && r.formulaire === "3916-bis").length,
    nbExonere: resultats.filter((r) => r.verdict === "exonere").length,
    nbAVerifier: resultats.filter((r) => r.verdict === "a_verifier").length,
  };
}
