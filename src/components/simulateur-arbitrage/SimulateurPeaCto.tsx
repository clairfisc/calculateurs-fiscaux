import { useMemo, useState } from "react";
import { calculePeaCto } from "../../lib/simulateur-arbitrage";
import type { ComparatifArbitrage, DetailsPeaCto, HorizonPea } from "../../lib/simulateur-arbitrage";
import { toCents, formateCents } from "../fx";

/**
 * Levier **L4 — Arbitrage PEA / CTO**, îlot React autonome du simulateur d'arbitrage (mode A).
 * Cadrage : §X + méthode  (sous-moteur PEA neuf, sourcé et gelé en tests).
 *
 * Compare **sans recommander** le coût fiscal de sortie d'un gain donné : A « compte-titres
 * ordinaire » vs B « PEA » selon l'horizon de détention (avant / après 5 ans). Tout le calcul est
 * délégué à `simulateur-arbitrage/pea` (sous-moteur PEA + composition `pfu-bareme`).
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

const LIBELLE_HORIZON: Record<HorizonPea, string> = {
  AVANT_5_ANS: "Avant 5 ans (clôture du plan)",
  APRES_5_ANS: "Après 5 ans (exonération d'IR)",
};

/** Formate un montant signé en centimes : « − 1 420,00 € », « + 140,00 € », « 0,00 € ». */
function formateCentsSigne(cents: number): string {
  if (cents === 0) return formateCents(0);
  const signe = cents > 0 ? "+ " : "− ";
  return signe + formateCents(Math.abs(cents));
}

/** Champ de montant en euros (libellé + aide courte). */
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

/** Carte d'un scénario : coût fiscal de sortie, décomposé IR + PS (descriptif, neutre). */
function CarteScenario({
  titre,
  impotEtPsCents,
  irCents,
  psCents,
}: {
  titre: string;
  impotEtPsCents: number;
  irCents: number;
  psCents: number;
}) {
  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{titre}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-slate-900">{formateCents(impotEtPsCents)}</p>
      <p className="text-xs text-slate-500">coût fiscal de sortie estimé (IR + prélèvements sociaux)</p>
      <dl className="mt-3 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Impôt sur le revenu</dt>
          <dd className="font-mono text-slate-900">{formateCents(irCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Prélèvements sociaux</dt>
          <dd className="font-mono text-slate-900">{formateCents(psCents)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Bandeau de différentiel — descriptif, sans recommandation (mode A). */
function Differentiel({ resultat }: { resultat: ComparatifArbitrage<DetailsPeaCto> }) {
  const d = resultat.deltaImpotEtPsCents;

  let phrase: React.ReactNode;
  if (d < 0) {
    phrase = (
      <>
        Dans le scénario B (PEA), le coût fiscal de sortie est{" "}
        <strong>inférieur de {formateCents(Math.abs(d))}</strong> à celui du compte-titres.
      </>
    );
  } else if (d > 0) {
    phrase = (
      <>
        Dans le scénario B (PEA), le coût fiscal de sortie est{" "}
        <strong>supérieur de {formateCents(d)}</strong> à celui du compte-titres.
      </>
    );
  } else {
    phrase = (
      <>
        Les deux scénarios aboutissent au <strong>même coût fiscal de sortie</strong>.
      </>
    );
  }

  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-800">
      <p className="m-0">
        <span className="font-medium">Différence de coût (PEA − compte-titres) :</span>{" "}
        <span className="font-mono">{formateCentsSigne(d)}</span>. {phrase}
      </p>
    </div>
  );
}

export default function SimulateurPeaCto() {
  const [millesime, setMillesime] = useState<2025 | 2026>(2025);
  const [regime, setRegime] = useState<"PFU" | "BAREME">("PFU");
  const [tmiBp, setTmiBp] = useState<number>(3000);
  const [horizon, setHorizon] = useState<HorizonPea>("APRES_5_ANS");
  const [plusValue, setPlusValue] = useState("");

  const plusValueLatenteCents = toCents(plusValue) ?? 0;
  const aSaisie = plusValueLatenteCents > 0;

  const resultat = useMemo(
    () =>
      calculePeaCto({
        plusValueLatenteCents,
        horizonPea: horizon,
        imposition: {
          millesime,
          regime,
          ...(regime === "BAREME" ? { tmiBp } : {}),
        },
      }),
    [plusValueLatenteCents, horizon, millesime, regime, tmiBp],
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          PEA ou compte-titres : comparer le coût fiscal de sortie d'un gain
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Visualisez ce que coûte la sortie d'une plus-value selon qu'elle est logée sur un
          compte-titres ordinaire ou sur un PEA, et selon que le retrait du PEA intervient avant ou
          après 5 ans. Comparatif chiffré, calculé localement dans votre navigateur (aucune donnée
          collectée).
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
            <p className="text-xs text-slate-500">
              Détermine le taux des prélèvements sociaux (17,2 % en 2025, 18,6 % en 2026).
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Horizon de détention du PEA</span>
            <div className="flex rounded-md border border-slate-300 p-0.5 text-sm">
              {(["AVANT_5_ANS", "APRES_5_ANS"] as HorizonPea[]).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizon(h)}
                  aria-pressed={horizon === h}
                  className={
                    "flex-1 rounded px-3 py-1.5 transition " +
                    (horizon === h
                      ? "bg-blue-600 font-medium text-white"
                      : "text-slate-700 hover:bg-slate-100")
                  }
                >
                  {LIBELLE_HORIZON[h]}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Avant 5 ans : retrait = clôture du plan + imposition. Après 5 ans : gain exonéré d'IR,
              prélèvements sociaux dus.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Imposition de la plus-value (compte-titres)</span>
          <div className="flex max-w-md rounded-md border border-slate-300 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setRegime("PFU")}
              aria-pressed={regime === "PFU"}
              className={
                "flex-1 rounded px-3 py-1.5 transition " +
                (regime === "PFU"
                  ? "bg-blue-600 font-medium text-white"
                  : "text-slate-700 hover:bg-slate-100")
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
                (regime === "BAREME"
                  ? "bg-blue-600 font-medium text-white"
                  : "text-slate-700 hover:bg-slate-100")
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
              className="mt-1 max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TMI_BP.map((bp) => (
                <option key={bp} value={bp}>
                  TMI {LIBELLE_TMI[bp]}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-slate-500">
            S'applique au compte-titres, et au PEA en cas de retrait avant 5 ans. Après 5 ans, le PEA
            est exonéré d'impôt sur le revenu quel que soit ce choix.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ChampMontant
            id="plus-value"
            libelle="Plus-value latente / gain net de sortie"
            aide="Gain net concerné par la sortie (valeur actuelle moins prix de revient)."
            valeur={plusValue}
            onChange={setPlusValue}
          />
        </div>
      </section>

      {/* Résultats */}
      {aSaisie ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Comparaison des deux scénarios</h2>
          <Differentiel resultat={resultat} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CarteScenario
              titre={"Scénario A — " + resultat.scenarioA.libelle}
              impotEtPsCents={resultat.scenarioA.impotEtPsCents}
              irCents={resultat.details.irCtoCents}
              psCents={resultat.details.psCtoCents}
            />
            <CarteScenario
              titre={"Scénario B — " + resultat.scenarioB.libelle}
              impotEtPsCents={resultat.scenarioB.impotEtPsCents}
              irCents={resultat.details.irPeaCents}
              psCents={resultat.details.psPeaCents}
            />
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Renseignez la plus-value latente concernée pour comparer la sortie en compte-titres et en PEA.
        </div>
      )}

      {/* Garde-fous (portés par le calcul, mode A — signalés, non tranchés) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <p className="mb-2 text-sm font-semibold text-slate-900">À savoir</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {resultat.details.gardeFous.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-slate-400">
        Aide informative — ne constitue pas un conseil fiscal ni en investissement.
      </p>
    </div>
  );
}
