/**
 * Levier **L5 — Donation avant cession** : moteur de **composition** (cessions-2074 + pfu-bareme) **+**
 * le seul calcul fiscal neuf autorisé : les **droits de donation** (barème + abattement). Oracle gelé :
 * SOURCES-DONATION.md. cf. §X (L5) /  (valider avant déployer).
 *
 *   - Scénario A « vendre puis donner le net » : on chiffre la plus-value de cession via `cessions-2074`
 *     (assiette 3VG), l'impôt + PS via `pfu-bareme.compareRegimes`, puis les droits de donation sur le
 *     **net d'impôt** donné.
 *   - Scénario B « donner les titres appréciés » : plus-value latente **purgée** (CGI 150-0 D, 1, non
 *     imposée à la donation), droits de donation sur la **valeur vénale** entière.
 *
 * RÈGLE D'OR : montants en centimes entiers ; on n'arrondit à l'euro que là où les moteurs composés le
 * font (3VG, impôt + PS) et pour les droits de donation (barème en euros, arrondi euro). Mode A
 * (risque le plus élevé) : libellés descriptifs et neutres, avertissement abus de droit porté par
 * `gardeFous`. Aucun champ ne désigne un scénario à retenir.
 */

import { calculeDeclaration } from "../../cessions-2074/index";
import type { Cession } from "../../cessions-2074/index";
import { compareRegimes } from "../../pfu-bareme/index";
import type { Cents, ComparatifArbitrage, ScenarioChiffre } from "../types";
import {
  GARDE_FOUS_DONATION,
  type DetailsDonation,
  type DonationInput,
  type LienDonataire,
  type ParametresImposition,
  type RegimeImposition,
} from "./types";

/** Identifiant du levier dans le contrat partagé. */
const LEVIER = "donation";

const clampMin0 = (n: number): number => (n > 0 ? n : 0);

/** Une tranche de barème : `jusqua` = borne haute en euros (Infinity pour la dernière), `taux` ∈ [0,1]. */
interface TrancheDroits {
  readonly jusqua: number;
  readonly taux: number;
}

/**
 * Barème **ligne directe** (CGI art. 777, tableau I) — enfant, petit-enfant, conjoint/PACS. Bornes en
 * euros, inchangé depuis 2011. cf. SOURCES-DONATION.md §2.1.
 */
const BAREME_LIGNE_DIRECTE: readonly TrancheDroits[] = [
  { jusqua: 8_072, taux: 0.05 },
  { jusqua: 12_109, taux: 0.1 },
  { jusqua: 15_932, taux: 0.15 },
  { jusqua: 552_324, taux: 0.2 },
  { jusqua: 902_838, taux: 0.3 },
  { jusqua: 1_805_677, taux: 0.4 },
  { jusqua: Infinity, taux: 0.45 },
];

/** Barème **entre frères et sœurs** (CGI art. 777, tableau II). cf. SOURCES-DONATION.md §2.2. */
const BAREME_FRERE_SOEUR: readonly TrancheDroits[] = [
  { jusqua: 24_430, taux: 0.35 },
  { jusqua: Infinity, taux: 0.45 },
];

/** Abattement applicable au lien (euros, CGI 779/790). cf. SOURCES-DONATION.md §2.4. */
const ABATTEMENT_EUR: Record<LienDonataire, number> = {
  enfant: 100_000,
  "petit-enfant": 31_865,
  "frere-soeur": 15_932,
  "neveu-niece": 7_967,
  "conjoint-pacs": 80_724,
  tiers: 0,
};

/**
 * Calcule les **droits de donation** (euros) sur une assiette taxable (euros, déjà nette d'abattement),
 * selon le lien. Liens à barème progressif → application tranche par tranche ; liens à taux
 * proportionnel (neveu/nièce 55 %, tiers 60 %) → taux unique. Arrondi euro en sortie (CGI/pratique).
 */
function droitsDonationEur(taxableEur: number, lien: LienDonataire): number {
  // Base imposable arrondie à l'euro le plus proche AVANT le barème (pratique fiscale, CGI 1657) :
  // les appelants passent une assiette en euros pouvant comporter des centimes (montant net donné,
  // ou valeur vénale saisie au centime dans l'UI) → on fige l'euro pour que barème progressif et
  // taux proportionnels s'appliquent sur une base entière déterministe. Sans effet sur des entrées
  // en euros ronds (Math.round(n) = n).
  const taxable = clampMin0(Math.round(taxableEur));
  if (taxable === 0) return 0;

  // Taux proportionnels (CGI 777, tableau III) — pas de barème progressif.
  if (lien === "neveu-niece") return Math.round(taxable * 0.55);
  if (lien === "tiers") return Math.round(taxable * 0.6);

  const bareme = lien === "frere-soeur" ? BAREME_FRERE_SOEUR : BAREME_LIGNE_DIRECTE;
  let droits = 0;
  let bas = 0;
  for (const t of bareme) {
    if (taxable <= bas) break;
    const haut = Math.min(taxable, t.jusqua);
    droits += (haut - bas) * t.taux;
    bas = haut;
  }
  return Math.round(droits);
}

/** Construit la cession synthétique d'une plus-value (valeur vénale vs prix de revient), via PMP EUR. */
function cessionPlusValue(valeurVenaleCents: Cents, prixRevientCents: Cents): Cession[] {
  if (valeurVenaleCents <= 0) return [];
  return [
    {
      id: "cession-avant-donation",
      dateISO: "2025-12-31",
      devise: "EUR",
      quantiteCedee: 1,
      prixUnitaireCents: valeurVenaleCents,
      acquisition: { type: "pmp", pmpUnitaireEurCents: clampMin0(prixRevientCents), quantiteTotale: 1 },
    },
  ];
}

/** Impôt + PS estimés (centimes) sur une plus-value nette (case 3VG en euros), via `compareRegimes`. */
function impotEtPsCents(case3vgEur: number, imposition: ParametresImposition): Cents {
  const regime: RegimeImposition = imposition.regime ?? "PFU";
  const r = compareRegimes({
    millesime: imposition.millesime,
    tmiBp: imposition.tmiBp,
    revenuImposableHorsCapitalCents: imposition.revenuImposableHorsCapitalCents,
    parts: imposition.parts,
    dividendesCents: 0,
    interetsCents: 0,
    plusValuesCents: clampMin0(case3vgEur) * 100,
  });
  const totalEur = regime === "BAREME" ? r.bareme.totalEur : r.pfu.totalEur;
  return totalEur * 100;
}

/**
 * Calcule le comparatif neutre A vs B du levier L5 (donation avant cession).
 *
 * @param input valeur vénale, prix de revient, lien donataire, donations antérieures, imposition PV.
 * @returns `ComparatifArbitrage<DetailsDonation>` — coût total (impôt PV + droits de donation) de
 *          chaque scénario et différentiel signé. Aucun champ ne désigne un scénario à retenir ;
 *          l'avertissement abus de droit est porté par `details.gardeFous` (mode A — risque élevé).
 */
export function calculeDonation(input: DonationInput): ComparatifArbitrage<DetailsDonation> {
  const valeurVenaleCents = clampMin0(input.valeurVenaleCents);
  const prixRevientCents = clampMin0(input.prixRevientCents);
  const lien = input.lienDonataire;
  const anterieuresCents = clampMin0(input.donationsAnterieures15ansCents ?? 0);
  const regime: RegimeImposition = input.imposition.regime ?? "PFU";

  // --- Abattement disponible : base du lien, diminué des donations antérieures < 15 ans (CGI 784) ---
  const abattementBaseCents = ABATTEMENT_EUR[lien] * 100;
  const abattementDisponibleCents = clampMin0(abattementBaseCents - anterieuresCents);

  // === Scénario A : vendre d'abord (PV taxée), puis donner le net ===
  const declA = calculeDeclaration({
    cessions: cessionPlusValue(valeurVenaleCents, prixRevientCents),
    regime: "PFU", // PMP direct EUR sans abattement : le régime 2074 n'affecte pas la 3VG ici
    moinsValuesAnterieuresCents: 0,
  });
  const plusValueImposeeACents = declA.case3VG * 100;
  const impotPlusValueACents = impotEtPsCents(declA.case3VG, input.imposition);
  // Le net donné = valeur vénale − impôt sur la PV (les fonds nets transmis).
  const montantNetDonneACents = clampMin0(valeurVenaleCents - impotPlusValueACents);
  const assietteDroitsACents = clampMin0(montantNetDonneACents - abattementDisponibleCents);
  const droitsDonationACents =
    droitsDonationEur(assietteDroitsACents / 100, lien) * 100;
  const coutTotalACents = impotPlusValueACents + droitsDonationACents;

  // === Scénario B : donner les titres appréciés (PV latente purgée, CGI 150-0 D 1) ===
  const plusValueLatentePurgeeCents = clampMin0(valeurVenaleCents - prixRevientCents);
  const assietteDroitsBCents = clampMin0(valeurVenaleCents - abattementDisponibleCents);
  const droitsDonationBCents =
    droitsDonationEur(assietteDroitsBCents / 100, lien) * 100;
  const coutTotalBCents = droitsDonationBCents; // PV non imposée → seul coût = droits de donation

  const scenarioA: ScenarioChiffre = {
    id: "A",
    libelle: "Je vends les titres, puis je donne le montant net",
    assietteImposableCents: plusValueImposeeACents,
    impotEtPsCents: coutTotalACents,
  };
  const scenarioB: ScenarioChiffre = {
    id: "B",
    libelle: "Je donne les titres, le donataire pourra les vendre",
    assietteImposableCents: assietteDroitsBCents,
    impotEtPsCents: coutTotalBCents,
  };

  const details: DetailsDonation = {
    lienDonataire: lien,
    regime,
    abattementBaseCents,
    abattementDisponibleCents,
    plusValueImposeeACents,
    impotPlusValueACents,
    montantNetDonneACents,
    assietteDroitsACents,
    droitsDonationACents,
    plusValueLatentePurgeeCents,
    assietteDroitsBCents,
    droitsDonationBCents,
    gardeFous: GARDE_FOUS_DONATION,
  };

  return {
    levier: LEVIER,
    scenarioA,
    scenarioB,
    deltaImpotEtPsCents: coutTotalBCents - coutTotalACents,
    details,
  };
}
