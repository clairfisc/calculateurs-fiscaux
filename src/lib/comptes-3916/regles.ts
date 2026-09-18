/**
 * Moteur de règles 3916 / 3916-bis.
 * Module pur, 100 % testable. Toutes les règles sont sourcées (cf. SOURCES-3916.md).
 *
 * RÈGLE D'OR (révisée le 18/09/2026) : ne jamais trancher un cas qu'aucune source ne
 * tranche — mais ne jamais laisser en suspens un cas que les sources tranchent. La
 * version précédente rendait `a_verifier` sur le PEA et le wallet auto-hébergé alors
 * que les textes réglementaires les tranchent ; l'excès de prudence est aussi un défaut
 * de justesse, et il coûtait ici deux réponses fausses (cf. §9).
 *
 * Quand un cas n'est pas tranché, distinguer QUI ne sait pas :
 *  - les textes    → `non_tranche` + conduite à tenir (déclarer par précaution) ;
 *  - l'utilisateur → `info_manquante` + énoncé des deux branches.
 */

import type { Compte, ResultatCompte } from "./types";
import { SEUIL_EMONEY_EUR } from "./types";

/**
 * Dispense des comptes de paiement/encaissement en ligne (SOURCES §6).
 *
 * Source : BOFiP BOI-CF-CPF-30-20 §85 UNIQUEMENT. Cette dispense n'a AUCUN ancrage
 * réglementaire : cherchée et absente des art. 344 A, 344 B, 344 C et 344 G decies de
 * l'annexe III au CGI (vérification du 18/09/2026, qui clôt la question ouverte du §9).
 * Étant doctrinale et publiée, elle est opposable à l'administration sur le fondement
 * du LPF art. L. 80 A — ce qui vaut mieux qu'une tolérance : c'est une garantie.
 *
 * Trois conditions CUMULATIVES, verbatim du BOFiP §85 :
 *  (1) « le compte a pour objet de réaliser en ligne des paiements d'achats OU des
 *      encaissements afférents à des ventes de biens » — noter le « ou », et « biens »
 *      et non « biens et services » ;
 *  (2) « l'ouverture du compte suppose la détention d'un autre compte ouvert en France
 *      et auquel il est adossé » ;
 *  (3) « la somme des encaissements annuels crédités sur ce compte […] n'excède pas
 *      10 000 € », seuil apprécié en faisant la somme sur TOUS les comptes de même objet
 *      du titulaire.
 *
 * Le BOFiP §85 ne dit jamais « monnaie électronique » : il vise « les comptes détenus à
 * l'étranger dans des établissements financiers ». La dispense est fondée sur l'USAGE,
 * pas sur le statut du prestataire — d'où son ouverture aux types `neobanque`/`banque`.
 */
function evalueDispensePaiementEnLigne(c: Compte): ResultatCompte {
  const src =
    "BOFiP BOI-CF-CPF-30-20 §85 ; FAQ impots.gouv « Dois-je déclarer mon compte PayPal… » ; LPF art. L. 80 A";
  // Ne PAS coalescer usage/adosse à `false` ici : `undefined` (fiche statique, sans case à
  // cocher) et `false` (case décochée dans la checklist) sont deux informations distinctes —
  // la première signifie « pas encore répondu », la seconde « répondu non ». Les confondre
  // aurait affirmé « à déclarer » sur une fiche qui n'a en réalité posé aucune question.
  const usage = c.emoneyUsageAchatsOuVentesBiens;
  const adosse = c.emoneyAdosseCompteFrancais;
  const cumul = c.emoneyEncaissementsAnnuelsEur;

  // La dispense suppose les DEUX conditions qualitatives affirmées (usage + adossement).
  if (usage === true && adosse === true) {
    if (cumul === undefined) {
      return {
        verdict: "info_manquante",
        formulaire: "3916",
        motif:
          "Conditions (1) usage — paiements d'achats ou encaissements de ventes de biens en ligne — et " +
          "(2) adossement à un compte ouvert en France : remplies. Reste la condition (3) : indiquez le " +
          "total de vos encaissements annuels de ventes, TOUS vos comptes de même objet confondus — " +
          `≤ ${SEUIL_EMONEY_EUR.toLocaleString("fr-FR")} € ⇒ dispensé, au-delà ⇒ à déclarer.`,
        source: src,
      };
    }
    if (cumul <= SEUIL_EMONEY_EUR) {
      return {
        verdict: "dispense",
        formulaire: null,
        motif:
          "Compte remplissant les trois conditions cumulatives de dispense (usage : paiements d'achats ou " +
          "encaissements de ventes de biens en ligne ; adossé à un compte ouvert en France ; encaissements " +
          `annuels ≤ ${SEUIL_EMONEY_EUR.toLocaleString("fr-FR")} €, tous comptes de même objet confondus) → non déclarable. Cette ` +
          "dispense est d'origine doctrinale : elle vous est opposable à l'administration sur le fondement " +
          "de l'article L. 80 A du LPF. Attention : elle ne couvre pas les ventes de PRESTATIONS DE " +
          "SERVICES — dans ce cas le compte est déclarable dès le premier euro encaissé.",
        source: src,
      };
    }
    return {
      verdict: "a_declarer",
      formulaire: "3916",
      motif:
        `Encaissements annuels supérieurs à ${SEUIL_EMONEY_EUR.toLocaleString("fr-FR")} € (tous comptes de même objet confondus) → ` +
        "la dispense ne s'applique pas : compte à déclarer.",
      source: src,
    };
  }

  // Au moins une condition qualitative connue et NON remplie (case décochée) → à déclarer.
  if (usage === false || adosse === false) {
    return {
      verdict: "a_declarer",
      formulaire: "3916",
      motif:
        "Les trois conditions cumulatives de dispense ne sont pas toutes remplies (usage : paiements d'achats " +
        "ou encaissements de ventes de biens en ligne — les prestations de services ne comptent pas ; adossé " +
        `à un compte ouvert en France ; encaissements annuels ≤ ${SEUIL_EMONEY_EUR.toLocaleString("fr-FR")} €, tous comptes ` +
        "confondus) → compte à déclarer.",
      source: src,
    };
  }

  // Ni affirmées, ni infirmées : usage et/ou adossement ne sont pas renseignés (fiche
  // statique, ou checklist pas encore remplie) — le droit tranche, c'est une donnée qui manque.
  return {
    verdict: "info_manquante",
    formulaire: "3916",
    motif:
      "Trois conditions cumulatives ouvrent une dispense (usage : paiements d'achats ou encaissements de " +
      "ventes de biens en ligne ; adossé à un compte ouvert en France ; encaissements annuels " +
      `≤ ${SEUIL_EMONEY_EUR.toLocaleString("fr-FR")} €, tous comptes de même objet confondus) — non renseignées ici. Si vous ` +
      "remplissez les trois, ce compte est dispensé ; sinon, il est à déclarer.",
    source: src,
  };
}

/**
 * Comptes sensibles au LIEU DE TENUE — le cas général du module.
 *
 * Aucune de ces natures de compte n'est déclarable ou non « par nature » : tout dépend
 * de l'établissement qui la tient. Le critère « succursale française ⇒ compte français »
 * est une lecture raisonnée de l'art. 1649 A (« à l'étranger »), de l'art. 344 B (la
 * déclaration porte sur « l'adresse de la personne dépositaire ou gestionnaire ») et du
 * cerfa 3916 (qui demande le PAYS de l'organisme gestionnaire) — le BOFiP, lui, est MUET
 * sur la succursale (vérifié dans tout le BOI-CF-CPF-30-20 le 18/09/2026). On assume
 * cette lecture ; on ne l'habille pas en citation.
 */
function evalueSelonLieuDeTenue(
  c: Compte,
  opts: {
    formulaire: "3916" | "3916-bis";
    motifADeclarer: string;
    motifHorsChamp: string;
    motifInconnu: string;
    source: string;
  },
): ResultatCompte {
  if (c.teneurHorsDeFrance === false) {
    return { verdict: "hors_champ", formulaire: null, motif: opts.motifHorsChamp, source: opts.source };
  }
  if (c.teneurHorsDeFrance === true) {
    return { verdict: "a_declarer", formulaire: opts.formulaire, motif: opts.motifADeclarer, source: opts.source };
  }
  return { verdict: "info_manquante", formulaire: opts.formulaire, motif: opts.motifInconnu, source: opts.source };
}

const SRC_BANCAIRE = "CGI art. 1649 A, 2e al. ; CGI ann. III art. 344 A, I et 344 B ; BOFiP BOI-CF-CPF-30-20 §120";

/** Évalue un compte → verdict + formulaire + motif sourcé. */
export function evalueCompte(c: Compte): ResultatCompte {
  switch (c.type) {
    case "exchange_crypto":
      return evalueSelonLieuDeTenue(c, {
        formulaire: "3916-bis",
        motifADeclarer:
          "Compte / portefeuille de crypto-actifs ouvert auprès d'un PSAN-PSCA établi hors de France : à " +
          "déclarer MÊME sans cession ni activité (le critère est l'existence du compte, pas son usage).",
        motifHorsChamp:
          "Compte de crypto-actifs tenu par une entité établie en France : il n'est pas ouvert « auprès " +
          "d'un organisme établi à l'étranger », il n'entre donc pas dans le champ du 3916-bis.",
        motifInconnu:
          "Tout dépend de l'entité auprès de laquelle votre compte est ouvert. Entité établie hors de " +
          "France → à déclarer au 3916-bis, même sans aucune cession. Entité française → hors champ. " +
          "L'entité contractante figure dans vos conditions générales et sur vos relevés.",
        source:
          "CGI art. 1649 bis C (loi n° 2026-534 du 25/06/2026, en vigueur au 01/07/2026) ; " +
          "CGI ann. III art. 344 G decies, I (décret n° 2026-562 du 29/06/2026)",
      });

    case "wallet_auto_heberge": {
      const motifHorsChampBase =
        "Wallet auto-hébergé (non custodial, type Ledger / Trezor / MetaMask) : hors du champ de " +
        "l'obligation. Les portefeuilles à déclarer sont ceux « ouverts auprès de toute personne de droit " +
        "privé ou public qui reçoit habituellement en dépôt des crypto-actifs » ; un wallet dont vous " +
        "détenez seul les clés n'est ouvert auprès de personne.";
      // Le décret n° 2019-656 du 27/06/2019, art. 2, a défini le champ des « comptes d'actifs
      // numériques » (art. 344 G decies) ; le décret n° 2026-562 du 29/06/2026 l'a seulement
      // HARMONISÉ au vocabulaire MiCA (« crypto-actifs ») sans changer le critère du dépositaire
      // tiers — ne pas attribuer cette définition d'origine au seul texte de 2026.
      const src =
        "CGI ann. III art. 344 G decies, I (décret n° 2019-656 du 27/06/2019, art. 2, définition d'origine " +
        "du critère de dépôt auprès d'un tiers ; harmonisé « crypto-actifs » par le décret n° 2026-562 du " +
        "29/06/2026) ; CGI art. 1649 bis C (loi n° 2026-534 du 25/06/2026) ; BOFiP muet sur l'auto-détention " +
        "(BOI-RPPM-PVBMC-30-30)";
      // Trois branches, et non un `hors_champ` unique masquant une réserve NFT qui ne se
      // déclenchait jamais : le statut NFT distingue désormais un cas RÉELLEMENT non tranché
      // (`non_tranche`, NFT détenus) d'un `hors_champ` simple (pas de NFT, ou situation non
      // encore précisée par l'utilisateur — auquel cas la réserve reste affichée, courte).
      if (c.detientNftAutoConserves === true) {
        return {
          verdict: "non_tranche",
          formulaire: "3916-bis",
          motif:
            motifHorsChampBase +
            " Vous avez indiqué détenir des crypto-actifs uniques et non fongibles (NFT) que vous " +
            "conservez vous-même, hors plateforme. Depuis le 1er juillet 2026, l'article 1649 bis C vise " +
            "aussi ces NFT « détenus ou utilisés à l'étranger », SANS condition de dépositaire tiers : ni " +
            "les textes ni la doctrine ne disent ce que « à l'étranger » signifie pour un NFT " +
            "auto-conservé. Ce cas n'est pas tranché — les déclarer par précaution ne coûte rien.",
          source: src,
        };
      }
      if (c.detientNftAutoConserves === false) {
        return {
          verdict: "hors_champ",
          formulaire: null,
          motif: motifHorsChampBase,
          source: src,
        };
      }
      return {
        verdict: "hors_champ",
        formulaire: null,
        motif:
          motifHorsChampBase +
          " Réserve : si vous détenez des crypto-actifs uniques et non fongibles (NFT) hors plateforme, " +
          "cochez-le — ce cas n'est pas tranché.",
        source: src,
      };
    }

    case "pea":
      // Le PEA n'est pas une catégorie à part au regard du 3916 : rien ne l'exempte.
      // La liste doctrinale des comptes dispensés (BOI-CF-CPF-30-20 §85) ne le comporte
      // pas, et le BOFiP PEA envisage lui-même des plans « détenus hors de France » /
      // des « comptes tenus à l'étranger » auxquels le droit interne reste applicable.
      return evalueSelonLieuDeTenue(c, {
        formulaire: "3916",
        motifADeclarer:
          "PEA tenu par un établissement situé hors de France (gestion depuis l'étranger en libre " +
          "prestation de services) : à déclarer. Le PEA n'est pas une catégorie à part — l'obligation vise " +
          "tout compte recevant en dépôt des valeurs mobilières, titres ou fonds hors de France, et la " +
          "seule liste doctrinale de comptes dispensés ne comporte pas le PEA. Le BOFiP envisage lui-même " +
          "des plans « détenus hors de France » et des « comptes tenus à l'étranger », auxquels le droit " +
          "interne français reste applicable. Sur le cerfa, la nature à retenir est « Autres » : le " +
          "formulaire ne propose pas de case PEA.",
        motifHorsChamp:
          "PEA tenu par un établissement situé en France — y compris la succursale française d'une banque " +
          "de l'Espace économique européen : le compte n'est pas « ouvert hors de France », il n'entre pas " +
          "dans le champ du 3916. C'est le cas du PEA Trade Republic, offert par Trade Republic Bank GmbH, " +
          "Succursale France (REGAFI 741192, SIREN 900 796 855) depuis le 9 janvier 2025.",
        motifInconnu:
          "Le PEA n'est pas une catégorie à part au regard du 3916 : tout dépend du lieu d'établissement " +
          "du teneur de compte. Tenu par un établissement français — y compris la succursale française " +
          "d'une banque européenne — il n'est pas à déclarer. Tenu depuis l'étranger, il l'est. Où " +
          "regarder : la raison sociale et le pays de l'établissement dans vos conditions générales, et le " +
          "pays de l'IBAN du compte espèces associé.",
        source:
          SRC_BANCAIRE +
          " ; BOFiP BOI-CF-CPF-30-20 §85 (liste des comptes dispensés) ; " +
          "BOFiP BOI-RPPM-RCM-40-50-10 §70 et sa remarque (version du 30/07/2024)",
      });

    case "titres_cto":
      return evalueSelonLieuDeTenue(c, {
        formulaire: "3916",
        motifADeclarer:
          "Compte-titres ordinaire chez un établissement étranger : à déclarer. La définition couvre " +
          "expressément les prestataires de services d'investissement (dépôt de valeurs mobilières, titres " +
          "ou fonds).",
        motifHorsChamp:
          "Compte-titres dont les titres sont conservés par un établissement situé en France — y compris " +
          "la succursale française d'un courtier européen : compte français, non déclarable.",
        motifInconnu:
          "Tout dépend de l'entité qui conserve vos titres. Conservation par un établissement situé hors " +
          "de France → à déclarer au 3916. Conservation par la succursale française d'un courtier " +
          "européen → compte français, hors champ. Vérifiez la raison sociale du teneur de compte sur vos " +
          "relevés.",
        source: SRC_BANCAIRE,
      });

    case "assurance_vie":
      return {
        verdict: "a_declarer",
        formulaire: "1649AA",
        motif:
          "Contrat d'assurance-vie / de capitalisation souscrit hors de France : obligation déclarative " +
          "DISTINCTE (sanction art. 1766), à ne pas traiter sous le régime du compte bancaire 3916. Le " +
          "cerfa demande la désignation de l'organisme d'assurance « et, le cas échéant, de la succursale " +
          "qui accorde la couverture ».",
        source: "CGI art. 1649 AA ; sanction art. 1766 ; CGI ann. III art. 344 C",
      };

    case "paiement_emoney":
      return evalueDispensePaiementEnLigne(c);

    case "banque":
    case "neobanque": {
      const lieu = {
        formulaire: "3916" as const,
        motifADeclarer:
          "Compte bancaire détenu à l'étranger : à déclarer MÊME vide / dormant (l'obligation porte sur " +
          "l'existence du compte, pas sur son activité). Cela vaut y compris au titre de l'année de sa " +
          "clôture ou de sa migration vers un compte français.",
        motifHorsChamp:
          "Compte tenu en France — y compris par la succursale française d'une banque étrangère (IBAN " +
          "FR) : ce n'est pas un compte « ouvert hors de France », il n'est pas à déclarer. Attention : si " +
          "ce compte a eu un IBAN étranger pendant une partie de l'année, l'ancien compte reste " +
          "déclarable au titre de cette année-là.",
        motifInconnu:
          "Tout dépend de l'établissement qui tient le compte. Tenu hors de France → à déclarer, même " +
          "vide. Tenu par une succursale française (IBAN FR) → compte français, hors champ. Le pays de " +
          "votre IBAN et la raison sociale figurant sur votre relevé donnent la réponse.",
        source: SRC_BANCAIRE,
      };
      // Le lieu de tenue se teste D'ABORD, et un « non » (tenu en France) ferme le cas :
      // un compte hors champ ne peut pas devenir « à déclarer » via un raisonnement sur la
      // dispense e-money, qui ne s'applique qu'aux comptes DÉTENUS À L'ÉTRANGER (préambule
      // du BOFiP §85). Sans ce garde-fou, un compte pourtant tenu en France (donc hors
      // champ par construction) mais dont les 2 cases dispense sont cochées et le cumul
      // > 10 000 € retombait à tort en `a_declarer` via `evalueDispensePaiementEnLigne`.
      if (c.teneurHorsDeFrance === false) {
        return evalueSelonLieuDeTenue(c, lieu);
      }
      // La dispense du BOFiP §85 est fondée sur l'USAGE, pas sur le statut du prestataire :
      // un compte de néobanque qui remplit les 3 conditions en bénéficie aussi. Ne pas
      // la proposer ici était un faux positif (sur-déclaration).
      if (c.emoneyUsageAchatsOuVentesBiens && c.emoneyAdosseCompteFrancais) {
        return evalueDispensePaiementEnLigne(c);
      }
      return evalueSelonLieuDeTenue(c, lieu);
    }
  }
}

/**
 * Une ligne participe-t-elle au seuil de dispense e-money (SOURCES §6, cond. 3) ?
 * Mêmes conditions qualitatives que celles testées par `evalueDispensePaiementEnLigne` /
 * le cas `banque`/`neobanque` de `evalueCompte` : un `paiement_emoney`, ou une ligne
 * `banque`/`neobanque` dont le lieu n'exclut pas déjà le compte (`teneurHorsDeFrance !==
 * false`) et qui a explicitement coché usage + adossement.
 */
function estEligibleDispenseEmoney(c: Compte): boolean {
  if (c.type === "paiement_emoney") return true;
  if (c.type === "banque" || c.type === "neobanque") {
    return (
      c.teneurHorsDeFrance !== false &&
      c.emoneyUsageAchatsOuVentesBiens === true &&
      c.emoneyAdosseCompteFrancais === true
    );
  }
  return false;
}

/** Agrège une liste de comptes → résultats + compteurs par verdict / formulaire. */
export function evalueDeclaration(comptes: readonly Compte[]): {
  resultats: ResultatCompte[];
  nbADeclarer: number;
  nbADeclarer3916: number;
  nbADeclarer3916bis: number;
  nbHorsChamp: number;
  nbDispense: number;
  nbInfoManquante: number;
  nbNonTranche: number;
} {
  // Le seuil de dispense (SOURCES §6, cond. 3) s'apprécie sur l'ENSEMBLE des comptes de
  // même objet du titulaire (BOFiP §85 : « en faisant la somme de tous les encaissements
  // effectués sur l'ensemble des comptes... »), pas compte par compte. `evalueCompte` ne
  // voit qu'une ligne à la fois et ne peut pas le savoir ; `evalueDeclaration`, qui voit
  // toutes les lignes, recalcule ici le cumul et l'applique aux lignes éligibles avant
  // réévaluation — faute de quoi un titulaire qui saisit SON PROPRE montant par compte
  // (ex. 6 000 € sur deux comptes PayPal/Wise distincts) voit chaque ligne comparée
  // isolément au seuil et ressort à tort dispensé deux fois, alors que le cumul
  // (12 000 €) dépasse le seuil.
  const eligibles = comptes.filter(estEligibleDispenseEmoney);
  const valeursConnues = eligibles
    .map((c) => c.emoneyEncaissementsAnnuelsEur)
    .filter((v): v is number => v !== undefined);
  const sommeConnue = valeursConnues.length > 0 ? valeursConnues.reduce((a, b) => a + b, 0) : undefined;
  const toutesRenseignees = valeursConnues.length === eligibles.length;
  // Le cumul n'est CERTAIN que dans deux cas : (a) toutes les lignes éligibles ont
  // renseigné leur montant — la somme est complète ; (b) la somme des montants déjà
  // connus dépasse SEULE le seuil — les montants manquants ne peuvent alors que
  // confirmer le dépassement (une somme ne peut pas diminuer). Hors de ces deux cas (au
  // moins une ligne manque son montant ET la somme connue ne dépasse pas déjà le seuil),
  // le cumul réel reste indéterminé.
  const cumulCertain =
    sommeConnue !== undefined && (toutesRenseignees || sommeConnue > SEUIL_EMONEY_EUR) ? sommeConnue : undefined;
  const comptesAjustes = comptes.map((c) => {
    if (!estEligibleDispenseEmoney(c)) return c;
    // I4-c (contre-vérification du 19/09/2026) : ne JAMAIS prêter un montant à une ligne
    // qui n'a pas répondu — une ligne éligible sans montant doit rester `info_manquante`,
    // pas hériter d'un cumul qui n'est même pas le sien.
    if (c.emoneyEncaissementsAnnuelsEur === undefined) return c;
    if (cumulCertain !== undefined) return { ...c, emoneyEncaissementsAnnuelsEur: cumulCertain };
    // Cumul indéterminé (une ligne sœur éligible n'a pas encore répondu, et la somme
    // connue ne suffit pas déjà à conclure) : la ligne A ne doit pas ressortir
    // « dispensée » sur la foi d'une somme partielle — ce serait un verdict rassurant
    // sur une donnée incomplète, dans le sens de la sous-déclaration. On efface son
    // montant pour ce calcul, ce qui la fait retomber en `info_manquante` comme sa
    // ligne sœur, plutôt que de choisir arbitrairement entre affirmer ou nier la
    // dispense.
    return { ...c, emoneyEncaissementsAnnuelsEur: undefined };
  });
  const resultats = comptesAjustes.map(evalueCompte);
  const parVerdict = (v: ResultatCompte["verdict"]) => resultats.filter((r) => r.verdict === v).length;
  return {
    resultats,
    nbADeclarer: parVerdict("a_declarer"),
    nbADeclarer3916: resultats.filter((r) => r.verdict === "a_declarer" && r.formulaire === "3916").length,
    nbADeclarer3916bis: resultats.filter((r) => r.verdict === "a_declarer" && r.formulaire === "3916-bis").length,
    nbHorsChamp: parVerdict("hors_champ"),
    nbDispense: parVerdict("dispense"),
    nbInfoManquante: parVerdict("info_manquante"),
    nbNonTranche: parVerdict("non_tranche"),
  };
}
