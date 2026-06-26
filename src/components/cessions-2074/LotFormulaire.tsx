import type { LotSaisie } from "./types";

/**
 * Une ligne de lot d'acquisition (date, quantité, prix unitaire, frais), dans la devise de la
 * cession parente. Composant contrôlé.
 */
interface LotFormulaireProps {
  readonly lot: LotSaisie;
  readonly devise: string;
  readonly suppressionImpossible: boolean;
  readonly onChange: (id: string, champs: Partial<LotSaisie>) => void;
  readonly onSupprimer: (id: string) => void;
}

const classeChamp =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function LotFormulaire({
  lot,
  devise,
  suppressionImpossible,
  onChange,
  onSupprimer,
}: LotFormulaireProps) {
  return (
    <div className="grid grid-cols-2 items-end gap-2 rounded-md border border-slate-200 bg-white p-2 sm:grid-cols-5">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Date d'achat
        <input
          type="date"
          className={classeChamp}
          autoComplete="off"
          value={lot.dateISO}
          onChange={(e) => onChange(lot.id, { dateISO: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Quantité
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="0"
          className={classeChamp}
          autoComplete="off"
          value={lot.quantite}
          onChange={(e) => onChange(lot.id, { quantite: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Prix unitaire ({devise})
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0,00"
          className={classeChamp}
          autoComplete="off"
          value={lot.prixUnitaire}
          onChange={(e) => onChange(lot.id, { prixUnitaire: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Frais ({devise})
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0,00"
          className={classeChamp}
          autoComplete="off"
          value={lot.frais}
          onChange={(e) => onChange(lot.id, { frais: e.target.value })}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSupprimer(lot.id)}
          disabled={suppressionImpossible}
          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          Retirer le lot
        </button>
      </div>
    </div>
  );
}
