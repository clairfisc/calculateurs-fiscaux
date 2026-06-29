import type { OperationSaisie, TypeOperationSaisie } from "./types";

/**
 * Une opération éditable du journal 2086 : achat (acquisition) ou vente (cession imposable).
 * Composant contrôlé : remonte chaque modification via `onChange`.
 */
interface OperationFormulaireProps {
  readonly operation: OperationSaisie;
  readonly index: number;
  /** Vrai s'il s'agit de la seule opération (on ne peut alors pas la supprimer). */
  readonly suppressionImpossible: boolean;
  readonly onChange: (id: string, champs: Partial<OperationSaisie>) => void;
  readonly onSupprimer: (id: string) => void;
  /** Erreurs de validation (affichées dès qu'un montant est saisi). */
  readonly erreurs: readonly string[];
}

const classeChamp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

// Hauteur réservée uniforme pour le libellé (jusqu'à 2 lignes) + texte aligné en bas, afin
// que tous les champs d'une même ligne commencent à la même hauteur.
const classeLibelle = "flex min-h-10 items-end text-sm font-medium text-slate-700";

export default function OperationFormulaire({
  operation,
  index,
  suppressionImpossible,
  onChange,
  onSupprimer,
  erreurs,
}: OperationFormulaireProps) {
  const estAchat = operation.type === "achat";
  const montantRenseigne = estAchat
    ? operation.montant.trim() !== ""
    : operation.prixCession.trim() !== "";

  return (
    <fieldset
      className={
        "rounded-lg border p-3 " +
        (estAchat ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50/60")
      }
    >
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Opération {index + 1}
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Type : achat / vente */}
        <div className="flex flex-col gap-1">
          <span className={classeLibelle}>Type</span>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
            {(["achat", "vente"] as TypeOperationSaisie[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange(operation.id, { type: t })}
                className={
                  "flex-1 px-3 py-1.5 text-sm capitalize transition " +
                  (operation.type === t
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100")
                }
                aria-pressed={operation.type === t}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <label className="flex flex-col gap-1">
          <span className={classeLibelle}>Date</span>
          <input
            type="date"
            className={classeChamp}
            autoComplete="off"
            value={operation.date}
            onChange={(e) => onChange(operation.id, { date: e.target.value })}
          />
          <span className="mt-0.5 text-xs font-normal text-slate-400">facultatif</span>
        </label>

        {estAchat ? (
          /* ACHAT — montant payé */
          <label className="flex flex-col gap-1">
            <span className={classeLibelle}>Montant payé (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              className={classeChamp}
              autoComplete="off"
              value={operation.montant}
              onChange={(e) => onChange(operation.id, { montant: e.target.value })}
            />
            <span className="mt-0.5 text-xs font-normal text-slate-400">
              prix d'acquisition en euros
            </span>
          </label>
        ) : (
          /* VENTE — prix, valeur globale, frais */
          <>
            <label className="flex flex-col gap-1">
              <span className={classeLibelle}>Prix de cession (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                className={classeChamp}
                autoComplete="off"
                value={operation.prixCession}
                onChange={(e) => onChange(operation.id, { prixCession: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={classeLibelle}>Valeur globale du portefeuille (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                className={classeChamp}
                autoComplete="off"
                value={operation.valeurGlobale}
                onChange={(e) => onChange(operation.id, { valeurGlobale: e.target.value })}
              />
              <span className="mt-0.5 text-xs font-normal text-slate-400">
                valeur de vos cryptos au moment de cette cession (avant la vente)
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className={classeLibelle}>Frais de cession (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                className={classeChamp}
                autoComplete="off"
                value={operation.frais}
                onChange={(e) => onChange(operation.id, { frais: e.target.value })}
              />
              <span className="mt-0.5 text-xs font-normal text-slate-400">optionnel</span>
            </label>
          </>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
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
          onClick={() => onSupprimer(operation.id)}
          disabled={suppressionImpossible}
          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          Supprimer
        </button>
      </div>
    </fieldset>
  );
}
