/**
 * Libellés de verdict — SOURCE UNIQUE pour la fiche établissement, le hub et la
 * checklist React.
 *
 * Pourquoi centraliser : ces trois surfaces portaient chacune sa propre table de
 * libellés, et elles avaient déjà divergé (« Oui, en principe à déclarer » sur la
 * fiche, « En principe à déclarer » sur le hub, « À déclarer » dans la checklist).
 * Un libellé de verdict fiscal est du contenu, pas de la présentation.
 *
 * CONTRAINTE DE RÉDACTION (la raison d'être de ce fichier) : un libellé est emprunté
 * par TOUTES les fiches qui tombent dans son état. Il doit donc rester vrai pour
 * chacune d'elles, sans exception. C'est ce qui interdit :
 *  - « en principe », qui suggérait une réserve de DROIT là où la seule inconnue est
 *    un FAIT (quelle entité tient votre compte) — le doute est déplacé vers ce fait ;
 *  - un « Non tranché par les textes » générique sur l'ancien état `a_verifier`, qui
 *    aurait été faux pour la dispense e-money dont le montant n'est pas renseigné :
 *    là, les textes tranchent parfaitement, c'est l'utilisateur qui n'a pas répondu.
 */

import type { Formulaire, TypeCompte, Verdict } from "./types";

/**
 * Libellé long (encadré de verdict en tête de fiche, phrase de meta description).
 *
 * Clivé par `formulaire` pour `a_declarer` : « compte » est faux pour un contrat
 * d'assurance-vie, dont l'obligation relève du 1649 AA et non du 3916.
 *
 * `type`, optionnel, sert UNIQUEMENT à distinguer le chemin `paiement_emoney` (M5,
 * revue du 19/09/2026) : `evalueDispensePaiementEnLigne` ne vérifie jamais
 * `teneurHorsDeFrance`, donc affirmer « compte tenu hors de France » sur ce chemin
 * décrit un fait que le moteur n'a pas établi — vrai en pratique pour les fiches PayPal
 * et Wise (lieu connu et sourcé par ailleurs), faux en général pour une saisie libre de
 * la checklist où seule la dispense a été évaluée.
 */
export function libelleVerdict(verdict: Verdict, formulaire: Formulaire | null, type?: TypeCompte): string {
  switch (verdict) {
    case "a_declarer":
      if (formulaire === "1649AA") return "Oui, à déclarer — le contrat étant souscrit hors de France";
      if (type === "paiement_emoney") return "Oui, à déclarer — les conditions de dispense ne sont pas remplies";
      return "Oui, à déclarer — dès lors que le compte est tenu hors de France";
    case "hors_champ":
      return "Non — hors du champ de l'obligation déclarative";
    case "dispense":
      return "Non — dispensé, si les trois conditions sont réunies";
    case "info_manquante":
      return "Cela dépend d'un élément que vous seul connaissez";
    case "non_tranche":
      return "Non tranché par les textes — déclarez par précaution";
  }
}

/** Libellé court (badge du hub, badge de ligne dans la checklist). Voir `type` ci-dessus. */
export function libelleVerdictCourt(verdict: Verdict, formulaire: Formulaire | null, type?: TypeCompte): string {
  switch (verdict) {
    case "a_declarer":
      if (formulaire === "1649AA") return "À déclarer (contrat souscrit hors de France)";
      if (type === "paiement_emoney") return "À déclarer (conditions de dispense non remplies)";
      return "À déclarer (compte tenu hors de France)";
    case "hors_champ":
      return "Hors champ";
    case "dispense":
      return "Dispensé sous conditions";
    case "info_manquante":
      return "Selon votre situation";
    case "non_tranche":
      return "Non tranché — déclarer par précaution";
  }
}

/**
 * Conduite à tenir, affichée en pied de fiche et sous la synthèse de la checklist.
 *
 * L'asymétrie de risque énoncée pour `non_tranche` est exacte et vérifiée : l'art.
 * 1736, IV-2 du CGI ne sanctionne que les INFRACTIONS à l'obligation déclarative.
 * Aucune sanction n'est attachée à la déclaration d'un compte qui n'avait pas à
 * l'être — c'est ce qui rend le conseil « dans le doute, déclarez » gratuit pour le
 * lecteur, là où « rapprochez-vous d'un professionnel » lui coûtait une consultation.
 */
export function conduiteATenir(verdict: Verdict): string | undefined {
  switch (verdict) {
    case "non_tranche":
      return (
        "Les textes ne tranchent pas ce cas. Déclarer un compte qui n'avait pas à l'être n'expose à " +
        "aucune sanction ; omettre un compte déclarable coûte 1 500 € par compte et par année " +
        "(CGI art. 1736, IV-2). Dans le doute, déclarez."
      );
    case "info_manquante":
      return (
        "Le droit est clair ; c'est votre situation qui détermine la réponse. Renseignez l'élément " +
        "manquant dans la checklist pour obtenir un verdict."
      );
    case "hors_champ":
      return (
        "Cette réponse suppose exacte l'information d'entrée (dépositaire, pays de tenue du compte) : " +
        "vérifiez-la sur vos conditions générales ou votre relevé."
      );
    default:
      return undefined;
  }
}

/** Classes Tailwind du badge, par état (checklist React). */
export const CLASSE_VERDICT: Record<Verdict, string> = {
  a_declarer: "bg-amber-100 text-amber-900 border-amber-300",
  hors_champ: "bg-green-100 text-green-900 border-green-300",
  dispense: "bg-green-100 text-green-900 border-green-300",
  info_manquante: "bg-blue-100 text-blue-900 border-blue-300",
  non_tranche: "bg-blue-100 text-blue-900 border-blue-300",
};
