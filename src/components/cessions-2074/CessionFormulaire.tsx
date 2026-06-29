import type { CessionSaisie, LotSaisie, BaseMode } from "./types";
import { DEVISE_DEFAUT, DEVISES_SUPPORTEES } from "../fx";
import LotFormulaire from "./LotFormulaire";

/**
 * Un bloc de saisie de cession : côté cession (date, devise, quantité, prix, frais) + base
 * d'acquisition (lots → PMP calculé, ou PMP connu). Composant contrôlé.
 */
interface CessionFormulaireProps {
  readonly cession: CessionSaisie;
  readonly index: number;
  readonly suppressionImpossible: boolean;
  /** Vrai si le régime barème est actif (affiche la date de référence d'abattement si utile). */
  readonly regimeBareme: boolean;
  readonly onChange: (id: string, champs: Partial<CessionSaisie>) => void;
  readonly onSupprimer: (id: string) => void;
  readonly erreurs: readonly string[];
  readonly afficheErreurs: boolean;
  /** Génère un id de lot stable. */
  readonly nouvelIdLot: () => string;
}

const classeChamp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function lotVide(id: string): LotSaisie {
  return { id, dateISO: "", quantite: "", prixUnitaire: "", frais: "" };
}

export default function CessionFormulaire({
  cession,
  index,
  suppressionImpossible,
  regimeBareme,
  onChange,
  onSupprimer,
  erreurs,
  afficheErreurs,
  nouvelIdLot,
}: CessionFormulaireProps) {
  const devise = (cession.devise.trim() || DEVISE_DEFAUT).toUpperCase();

  function modifierLot(lotId: string, champs: Partial<LotSaisie>) {
    onChange(cession.id, {
      lots: cession.lots.map((l) => (l.id === lotId ? { ...l, ...champs } : l)),
    });
  }
  function ajouterLot() {
    onChange(cession.id, { lots: [...cession.lots, lotVide(nouvelIdLot())] });
  }
  function supprimerLot(lotId: string) {
    onChange(cession.id, {
      lots: cession.lots.length > 1 ? cession.lots.filter((l) => l.id !== lotId) : cession.lots,
    });
  }

  // Date de référence d'abattement utile seulement sous barème, hors lot unique (déduit auto).
  const afficheDateRef =
    regimeBareme && (cession.baseMode === "pmp" || cession.lots.length > 1);

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Cession {index + 1}
      </legend>

      {/* Libellé + côté cession */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
          Titre / libellé (facultatif)
          <input
            type="text"
            className={classeChamp}
            autoComplete="off"
            placeholder="ex. Apple, ISIN US0378331005…"
            value={cession.libelle}
            onChange={(e) => onChange(cession.id, { libelle: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Date de cession
          <input
            type="date"
            className={classeChamp}
            autoComplete="off"
            value={cession.dateISO}
            onChange={(e) => onChange(cession.id, { dateISO: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Devise
          <select
            className={classeChamp}
            autoComplete="off"
            value={devise}
            onChange={(e) => onChange(cession.id, { devise: e.target.value })}
          >
            <option value={DEVISE_DEFAUT}>{DEVISE_DEFAUT}</option>
            {DEVISES_SUPPORTEES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {devise !== DEVISE_DEFAUT && (
            <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              chaque opération convertie en EUR au cours BCE de sa date
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Quantité cédée
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="0"
            className={classeChamp}
            autoComplete="off"
            value={cession.quantiteCedee}
            onChange={(e) => onChange(cession.id, { quantiteCedee: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Prix de cession unitaire ({devise})
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            className={classeChamp}
            autoComplete="off"
            value={cession.prixUnitaire}
            onChange={(e) => onChange(cession.id, { prixUnitaire: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Frais de cession ({devise})
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            className={classeChamp}
            autoComplete="off"
            value={cession.frais}
            onChange={(e) => onChange(cession.id, { frais: e.target.value })}
          />
        </label>
      </div>

      {/* Base d'acquisition */}
      <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-800">Acquisition</span>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
            {(
              [
                ["lots", "Par lots (PMP calculé)"],
                ["pmp", "PMP connu"],
              ] as [BaseMode, string][]
            ).map(([m, libelle]) => (
              <button
                key={m}
                type="button"
                onClick={() => onChange(cession.id, { baseMode: m })}
                aria-pressed={cession.baseMode === m}
                className={
                  "px-3 py-1.5 text-xs font-medium transition " +
                  (cession.baseMode === m
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100")
                }
              >
                {libelle}
              </button>
            ))}
          </div>
        </div>

        {cession.baseMode === "lots" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500">
              Saisissez chaque achat. Le prix moyen pondéré (PMP) est calculé en convertissant
              chaque lot au cours du jour de son acquisition.
            </p>
            {cession.lots.map((lot) => (
              <LotFormulaire
                key={lot.id}
                lot={lot}
                devise={devise}
                suppressionImpossible={cession.lots.length === 1}
                onChange={modifierLot}
                onSupprimer={supprimerLot}
              />
            ))}
            <button
              type="button"
              onClick={ajouterLot}
              className="w-fit rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            >
              + Ajouter un lot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              PMP unitaire (€)
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                className={classeChamp}
                autoComplete="off"
                value={cession.pmpUnitaire}
                onChange={(e) => onChange(cession.id, { pmpUnitaire: e.target.value })}
              />
              <span className="mt-0.5 text-xs font-normal text-slate-400">
                prix de revient unitaire déjà connu, en euros
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Quantité totale détenue
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0"
                className={classeChamp}
                autoComplete="off"
                value={cession.quantiteTotale}
                onChange={(e) => onChange(cession.id, { quantiteTotale: e.target.value })}
              />
            </label>
          </div>
        )}

        {afficheDateRef && (
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
            Date d'acquisition de référence (abattement)
            <input
              type="date"
              className={classeChamp}
              autoComplete="off"
              value={cession.dateAcquisitionRef}
              onChange={(e) => onChange(cession.id, { dateAcquisitionRef: e.target.value })}
            />
            <span className="mt-0.5 text-xs font-normal text-slate-400">
              requise sous barème pour l'abattement durée de détention (titres acquis avant 2018)
            </span>
          </label>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        {afficheErreurs && erreurs.length > 0 ? (
          <ul className="list-inside list-disc text-xs font-medium text-red-600">
            {erreurs.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => onSupprimer(cession.id)}
          disabled={suppressionImpossible}
          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          Supprimer la cession
        </button>
      </div>
    </fieldset>
  );
}
