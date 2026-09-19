import type { Declaration2047, ResultatLigne, Case2042 } from "../lib/tax-engine";
import BoutonCopier from "./BoutonCopier";
import { formateEurosEntiers } from "./fx";

/** Libellés des cases 2042/2042C où sont reportés les revenus (cf. SOURCES-2047.md §5). */
const LIBELLES_CASE_2042: Record<Case2042, string> = {
  "2DC": "dividendes éligibles à l'abattement de 40 %",
  "2TS": "autres revenus distribués",
  "2TR": "intérêts et produits de placement à revenu fixe",
};

/**
 * Affichage des résultats case par case + agrégats 8VL / 8PL.
 * On reçoit la déclaration calculée par le moteur ainsi que les libellés des lignes.
 */
interface ResultatsProps {
  readonly declaration: Declaration2047;
  /** Libellé descriptif de chaque ligne (même ordre que declaration.lignes). */
  readonly libellesLignes: readonly string[];
}

function CelluleCase({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-slate-500">{libelle}</span>
      <span className="font-mono text-sm text-slate-900">{formateEurosEntiers(valeur)}</span>
    </div>
  );
}

function CarteLigne({ resultat, libelle, numero }: { resultat: ResultatLigne; libelle: string; numero: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          Ligne {numero} — {libelle}
        </h3>
        {!resultat.ouvreDroitCredit && (
          <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            n'ouvre pas droit à crédit
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CelluleCase libelle="205 (crédit calculé)" valeur={resultat.ligne205Eur} />
        <CelluleCase libelle="206 (impôt étranger)" valeur={resultat.ligne206Eur} />
        <CelluleCase libelle="207 (crédit retenu)" valeur={resultat.ligne207Eur} />
        <CelluleCase libelle="Excédent non récup." valeur={resultat.excedentNonRecuperableEur} />
      </div>

      {resultat.excedentNonRecuperableEur > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Excédent non récupérable côté FR ({formateEurosEntiers(resultat.excedentNonRecuperableEur)}),
          à réclamer à l'État source.
        </p>
      )}

      {resultat.ligne206Eur > 0 && resultat.ligne207Eur === 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Ce pays n'ouvre pas droit à crédit pour ce type de revenu&nbsp;: le montant à
          reporter n'inclut donc aucun crédit — si un impôt étranger a bien été prélevé,
          faites confirmer le montant exact à reporter (le formulaire ne prévoit pas de
          mécanique 203+207 pour la ligne 220).
        </p>
      )}
    </div>
  );
}

export default function Resultats({ declaration, libellesLignes }: ResultatsProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-900">Résultats</h2>

      <div className="flex flex-col gap-3">
        {declaration.lignes.map((r, i) => (
          <CarteLigne
            key={i}
            resultat={r}
            libelle={libellesLignes[i] ?? ""}
            numero={i + 1}
          />
        ))}
      </div>

      {/* Agrégats mis en avant */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-blue-900">Case 8VL</p>
              <p className="text-xs text-blue-700">Crédit d'impôt total (somme des 207)</p>
              <p className="mt-1 font-mono text-2xl font-bold text-blue-900">
                {formateEurosEntiers(declaration.case8vlEur)}
              </p>
            </div>
            <BoutonCopier valeur={String(declaration.case8vlEur)} libelle="Copier la case 8VL" />
          </div>
        </div>

        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-blue-900">Case 8PL</p>
              <p className="text-xs text-blue-700">Base nette ouvrant droit à crédit</p>
              <p className="mt-1 font-mono text-2xl font-bold text-blue-900">
                {formateEurosEntiers(declaration.case8plEur)}
              </p>
            </div>
            <BoutonCopier valeur={String(declaration.case8plEur)} libelle="Copier la case 8PL" />
          </div>
        </div>
      </div>

      {/* Report sur la déclaration 2042 (cases 2DC / 2TS / 2TR) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Report sur la 2042</p>
        <p className="mb-2 text-xs text-slate-500">
          Montants bruts, crédit d'impôt inclus (ligne 208 du 2047 = 203 + 207)
        </p>
        <div className="flex flex-col gap-2">
          {(Object.entries(declaration.report2042) as [Case2042, number][])
            .filter(([, montant]) => montant > 0)
            .map(([caseId, montant]) => (
              <div key={caseId} className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-700">
                  <span className="font-mono font-semibold">{caseId}</span> — {LIBELLES_CASE_2042[caseId]}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-900">{formateEurosEntiers(montant)}</span>
                  <BoutonCopier valeur={String(montant)} libelle={`Copier la case ${caseId}`} />
                </div>
              </div>
            ))}
          {Object.values(declaration.report2042).every((m) => m === 0) && (
            <p className="text-xs text-slate-400">Aucun montant à reporter.</p>
          )}
        </div>
      </div>
    </section>
  );
}
