/**
 * Fiche « à recopier sur impots.gouv » d'un compte — fonction PURE, extraite le
 * 17/10/2026 de `ChecklistComptes.tsx` pour être testable : la fiche d'une ligne
 * crypto Revolut affichait l'établissement principal (« Revolut / Revolut Bank UAB,
 * Vilnius ») au lieu du teneur réel (Revolut Digital Assets Europe Ltd, Chypre).
 * La raison sociale, l'adresse, le pays et le code PSAN viennent désormais de
 * `teneurPourType` (gabarit > `entitesParType` > établissement), la même source que
 * le lieu de tenue prérempli dans le moteur : fiche et verdict lisent le même teneur.
 */

import { etablissementParId, teneurPourType, type TeneurResolu } from "./etablissements";
import type { ResultatCompte, TypeCompte } from "./types";

export interface FicheChamp {
  readonly label: string;
  readonly value: string;
  /** Champ que l'utilisateur doit compléter lui-même (affiché en grisé). */
  readonly aRenseigner?: boolean;
}

/** Ce que la fiche lit d'une ligne de la checklist (poste + compte). */
export interface LigneFiche {
  readonly etablissementId?: string;
  readonly etablissementLibre?: string;
  readonly type: TypeCompte;
  /** Pays saisi par l'utilisateur (surcharge) ; sinon celui du teneur résolu. */
  readonly pays?: string;
  /** Libellé du gabarit auto-déplié (ex. « Compte-titres DEGIRO (succursale néerlandaise) »). */
  readonly sousCompteLibelle?: string;
}

/** Teneur résolu d'une ligne (`undefined` en saisie libre). */
export function teneurDeLigne(l: Pick<LigneFiche, "etablissementId" | "type">): TeneurResolu | undefined {
  const etab = l.etablissementId ? etablissementParId(l.etablissementId) : undefined;
  return etab ? teneurPourType(etab, l.type) : undefined;
}

/**
 * Champs structurés de la fiche.
 *
 * `r` est OBLIGATOIRE et vient de `agregat.resultats` (jamais recalculé ici par un
 * nouvel appel à `evalueCompte` sur la valeur brute de la ligne) : depuis I4, le verdict
 * d'une ligne `paiement_emoney`/`banque`/`neobanque` dépend du CUMUL réel sur toutes les
 * lignes éligibles, que seul `evalueDeclaration` connaît (I4-a, contre-vérification du
 * 19/09/2026).
 */
export function ficheChamps(l: LigneFiche, r: ResultatCompte, libelleType: string): FicheChamp[] {
  const teneur = teneurDeLigne(l);
  const designation = teneur?.designation ?? l.etablissementLibre ?? "";
  const adresse = teneur?.adresse ?? "";
  const pays = l.pays ?? teneur?.pays ?? "";
  const champs: FicheChamp[] = [
    { label: "Formulaire", value: r.formulaire ?? "—" },
    { label: "Établissement", value: designation || "à renseigner", aRenseigner: !designation },
  ];
  if (l.sousCompteLibelle) {
    champs.push({ label: "Compte", value: l.sousCompteLibelle });
  } else if (teneur?.intermediaire && teneur.intermediaire !== teneur.designation) {
    // L'intermédiaire (N26, DEGIRO, IBKR…) n'est mentionné que pour que le lecteur
    // reconnaisse son compte : c'est le TENEUR, ci-dessus, qui se déclare.
    champs.push({
      label: "Compte",
      value: `ouvert via ${teneur.intermediaire} (à déclarer au nom de l'établissement ci-dessus)`,
    });
  }
  champs.push(
    { label: "Adresse de l'établissement", value: adresse || "à renseigner", aRenseigner: !adresse },
    { label: "Pays", value: pays || "à renseigner", aRenseigner: !pays },
  );
  // Code PSAN : seulement sur un compte crypto, et seulement le code du TENEUR (jamais
  // hérité de l'intermédiaire). Absent = pas de ligne : le cerfa admet nom + adresse.
  if (r.formulaire === "3916-bis" && teneur?.codePsan) {
    champs.push({ label: "Code PSAN (3916-bis)", value: teneur.codePsan });
  }
  champs.push(
    { label: "Type de compte", value: libelleType },
    { label: "N° / identifiant du compte", value: "à renseigner", aRenseigner: true },
    { label: "Dates d'ouverture / clôture", value: "à renseigner", aRenseigner: true },
  );
  return champs;
}
