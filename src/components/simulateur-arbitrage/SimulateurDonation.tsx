import { useMemo, useState } from "react";
import { calculeDonation } from "../../lib/simulateur-arbitrage/donation";
import type { ComparatifArbitrage } from "../../lib/simulateur-arbitrage";
import type { DetailsDonation, LienDonataire } from "../../lib/simulateur-arbitrage/donation";
import { toCents, formateCents } from "../fx";

/**
 * Levier **L5 — Donation avant cession** (purge de plus-value latente), îlot React autonome du
 * simulateur d'arbitrage (mode A — **risque le plus élevé** : frontière conseil patrimonial + abus de
 * droit donation-cession). Cadrage : §X (L5) /  .
 *
 * Compare **sans recommander** deux scénarios décrits :
 *   - A « je vends les titres, puis je donne le montant net » → la plus-value est taxée ;
 *   - B « je donne les titres, le donataire pourra les vendre » → la plus-value latente est purgée
 *     (CGI 150-0 D 1), restent les droits de donation sur la valeur vénale.
 *
 * Tout le calcul est délégué au module `simulateur-arbitrage/donation`. L'**avertissement abus de
 * droit** est affiché en clair, en tête, **non contournable**. 100 % client-side : aucune donnée saisie
 * ne quitte le navigateur.
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

const LIENS: { value: LienDonataire; label: string; abattement: string }[] = [
  { value: "enfant", label: "Enfant", abattement: "abattement 100 000 €" },
  { value: "petit-enfant", label: "Petit-enfant", abattement: "abattement 31 865 €" },
  { value: "frere-soeur", label: "Frère / sœur", abattement: "abattement 15 932 €" },
  { value: "neveu-niece", label: "Neveu / nièce", abattement: "abattement 7 967 €, droits 55 %" },
  { value: "conjoint-pacs", label: "Conjoint / PACS", abattement: "abattement 80 724 €" },
  { value: "tiers", label: "Tiers (sans lien)", abattement: "aucun abattement, droits 60 %" },
];

/** Formate un montant signé en centimes : « − 1 256,00 € », « + 4 000,00 € », « 0,00 € ». */
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

/** Carte d'un scénario : situation décrite (neutre), coût total et son détail (impôt PV + droits). */
function CarteScenario({
  titre,
  coutTotalCents,
  impotPvCents,
  droitsCents,
  ligneImpotPv,
}: {
  titre: string;
  coutTotalCents: number;
  impotPvCents: number;
  droitsCents: number;
  ligneImpotPv: string;
}) {
  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{titre}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-slate-900">{formateCents(coutTotalCents)}</p>
      <p className="text-xs text-slate-500">coût fiscal total estimé (impôt + droits de donation)</p>
      <dl className="mt-3 flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">{ligneImpotPv}</dt>
          <dd className="font-mono text-slate-900">{formateCents(impotPvCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Droits de donation</dt>
          <dd className="font-mono text-slate-900">{formateCents(droitsCents)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Bandeau de différentiel — descriptif, sans recommandation (mode A). */
function Differentiel({ resultat }: { resultat: ComparatifArbitrage<DetailsDonation> }) {
  const d = resultat.deltaImpotEtPsCents;
  let phrase: React.ReactNode;
  if (d < 0) {
    phrase = (
      <>
        Dans le scénario B (donner les titres), le coût fiscal total estimé est{" "}
        <strong>inférieur de {formateCents(Math.abs(d))}</strong> à celui du scénario A.
      </>
    );
  } else if (d > 0) {
    phrase = (
      <>
        Dans le scénario B (donner les titres), le coût fiscal total estimé est{" "}
        <strong>supérieur de {formateCents(d)}</strong> à celui du scénario A.
      </>
    );
  } else {
    phrase = (
      <>
        Les deux scénarios aboutissent au <strong>même coût fiscal total</strong>.
      </>
    );
  }
  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-800">
      <p className="m-0">
        <span className="font-medium">Différence de coût total (B − A) :</span>{" "}
        <span className="font-mono">{formateCentsSigne(d)}</span>. {phrase}
      </p>
      <p className="m-0 mt-2 text-slate-600">
        Ce chiffre suppose une donation <strong>réelle, antérieure et sans réappropriation du prix</strong>.
        À défaut, l'opération relèverait de l'abus de droit (voir l'avertissement ci-dessus) et la
        plus-value latente redeviendrait imposable.
      </p>
    </div>
  );
}

/** Avertissement abus de droit — affiché en tête, **non contournable** (mode A, risque le plus élevé). */
function AvertissementAbusDeDroit() {
  return (
    <aside
      role="alert"
      className="rounded-md border-l-4 border-l-red-600 border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900"
    >
      <p className="m-0 font-semibold">Avertissement — abus de droit « donation-cession »</p>
      <p className="m-0 mt-2">
        Donner des titres avant qu'ils soient vendus n'est <strong>pas un montage d'optimisation</strong>.
        Si la vente est <strong>déjà convenue avant la donation</strong>, ou si le donateur{" "}
        <strong>se réapproprie le prix</strong> de cession, l'administration peut requalifier l'opération
        (LPF art. L64) : la plus-value latente <strong>redevient imposable</strong> chez le donateur, en
        plus des droits de donation et de pénalités. Une donation est en outre{" "}
        <strong>irrévocable</strong>. Ce simulateur compare des scénarios chiffrés ; il ne décrit pas une
        marche à suivre. La mise en œuvre relève d'un <strong>notaire</strong>.
      </p>
    </aside>
  );
}

export default function SimulateurDonation() {
  const [millesime, setMillesime] = useState<2025 | 2026>(2025);
  const [regime, setRegime] = useState<"PFU" | "BAREME">("PFU");
  const [tmiBp, setTmiBp] = useState<number>(3000);
  const [lien, setLien] = useState<LienDonataire>("enfant");
  const [valeur, setValeur] = useState("");
  const [revient, setRevient] = useState("");
  const [anterieures, setAnterieures] = useState("");

  const valeurVenaleCents = toCents(valeur) ?? 0;
  const prixRevientCents = toCents(revient) ?? 0;
  const donationsAnterieures15ansCents = toCents(anterieures) ?? 0;

  const aSaisie = valeurVenaleCents > 0;

  const resultat = useMemo(
    () =>
      calculeDonation({
        valeurVenaleCents,
        prixRevientCents,
        lienDonataire: lien,
        donationsAnterieures15ansCents,
        imposition: {
          millesime,
          regime,
          ...(regime === "BAREME" ? { tmiBp } : {}),
        },
      }),
    [
      valeurVenaleCents,
      prixRevientCents,
      lien,
      donationsAnterieures15ansCents,
      millesime,
      regime,
      tmiBp,
    ],
  );

  const revientSuperieur = prixRevientCents > valeurVenaleCents && valeurVenaleCents > 0;
  const ligneImpotPvA = `Impôt + PS sur la plus-value (${formateCents(resultat.details.plusValueImposeeACents)})`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Donner ou vendre des actions : simuler l'impact fiscal
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Comparez deux situations chiffrées — <strong>vendre les titres puis donner le net</strong> (la
          plus-value est taxée) ou <strong>donner les titres appréciés</strong> (la plus-value latente
          n'est pas imposée à la donation ; restent les droits de donation). Calcul 100 % local dans
          votre navigateur, aucune donnée collectée.
        </p>
      </header>

      {/* Avertissement abus de droit — toujours visible, en tête, non contournable */}
      <AvertissementAbusDeDroit />

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
            <label htmlFor="lien" className="text-sm font-medium text-slate-700">
              Lien avec le donataire
            </label>
            <select
              id="lien"
              value={lien}
              onChange={(e) => setLien(e.target.value as LienDonataire)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {LIENS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label} — {l.abattement}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Détermine l'abattement et le barème des droits de donation (renouvelable tous les 15 ans).
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Imposition de la plus-value</span>
          <div className="flex max-w-sm rounded-md border border-slate-300 p-0.5 text-sm">
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
              className="mt-1 max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TMI_BP.map((bp) => (
                <option key={bp} value={bp}>
                  TMI {LIBELLE_TMI[bp]}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-slate-500">
            S'applique à la plus-value du scénario A (vendre puis donner). Par défaut le PFU.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ChampMontant
            id="valeur"
            libelle="Valeur des titres au jour de la donation"
            aide="Valeur vénale (cours du jour). C'est l'assiette des droits de donation et la nouvelle base de revient du donataire."
            valeur={valeur}
            onChange={setValeur}
          />
          <ChampMontant
            id="revient"
            libelle="Prix de revient (votre prix d'achat)"
            aide="Ce que les titres vous ont coûté, frais inclus. La différence avec la valeur du jour est la plus-value latente."
            valeur={revient}
            onChange={setRevient}
          />
          <ChampMontant
            id="anterieures"
            libelle="Donations antérieures de moins de 15 ans"
            aide="Donations déjà consenties à ce même donataire depuis moins de 15 ans : elles réduisent l'abattement disponible (facultatif)."
            valeur={anterieures}
            onChange={setAnterieures}
          />
        </div>

        {revientSuperieur && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Le prix de revient saisi dépasse la valeur du jour : il n'y a pas de plus-value latente (les
            titres sont en moins-value). La donation ne purge alors aucun gain.
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
              coutTotalCents={resultat.scenarioA.impotEtPsCents}
              impotPvCents={resultat.details.impotPlusValueACents}
              droitsCents={resultat.details.droitsDonationACents}
              ligneImpotPv={ligneImpotPvA}
            />
            <CarteScenario
              titre={"Scénario B — " + resultat.scenarioB.libelle}
              coutTotalCents={resultat.scenarioB.impotEtPsCents}
              impotPvCents={0}
              droitsCents={resultat.details.droitsDonationBCents}
              ligneImpotPv="Impôt sur la plus-value (purgée par la donation)"
            />
          </div>

          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Plus-value latente <strong>{formateCents(resultat.details.plusValueLatentePurgeeCents)}</strong> ·
            abattement appliqué{" "}
            <strong>{formateCents(resultat.details.abattementDisponibleCents)}</strong>
            {resultat.details.abattementDisponibleCents !== resultat.details.abattementBaseCents && (
              <>
                {" "}
                (sur {formateCents(resultat.details.abattementBaseCents)} après rappel des donations de
                moins de 15 ans)
              </>
            )}
            .
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Renseignez la valeur des titres au jour de la donation et votre prix de revient pour comparer
          les deux scénarios.
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
        Aide informative — ne constitue pas un conseil fiscal, juridique ni en investissement. Une
        donation est un acte notarié : faites-vous accompagner par un professionnel.
      </p>
    </div>
  );
}
