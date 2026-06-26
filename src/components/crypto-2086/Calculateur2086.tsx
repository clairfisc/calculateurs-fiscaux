import { useEffect, useMemo, useState } from "react";
import { calculeDeclaration2086 } from "../../lib/crypto-2086";
import type { Cession } from "../../lib/crypto-2086";
import type { CessionSaisie } from "./types";
import { toCents } from "../fx";
import CessionFormulaire from "./CessionFormulaire";
import Resultats2086 from "./Resultats2086";

/**
 * Calculateur de plus-values crypto 2086 (CGI art. 150 VH bis) — îlot React autonome.
 *
 * Saisie manuelle des cessions IMPOSABLES (date, prix de cession, valeur globale du
 * portefeuille, frais) + prix total d'acquisition du portefeuille, calcul via le moteur
 * `crypto-2086` (méthode de la valeur globale + imputation progressive), et restitution du
 * détail par cession + cases 2042-C 3AN / 3BN copiables.
 *
 * 100 % client-side : aucune donnée saisie ne quitte le navigateur.
 */

let compteurId = 0;
function nouvelId(): string {
  compteurId += 1;
  return `cession-${compteurId}`;
}

function cessionVide(): CessionSaisie {
  return { id: nouvelId(), date: "", prixCession: "", frais: "", valeurGlobale: "" };
}

/** Conversion d'une saisie en `Cession` moteur (ou erreurs de validation). */
interface ConversionCession {
  readonly cession: Cession | null;
  readonly erreurs: readonly string[];
}

function convertitCession(saisie: CessionSaisie): ConversionCession {
  const erreurs: string[] = [];
  const prixCents = toCents(saisie.prixCession);
  const vgpCents = toCents(saisie.valeurGlobale);
  const fraisCents = saisie.frais.trim() === "" ? 0 : toCents(saisie.frais);

  if (prixCents === null) erreurs.push("Prix de cession invalide (nombre ≥ 0 attendu).");
  if (vgpCents === null || vgpCents <= 0) {
    erreurs.push("Valeur globale du portefeuille requise (nombre > 0).");
  }
  if (fraisCents === null) erreurs.push("Frais invalides (nombre ≥ 0 attendu).");
  if (prixCents !== null && fraisCents !== null && fraisCents > prixCents) {
    erreurs.push("Les frais ne peuvent pas dépasser le prix de cession.");
  }

  if (prixCents === null || vgpCents === null || vgpCents <= 0 || fraisCents === null) {
    return { cession: null, erreurs };
  }

  return {
    cession: {
      date: saisie.date,
      prixCessionCents: prixCents,
      fraisCessionCents: fraisCents,
      valeurGlobalePortefeuilleCents: vgpCents,
    },
    erreurs,
  };
}

export default function Calculateur2086() {
  const [prixAcquisition, setPrixAcquisition] = useState("");
  const [cessions, setCessions] = useState<CessionSaisie[]>(() => [cessionVide()]);

  // Refresh = formulaire propre (cf. note dans le calculateur 2047 : certains navigateurs
  // restaurent visuellement les champs sans déclencher onChange). On régénère les ids.
  useEffect(() => {
    setPrixAcquisition("");
    setCessions([cessionVide()]);
  }, []);

  function modifierCession(id: string, champs: Partial<CessionSaisie>) {
    setCessions((prev) => prev.map((c) => (c.id === id ? { ...c, ...champs } : c)));
  }
  function ajouterCession() {
    setCessions((prev) => [...prev, cessionVide()]);
  }
  function supprimerCession(id: string) {
    setCessions((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  }

  const conversions = useMemo(() => cessions.map(convertitCession), [cessions]);
  const ptaCents = toCents(prixAcquisition);

  // Cessions « prêtes » : converties sans erreur, avec un prix renseigné.
  const cessionsPretes = conversions.filter(
    (c, i) => c.cession !== null && cessions[i]!.prixCession.trim() !== "",
  );

  const declaration = useMemo(() => {
    if (ptaCents === null || cessionsPretes.length === 0) return null;
    return calculeDeclaration2086(
      cessionsPretes.map((c) => c.cession!),
      ptaCents,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cessions, prixAcquisition]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Calculateur de plus-values crypto (formulaire 2086)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Méthode de la valeur globale du portefeuille (CGI art. 150 VH bis). Calcul effectué
          localement dans votre navigateur (aucune donnée collectée).
        </p>
      </header>

      {/* Prix total d'acquisition du portefeuille */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Prix total d'acquisition de votre portefeuille (€)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoComplete="off"
            value={prixAcquisition}
            onChange={(e) => setPrixAcquisition(e.target.value)}
          />
          <span className="mt-0.5 text-xs font-normal text-slate-400">
            montant total que vous avez <strong>payé</strong> (en €) pour acquérir vos cryptos — pas
            leur valeur actuelle. Les cryptos reçues par échange comptent pour 0.
          </span>
        </label>
        <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
          À saisir : le total payé pour les cryptos que vous déteniez au moment de votre
          <strong> première vente</strong>. Le moteur déduit ensuite automatiquement, à chaque
          vente, la part de ce prix déjà « consommée ». <strong>Si vous avez racheté de la crypto
          entre deux ventes</strong>, ce calcul simplifié ne le prend pas en compte.
        </p>
      </section>

      {/* Aide : ce qu'on saisit (et ce qu'on ne saisit pas) */}
      <aside className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-semibold">N'entrez ici que vos cessions imposables :</p>
        <ul className="mt-1 list-inside list-disc text-blue-800">
          <li>vente d'actifs numériques contre des euros (ou une autre monnaie ayant cours légal) ;</li>
          <li>paiement d'un bien ou d'un service réglé en crypto.</li>
        </ul>
        <p className="mt-2 text-blue-800">
          Les <strong>échanges crypto → crypto</strong> (par ex. BTC → ETH) ne sont
          <strong> pas imposables</strong> (sursis d'imposition, art. 150 VH bis II-A) :
          inutile de les saisir, ils ne se déclarent pas sur le 2086.
        </p>
      </aside>

      {/* Saisie des cessions */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Vos cessions imposables de l'année</h2>
          <button
            type="button"
            onClick={ajouterCession}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Ajouter une cession
          </button>
        </div>

        {cessions.map((cession, i) => (
          <CessionFormulaire
            key={cession.id}
            cession={cession}
            index={i}
            suppressionImpossible={cessions.length === 1}
            onChange={modifierCession}
            onSupprimer={supprimerCession}
            erreurs={conversions[i]!.erreurs}
          />
        ))}
      </section>

      {/* Résultats ou état vide */}
      {declaration ? (
        <Resultats2086 declaration={declaration} />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Renseignez le prix d'acquisition de votre portefeuille et au moins une cession
          (prix de cession + valeur globale) pour afficher les résultats.
        </div>
      )}

      {/* Hors périmètre : revenus crypto (staking, lending, mining, airdrops) */}
      <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <strong>Hors périmètre du 2086 :</strong> les revenus de staking, lending, mining et
        airdrops ne sont pas des plus-values de cession (régimes distincts, BNC ou RCM) et ne se
        déclarent pas ici.
      </p>

      <p className="text-xs text-slate-400">
        Aide informative — ne constitue pas un conseil fiscal. Le moteur calcule l'assiette
        (plus/moins-value) ; l'impôt (PFU 30 % ou option barème, case 3CN) est liquidé par
        l'administration.
      </p>
    </div>
  );
}
