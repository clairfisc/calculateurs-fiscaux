import { useMemo, useState } from "react";
import {
  evalueCompte,
  evalueDeclaration,
  etablissementParId,
  etablissementsPourType,
  typesDeEtablissement,
  type Compte,
  type TypeCompte,
  type Verdict,
} from "../../lib/comptes-3916";
import BoutonCopier from "../BoutonCopier";

/**
 * Checklist comptes étrangers (3916 / 3916-bis) — îlot React autonome.
 *
 * Pour chaque compte saisi, applique le moteur de règles (`evalueCompte`) et affiche
 * le verdict (à déclarer / exonéré / à vérifier) + le motif sourcé + la fiche à recopier.
 * 100 % client-side : aucune donnée saisie ne quitte le navigateur.
 */

const TYPE_LABELS: Record<TypeCompte, string> = {
  banque: "Compte bancaire (banque classique)",
  neobanque: "Néobanque (Revolut, N26, bunq…)",
  paiement_emoney: "Compte de paiement / monnaie électronique (PayPal…)",
  titres_cto: "Compte-titres (courtier étranger)",
  pea: "PEA chez un courtier étranger",
  exchange_crypto: "Compte crypto (exchange : Binance, Kraken…)",
  wallet_auto_heberge: "Wallet crypto auto-hébergé (Ledger, MetaMask…)",
  assurance_vie: "Assurance-vie / capitalisation (étranger)",
};

const VERDICT_STYLE: Record<Verdict, { label: string; classe: string }> = {
  a_declarer: { label: "À déclarer", classe: "bg-amber-100 text-amber-900 border-amber-300" },
  exonere: { label: "Dispensé de déclaration", classe: "bg-green-100 text-green-900 border-green-300" },
  a_verifier: { label: "À vérifier", classe: "bg-blue-100 text-blue-900 border-blue-300" },
};

interface CompteSaisie extends Compte {
  readonly id: string;
  /** Libellé de sous-compte (gabarit multi-comptes, ex. DEGIRO « Compte espèces flatex »). */
  readonly sousCompteLibelle?: string;
}

let compteur = 0;
function compteVide(): CompteSaisie {
  compteur += 1;
  return { id: `compte-${compteur}`, type: "banque" };
}

/** Texte de la fiche à recopier sur impots.gouv (généré pour les comptes à déclarer). */
function ficheTexte(c: CompteSaisie): string {
  const etab = c.etablissementId ? etablissementParId(c.etablissementId) : undefined;
  const r = evalueCompte(c);
  const designation = etab?.designation ?? c.etablissementLibre ?? "(à renseigner)";
  const adresse = etab?.adresse ?? "(adresse à renseigner)";
  const pays = c.pays ?? etab?.pays ?? "(pays à renseigner)";
  return [
    `Formulaire : ${r.formulaire ?? "—"}`,
    `Établissement : ${designation}`,
    c.sousCompteLibelle ? `Compte : ${c.sousCompteLibelle}` : null,
    `Adresse : ${adresse}`,
    `Pays : ${pays}`,
    `Type de compte : ${TYPE_LABELS[c.type]}`,
    `N° / identifiant : (à renseigner)`,
    `Date d'ouverture / clôture dans l'année : (à renseigner)`,
  ]
    .filter((l): l is string => Boolean(l))
    .join("\n");
}

export default function ChecklistComptes() {
  const [comptes, setComptes] = useState<CompteSaisie[]>(() => [compteVide()]);

  function modifier(id: string, champs: Partial<CompteSaisie>) {
    setComptes((prev) => prev.map((c) => (c.id === id ? { ...c, ...champs } : c)));
  }
  function ajouter() {
    setComptes((prev) => [...prev, compteVide()]);
  }
  function supprimer(id: string) {
    setComptes((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  }
  // Choix d'un établissement : auto-déplie en plusieurs lignes si gabarit multi-comptes
  // (ex. DEGIRO = titres + espèces) ; sinon adapte le type s'il n'est pas proposé.
  function choisirEtablissement(rowId: string, id: string | undefined) {
    const etab = id ? etablissementParId(id) : undefined;
    setComptes((prev) => {
      const idx = prev.findIndex((c) => c.id === rowId);
      if (idx < 0) return prev;
      const c = prev[idx]!;
      let remplacement: CompteSaisie[];
      if (etab?.comptes && etab.comptes.length > 1) {
        remplacement = etab.comptes.map((g, k) => ({
          id: `${rowId}.${k}`,
          type: g.type,
          etablissementId: id,
          sousCompteLibelle: g.libelle,
          pays: c.pays,
        }));
      } else {
        const type = etab && !typesDeEtablissement(etab).includes(c.type) ? etab.typeParDefaut : c.type;
        remplacement = [{ ...c, etablissementId: id, type, sousCompteLibelle: undefined }];
      }
      return [...prev.slice(0, idx), ...remplacement, ...prev.slice(idx + 1)];
    });
  }

  const agregat = useMemo(() => evalueDeclaration(comptes), [comptes]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Quels comptes étrangers devez-vous déclarer&nbsp;?</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ajoutez vos comptes (bancaires, néobanques, courtiers, exchanges crypto, PayPal…). L'outil indique
          pour chacun s'il est <strong>à déclarer</strong> (formulaire 3916 / 3916-bis), <strong>dispensé</strong>,
          ou <strong>à vérifier</strong>, et la fiche à recopier. Calcul local, aucune donnée collectée.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Vos comptes</h2>
          <button
            type="button"
            onClick={ajouter}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Ajouter un compte
          </button>
        </div>

        {comptes.map((c, i) => {
          const r = evalueCompte(c);
          const etab = c.etablissementId ? etablissementParId(c.etablissementId) : undefined;
          const style = VERDICT_STYLE[r.verdict];
          return (
            <article key={c.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-slate-500">
                  Compte {i + 1}{c.sousCompteLibelle ? ` — ${c.sousCompteLibelle}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => supprimer(c.id)}
                  disabled={comptes.length === 1}
                  className="text-xs text-slate-400 underline disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Type de compte</span>
                  <select
                    value={c.type}
                    onChange={(e) => {
                      const type = e.target.value as TypeCompte;
                      // Si l'établissement choisi n'est pas compatible avec le nouveau type, on le réinitialise.
                      const etab = c.etablissementId ? etablissementParId(c.etablissementId) : undefined;
                      const garde = etab ? typesDeEtablissement(etab).includes(type) : true;
                      modifier(c.id, { type, etablissementId: garde ? c.etablissementId : undefined });
                    }}
                    className="rounded-md border border-slate-300 px-2 py-1.5"
                  >
                    {(Object.keys(TYPE_LABELS) as TypeCompte[]).map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Établissement</span>
                  <select
                    value={c.etablissementId ?? ""}
                    onChange={(e) => choisirEtablissement(c.id, e.target.value || undefined)}
                    className="rounded-md border border-slate-300 px-2 py-1.5"
                  >
                    <option value="">Autre / saisie libre…</option>
                    {etablissementsPourType(c.type).map((e) => (
                      <option key={e.id} value={e.id}>{e.designation}</option>
                    ))}
                  </select>
                </label>

                {!c.etablissementId && (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Nom de l'établissement</span>
                    <input
                      type="text"
                      autoComplete="off"
                      value={c.etablissementLibre ?? ""}
                      onChange={(e) => modifier(c.id, { etablissementLibre: e.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1.5"
                    />
                  </label>
                )}

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Pays</span>
                  <input
                    type="text"
                    autoComplete="off"
                    value={c.pays ?? etab?.pays ?? ""}
                    onChange={(e) => modifier(c.id, { pays: e.target.value })}
                    className="rounded-md border border-slate-300 px-2 py-1.5"
                  />
                </label>
              </div>

              {/* Conditions e-money (uniquement pour les comptes de paiement) */}
              {c.type === "paiement_emoney" && (
                <fieldset className="flex flex-col gap-2 rounded-md bg-slate-50 p-3 text-sm">
                  <legend className="px-1 text-slate-600">Exemption monnaie électronique (3 conditions cumulatives)</legend>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={c.emoneyUsageVentesBiens ?? false}
                      onChange={(e) => modifier(c.id, { emoneyUsageVentesBiens: e.target.checked })}
                    />
                    Usage : paiements / encaissements de <strong>ventes de biens</strong> en ligne
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={c.emoneyAdosseCompteFrancais ?? false}
                      onChange={(e) => modifier(c.id, { emoneyAdosseCompteFrancais: e.target.checked })}
                    />
                    Adossé à un compte ouvert en France
                  </label>
                  <label className="flex items-center gap-2">
                    Encaissements annuels (€)
                    <input
                      type="number"
                      min={0}
                      autoComplete="off"
                      value={c.emoneyEncaissementsAnnuelsEur ?? ""}
                      onChange={(e) =>
                        modifier(c.id, {
                          emoneyEncaissementsAnnuelsEur: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      className="w-32 rounded-md border border-slate-300 px-2 py-1"
                    />
                  </label>
                </fieldset>
              )}

              {/* Verdict */}
              <div className={`rounded-md border px-3 py-2 text-sm ${style.classe}`}>
                <p className="font-semibold">{style.label}{r.formulaire ? ` · ${r.formulaire}` : ""}</p>
                <p className="mt-1">{r.motif}</p>
                {etab?.note && <p className="mt-1 italic">{etab.note}</p>}
                <p className="mt-1 text-xs opacity-80">Source : {r.source}</p>
              </div>

              {/* Fiche à recopier (si à déclarer) */}
              {r.verdict === "a_declarer" && (
                <details className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-700">Fiche à recopier sur impots.gouv</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-700">{ficheTexte(c)}</pre>
                  <div className="mt-2">
                    <BoutonCopier valeur={ficheTexte(c)} libelle={`Copier la fiche du compte ${i + 1}`} />
                  </div>
                </details>
              )}
            </article>
          );
        })}
      </section>

      {/* Synthèse */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="text-lg font-semibold text-slate-900">Synthèse</h2>
        <ul className="mt-2 flex flex-col gap-1 text-slate-700">
          <li><strong>{agregat.nbADeclarer3916}</strong> compte(s) à déclarer sur le <strong>3916</strong> (bancaire / titres)</li>
          <li><strong>{agregat.nbADeclarer3916bis}</strong> compte(s) d'actifs numériques à déclarer sur le <strong>3916-bis</strong></li>
          <li><strong>{agregat.nbExonere}</strong> dispensé(s) · <strong>{agregat.nbAVerifier}</strong> à vérifier</li>
        </ul>
        {agregat.nbADeclarer > 0 && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-amber-900">
            ⚠️ Un compte non déclaré expose à une amende de <strong>1 500 €</strong> par compte bancaire
            (10 000 € pour un État sans convention d'assistance) et <strong>750 €</strong> par compte d'actifs numériques.
          </p>
        )}
      </section>

      <p className="text-xs text-slate-400">
        Aide informative — ne constitue pas un conseil fiscal. Les cas marqués « à vérifier » ne sont pas tranchés&nbsp;:
        rapprochez-vous de la doctrine ou d'un professionnel.
      </p>
    </div>
  );
}
