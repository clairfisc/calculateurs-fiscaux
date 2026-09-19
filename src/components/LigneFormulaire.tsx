import { PAYS_2025 } from "../lib/tax-engine";
import type { LigneSaisie, ModeMontant } from "./types";
import type { TypeRevenu } from "../lib/tax-engine";
import { DEVISE_DEFAUT, DEVISES_SUPPORTEES, devisErangere } from "./fx";

/**
 * Une ligne éditable du formulaire de saisie.
 * Composant contrôlé : remonte chaque modification via `onChange`.
 */
interface LigneFormulaireProps {
  readonly ligne: LigneSaisie;
  readonly index: number;
  /** Vrai s'il s'agit de la seule ligne (on ne peut alors pas la supprimer). */
  readonly suppressionImpossible: boolean;
  readonly onChange: (id: string, champs: Partial<LigneSaisie>) => void;
  readonly onSupprimer: (id: string) => void;
  /** Erreurs de validation/conversion de la ligne (affichées dès qu'un montant est saisi). */
  readonly erreurs: readonly string[];
}

const classeChamp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function LigneFormulaire({
  ligne,
  index,
  suppressionImpossible,
  onChange,
  onSupprimer,
  erreurs,
}: LigneFormulaireProps) {
  const montantRenseigne = ligne.montant.trim() !== "";
  // La devise étrangère déclenche la conversion BCE : la date d'encaissement
  // devient nécessaire et le champ n'a aucun sens en EUR (cours = 1).
  const deviseEtrangere = devisErangere(ligne.devise);

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Ligne {index + 1}
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Pays */}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Pays
          <select
            className={classeChamp}
            autoComplete="off"
            value={ligne.paysCode}
            onChange={(e) => onChange(ligne.id, { paysCode: e.target.value })}
          >
            {PAYS_2025.map((p) => (
              <option key={p.code} value={p.code}>
                {p.nom}
              </option>
            ))}
          </select>
        </label>

        {/* Type de revenu */}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Type de revenu
          <select
            className={classeChamp}
            autoComplete="off"
            value={ligne.type}
            onChange={(e) => onChange(ligne.id, { type: e.target.value as TypeRevenu })}
          >
            <option value="dividende">Dividende</option>
            <option value="interet">Intérêt</option>
          </select>
        </label>

        {/* Date d'encaissement — uniquement pour une devise étrangère (sert au cours BCE). */}
        {deviseEtrangere && (
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Date d'encaissement
            <input
              type="date"
              className={classeChamp}
              autoComplete="off"
              value={ligne.dateEncaissement}
              onChange={(e) => onChange(ligne.id, { dateEncaissement: e.target.value })}
            />
            <span className="mt-0.5 text-xs font-normal text-slate-400">
              requise pour la conversion
            </span>
          </label>
        )}

        {/* Montant + bascule brut/net */}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Montant
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            className={classeChamp}
            autoComplete="off"
            value={ligne.montant}
            onChange={(e) => onChange(ligne.id, { montant: e.target.value })}
          />
        </label>

        {/* Bascule brut/net */}
        <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Saisi en
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
            {(["brut", "net"] as ModeMontant[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChange(ligne.id, { mode: m })}
                className={
                  "flex-1 px-3 py-1.5 text-sm capitalize transition " +
                  (ligne.mode === m
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100")
                }
                aria-pressed={ligne.mode === m}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Devise */}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Devise
          <select
            className={classeChamp}
            autoComplete="off"
            value={ligne.devise}
            onChange={(e) => onChange(ligne.id, { devise: e.target.value })}
          >
            <option value={DEVISE_DEFAUT}>{DEVISE_DEFAUT}</option>
            {DEVISES_SUPPORTEES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {deviseEtrangere && (
            <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              converti en EUR au cours BCE du jour d'encaissement
            </span>
          )}
        </label>

        {/* Impôt étranger retenu */}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Impôt étranger retenu
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            className={classeChamp}
            autoComplete="off"
            value={ligne.impotEtranger}
            onChange={(e) => onChange(ligne.id, { impotEtranger: e.target.value })}
          />
        </label>

        {/* Abattement 40 % : routage 2DC (coché) vs 2TS — dividendes uniquement. */}
        {ligne.type === "dividende" && (
          <label className="flex items-start gap-2 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
              autoComplete="off"
              checked={ligne.eligibleAbattement40 ?? true}
              onChange={(e) => onChange(ligne.id, { eligibleAbattement40: e.target.checked })}
            />
            <span>
              Dividende éligible à l'abattement de 40 % (société soumise à l'IS ou
              équivalent, siège UE ou pays conventionné, dividende voté en AG)
              <span className="mt-0.5 block text-xs font-normal text-slate-400">
                Décochez pour un ETF/fonds, une foncière cotée (SIIC, SPPICAV, REIT) ou un
                jeton de présence.
              </span>
            </span>
          </label>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        {/* Erreurs de validation/conversion, une fois un montant saisi (sinon ligne en cours). */}
        {montantRenseigne && erreurs.length > 0 ? (
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
          onClick={() => onSupprimer(ligne.id)}
          disabled={suppressionImpossible}
          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          Supprimer
        </button>
      </div>
    </fieldset>
  );
}
