import { useEffect, useMemo, useState } from "react";
import { calculeDeclaration2086 } from "../../lib/crypto-2086";
import type { Operation } from "../../lib/crypto-2086";
import type { OperationSaisie, TypeOperationSaisie } from "./types";
import { toCents } from "../fx";
import OperationFormulaire from "./OperationFormulaire";
import Resultats2086 from "./Resultats2086";

/**
 * Calculateur de plus-values crypto 2086 (CGI art. 150 VH bis) — îlot React autonome.
 *
 * Saisie en **journal chronologique** : on recopie ses achats (montant payé) et ses ventes
 * imposables (date, prix de cession, valeur globale du portefeuille, frais). Calcul via le moteur
 * `crypto-2086` (méthode de la valeur globale + imputation progressive), restitution du détail
 * par vente + cases 2042-C 3AN / 3BN copiables.
 *
 * 100 % client-side : aucune donnée saisie ne quitte le navigateur.
 */

let compteurId = 0;
function nouvelId(): string {
  compteurId += 1;
  return `op-${compteurId}`;
}

function operationVide(type: TypeOperationSaisie): OperationSaisie {
  return { id: nouvelId(), type, date: "", montant: "", prixCession: "", frais: "", valeurGlobale: "" };
}

/** Conversion d'une saisie en `Operation` moteur (ou erreurs de validation). */
interface ConversionOperation {
  readonly operation: Operation | null;
  readonly erreurs: readonly string[];
  /** L'utilisateur a-t-il commencé à renseigner cette opération ? (pour n'afficher les erreurs qu'alors). */
  readonly amorcee: boolean;
}

function convertitOperation(saisie: OperationSaisie): ConversionOperation {
  const erreurs: string[] = [];

  if (saisie.type === "achat") {
    const montant = toCents(saisie.montant);
    const amorcee = saisie.montant.trim() !== "";
    if (montant === null) {
      if (amorcee) erreurs.push("Montant payé invalide (nombre ≥ 0 attendu).");
      return { operation: null, erreurs, amorcee };
    }
    return { operation: { type: "achat", date: saisie.date, montantCents: montant }, erreurs, amorcee };
  }

  // vente
  const amorcee = saisie.prixCession.trim() !== "";
  const prixCents = toCents(saisie.prixCession);
  const vgpCents = toCents(saisie.valeurGlobale);
  const fraisCents = saisie.frais.trim() === "" ? 0 : toCents(saisie.frais);

  if (prixCents === null) erreurs.push("Prix de cession invalide (nombre ≥ 0 attendu).");
  if (vgpCents === null || vgpCents <= 0) {
    erreurs.push("Valeur globale du portefeuille requise (nombre > 0).");
  }
  if (fraisCents === null) erreurs.push("Frais invalides (nombre ≥ 0 attendu).");
  if (prixCents !== null && fraisCents !== null && fraisCents > prixCents) {
    erreurs.push("Les frais ne peuvent pas dépasser le prix de cession.");
  }

  if (prixCents === null || vgpCents === null || vgpCents <= 0 || fraisCents === null) {
    return { operation: null, erreurs, amorcee };
  }

  return {
    operation: {
      type: "vente",
      date: saisie.date,
      prixCessionCents: prixCents,
      fraisCessionCents: fraisCents,
      valeurGlobalePortefeuilleCents: vgpCents,
    },
    erreurs,
    amorcee,
  };
}

export default function Calculateur2086() {
  // Prix d'acquisition net reporté des années précédentes (portefeuille déjà détenu).
  const [reportAcquisition, setReportAcquisition] = useState("");
  const [operations, setOperations] = useState<OperationSaisie[]>(() => [
    operationVide("achat"),
    operationVide("vente"),
  ]);

  // Refresh = formulaire propre (cf. note dans le calculateur 2047 : certains navigateurs
  // restaurent visuellement les champs sans déclencher onChange). On régénère les ids.
  useEffect(() => {
    setReportAcquisition("");
    setOperations([operationVide("achat"), operationVide("vente")]);
  }, []);

  function modifierOperation(id: string, champs: Partial<OperationSaisie>) {
    setOperations((prev) => prev.map((o) => (o.id === id ? { ...o, ...champs } : o)));
  }
  function ajouterOperation(type: TypeOperationSaisie) {
    setOperations((prev) => [...prev, operationVide(type)]);
  }
  function supprimerOperation(id: string) {
    setOperations((prev) => (prev.length > 1 ? prev.filter((o) => o.id !== id) : prev));
  }

  const conversions = useMemo(() => operations.map(convertitOperation), [operations]);

  // Opérations « prêtes » : converties sans erreur et amorcées.
  const operationsPretes = conversions.filter((c) => c.operation !== null && c.amorcee);
  const ventesPretes = operationsPretes.filter((c) => c.operation!.type === "vente");
  const achatsPrets = operationsPretes.filter((c) => c.operation!.type === "achat");

  // Report N-1 : vide ou invalide → 0.
  const reportCents = toCents(reportAcquisition) ?? 0;

  const declaration = useMemo(() => {
    if (ventesPretes.length === 0) return null;
    return calculeDeclaration2086(operationsPretes.map((c) => c.operation!), reportCents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations, reportAcquisition]);

  // Garde-fou : des ventes mais aucun prix d'acquisition (ni achat, ni report) → gain surévalué.
  const venteSansAchat = ventesPretes.length > 0 && achatsPrets.length === 0 && reportCents === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Calculateur de plus-values crypto (formulaire 2086)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Méthode de la valeur globale du portefeuille (CGI art. 150 VH bis). Calcul effectué
          localement dans votre navigateur (aucune donnée collectée).
        </p>
      </header>

      {/* Aide : comment remplir le journal */}
      <aside className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-semibold">Recopiez vos opérations de l'année dans l'ordre :</p>
        <ul className="mt-1 list-inside list-disc text-blue-800">
          <li><strong>Achat</strong> : chaque acquisition de crypto en euros (le montant payé).</li>
          <li>
            <strong>Vente imposable</strong> : vente contre euros, ou paiement d'un bien/service en
            crypto (prix, valeur globale du portefeuille, frais éventuels).
          </li>
        </ul>
        <p className="mt-2 text-blue-800">
          Les <strong>échanges crypto → crypto</strong> (ex. BTC → ETH) ne sont
          <strong> pas imposables</strong> (sursis, art. 150 VH bis II-A) : ne les saisissez pas.
        </p>
      </aside>

      {/* Portefeuille déjà détenu — report des années précédentes */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Prix d'acquisition net déjà détenu avant cette année (€)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoComplete="off"
            value={reportAcquisition}
            onChange={(e) => setReportAcquisition(e.target.value)}
          />
          <span className="mt-0.5 text-xs font-normal text-slate-400">
            laissez vide si vous n'aviez pas de crypto avant cette année
          </span>
        </label>
        <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Vous déteniez déjà des cryptos ? Indiquez ici le total que vous aviez payé pour les
          acquérir. <strong>Si vous aviez déjà vendu une année précédente</strong>, reprenez le
          <strong> prix d'acquisition net</strong> de votre dernier formulaire 2086 (ligne 223 —
          déjà diminué des quote-parts imputées les années passées). Les achats faits
          <strong> pendant l'année</strong> se saisissent, eux, en lignes « Achat » ci-dessous.
        </p>
      </section>

      {/* Saisie du journal */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Vos opérations</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ajouterOperation("achat")}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              + Achat
            </button>
            <button
              type="button"
              onClick={() => ajouterOperation("vente")}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              + Vente
            </button>
          </div>
        </div>

        {operations.map((operation, i) => (
          <OperationFormulaire
            key={operation.id}
            operation={operation}
            index={i}
            suppressionImpossible={operations.length === 1}
            onChange={modifierOperation}
            onSupprimer={supprimerOperation}
            erreurs={conversions[i]!.erreurs}
          />
        ))}
      </section>

      {/* Garde-fou : ventes sans achat */}
      {venteSansAchat && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Vous avez saisi des ventes mais <strong>aucun achat</strong> : le prix d'acquisition est
          considéré comme nul, donc la plus-value est maximale. Ajoutez vos acquisitions pour un
          calcul correct.
        </p>
      )}

      {/* Résultats ou état vide */}
      {declaration ? (
        <Resultats2086 declaration={declaration} />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Renseignez au moins une vente (prix de cession + valeur globale) pour afficher les
          résultats. Ajoutez vos achats pour le prix d'acquisition.
        </div>
      )}

      {/* Hors périmètre : revenus crypto (staking, lending, mining, airdrops) */}
      <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <strong>Hors périmètre du 2086 :</strong> les revenus de staking, lending, mining et
        airdrops ne sont pas des plus-values de cession (régimes distincts, BNC ou RCM) et ne se
        déclarent pas ici.
      </p>

      <p className="text-xs text-slate-400">
        Aide informative — ne constitue pas un conseil fiscal. Le moteur calcule l'assiette
        (plus/moins-value) ; l'impôt (PFU 30 % ou option barème, case 3CN) est liquidé par
        l'administration.
      </p>
    </div>
  );
}
