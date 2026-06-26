/**
 * Conversion saisie utilisateur → objets du moteur `cessions-2074`.
 *
 * Cette couche ne fait que du **parsing + validation de présence** (chaînes → nombres, dates
 * présentes, quantités > 0). La conversion de change et le calcul fiscal restent au moteur :
 * les montants sont passés en **centimes de la devise** + date d'opération, le moteur applique
 * le cours BCE du jour (FX par opération). Les erreurs de change (date hors historique, devise
 * non cotée) et d'abattement remontent du moteur, captées par le composant.
 */
import { toCents } from "../fx";
import type { Cession, Lot, Regime } from "../../lib/cessions-2074";
import type { CessionSaisie } from "./types";

/** Parse une quantité (chaîne) en nombre > 0 (décimales tolérées), sinon null. */
export function toQuantite(saisie: string): number | null {
  const brut = saisie.trim();
  if (brut === "") return null;
  const normalise = brut.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalise)) return null;
  const valeur = Number(normalise);
  return Number.isFinite(valeur) && valeur > 0 ? valeur : null;
}

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse des frais optionnels : vide → 0, sinon centimes ≥ 0 (null si invalide). */
function fraisCents(saisie: string): number | null {
  if (saisie.trim() === "") return 0;
  return toCents(saisie);
}

/** Résultat de conversion d'une cession saisie. */
export interface ConversionCession {
  readonly cession: Cession | null;
  readonly erreurs: readonly string[];
  readonly libelle: string;
}

/**
 * Convertit une cession saisie en objet `Cession` du moteur (ou liste d'erreurs de validation).
 * La devise de la cession s'applique aussi à ses lots.
 */
export function convertitCession(saisie: CessionSaisie, index: number): ConversionCession {
  const erreurs: string[] = [];
  const libelle = saisie.libelle.trim() !== "" ? saisie.libelle.trim() : `Cession n°${index + 1}`;
  const devise = (saisie.devise.trim() || "EUR").toUpperCase();

  // --- Côté cession ---
  const quantiteCedee = toQuantite(saisie.quantiteCedee);
  if (quantiteCedee === null) erreurs.push("Quantité cédée invalide (nombre > 0 attendu).");

  const prixCessionCents = toCents(saisie.prixUnitaire);
  if (prixCessionCents === null) erreurs.push("Prix de cession invalide (nombre ≥ 0 attendu).");

  const fraisCessionCents = fraisCents(saisie.frais);
  if (fraisCessionCents === null) erreurs.push("Frais de cession invalides (nombre ≥ 0 attendu).");

  if (!FORMAT_DATE.test(saisie.dateISO)) erreurs.push("Date de cession requise.");

  // --- Côté acquisition ---
  let acquisition: Cession["acquisition"] | null = null;
  if (saisie.baseMode === "lots") {
    const lots: Lot[] = [];
    saisie.lots.forEach((l, i) => {
      const q = toQuantite(l.quantite);
      const prix = toCents(l.prixUnitaire);
      const frais = fraisCents(l.frais);
      const dateOk = FORMAT_DATE.test(l.dateISO);
      if (q === null || prix === null || frais === null || !dateOk) {
        erreurs.push(`Lot ${i + 1} : saisie incomplète (date, quantité, prix).`);
        return;
      }
      lots.push({
        dateISO: l.dateISO,
        devise,
        quantite: q,
        prixUnitaireCents: prix,
        fraisCents: frais,
      });
    });
    if (lots.length === 0 && !erreurs.some((e) => e.startsWith("Lot"))) {
      erreurs.push("Ajoutez au moins un lot d'acquisition.");
    }
    if (lots.length === saisie.lots.length && lots.length > 0) {
      acquisition = { type: "lots", lots };
    }
  } else {
    const pmp = toCents(saisie.pmpUnitaire);
    const quantiteTotale = toQuantite(saisie.quantiteTotale);
    if (pmp === null) erreurs.push("PMP unitaire invalide (nombre ≥ 0 attendu).");
    if (quantiteTotale === null) erreurs.push("Quantité totale détenue invalide (nombre > 0).");
    if (pmp !== null && quantiteTotale !== null) {
      acquisition = {
        type: "pmp",
        pmpUnitaireEurCents: pmp,
        quantiteTotale,
        dateAcquisitionRefISO: FORMAT_DATE.test(saisie.dateAcquisitionRef)
          ? saisie.dateAcquisitionRef
          : undefined,
      };
    }
  }

  if (
    erreurs.length > 0 ||
    quantiteCedee === null ||
    prixCessionCents === null ||
    fraisCessionCents === null ||
    acquisition === null
  ) {
    return { cession: null, erreurs, libelle };
  }

  const dateAcqRef = FORMAT_DATE.test(saisie.dateAcquisitionRef)
    ? saisie.dateAcquisitionRef
    : undefined;

  return {
    cession: {
      id: libelle,
      dateISO: saisie.dateISO,
      devise,
      quantiteCedee,
      prixUnitaireCents: prixCessionCents,
      fraisCents: fraisCessionCents,
      acquisition,
      dateAcquisitionRefISO: dateAcqRef,
    },
    erreurs,
    libelle,
  };
}

/** Une cession saisie est-elle « entamée » (au moins un montant/quantité renseigné) ? */
export function cessionEntamee(saisie: CessionSaisie): boolean {
  if (saisie.quantiteCedee.trim() !== "" || saisie.prixUnitaire.trim() !== "") return true;
  if (saisie.baseMode === "pmp") {
    return saisie.pmpUnitaire.trim() !== "" || saisie.quantiteTotale.trim() !== "";
  }
  return saisie.lots.some((l) => l.quantite.trim() !== "" || l.prixUnitaire.trim() !== "");
}

/** Le régime ouvre-t-il l'abattement (barème) ? (utilitaire d'affichage) */
export function regimeAbattement(regime: Regime): boolean {
  return regime === "BAREME";
}
