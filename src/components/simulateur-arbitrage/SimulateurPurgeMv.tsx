import { useMemo, useState } from "react";
import { calculePurgeMv } from "../../lib/simulateur-arbitrage";
import type { ComparatifArbitrage, DetailsPurgeMV } from "../../lib/simulateur-arbitrage";
import { toCents, formateCents } from "../fx";

/**
 * Levier **L1 — Purge des moins-values** (tax-loss harvesting), îlot React autonome du simulateur
 * d'arbitrage (mode A, year-round). Cadrage : §X / §X / §X .
 *
 * Compare **sans recommander** deux scénarios : A « je ne réalise pas mes moins-values latentes »
 * vs B « je réalise N € de moins-values latentes avant le 31/12 ». Tout le calcul est délégué au
 * module `simulateur-arbitrage/purge-mv` (qui compose `cessions-2074` + `pfu-bareme`) — ce composant
 * ne fait que saisir, appeler et restituer le différentiel.
 *
 * Mode A (§X) : libellés descriptifs et neutres, aucun « recommandé / vous devriez ».
 * 100 % client-side : aucune donnée saisie ne quitte le navigateur.
 */

const LIBELLE_MILLESIME: Record<2025 | 2026, string> = {
  2025: "Revenus 2025 (déclaration 2026)",
  2026: "Revenus 2026 (déclaration 2027)",
};

const LIBELLE_TMI: Record<number, string> = {
  0: "0 % (non imposable)",
  1100: "11 %",
  3000: "30 %",
  4100: "41 %",
  4500: "45 %",
};
const TMI_BP = [0, 1100, 3000, 4100, 4500];

/** Formate un montant signé en centimes : « −1 256,00 € », « +4 000,00 € », « 0,00 € ». */
function formateCentsSigne(cents: number): string {
  if (cents === 0) return formateCents(0);
  const signe = cents > 0 ? "+ " : "− ";
  return signe + formateCents(Math.abs(cents));
}

/** Champ de montant en euros (libellé + aide courte), aligné sur le comparateur PFU. */
function ChampMontant({
  id,
  libelle,
  aide,
  valeur,
  onChange,
}: {
  id: string;
  libelle: string;
  aide: string;
  valeur: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {libelle}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full rounded-md border border-slate-300 px-3 py-2 pr-8 text-right font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
          €
        </span>
      </div>
      <p className="text-xs text-slate-500">{aide}</p>
    </div>
  );
}

/** Carte d'un scénario : situation décrite (neutre), impôt + PS estimé et plus-value imposable. */
function CarteScenario({
  titre,
  case3vgEur,
  impotEtPsCents,
}: {
  titre: string;
  case3vgEur: number;
  impotEtPsCents: number;
}) {
  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{titre}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-slate-900">
        {formateCents(impotEtPsCents)}
      </p>
      <p className="text-xs text-slate-500">impôt sur le revenu + prélèvements sociaux estimés</p>
      <dl className="mt-3 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Plus-value imposable (case 3VG)</dt>
          <dd className="font-mono text-slate-900">{formateCents(case3vgEur * 100)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Bandeau de différentiel — descriptif, sans recommandation (mode A). */
function Differentiel({ resultat }: { resultat: ComparatifArbitrage<DetailsPurgeMV> }) {
  const dImpot = resultat.deltaImpotEtPsCents;
  const dReport = resultat.details.deltaMvReportableCents;

  let phraseImpot: React.ReactNode;
  if (dImpot < 0) {
    phraseImpot = (
      <>
        Dans le scénario B, l'impôt + PS estimé de l'année est{" "}
        <strong>inférieur de {formateCents(Math.abs(dImpot))}</strong>.
      </>
    );
  } else if (dImpot > 0) {
    phraseImpot = (
      <>
        Dans le scénario B, l'impôt + PS estimé de l'année est{" "}
        <strong>supérieur de {formateCents(dImpot)}</strong>.
      </>
    );
  } else {
    phraseImpot = (
      <>
        Les deux scénarios aboutissent au <strong>même impôt + PS</strong> sur l'année.
      </>
    );
  }

  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-800">
      <p className="m-0">
        <span className="font-medium">Différence d'impôt + PS (B − A) :</span>{" "}
        <span className="font-mono">{formateCentsSigne(dImpot)}</span>. {phraseImpot}
      </p>
      {dReport !== 0 && (
        <p className="m-0 mt-2 text-slate-700">
          {dReport > 0 ? (
            <>
              La moins-value reportable augmente de{" "}
              <strong>{formateCents(dReport)}</strong> (part non imputée cette année, reportable
              10 ans sur des plus-values de même nature).
            </>
          ) : (
            <>
              La moins-value reportable diminue de <strong>{formateCents(Math.abs(dReport))}</strong>{" "}
              (imputée cette année).
            </>
          )}
        </p>
      )}
    </div>
  );
}

export default function SimulateurPurgeMv() {
  const [millesime, setMillesime] = useState<2025 | 2026>(2025);
  const [regime, setRegime] = useState<"PFU" | "BAREME">("PFU");
  const [tmiBp, setTmiBp] = useState<number>(3000);
  const [plusValue, setPlusValue] = useState("");
  const [mvMobilisable, setMvMobilisable] = useState("");
  const [mvARealiser, setMvARealiser] = useState("");
  const [mvAnterieures, setMvAnterieures] = useState("");

  const plusValueNetteAnneeCents = toCents(plusValue) ?? 0;
  const mvLatenteMobilisableCents = toCents(mvMobilisable) ?? 0;
  const mvLatenteARealiserCents = toCents(mvARealiser) ?? 0;
  const mvAnterieuresReportablesCents = toCents(mvAnterieures) ?? 0;

  const aSaisie = plusValueNetteAnneeCents > 0 || mvLatenteMobilisableCents > 0;

  const resultat = useMemo(
    () =>
      calculePurgeMv({
        plusValueNetteAnneeCents,
        mvLatenteMobilisableCents,
        mvLatenteARealiserCents,
        mvAnterieuresReportablesCents,
        imposition: {
          millesime,
          regime,
          ...(regime === "BAREME" ? { tmiBp } : {}),
        },
      }),
    [
      plusValueNetteAnneeCents,
      mvLatenteMobilisableCents,
      mvLatenteARealiserCents,
      mvAnterieuresReportablesCents,
      millesime,
      regime,
      tmiBp,
    ],
  );

  const realiseBornee =
    mvLatenteARealiserCents > mvLatenteMobilisableCents && mvLatenteMobilisableCents > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Purge de moins-values : simuler l'impact avant le 31 décembre
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Visualisez la différence d'impôt entre réaliser ou non vos moins-values latentes avant la
          fin de l'année, pour les imputer sur vos plus-values. Comparatif chiffré, calculé localement
          dans votre navigateur (aucune donnée collectée).
        </p>
      </header>

      {/* Saisie */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Votre situation</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="millesime" className="text-sm font-medium text-slate-700">
              Année des revenus
            </label>
            <select
              id="millesime"
              value={millesime}
              onChange={(e) => setMillesime(Number(e.target.value) as 2025 | 2026)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {(Object.keys(LIBELLE_MILLESIME) as unknown as (2025 | 2026)[]).map((m) => (
                <option key={m} value={m}>
                  {LIBELLE_MILLESIME[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Imposition de la plus-value</span>
            <div className="flex rounded-md border border-slate-300 p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setRegime("PFU")}
                aria-pressed={regime === "PFU"}
                className={
                  "flex-1 rounded px-3 py-1.5 transition " +
                  (regime === "PFU" ? "bg-blue-600 font-medium text-white" : "text-slate-700 hover:bg-slate-100")
                }
              >
                PFU (flat tax)
              </button>
              <button
                type="button"
                onClick={() => setRegime("BAREME")}
                aria-pressed={regime === "BAREME"}
                className={
                  "flex-1 rounded px-3 py-1.5 transition " +
                  (regime === "BAREME" ? "bg-blue-600 font-medium text-white" : "text-slate-700 hover:bg-slate-100")
                }
              >
                Barème (2OP)
              </button>
            </div>
            {regime === "BAREME" && (
              <select
                aria-label="Tranche marginale d'imposition"
                value={tmiBp}
                onChange={(e) => setTmiBp(Number(e.target.value))}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TMI_BP.map((bp) => (
                  <option key={bp} value={bp}>
                    TMI {LIBELLE_TMI[bp]}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-slate-500">
              Par défaut le PFU (12,8 % + prélèvements sociaux). Le barème suppose l'option globale 2OP.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ChampMontant
            id="plus-value"
            libelle="Plus-values déjà réalisées cette année"
            aide="Plus-value nette imposable déjà réalisée sur vos cessions de l'année (case 3VG)."
            valeur={plusValue}
            onChange={setPlusValue}
          />
          <ChampMontant
            id="mv-mobilisable"
            libelle="Moins-values latentes mobilisables"
            aide="Lignes en perte que vous pourriez vendre avant le 31/12."
            valeur={mvMobilisable}
            onChange={setMvMobilisable}
          />
          <ChampMontant
            id="mv-a-realiser"
            libelle="Moins-values réalisées dans le scénario B"
            aide="Montant que vous envisagez de réaliser (borné au mobilisable ci-dessus)."
            valeur={mvARealiser}
            onChange={setMvARealiser}
          />
          <ChampMontant
            id="mv-anterieures"
            libelle="Moins-values antérieures reportables"
            aide="Stock de moins-values des 10 dernières années non encore imputées (facultatif)."
            valeur={mvAnterieures}
            onChange={setMvAnterieures}
          />
        </div>

        {realiseBornee && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Le montant réalisé dans le scénario B est ramené au total mobilisable (
            {formateCents(mvLatenteMobilisableCents)}) : on ne peut pas réaliser plus de moins-values
            que vous n'en détenez en latent.
          </p>
        )}
      </section>

      {/* Résultats */}
      {aSaisie ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Comparaison des deux scénarios</h2>
          <Differentiel resultat={resultat} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CarteScenario
              titre={"Scénario A — " + resultat.scenarioA.libelle}
              case3vgEur={resultat.details.case3vgAEur}
              impotEtPsCents={resultat.scenarioA.impotEtPsCents}
            />
            <CarteScenario
              titre={"Scénario B — " + resultat.scenarioB.libelle}
              case3vgEur={resultat.details.case3vgBEur}
              impotEtPsCents={resultat.scenarioB.impotEtPsCents}
            />
          </div>

          {resultat.details.mvRealiseeCents > 0 &&
            resultat.details.deltaCase3vgEur === 0 &&
            resultat.deltaImpotEtPsCents === 0 && (
              <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Ici, aucune plus-value de l'année n'est effacée par la purge : la moins-value réalisée
                est <strong>simplement reportée</strong> (elle ne réduit pas l'impôt de l'année).
              </p>
            )}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Renseignez vos plus-values de l'année et vos moins-values latentes pour comparer les deux
          scénarios.
        </div>
      )}

      {/* Garde-fous (portés par le calcul, mode A — signalés, non tranchés) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <p className="mb-2 text-sm font-semibold text-slate-900">À savoir</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {resultat.details.gardeFous.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
          <li>
            L'imputation suit l'ordre légal : moins-values de l'année, puis moins-values antérieures,
            le reliquat étant reporté 10 ans sur des plus-values de <strong>même nature</strong>.
          </li>
          <li>
            PEA, assurance-vie et abattements pour durée de détention (titres acquis avant 2018)
            relèvent de règles propres, <strong>hors de cette simulation</strong>.
          </li>
        </ul>
      </section>

      <p className="text-xs text-slate-400">
        Aide informative — ne constitue pas un conseil fiscal ni en investissement.
      </p>
    </div>
  );
}
