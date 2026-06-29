import { useEffect, useMemo, useState } from "react";
import { calculeCession, calculeDeclaration } from "../../lib/cessions-2074";
import type { Cession, Regime } from "../../lib/cessions-2074";
import { toCents } from "../fx";
import type { CessionSaisie, EtatFormulaire, LotSaisie } from "./types";
import { cessionEntamee, convertitCession } from "./saisie";
import CessionFormulaire from "./CessionFormulaire";
import ResultatsCessions from "./ResultatsCessions";

/**
 * Calculateur 2074-CMV (plus/moins-values de cession, compte-titres ordinaire — courtier étranger,
 * PEA exclu) — îlot React autonome. Saisie manuelle des cessions (PMP via lots ou PMP direct,
 * change par opération), calcul via le moteur `cessions-2074`, restitution des cases 3VG/3VH +
 * imputation/report des moins-values. 100 % client-side : aucune donnée ne quitte le navigateur.
 */

let compteurCession = 0;
let compteurLot = 0;
const nouvelIdCession = () => `cession-${(compteurCession += 1)}`;
const nouvelIdLot = () => `lot-${(compteurLot += 1)}`;

function lotVide(): LotSaisie {
  return { id: nouvelIdLot(), dateISO: "", quantite: "", prixUnitaire: "", frais: "" };
}

function cessionVide(): CessionSaisie {
  return {
    id: nouvelIdCession(),
    libelle: "",
    dateISO: "",
    devise: "EUR",
    quantiteCedee: "",
    prixUnitaire: "",
    frais: "",
    baseMode: "lots",
    lots: [lotVide()],
    pmpUnitaire: "",
    quantiteTotale: "",
    dateAcquisitionRef: "",
  };
}

function etatVide(): EtatFormulaire {
  return { cessions: [cessionVide()], regime: "PFU", moinsValuesAnterieures: "" };
}

export default function CalculateurCessions() {
  const [etat, setEtat] = useState<EtatFormulaire>(etatVide);

  // Repart d'une saisie vierge au montage (cf. 2047 : Firefox restaure des valeurs sur refresh
  // sans déclencher onChange → on régénère les ids pour forcer le remontage des champs).
  useEffect(() => {
    compteurCession = 0;
    compteurLot = 0;
    setEtat(etatVide());
  }, []);

  function modifierCession(id: string, champs: Partial<CessionSaisie>) {
    setEtat((prev) => ({
      ...prev,
      cessions: prev.cessions.map((c) => (c.id === id ? { ...c, ...champs } : c)),
    }));
  }
  function ajouterCession() {
    setEtat((prev) => ({ ...prev, cessions: [...prev.cessions, cessionVide()] }));
  }
  function supprimerCession(id: string) {
    setEtat((prev) => ({
      ...prev,
      cessions:
        prev.cessions.length > 1 ? prev.cessions.filter((c) => c.id !== id) : prev.cessions,
    }));
  }

  const regimeBareme = etat.regime === "BAREME";

  // Validation de présence (parsing) par cession.
  const conversions = useMemo(
    () => etat.cessions.map((c, i) => convertitCession(c, i)),
    [etat.cessions],
  );

  // Calcul par cession (capture les erreurs de change / abattement remontées du moteur).
  const analyse = useMemo(() => {
    const erreursParCession: string[][] = [];
    const pretes: Cession[] = [];
    conversions.forEach((conv) => {
      const erreurs = [...conv.erreurs];
      if (conv.cession) {
        try {
          calculeCession(conv.cession, etat.regime);
          pretes.push(conv.cession);
        } catch (e) {
          erreurs.push(e instanceof Error ? e.message : "Erreur de calcul.");
        }
      }
      erreursParCession.push(erreurs);
    });
    return { erreursParCession, pretes };
  }, [conversions, etat.regime]);

  // Moins-values antérieures (stock reporté, EUR).
  const mvAnterieures = useMemo(() => {
    const s = etat.moinsValuesAnterieures.trim();
    if (s === "") return { cents: 0, erreur: null as string | null };
    const cents = toCents(s);
    return cents === null
      ? { cents: 0, erreur: "Montant de moins-values antérieures invalide (nombre ≥ 0)." }
      : { cents, erreur: null };
  }, [etat.moinsValuesAnterieures]);

  // Agrégation : imputation/report + cases. Capture l'erreur globale (abattement × imputation).
  const { declaration, erreurGlobale } = useMemo(() => {
    if (analyse.pretes.length === 0) return { declaration: null, erreurGlobale: null };
    try {
      return {
        declaration: calculeDeclaration({
          cessions: analyse.pretes,
          regime: etat.regime,
          moinsValuesAnterieuresCents: mvAnterieures.cents,
        }),
        erreurGlobale: null as string | null,
      };
    } catch (e) {
      return {
        declaration: null,
        erreurGlobale: e instanceof Error ? e.message : "Calcul impossible.",
      };
    }
  }, [analyse.pretes, etat.regime, mvAnterieures.cents]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Calculateur de plus-values de cession (2074-CMV)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Titres détenus chez un courtier étranger (compte-titres ordinaire, PEA exclu). PMP, change
          par opération et report des moins-values. Calcul local dans votre navigateur (aucune
          donnée collectée).
        </p>
      </header>

      {/* Régime + moins-values antérieures */}
      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Régime d'imposition
          <div className="inline-flex w-fit overflow-hidden rounded-md border border-slate-300">
            {(
              [
                ["PFU", "PFU (12,8 %)"],
                ["BAREME", "Barème (option 2OP)"],
              ] as [Regime, string][]
            ).map(([r, libelle]) => (
              <button
                key={r}
                type="button"
                onClick={() => setEtat((prev) => ({ ...prev, regime: r }))}
                aria-pressed={etat.regime === r}
                className={
                  "px-3 py-1.5 text-sm transition " +
                  (etat.regime === r
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100")
                }
              >
                {libelle}
              </button>
            ))}
          </div>
          {regimeBareme && (
            <span className="mt-1 text-xs font-normal text-slate-500">
              L'abattement durée de détention ne s'applique qu'aux titres acquis <b>avant 2018</b> ;
              l'option barème est globale et irrévocable.
            </span>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Moins-values antérieures reportées (€)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={etat.moinsValuesAnterieures}
            onChange={(e) =>
              setEtat((prev) => ({ ...prev, moinsValuesAnterieures: e.target.value }))
            }
          />
          <span className="mt-0.5 text-xs font-normal text-slate-400">
            stock de moins-values des 10 années précédentes (saisie manuelle ; non conservé)
          </span>
          {mvAnterieures.erreur && (
            <span className="text-xs font-medium text-red-600">{mvAnterieures.erreur}</span>
          )}
        </label>
      </section>

      {/* Saisie des cessions */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Cessions</h2>
          <button
            type="button"
            onClick={ajouterCession}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Ajouter une cession
          </button>
        </div>

        {etat.cessions.map((cession, i) => (
          <CessionFormulaire
            key={cession.id}
            cession={cession}
            index={i}
            suppressionImpossible={etat.cessions.length === 1}
            regimeBareme={regimeBareme}
            onChange={modifierCession}
            onSupprimer={supprimerCession}
            erreurs={analyse.erreursParCession[i] ?? []}
            afficheErreurs={cessionEntamee(cession)}
            nouvelIdLot={nouvelIdLot}
          />
        ))}
      </section>

      {erreurGlobale && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {erreurGlobale}
        </p>
      )}

      {/* Résultats ou état vide */}
      {declaration ? (
        <ResultatsCessions declaration={declaration} />
      ) : (
        !erreurGlobale && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Renseignez au moins une cession complète (cession + acquisition) pour afficher les
            résultats.
          </div>
        )
      )}

      <p className="text-xs text-slate-400">
        Aide informative — ne constitue pas un conseil fiscal. PEA, produits dérivés, OST (splits,
        fusions) et abattement renforcé PME hors périmètre.
      </p>
    </div>
  );
}
