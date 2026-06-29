import type { Declaration2086 } from "../../lib/crypto-2086";
import BoutonCopier from "../BoutonCopier";
import { formateCents, formateEurosEntiers } from "../fx";

/**
 * Affichage des résultats du calcul 2086 : détail par vente (imputation progressive du
 * prix d'acquisition) + cases 2042-C 3AN / 3BN à reporter. Tout est dérivé du moteur.
 */
interface Resultats2086Props {
  readonly declaration: Declaration2086;
}

function Cellule({ libelle, cents }: { libelle: string; cents: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-slate-500">{libelle}</span>
      <span className="font-mono text-sm text-slate-900">{formateCents(cents)}</span>
    </div>
  );
}

export default function Resultats2086({ declaration }: Resultats2086Props) {
  const { ventes, totalCessionsEur, exonere305, case3anEur, case3bnEur } = declaration;
  const estMoinsValue = case3bnEur > 0;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-900">Résultats</h2>

      {/* Exonération 305 € */}
      {exonere305 && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <strong>Cessions exonérées.</strong> Le total de vos prix de cession imposables
          ({formateEurosEntiers(totalCessionsEur)}) n'excède pas 305 € sur l'année : les plus-values
          sont exonérées (art. 150 VH bis, II-B). Rien à reporter en 3AN/3BN.
        </p>
      )}

      {/* Détail par vente */}
      <div className="flex flex-col gap-3">
        {ventes.map((c, i) => {
          const moinsValue = c.plusValueCents < 0;
          return (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  Vente {i + 1}
                  {c.date && <span className="font-normal text-slate-500"> — {c.date}</span>}
                </h3>
                <span
                  className={
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                    (moinsValue ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")
                  }
                >
                  {moinsValue ? "Moins-value" : "Plus-value"} {formateCents(c.plusValueCents)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Cellule libelle="Prix de cession" cents={c.prixCessionCents} />
                <Cellule libelle="Valeur globale portef." cents={c.valeurGlobalePortefeuilleCents} />
                <Cellule libelle="Prix d'acquisition net" cents={c.prixAcquisitionNetCents} />
                <Cellule libelle="Quote-part imputée" cents={c.fractionAcquisitionImputeeCents} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Cases 2042-C : 3AN (plus-value) / 3BN (moins-value) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className={
            "rounded-xl border-2 p-4 " +
            (!estMoinsValue && !exonere305 ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white")
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-blue-900">Case 3AN</p>
              <p className="text-xs text-blue-700">Plus-value nette imposable</p>
              <p className="mt-1 font-mono text-2xl font-bold text-blue-900">
                {formateEurosEntiers(case3anEur)}
              </p>
            </div>
            <BoutonCopier valeur={String(case3anEur)} libelle="Copier la case 3AN" />
          </div>
        </div>

        <div
          className={
            "rounded-xl border-2 p-4 " +
            (estMoinsValue ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white")
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-rose-900">Case 3BN</p>
              <p className="text-xs text-rose-700">Moins-value de l'année</p>
              <p className="mt-1 font-mono text-2xl font-bold text-rose-900">
                {formateEurosEntiers(case3bnEur)}
              </p>
            </div>
            <BoutonCopier valeur={String(case3bnEur)} libelle="Copier la case 3BN" />
          </div>
        </div>
      </div>

      {/* Sort de la moins-value : pas de report */}
      {estMoinsValue && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          La moins-value nette d'actifs numériques n'est <strong>ni reportable</strong> sur les
          années suivantes, ni imputable sur des plus-values d'une autre nature (art. 150 VH bis,
          IV). Elle ne s'impute que sur des plus-values crypto de la même année.
        </p>
      )}
    </section>
  );
}
