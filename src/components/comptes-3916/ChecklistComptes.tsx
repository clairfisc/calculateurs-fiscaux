import { useMemo, useState } from "react";
import {
  evalueDeclaration,
  etablissementParId,
  typesDeEtablissement,
  teneurHorsDeFrancePourType,
  libelleVerdictCourt,
  conduiteATenir,
  CLASSE_VERDICT,
  ETABLISSEMENTS,
  type Compte,
  type ResultatCompte,
  type TypeCompte,
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
  titres_cto: "Compte-titres (courtier)",
  pea: "PEA",
  exchange_crypto: "Compte crypto (plateforme : Binance, Kraken…)",
  wallet_auto_heberge: "Wallet crypto auto-hébergé (Ledger, MetaMask…)",
  assurance_vie: "Assurance-vie / capitalisation (étranger)",
};
const TOUS_TYPES = Object.keys(TYPE_LABELS) as TypeCompte[];

/**
 * Types dont le verdict dépend du LIEU DE TENUE : pour eux seuls on pose la question.
 * `assurance_vie` en est exclu (régime distinct 1649 AA), ainsi que
 * `wallet_auto_heberge` (hors champ par nature) et `paiement_emoney` (piloté par les
 * trois conditions de dispense).
 */
const TYPES_SENSIBLES_AU_LIEU: readonly TypeCompte[] = [
  "banque",
  "neobanque",
  "titres_cto",
  "pea",
  "exchange_crypto",
];

/**
 * Types éligibles à la dispense du BOFiP §85 : elle est fondée sur l'USAGE du compte,
 * pas sur le statut du prestataire — la réserver à `paiement_emoney` écartait à tort
 * les comptes de néobanque qui remplissent les trois conditions.
 */
const TYPES_ELIGIBLES_DISPENSE: readonly TypeCompte[] = ["paiement_emoney", "neobanque", "banque"];

interface CompteLigne {
  readonly id: string;
  readonly type: TypeCompte;
  readonly sousCompteLibelle?: string;
  readonly note?: string;
  /** Pays/adresse du compte (pré-remplis depuis l'établissement, éditables ; peuvent différer par compte). */
  readonly pays?: string;
  readonly adresse?: string;
  /**
   * `undefined` = pas encore touché par l'utilisateur (le prérempli éventuel de la base
   * s'applique) ; `null` = l'utilisateur a explicitement choisi « Je ne sais pas encore »,
   * y compris pour ÉCARTER un prérempli (M8) ; `boolean` = réponse explicite de l'utilisateur.
   */
  readonly teneurHorsDeFrance?: boolean | null;
  readonly emoneyUsageAchatsOuVentesBiens?: boolean;
  readonly emoneyAdosseCompteFrancais?: boolean;
  readonly emoneyEncaissementsAnnuelsEur?: number;
  readonly detientNftAutoConserves?: boolean;
}
interface Poste {
  readonly id: string;
  readonly etablissementId?: string;
  readonly etablissementLibre?: string;
  readonly comptes: readonly CompteLigne[];
}

let seq = 0;
const uid = (p: string) => `${p}-${(seq += 1)}`;

/**
 * Nouvelle ligne de compte.
 *
 * Les deux conditions qualitatives de la dispense sont initialisées à `false` — et non
 * laissées à `undefined` — pour les comptes de paiement : le moteur distingue désormais
 * « non renseigné » (→ `info_manquante`) de « répondu non » (→ `a_declarer`), et dans
 * l'UI une case décochée est bien une réponse négative, pas une absence de réponse.
 * C'est l'inverse sur la fiche statique, qui n'a aucune case à cocher et doit donc
 * rester en `undefined`.
 */
const ligneVide = (type: TypeCompte = "banque"): CompteLigne => ({
  id: uid("l"),
  type,
  ...(type === "paiement_emoney"
    ? { emoneyUsageAchatsOuVentesBiens: false, emoneyAdosseCompteFrancais: false }
    : {}),
});
const posteVide = (): Poste => ({ id: uid("p"), comptes: [ligneVide()] });

/** Construit l'entrée du moteur à partir d'un poste + une de ses lignes. */
function buildCompte(p: Poste, l: CompteLigne): Compte {
  const etab = p.etablissementId ? etablissementParId(p.etablissementId) : undefined;
  return {
    type: l.type,
    etablissementId: p.etablissementId,
    etablissementLibre: p.etablissementLibre,
    pays: l.pays,
    // Réponse de l'utilisateur si elle existe, sinon valeur sourcée de la base — SAUF si
    // l'utilisateur a explicitement choisi « Je ne sais pas encore » (`null`), auquel cas on
    // n'applique PAS le prérempli : sans ce cas particulier, revenir sur « inconnu » après un
    // prérempli était impossible (M8, revue du 19/09/2026).
    teneurHorsDeFrance:
      l.teneurHorsDeFrance === null
        ? undefined
        : l.teneurHorsDeFrance ?? (etab ? teneurHorsDeFrancePourType(etab, l.type) : undefined),
    emoneyUsageAchatsOuVentesBiens: l.emoneyUsageAchatsOuVentesBiens,
    emoneyAdosseCompteFrancais: l.emoneyAdosseCompteFrancais,
    emoneyEncaissementsAnnuelsEur: l.emoneyEncaissementsAnnuelsEur,
    detientNftAutoConserves: l.detientNftAutoConserves,
  };
}

interface FicheChamp {
  readonly label: string;
  readonly value: string;
  /** Champ que l'utilisateur doit compléter lui-même (affiché en grisé). */
  readonly aRenseigner?: boolean;
}

/**
 * Champs structurés de la fiche à recopier sur impots.gouv.
 *
 * `r` est OBLIGATOIRE et vient de `agregat.resultats` (jamais recalculé ici par un
 * nouvel appel à `evalueCompte` sur la valeur brute de la ligne) : depuis I4, le verdict
 * d'une ligne `paiement_emoney`/`banque`/`neobanque` dépend du CUMUL réel sur toutes les
 * lignes éligibles, que seul `evalueDeclaration` connaît (I4-a, contre-vérification du
 * 19/09/2026 — un appel local à `evalueCompte` ignorait ce cumul et pouvait afficher
 * « Dispensé » sur une ligne que la synthèse comptait pourtant « à déclarer », sans
 * jamais rendre la fiche à recopier correspondante).
 */
function ficheChamps(p: Poste, l: CompteLigne, r: ResultatCompte): FicheChamp[] {
  const etab = p.etablissementId ? etablissementParId(p.etablissementId) : undefined;
  const designation = etab?.designation ?? p.etablissementLibre ?? "";
  const adresse = l.adresse ?? etab?.adresse ?? "";
  const pays = l.pays ?? etab?.pays ?? "";
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
function ficheTexte(p: Poste, l: CompteLigne, r: ResultatCompte): string {
  return ficheChamps(p, l, r)
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
      comptes = etab.comptes.map((g) => ({ ...ligneVide(g.type), sousCompteLibelle: g.libelle, note: g.note, pays: g.pays, adresse: g.adresse }));
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
  // Aligne chaque résultat de `agregat.resultats` sur SA ligne d'origine, dans le MÊME
  // ORDRE que celui utilisé pour construire `toutesLignes` ci-dessus (flatMap postes →
  // comptes) — c'est cet ordre, et lui seul, qui garantit l'alignement par index. `l.id`
  // est unique tous postes confondus (compteur global `uid`), donc une simple Map suffit.
  // Le badge de ligne et la fiche à recopier DOIVENT lire leur résultat ici, jamais
  // rappeler `evalueCompte` sur la valeur brute de la ligne (I4-a, contre-vérification du
  // 19/09/2026) : sinon le cumul e-money calculé par `evalueDeclaration` (I4) n'est
  // jamais répercuté dans l'UI, et badge / synthèse / fiche divergent.
  const resultatParLigne = useMemo(() => {
    const m = new Map<string, ResultatCompte>();
    let i = 0;
    for (const p of postes) {
      for (const l of p.comptes) {
        m.set(l.id, agregat.resultats[i]);
        i += 1;
      }
    }
    return m;
  }, [postes, agregat]);
  // Les contrats d'assurance-vie/capitalisation (1649 AA) sont comptés dans `nbADeclarer`
  // (total) mais PAS dans `nbADeclarer3916` ni `nbADeclarer3916bis` (régime distinct, cf.
  // types.ts) : sans ce sous-total dédié, la somme des deux compteurs affichés ne
  // correspondait pas au total annoncé dès qu'un contrat 1649 AA était présent (M6, revue
  // du 19/09/2026).
  const nb1649AA = useMemo(
    () => agregat.resultats.filter((r) => r.verdict === "a_declarer" && r.formulaire === "1649AA").length,
    [agregat],
  );

  return (
    <form
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4"
      autoComplete="off"
      onSubmit={(e) => e.preventDefault()}
    >
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
                    autoComplete="off"
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
              </div>

              {etab?.note && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm italic text-slate-700">{etab.note}</p>}

              {/* Comptes du poste */}
              <div className="flex flex-col gap-3">
                {p.comptes.map((l) => {
                  const compte = buildCompte(p, l);
                  // Résultat AGRÉGÉ (I4-a) : jamais `evalueCompte(compte)` en local, qui
                  // ignorerait le cumul e-money calculé par `evalueDeclaration` sur
                  // l'ensemble des lignes éligibles.
                  const r = resultatParLigne.get(l.id)!;
                  // Valeur affichée dans le sélecteur : réponse de l'utilisateur, à défaut
                  // valeur sourcée de la base, à défaut « je ne sais pas encore ». Reflète
                  // `compte.teneurHorsDeFrance` (déjà résolu par `buildCompte`, y compris le
                  // cas où l'utilisateur a explicitement écarté un prérempli via `null`).
                  const lieuEffectif = compte.teneurHorsDeFrance;
                  return (
                    <div key={l.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
                      <div className="flex items-end gap-3">
                        <label className="flex flex-1 flex-col gap-1 text-sm">
                          <span className="text-slate-700">{l.sousCompteLibelle ?? "Type de compte"}</span>
                          {/* Changer de type remet à zéro les réponses spécifiques au type
                              précédent (lieu de tenue saisi, conditions de dispense) :
                              les conserver ferait porter une réponse sur une autre question. */}
                          <select
                            value={l.type}
                            onChange={(e) => {
                              const type = e.target.value as TypeCompte;
                              majLigne(p.id, l.id, {
                                type,
                                teneurHorsDeFrance: undefined,
                                emoneyUsageAchatsOuVentesBiens:
                                  type === "paiement_emoney" ? false : undefined,
                                emoneyAdosseCompteFrancais: type === "paiement_emoney" ? false : undefined,
                                emoneyEncaissementsAnnuelsEur: undefined,
                                detientNftAutoConserves: undefined,
                              });
                            }}
                            autoComplete="off"
                            className="rounded-md border border-slate-300 px-2 py-1.5"
                          >
                            {typesPourSelect.map((t) => (
                              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex w-40 flex-col gap-1 text-sm">
                          <span className="text-slate-700">Pays</span>
                          <input type="text" autoComplete="off" value={l.pays ?? etab?.pays ?? ""} onChange={(e) => majLigne(p.id, l.id, { pays: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5" />
                        </label>
                        {p.comptes.length > 1 && (
                          <button type="button" onClick={() => supprimerCompte(p.id, l.id)} className="pb-2 text-xs text-slate-400 underline">retirer</button>
                        )}
                      </div>

                      {TYPES_SENSIBLES_AU_LIEU.includes(l.type) && (
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-slate-700">
                            L'établissement qui tient ce compte est-il situé hors de France&nbsp;?
                          </span>
                          <select
                            value={lieuEffectif === undefined ? "" : lieuEffectif ? "oui" : "non"}
                            onChange={(e) =>
                              majLigne(p.id, l.id, {
                                // `null`, et non `undefined`, pour « Je ne sais pas encore » : si la base
                                // préremplit une réponse, `undefined` s'y fondrait à nouveau immédiatement
                                // via `buildCompte` — l'utilisateur ne pourrait jamais revenir sur
                                // « inconnu » après un prérempli (M8, revue du 19/09/2026). `null` est le
                                // seul moyen d'écarter explicitement le prérempli.
                                teneurHorsDeFrance: e.target.value === "" ? null : e.target.value === "oui",
                              })
                            }
                            autoComplete="off"
                            className="rounded-md border border-slate-300 px-2 py-1.5"
                          >
                            <option value="">Je ne sais pas encore</option>
                            <option value="oui">Oui — établissement / succursale hors de France</option>
                            <option value="non">Non — succursale française, IBAN FR</option>
                          </select>
                        </label>
                      )}

                      {TYPES_ELIGIBLES_DISPENSE.includes(l.type) && (
                        <fieldset className="flex flex-col gap-2 rounded-md bg-slate-50 p-3 text-sm">
                          <legend className="px-1 text-slate-600">
                            Dispense des comptes de paiement en ligne (3 conditions cumulatives)
                          </legend>
                          <label className="flex items-start gap-2">
                            <input type="checkbox" className="mt-1" checked={l.emoneyUsageAchatsOuVentesBiens ?? false} onChange={(e) => majLigne(p.id, l.id, { emoneyUsageAchatsOuVentesBiens: e.target.checked })} />
                            <span>
                              Ce compte sert à <strong>payer vos achats en ligne</strong>, ou à{" "}
                              <strong>encaisser vos ventes de biens</strong> en ligne (les prestations de{" "}
                              <strong>services</strong> ne sont pas couvertes)
                            </span>
                          </label>
                          <label className="flex items-start gap-2">
                            <input type="checkbox" className="mt-1" checked={l.emoneyAdosseCompteFrancais ?? false} onChange={(e) => majLigne(p.id, l.id, { emoneyAdosseCompteFrancais: e.target.checked })} />
                            <span>Adossé à un compte ouvert en France</span>
                          </label>
                          <label className="flex flex-col gap-1">
                            {/* I4-b (contre-vérification du 19/09/2026) : le champ demande désormais
                                le montant DE CE COMPTE SEUL. Le libellé précédent demandait déjà le
                                cumul par ligne — un titulaire obéissant qui ressaisissait le même
                                total sur 2 comptes le faisait compter deux fois (16 000 € au lieu de
                                8 000 €). C'est `evalueDeclaration`, qui voit toutes les lignes, qui
                                fait maintenant la somme (voir `regles.ts`). */}
                            <span>
                              Encaissements annuels de ventes de biens <strong>sur ce compte</strong> (€) —
                              le seuil de 10 000 € s'apprécie sur l'ensemble de vos comptes : l'outil fait
                              la somme
                            </span>
                            <input type="number" min={0} autoComplete="off" value={l.emoneyEncaissementsAnnuelsEur ?? ""} onChange={(e) => majLigne(p.id, l.id, { emoneyEncaissementsAnnuelsEur: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-40 rounded-md border border-slate-300 px-2 py-1" />
                          </label>
                        </fieldset>
                      )}

                      {l.type === "wallet_auto_heberge" && (
                        <label className="flex items-start gap-2 text-sm">
                          {/* Décocher revient à « non renseigné » (`undefined`), pas à « non » — un
                              wallet auto-hébergé sans réponse affiche déjà la réserve courte par défaut
                              (cas le plus fréquent), cocher la case affirme la détention de NFT et fait
                              basculer en `non_tranche` (I1, revue du 19/09/2026). */}
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={l.detientNftAutoConserves ?? false}
                            onChange={(e) =>
                              majLigne(p.id, l.id, {
                                detientNftAutoConserves: e.target.checked ? true : undefined,
                              })
                            }
                          />
                          <span>
                            Vous détenez des <strong>NFT</strong> (crypto-actifs uniques et non fongibles) que
                            vous conservez vous-même, hors plateforme
                          </span>
                        </label>
                      )}

                      <div className={`rounded-md border px-3 py-2 text-sm ${CLASSE_VERDICT[r.verdict]}`}>
                        <p className="font-semibold">
                          {libelleVerdictCourt(r.verdict, r.formulaire, l.type)}
                          {r.verdict === "a_declarer" && r.formulaire ? ` · ${r.formulaire}` : ""}
                        </p>
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
                            <BoutonCopier valeur={ficheTexte(p, l, r)} libelle="Copier la fiche" />
                          </div>
                          <dl className="divide-y divide-slate-100 text-sm">
                            {ficheChamps(p, l, r).map((ch) => (
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
          <li><strong>{agregat.nbADeclarer3916bis}</strong> compte(s) de crypto-actifs à déclarer sur le <strong>3916-bis</strong></li>
          {nb1649AA > 0 && (
            <li>
              <strong>{nb1649AA}</strong> contrat(s) d'assurance-vie / capitalisation à déclarer au{" "}
              <strong>1649 AA</strong> (régime distinct, hors 3916)
            </li>
          )}
          <li>
            <strong>{agregat.nbHorsChamp}</strong> hors champ · <strong>{agregat.nbDispense}</strong> dispensé(s)
          </li>
          {(agregat.nbInfoManquante > 0 || agregat.nbNonTranche > 0) && (
            <li>
              <strong>{agregat.nbInfoManquante}</strong> en attente d'une précision de votre part ·{" "}
              <strong>{agregat.nbNonTranche}</strong> non tranché(s) par les textes
            </li>
          )}
        </ul>
        {agregat.nbADeclarer > 0 && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-amber-900">
            ⚠️ Un compte non déclaré expose à une amende de <strong>1 500 €</strong> par compte bancaire
            (10 000 € pour un État sans convention d'assistance) et <strong>750 €</strong> par portefeuille de
            crypto-actifs.
          </p>
        )}

        {/* Conduite à tenir, affichée seulement quand un compte est dans l'état concerné :
            l'asymétrie de sanction suffit à décider, sans renvoyer à une consultation. */}
        {agregat.nbNonTranche > 0 && (
          <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-blue-900">{conduiteATenir("non_tranche")}</p>
        )}
        {agregat.nbInfoManquante > 0 && (
          <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-blue-900">
            {conduiteATenir("info_manquante")}
          </p>
        )}
        {agregat.nbHorsChamp > 0 && (
          <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-blue-900">{conduiteATenir("hors_champ")}</p>
        )}
      </section>

      <p className="text-xs text-slate-400">
        Aide informative — ne constitue pas un conseil fiscal. Les verdicts sont dérivés des textes cités sous
        chaque compte ; quand un point n'est pas tranché, l'outil le dit plutôt que de choisir à votre place.
      </p>
    </form>
  );
}
