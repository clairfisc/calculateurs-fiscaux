import { useMemo, useState } from "react";
import { calculeTimingCrypto } from "../../lib/simulateur-arbitrage/timing-crypto";
import type { DetailsTimingCrypto } from "../../lib/simulateur-arbitrage/timing-crypto";
import type { ComparatifArbitrage } from "../../lib/simulateur-arbitrage/types";
import { toCents, formateCents } from "../fx";

/**
 * Levier **L3 — Timing / fractionnement de la conversion fiat (crypto)**, îlot React autonome du
 * simulateur d'arbitrage (mode A).
 *
 * Compare **sans recommander** deux scénarios : A « je convertis tout en une fois cette année »
 * vs B « je fractionne la conversion sur N années ». Tout le calcul est délégué au module
 * `simulateur-arbitrage/timing-crypto` (qui compose `crypto-2086` + `pfu-bareme`) — ce composant
 * ne fait que saisir, appeler et restituer le différentiel.
 *
 * Mode A : libellés descriptifs et neutres, aucun « recommandé / vous devriez ».
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

/** Formate un montant signé en centimes : « −188,00 € », « +600,00 € », « 0,00 € ». */
function formateCentsSigne(cents: number): string {
  if (cents === 0) return formateCents(0);
  const signe = cents > 0 ? "+ " : "− ";
  return signe + formateCents(Math.abs(cents));
}

/** Champ de montant en euros (libellé + aide courte), aligné sur le comparateur PFU / L1. */
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
  case3anEur,
  impotEtPsCents,
}: {
  titre: string;
  case3anEur: number;
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
          <dt className="text-slate-600">Plus-value imposable (case 3AN)</dt>
          <dd className="font-mono text-slate-900">{formateCents(case3anEur * 100)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Bandeau de différentiel — descriptif, sans recommandation (mode A). */
function Differentiel({ resultat }: { resultat: ComparatifArbitrage<DetailsTimingCrypto> }) {
  const dImpot = resultat.deltaImpotEtPsCents;
  const nbExo = resultat.details.nbAnneesExonerees305B;

  let phraseImpot: React.ReactNode;
  if (dImpot < 0) {
    phraseImpot = (
      <>
        Dans le scénario B, l'impôt + PS estimé sur l'ensemble de la conversion est{" "}
        <strong>inférieur de {formateCents(Math.abs(dImpot))}</strong>.
      </>
    );
  } else if (dImpot > 0) {
    phraseImpot = (
      <>
        Dans le scénario B, l'impôt + PS estimé sur l'ensemble de la conversion est{" "}
        <strong>supérieur de {formateCents(dImpot)}</strong>.
      </>
    );
  } else {
    phraseImpot = (
      <>
        Les deux scénarios aboutissent au <strong>même impôt + PS</strong> total : ici, fractionner
        ne modifie pas la plus-value nette imposable.
      </>
    );
  }

  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-800">
      <p className="m-0">
        <span className="font-medium">Différence d'impôt + PS (B − A) :</span>{" "}
        <span className="font-mono">{formateCentsSigne(dImpot)}</span>. {phraseImpot}
      </p>
      {nbExo > 0 && (
        <p className="m-0 mt-2 text-slate-700">
          Dans le scénario B, {nbExo === 1 ? "une année passe" : `${nbExo} années passent`} sous le
          seuil d'exonération de 305 € de prix de cession. Ce seuil est un fait du calcul, pas un
          montant à viser&nbsp;: étaler ses ventes dans le seul but de passer sous 305 € chaque année
          n'est pas une démarche que ce simulateur propose, et un montage à but uniquement fiscal peut
          être écarté par l'administration.
        </p>
      )}
    </div>
  );
}

export default function SimulateurTimingCrypto() {
  const [millesime, setMillesime] = useState<2025 | 2026>(2025);
  const [regime, setRegime] = useState<"PFU" | "BAREME">("PFU");
  const [tmiBp, setTmiBp] = useState<number>(3000);
  const [montant, setMontant] = useState("");
  const [prixAcq, setPrixAcq] = useState("");
  const [valeurGlobale, setValeurGlobale] = useState("");
  const [nbFractions, setNbFractions] = useState(2);

  const montantTotalAConvertirCents = toCents(montant) ?? 0;
  const prixAcquisitionTotalCents = toCents(prixAcq) ?? 0;
  const valeurGlobaleCents = toCents(valeurGlobale) ?? 0;

  const aSaisie = montantTotalAConvertirCents > 0;

  const resultat = useMemo(
    () =>
      calculeTimingCrypto({
        montantTotalAConvertirCents,
        prixAcquisitionTotalCents,
        valeurGlobalePortefeuilleCents: valeurGlobaleCents,
        nbFractions,
        imposition: {
          millesime,
          regime,
          ...(regime === "BAREME" ? { tmiBp } : {}),
        },
      }),
    [
      montantTotalAConvertirCents,
      prixAcquisitionTotalCents,
      valeurGlobaleCents,
      nbFractions,
      millesime,
      regime,
      tmiBp,
    ],
  );

  const valeurGlobaleSousMontant =
    valeurGlobaleCents > 0 && valeurGlobaleCents < montantTotalAConvertirCents;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Quand convertir ses cryptos : simuler l'impôt selon le timing
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Visualisez la différence d'impôt entre convertir un montant de crypto en une seule fois ou
          le fractionner sur plusieurs années. Comparatif chiffré (plus-value 150 VH bis, formulaire
          2086), calculé localement dans votre navigateur (aucune donnée collectée).
        </p>
      </header>

      {/* Saisie */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Votre situation</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="millesime" className="text-sm font-medium text-slate-700">
              Année de la première conversion
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
                Barème (case 3CN)
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
              Par défaut le PFU (12,8 % + prélèvements sociaux). Le barème suppose l'option globale pour
              le barème — case 3CN, ouverte aux cessions depuis le 1ᵉʳ janvier 2023 et distincte de la
              case 2OP des titres (loi de finances 2022).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ChampMontant
            id="montant"
            libelle="Montant total à convertir en euros"
            aide="Valeur, en euros, de la crypto que vous comptez convertir (identique dans les deux scénarios)."
            valeur={montant}
            onChange={setMontant}
          />
          <ChampMontant
            id="prix-acquisition"
            libelle="Prix total d'acquisition du portefeuille"
            aide="Somme payée en euros pour acquérir vos cryptos (sert au calcul de la quote-part imputée)."
            valeur={prixAcq}
            onChange={setPrixAcq}
          />
          <ChampMontant
            id="valeur-globale"
            libelle="Valeur globale du portefeuille"
            aide="Valeur totale de tous vos actifs numériques au moment de la conversion (facultatif ; par défaut, égale au montant converti)."
            valeur={valeurGlobale}
            onChange={setValeurGlobale}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="nb-fractions" className="text-sm font-medium text-slate-700">
              Nombre d'années (scénario B)
            </label>
            <select
              id="nb-fractions"
              value={nbFractions}
              onChange={(e) => setNbFractions(Number(e.target.value))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} années
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Scénario B : la conversion est répartie en parts égales, une par année.
            </p>
          </div>
        </div>

        {valeurGlobaleSousMontant && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            La valeur globale du portefeuille est inférieure au montant converti : elle est ramenée au
            montant converti (on ne peut pas convertir plus de crypto que l'on n'en détient).
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
              case3anEur={resultat.details.case3anAEur}
              impotEtPsCents={resultat.scenarioA.impotEtPsCents}
            />
            <CarteScenario
              titre={"Scénario B — " + resultat.scenarioB.libelle}
              case3anEur={resultat.details.case3anBEur}
              impotEtPsCents={resultat.scenarioB.impotEtPsCents}
            />
          </div>

          {resultat.deltaImpotEtPsCents === 0 && resultat.details.deltaCase3anEur === 0 && (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Ici, fractionner la conversion <strong>ne change pas la plus-value nette imposable</strong> :
              la méthode de la valeur globale du portefeuille répartit la même plus-value sur les années,
              et l'impôt total est identique (hors effet du seuil 305 €).
            </p>
          )}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Renseignez le montant à convertir, votre prix d'acquisition et la valeur de votre
          portefeuille pour comparer les deux scénarios.
        </div>
      )}

      {/* Garde-fous (portés par le calcul, mode A) */}
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
