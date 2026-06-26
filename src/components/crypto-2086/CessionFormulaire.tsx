import type { CessionSaisie } from "./types";

/**
 * Une cession imposable éditable du formulaire 2086.
 * Composant contrôlé : remonte chaque modification via `onChange`.
 */
interface CessionFormulaireProps {
  readonly cession: CessionSaisie;
  readonly index: number;
  /** Vrai s'il s'agit de la seule cession (on ne peut alors pas la supprimer). */
  readonly suppressionImpossible: boolean;
  readonly onChange: (id: string, champs: Partial<CessionSaisie>) => void;
  readonly onSupprimer: (id: string) => void;
  /** Erreurs de validation de la cession (affichées dès qu'un montant est saisi). */
  readonly erreurs: readonly string[];
}

const classeChamp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

// Hauteur réservée uniforme pour le libellé (jusqu'à 2 lignes) + texte aligné en bas, afin
// que tous les champs d'une même ligne commencent à la même hauteur, même quand un libellé
// passe sur deux lignes (ex. « Valeur globale du portefeuille »).
const classeLibelle = "flex min-h-10 items-end text-sm font-medium text-slate-700";

export default function CessionFormulaire({
  cession,
  index,
  suppressionImpossible,
  onChange,
  onSupprimer,
  erreurs,
}: CessionFormulaireProps) {
  const montantRenseigne = cession.prixCession.trim() !== "";

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Cession {index + 1}
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Date de la cession */}
        <label className="flex flex-col gap-1">
          <span className={classeLibelle}>Date de la cession</span>
          <input
            type="date"
            className={classeChamp}
            autoComplete="off"
            value={cession.date}
            onChange={(e) => onChange(cession.id, { date: e.target.value })}
          />
          <span className="mt-0.5 text-xs font-normal text-slate-400">facultatif</span>
        </label>

        {/* Prix de cession */}
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
            value={cession.prixCession}
            onChange={(e) => onChange(cession.id, { prixCession: e.target.value })}
          />
        </label>

        {/* Valeur globale du portefeuille */}
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
            value={cession.valeurGlobale}
            onChange={(e) => onChange(cession.id, { valeurGlobale: e.target.value })}
          />
          <span className="mt-0.5 text-xs font-normal text-slate-400">
            valeur de vos cryptos au moment de cette cession
          </span>
        </label>

        {/* Frais de cession */}
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
            value={cession.frais}
            onChange={(e) => onChange(cession.id, { frais: e.target.value })}
          />
          <span className="mt-0.5 text-xs font-normal text-slate-400">optionnel</span>
        </label>
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
          onClick={() => onSupprimer(cession.id)}
          disabled={suppressionImpossible}
          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          Supprimer
        </button>
      </div>
    </fieldset>
  );
}
