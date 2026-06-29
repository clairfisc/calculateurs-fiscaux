import { useMemo, useState } from "react";
import {
  evalueCompte,
  evalueDeclaration,
  etablissementParId,
  typesDeEtablissement,
  ETABLISSEMENTS,
  type Compte,
  type TypeCompte,
  type Verdict,
} from "../../lib/comptes-3916";
import BoutonCopier from "../BoutonCopier";

/**
 * Checklist comptes étrangers (3916 / 3916-bis) — îlot React autonome.
 *
 * Modèle : un POSTE = un établissement (clé d'entrée) qui possède 1..N COMPTES.
 * Choisir l'établissement dérive ses comptes (ex. DEGIRO → compte-titres + espèces) ;
 * en changer re-dérive (pas de ligne orpheline). Verdict + fiche par compte.
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
const TOUS_TYPES = Object.keys(TYPE_LABELS) as TypeCompte[];

const VERDICT_STYLE: Record<Verdict, { label: string; classe: string }> = {
  a_declarer: { label: "À déclarer", classe: "bg-amber-100 text-amber-900 border-amber-300" },
  exonere: { label: "Dispensé de déclaration", classe: "bg-green-100 text-green-900 border-green-300" },
  a_verifier: { label: "À vérifier", classe: "bg-blue-100 text-blue-900 border-blue-300" },
};

interface CompteLigne {
  readonly id: string;
  readonly type: TypeCompte;
  readonly sousCompteLibelle?: string;
  readonly note?: string;
  readonly emoneyUsageVentesBiens?: boolean;
  readonly emoneyAdosseCompteFrancais?: boolean;
  readonly emoneyEncaissementsAnnuelsEur?: number;
}
interface Poste {
  readonly id: string;
  readonly etablissementId?: string;
  readonly etablissementLibre?: string;
  readonly pays?: string;
  readonly comptes: readonly CompteLigne[];
}

let seq = 0;
const uid = (p: string) => `${p}-${(seq += 1)}`;
const ligneVide = (type: TypeCompte = "banque"): CompteLigne => ({ id: uid("l"), type });
const posteVide = (): Poste => ({ id: uid("p"), comptes: [ligneVide()] });

/** Construit l'entrée du moteur à partir d'un poste + une de ses lignes. */
function buildCompte(p: Poste, l: CompteLigne): Compte {
  return {
    type: l.type,
    etablissementId: p.etablissementId,
    etablissementLibre: p.etablissementLibre,
    pays: p.pays,
    emoneyUsageVentesBiens: l.emoneyUsageVentesBiens,
    emoneyAdosseCompteFrancais: l.emoneyAdosseCompteFrancais,
    emoneyEncaissementsAnnuelsEur: l.emoneyEncaissementsAnnuelsEur,
  };
}

interface FicheChamp {
  readonly label: string;
  readonly value: string;
  /** Champ que l'utilisateur doit compléter lui-même (affiché en grisé). */
  readonly aRenseigner?: boolean;
}

/** Champs structurés de la fiche à recopier sur impots.gouv. */
function ficheChamps(p: Poste, l: CompteLigne): FicheChamp[] {
  const etab = p.etablissementId ? etablissementParId(p.etablissementId) : undefined;
  const r = evalueCompte(buildCompte(p, l));
  const designation = etab?.designation ?? p.etablissementLibre ?? "";
  const adresse = etab?.adresse ?? "";
  const pays = p.pays ?? etab?.pays ?? "";
  const champs: FicheChamp[] = [
    { label: "Formulaire", value: r.formulaire ?? "—" },
    { label: "Établissement", value: designation || "à renseigner", aRenseigner: !designation },
  ];
  if (l.sousCompteLibelle) champs.push({ label: "Compte", value: l.sousCompteLibelle });
  champs.push(
    { label: "Adresse de l'établissement", value: adresse || "à renseigner", aRenseigner: !adresse },
    { label: "Pays", value: pays || "à renseigner", aRenseigner: !pays },
    { label: "Type de compte", value: TYPE_LABELS[l.type] },
    { label: "N° / identifiant du compte", value: "à renseigner", aRenseigner: true },
    { label: "Dates d'ouverture / clôture", value: "à renseigner", aRenseigner: true },
  );
  return champs;
}

/** Version texte (presse-papiers) dérivée des champs structurés. */
function ficheTexte(p: Poste, l: CompteLigne): string {
  return ficheChamps(p, l)
    .map((c) => `${c.label} : ${c.value}`)
    .join("\n");
}

export default function ChecklistComptes() {
  const [postes, setPostes] = useState<Poste[]>(() => [posteVide()]);

  const majPoste = (id: string, champs: Partial<Poste>) =>
    setPostes((prev) => prev.map((p) => (p.id === id ? { ...p, ...champs } : p)));
  const majLigne = (posteId: string, ligneId: string, champs: Partial<CompteLigne>) =>
    setPostes((prev) =>
      prev.map((p) =>
        p.id !== posteId ? p : { ...p, comptes: p.comptes.map((l) => (l.id === ligneId ? { ...l, ...champs } : l)) },
      ),
    );

  // Choix de l'établissement = re-dérive TOUS les comptes du poste (corrige les lignes orphelines).
  function choisirEtablissement(posteId: string, id: string | undefined) {
    const etab = id ? etablissementParId(id) : undefined;
    let comptes: CompteLigne[];
    if (etab?.comptes && etab.comptes.length > 0) {
      comptes = etab.comptes.map((g) => ({ id: uid("l"), type: g.type, sousCompteLibelle: g.libelle, note: g.note }));
    } else if (etab) {
      comptes = [ligneVide(etab.typeParDefaut)];
    } else {
      comptes = [ligneVide()];
    }
    majPoste(posteId, { etablissementId: id, etablissementLibre: undefined, comptes });
  }

  function ajouterCompte(posteId: string) {
    setPostes((prev) =>
      prev.map((p) => {
        if (p.id !== posteId) return p;
        const etab = p.etablissementId ? etablissementParId(p.etablissementId) : undefined;
        return { ...p, comptes: [...p.comptes, ligneVide(etab?.typeParDefaut ?? "banque")] };
      }),
    );
  }
  const supprimerCompte = (posteId: string, ligneId: string) =>
    setPostes((prev) =>
      prev.map((p) =>
        p.id !== posteId ? p : { ...p, comptes: p.comptes.length > 1 ? p.comptes.filter((l) => l.id !== ligneId) : p.comptes },
      ),
    );
  const ajouterPoste = () => setPostes((prev) => [...prev, posteVide()]);
  const supprimerPoste = (id: string) => setPostes((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  const toutesLignes = useMemo(() => postes.flatMap((p) => p.comptes.map((l) => buildCompte(p, l))), [postes]);
  const agregat = useMemo(() => evalueDeclaration(toutesLignes), [toutesLignes]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Quels comptes étrangers devez-vous déclarer&nbsp;?</h1>
        <p className="mt-1 text-sm text-slate-600">
          Indiquez d'abord <strong>chez quel établissement</strong> vous avez un compte. L'outil affiche les comptes
          à déclarer (certains acteurs en impliquent plusieurs, ex. DEGIRO), le verdict (3916 / 3916-bis) et la fiche
          à recopier. Calcul local, aucune donnée collectée.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Vos établissements</h2>
          <button
            type="button"
            onClick={ajouterPoste}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Ajouter un établissement
          </button>
        </div>

        {postes.map((p, pi) => {
          const etab = p.etablissementId ? etablissementParId(p.etablissementId) : undefined;
          const typesPourSelect = etab ? typesDeEtablissement(etab) : TOUS_TYPES;
          return (
            <article key={p.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-slate-500">Établissement {pi + 1}</span>
                <button type="button" onClick={() => supprimerPoste(p.id)} disabled={postes.length === 1} className="text-xs text-slate-400 underline disabled:opacity-40">
                  Supprimer
                </button>
              </div>

              {/* 1er champ = l'établissement (clé d'entrée) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Établissement</span>
                  <select
                    value={p.etablissementId ?? ""}
                    onChange={(e) => choisirEtablissement(p.id, e.target.value || undefined)}
                    className="rounded-md border border-slate-300 px-2 py-1.5"
                  >
                    <option value="">Autre / saisie libre…</option>
                    {ETABLISSEMENTS.map((e) => (
                      <option key={e.id} value={e.id}>{e.designation}</option>
                    ))}
                  </select>
                </label>

                {!p.etablissementId && (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-700">Nom de l'établissement</span>
                    <input type="text" autoComplete="off" value={p.etablissementLibre ?? ""} onChange={(e) => majPoste(p.id, { etablissementLibre: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5" />
                  </label>
                )}

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-700">Pays</span>
                  <input type="text" autoComplete="off" value={p.pays ?? etab?.pays ?? ""} onChange={(e) => majPoste(p.id, { pays: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5" />
                </label>
              </div>

              {etab?.note && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm italic text-slate-700">{etab.note}</p>}

              {/* Comptes du poste */}
              <div className="flex flex-col gap-3">
                {p.comptes.map((l) => {
                  const r = evalueCompte(buildCompte(p, l));
                  const style = VERDICT_STYLE[r.verdict];
                  return (
                    <div key={l.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
                      <div className="flex items-end justify-between gap-3">
                        <label className="flex flex-1 flex-col gap-1 text-sm">
                          <span className="text-slate-700">{l.sousCompteLibelle ?? "Type de compte"}</span>
                          <select value={l.type} onChange={(e) => majLigne(p.id, l.id, { type: e.target.value as TypeCompte })} className="rounded-md border border-slate-300 px-2 py-1.5">
                            {typesPourSelect.map((t) => (
                              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                            ))}
                          </select>
                        </label>
                        {p.comptes.length > 1 && (
                          <button type="button" onClick={() => supprimerCompte(p.id, l.id)} className="pb-2 text-xs text-slate-400 underline">retirer</button>
                        )}
                      </div>

                      {l.type === "paiement_emoney" && (
                        <fieldset className="flex flex-col gap-2 rounded-md bg-slate-50 p-3 text-sm">
                          <legend className="px-1 text-slate-600">Exemption monnaie électronique (3 conditions cumulatives)</legend>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={l.emoneyUsageVentesBiens ?? false} onChange={(e) => majLigne(p.id, l.id, { emoneyUsageVentesBiens: e.target.checked })} />
                            Usage : paiements / encaissements de <strong>ventes de biens</strong> en ligne
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={l.emoneyAdosseCompteFrancais ?? false} onChange={(e) => majLigne(p.id, l.id, { emoneyAdosseCompteFrancais: e.target.checked })} />
                            Adossé à un compte ouvert en France
                          </label>
                          <label className="flex items-center gap-2">
                            Encaissements annuels (€)
                            <input type="number" min={0} autoComplete="off" value={l.emoneyEncaissementsAnnuelsEur ?? ""} onChange={(e) => majLigne(p.id, l.id, { emoneyEncaissementsAnnuelsEur: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-32 rounded-md border border-slate-300 px-2 py-1" />
                          </label>
                        </fieldset>
                      )}

                      <div className={`rounded-md border px-3 py-2 text-sm ${style.classe}`}>
                        <p className="font-semibold">{style.label}{r.formulaire ? ` · ${r.formulaire}` : ""}</p>
                        <p className="mt-1">{r.motif}</p>
                        {l.note && <p className="mt-1 italic">{l.note}</p>}
                        <p className="mt-1 text-xs opacity-80">Source : {r.source}</p>
                      </div>

                      {r.verdict === "a_declarer" && (
                        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Fiche à recopier sur impots.gouv
                            </span>
                            <BoutonCopier valeur={ficheTexte(p, l)} libelle="Copier la fiche" />
                          </div>
                          <dl className="divide-y divide-slate-100 text-sm">
                            {ficheChamps(p, l).map((ch) => (
                              <div key={ch.label} className="flex gap-3 px-3 py-1.5">
                                <dt className="w-48 shrink-0 text-slate-500">{ch.label}</dt>
                                <dd className={ch.aRenseigner ? "italic text-slate-400" : "font-medium text-slate-800"}>{ch.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button type="button" onClick={() => ajouterCompte(p.id)} className="self-start text-xs text-blue-700 underline">
                  + Ajouter un compte chez cet établissement
                </button>
              </div>
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
