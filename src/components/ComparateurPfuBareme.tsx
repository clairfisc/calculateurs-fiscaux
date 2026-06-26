import { useMemo, useState } from "react";
import { compareRegimes, PARAMETRES, TMI_DISPONIBLES_BP } from "../lib/pfu-bareme";
import type { ComparaisonResult, Millesime, RegimeResultat } from "../lib/pfu-bareme";
import { toCents, formateEurosEntiers } from "./fx";

/**
 * Comparateur PFU (flat tax) vs option barème progressif (case 2OP) — îlot React autonome.
 *
 * Saisie : millésime, TMI, et assiettes (dividendes éligibles, intérêts/RCM, plus-values).
 * Restitution : coût IR + PS + total de chaque régime, régime gagnant et écart.
 * Mécanique & sources : src/lib/pfu-bareme/SOURCES-PFU-BAREME.md.
 *
 * 100 % client-side : aucune donnée saisie ne quitte le navigateur.
 */

const LIBELLE_TMI: Record<number, string> = {
  0: "0 % (non imposable)",
  1100: "11 %",
  3000: "30 %",
  4100: "41 %",
  4500: "45 %",
};

const LIBELLE_MILLESIME: Record<Millesime, string> = {
  2025: "Revenus 2025 (déclaration 2026)",
  2026: "Revenus 2026 (déclaration 2027)",
};

/** Formate un taux en points de base en pourcentage français (3140 → « 31,4 % »). */
const fmtPct = (bp: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(bp / 100) + " %";

/**
 * Légende des taux PFU applicables pour l'année choisie. Le PFU n'est PAS uniforme :
 * la hausse CSG 2026 frappe les plus-values mobilières dès 2025 mais pas les
 * dividendes/intérêts (cf. SOURCES-PFU-BAREME.md §2bis) — d'où l'affichage par type.
 */
function LegendeTaux({ millesime }: { millesime: Millesime }) {
  const p = PARAMETRES[millesime];
  const uniforme = p.psPlacementBp === p.psPatrimoineBp;
  const ligne = (libelle: string, psBp: number) => (
    <li className="flex justify-between gap-3">
      <span>{libelle}</span>
      <span className="font-mono text-slate-900">
        PFU {fmtPct(1280 + psBp)} <span className="text-slate-400">(dont PS {fmtPct(psBp)})</span>
      </span>
    </li>
  );
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <p className="mb-1 font-medium text-slate-700">Taux PFU applicables pour {millesime}</p>
      <ul className="flex flex-col gap-0.5">
        {uniforme
          ? ligne("Tous revenus du capital", p.psPlacementBp)
          : (
            <>
              {ligne("Dividendes & intérêts", p.psPlacementBp)}
              {ligne("Plus-values mobilières", p.psPatrimoineBp)}
            </>
          )}
      </ul>
    </div>
  );
}

/** Champ de montant en euros, libellé + aide courte. */
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

/** Carte de coût d'un régime ; mise en avant si c'est le moins-disant. */
function CarteRegime({
  titre,
  sousTitre,
  regime,
  gagnant,
}: {
  titre: string;
  sousTitre: string;
  regime: RegimeResultat;
  gagnant: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border-2 p-4 " +
        (gagnant ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white")
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{titre}</p>
        {gagnant && (
          <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
            Le moins cher
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">{sousTitre}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-slate-900">
        {formateEurosEntiers(regime.totalEur)}
      </p>
      <dl className="mt-3 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Impôt sur le revenu</dt>
          <dd className="font-mono text-slate-900">{formateEurosEntiers(regime.irEur)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Prélèvements sociaux</dt>
          <dd className="font-mono text-slate-900">{formateEurosEntiers(regime.psEur)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Verdict({ resultat }: { resultat: ComparaisonResult }) {
  if (resultat.gagnant === "egalite") {
    return (
      <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-800">
        Les deux régimes aboutissent au même coût total.
      </p>
    );
  }
  const barèmeGagne = resultat.gagnant === "bareme";
  return (
    <p className="rounded-lg bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-900">
      {barèmeGagne
        ? "L'option pour le barème (case 2OP) est plus avantageuse"
        : "Le PFU (flat tax) est plus avantageux"}{" "}
      : vous économisez <strong>{formateEurosEntiers(resultat.ecartEur)}</strong> par rapport à
      l'autre régime.
    </p>
  );
}

export default function ComparateurPfuBareme() {
  const [millesime, setMillesime] = useState<Millesime>(2025);
  const [tmiBp, setTmiBp] = useState<number>(3000);
  const [dividendes, setDividendes] = useState("");
  const [interets, setInterets] = useState("");
  const [plusValues, setPlusValues] = useState("");

  const dividendesCents = toCents(dividendes) ?? 0;
  const interetsCents = toCents(interets) ?? 0;
  const plusValuesCents = toCents(plusValues) ?? 0;
  const aSaisie = dividendesCents > 0 || interetsCents > 0 || plusValuesCents > 0;

  const resultat = useMemo(
    () =>
      compareRegimes({
        millesime,
        tmiBp,
        dividendesEligiblesCents: dividendesCents,
        interetsCents,
        plusValuesCents,
      }),
    [millesime, tmiBp, dividendesCents, interetsCents, plusValuesCents],
  );

  const revocable = PARAMETRES[millesime].option2opRevocable;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">PFU ou barème : quel choix pour vos revenus du capital ?</h1>
        <p className="mt-1 text-sm text-slate-600">
          Comparez le prélèvement forfaitaire unique (flat tax) et l'option pour le barème
          progressif (case 2OP). Calcul effectué localement dans votre navigateur (aucune donnée
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
              onChange={(e) => setMillesime(Number(e.target.value) as Millesime)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {(Object.keys(LIBELLE_MILLESIME) as unknown as Millesime[]).map((m) => (
                <option key={m} value={m}>
                  {LIBELLE_MILLESIME[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="tmi" className="text-sm font-medium text-slate-700">
              Votre tranche marginale d'imposition (TMI)
            </label>
            <select
              id="tmi"
              value={tmiBp}
              onChange={(e) => setTmiBp(Number(e.target.value))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TMI_DISPONIBLES_BP.map((bp) => (
                <option key={bp} value={bp}>
                  {LIBELLE_TMI[bp]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <LegendeTaux millesime={millesime} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ChampMontant
            id="dividendes"
            libelle="Dividendes (brut)"
            aide="Montant brut perçu. L'abattement de 40 % est appliqué automatiquement — au barème seulement."
            valeur={dividendes}
            onChange={setDividendes}
          />
          <ChampMontant
            id="interets"
            libelle="Intérêts / autres RCM"
            aide="Obligations, comptes à terme… (aucun abattement)."
            valeur={interets}
            onChange={setInterets}
          />
          <ChampMontant
            id="plusvalues"
            libelle="Plus-values mobilières"
            aide="Cessions de titres (hors PEA)."
            valeur={plusValues}
            onChange={setPlusValues}
          />
        </div>
      </section>

      {/* Résultats */}
      {aSaisie ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Comparaison</h2>
          <Verdict resultat={resultat} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CarteRegime
              titre="PFU (flat tax)"
              sousTitre="12,8 % IR + prélèvements sociaux (17,2 % ou 18,6 %)"
              regime={resultat.pfu}
              gagnant={resultat.gagnant === "pfu"}
            />
            <CarteRegime
              titre="Option barème (case 2OP)"
              sousTitre={`IR à votre TMI (${LIBELLE_TMI[tmiBp]}) + prélèvements sociaux`}
              regime={resultat.bareme}
              gagnant={resultat.gagnant === "bareme"}
            />
          </div>

          {dividendesCents > 0 && (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <strong>Abattement de 40 % sur les dividendes</strong> : au barème, vos{" "}
              {formateEurosEntiers(Math.round(dividendesCents / 100))} de dividendes ne sont imposés
              que sur {formateEurosEntiers(Math.trunc((dividendesCents * 6000) / 10000 / 100))}{" "}
              (60 %). Au PFU, aucun abattement : l'impôt porte sur le montant brut.
            </p>
          )}

          {resultat.economieCsgDeductibleEur > 0 && (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
              L'option barème inclut une économie liée à la CSG déductible (6,8 %) de{" "}
              {formateEurosEntiers(resultat.economieCsgDeductibleEur)}, imputée ici sur l'année —
              en pratique cette déduction joue sur le revenu de l'année suivante.
            </p>
          )}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Renseignez au moins un montant pour comparer les deux régimes.
        </div>
      )}

      {/* Garde-fous */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <p className="mb-2 text-sm font-semibold text-slate-900">À savoir</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <strong>Hypothèse de calcul</strong> : l'impôt au barème est estimé à votre TMI, comme
            si vos revenus du capital restaient dans cette tranche. Si ces revenus vous font changer
            de tranche, l'écart réel peut différer — vérifiez avec le simulateur officiel.
          </li>
          <li>
            <strong>L'option barème (case 2OP) est globale</strong> : elle s'applique à
            l'ensemble de vos revenus du capital de l'année, pas à un placement isolé.
          </li>
          {dividendesCents > 0 && (
            <li>
              Les dividendes saisis sont supposés <strong>éligibles à l'abattement de 40 %</strong>
              {" "}(actions de sociétés à l'IS, UE ou à convention). Certains produits (ETF/fonds
              distribuants, etc.) n'y ont pas droit — à vérifier avant de retenir le barème.
            </li>
          )}
          <li>
            {revocable ? (
              <>
                Pour les revenus {millesime}, l'option 2OP est <strong>révocable</strong>.
              </>
            ) : (
              <>
                Pour les revenus {millesime}, l'option 2OP est <strong>irrévocable</strong> une fois
                la déclaration validée.
              </>
            )}
          </li>
          {plusValuesCents > 0 && millesime === 2025 && (
            <li>
              <strong>Plus-values 2025</strong> : elles subissent <strong>déjà la CSG à 10,6 %</strong>
              {" "}(prélèvements sociaux 18,6 %), contrairement aux dividendes et intérêts 2025 restés
              à 17,2 % — la hausse LFSS 2026 est rétroactive pour les plus-values mobilières.
            </li>
          )}
          {plusValuesCents > 0 && (
            <li>
              Les <strong>plus-values</strong> sont prises à 100 % : l'abattement pour durée de
              détention des titres acquis <em>avant 2018</em> n'est pas modélisé (cas à vérifier).
            </li>
          )}
          <li>
            PEA, assurance-vie et PEL relèvent de régimes propres, <strong>hors de ce comparateur</strong>.
          </li>
        </ul>
      </section>

      <p className="text-xs text-slate-400">Aide informative — ne constitue pas un conseil fiscal.</p>
    </div>
  );
}
