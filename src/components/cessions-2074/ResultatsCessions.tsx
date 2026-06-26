import type { Declaration2074, ResultatCession } from "../../lib/cessions-2074";
import BoutonCopier from "../BoutonCopier";
import { formateCents, formateEurosEntiers } from "../fx";

/**
 * Affichage des résultats du 2074-CMV : détail par cession (PMP, prix de revient, résultat signé,
 * abattement éventuel) + cases 3VG / 3VH copiables + imputation/report des moins-values.
 */
interface ResultatsCessionsProps {
  readonly declaration: Declaration2074;
}

/** Formate des centimes signés avec « + » explicite pour une plus-value. */
function formateSigne(cents: number): string {
  return (cents > 0 ? "+ " : cents < 0 ? "− " : "") + formateCents(Math.abs(cents));
}

function CelluleDetail({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-slate-500">{libelle}</span>
      <span className="font-mono text-sm text-slate-900">{valeur}</span>
    </div>
  );
}

function CarteCession({ resultat, numero }: { resultat: ResultatCession; numero: number }) {
  const estPlusValue = resultat.resultatEurCents > 0;
  const estMoinsValue = resultat.resultatEurCents < 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">
          {resultat.id ?? `Cession n°${numero}`}
        </h3>
        <span
          className={
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
            (estPlusValue
              ? "bg-emerald-100 text-emerald-800"
              : estMoinsValue
                ? "bg-red-100 text-red-700"
                : "bg-slate-200 text-slate-700")
          }
        >
          {estPlusValue ? "Plus-value" : estMoinsValue ? "Moins-value" : "Neutre"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CelluleDetail libelle="PMP unitaire" valeur={formateCents(resultat.pmpUnitaireEurCents)} />
        <CelluleDetail
          libelle="Prix de cession net"
          valeur={formateCents(resultat.prixCessionNetEurCents)}
        />
        <CelluleDetail
          libelle="Prix de revient"
          valeur={formateCents(resultat.prixRevientAlloueEurCents)}
        />
        <CelluleDetail libelle="Résultat" valeur={formateSigne(resultat.resultatEurCents)} />
      </div>

      {resultat.abattementPct > 0 && (
        <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Abattement durée de détention {resultat.abattementPct} % (barème, titres acquis avant
          2018) → résultat retenu {formateSigne(resultat.resultatApresAbattementEurCents)}.
        </p>
      )}
    </div>
  );
}

function CarteCase({
  code,
  libelle,
  valeur,
  ton,
}: {
  code: string;
  libelle: string;
  valeur: number;
  ton: "vert" | "rouge";
}) {
  const couleurs =
    ton === "vert"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-900";
  return (
    <div className={"rounded-xl border-2 p-4 " + couleurs}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            Case <span className="font-mono">{code}</span>
          </p>
          <p className="text-xs opacity-80">{libelle}</p>
          <p className="mt-1 font-mono text-2xl font-bold">{formateEurosEntiers(valeur)}</p>
        </div>
        <BoutonCopier valeur={String(valeur)} libelle={`Copier la case ${code}`} />
      </div>
    </div>
  );
}

export default function ResultatsCessions({ declaration }: ResultatsCessionsProps) {
  const {
    cessions,
    plusValueBruteAnneeEurCents,
    moinsValueAnneeEurCents,
    moinsValuesAnterieuresImputeesEurCents,
    moinsValueAnneeReportableEurCents,
    moinsValuesAnterieuresRestantesEurCents,
    moinsValueReportableTotaleEurCents,
  } = declaration;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-900">Résultats</h2>

      <div className="flex flex-col gap-3">
        {cessions.map((r, i) => (
          <CarteCession key={i} resultat={r} numero={i + 1} />
        ))}
      </div>

      {/* Cases 2042 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CarteCase
          code="3VG"
          libelle="Plus-value nette imposable de l'année"
          valeur={declaration.case3VG}
          ton="vert"
        />
        <CarteCase
          code="3VH"
          libelle="Moins-value de l'année non imputée (reportable 10 ans)"
          valeur={declaration.case3VH}
          ton="rouge"
        />
      </div>

      {/* Imputation / report des moins-values */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold text-slate-900">Imputation & report des moins-values</p>
        <dl className="flex flex-col gap-1.5 text-slate-700">
          <div className="flex items-center justify-between">
            <dt>Plus-values brutes de l'année</dt>
            <dd className="font-mono">{formateCents(plusValueBruteAnneeEurCents)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Moins-values de l'année</dt>
            <dd className="font-mono">{formateCents(moinsValueAnneeEurCents)}</dd>
          </div>
          {moinsValuesAnterieuresImputeesEurCents > 0 && (
            <div className="flex items-center justify-between">
              <dt>Moins-values antérieures imputées</dt>
              <dd className="font-mono">{formateCents(moinsValuesAnterieuresImputeesEurCents)}</dd>
            </div>
          )}
          {moinsValuesAnterieuresRestantesEurCents > 0 && (
            <div className="flex items-center justify-between text-slate-500">
              <dt>Moins-values antérieures restantes (toujours reportables, hors 3VH)</dt>
              <dd className="font-mono">{formateCents(moinsValuesAnterieuresRestantesEurCents)}</dd>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1.5 font-medium text-slate-900">
            <dt>Total reportable les années suivantes (10 ans)</dt>
            <dd className="font-mono">{formateCents(moinsValueReportableTotaleEurCents)}</dd>
          </div>
        </dl>
        {moinsValueAnneeReportableEurCents > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Dont {formateCents(moinsValueAnneeReportableEurCents)} créés cette année (case 3VH) ; le
            suivi pluriannuel du report n'est pas conservé par cet outil (saisie manuelle).
          </p>
        )}
      </div>

      <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
        Reportez <span className="font-mono font-semibold">3VG</span> et{" "}
        <span className="font-mono font-semibold">3VH</span> sur la déclaration{" "}
        <span className="font-semibold">2042-C</span> ; le détail par cession se reporte sur le
        formulaire <span className="font-semibold">2074</span> / la fiche{" "}
        <span className="font-semibold">2074-CMV</span>. Régime{" "}
        <span className="font-semibold">{declaration.regime === "BAREME" ? "barème" : "PFU"}</span>.
      </p>
    </section>
  );
}
