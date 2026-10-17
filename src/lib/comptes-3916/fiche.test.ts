import { describe, it, expect } from "vitest";
import {
  ETABLISSEMENTS,
  etablissementParId,
  teneurHorsDeFrancePourType,
  teneurPourType,
  typesDeEtablissement,
  descriptionFiche,
} from "./etablissements";
import { ficheChamps, type LigneFiche } from "./fiche";
import { evalueCompte, evalueDeclaration } from "./regles";
import type { Compte, TypeCompte } from "./types";

/**
 * Fiche à recopier : elle doit nommer le TENEUR du compte, pas l'établissement par
 * lequel l'utilisateur l'a ouvert (défaut en production jusqu'au 17/10/2026 : une ligne
 * crypto Revolut affichait « Revolut / Revolut Bank UAB, Vilnius »).
 */

/** Reproduit `buildCompte` (checklist) pour une ligne sans réponse utilisateur. */
function compteDeLigne(l: LigneFiche): Compte {
  const etab = l.etablissementId ? etablissementParId(l.etablissementId) : undefined;
  return {
    type: l.type,
    etablissementId: l.etablissementId,
    teneurHorsDeFrance: etab ? teneurHorsDeFrancePourType(etab, l.type) : undefined,
  };
}

/** Fiche d'une ligne, verdict lu dans `agregat.resultats` comme dans la checklist (I4). */
function fiche(l: LigneFiche) {
  const agregat = evalueDeclaration([compteDeLigne(l)]);
  const r = agregat.resultats[0];
  const champs = ficheChamps(l, r, "libellé");
  const valeur = (label: string) => champs.find((c) => c.label === label)?.value;
  return { r, champs, valeur };
}

describe("fiche à recopier — ligne crypto chez un intermédiaire", () => {
  const CAS: readonly { id: string; designation: string; pays: string; adresse: string | undefined }[] = [
    { id: "revolut", designation: "Revolut Digital Assets Europe Ltd", pays: "CY", adresse: undefined },
    {
      id: "n26",
      designation: "Bitpanda GmbH",
      pays: "AT",
      adresse: "Bitpanda GmbH, Stella-Klein-Löw-Weg 17, 1020 Vienne, Autriche",
    },
    {
      id: "degiro",
      designation: "Tangany GmbH",
      pays: "DE",
      adresse: "Tangany GmbH, Brienner Straße 53, 80333 Munich, Allemagne",
    },
    {
      id: "ibkr",
      designation: "zerohash europe B.V.",
      pays: "NL",
      adresse: "zerohash europe B.V., Herengracht 244-3, 1016 BT Amsterdam, Pays-Bas",
    },
  ];

  for (const c of CAS) {
    it(`${c.id} : la fiche crypto affiche le conservateur ${c.designation}`, () => {
      const etab = etablissementParId(c.id)!;
      expect(typesDeEtablissement(etab)).toContain("exchange_crypto");
      const { r, champs, valeur } = fiche({ etablissementId: c.id, type: "exchange_crypto" });
      expect(r.verdict).toBe("a_declarer");
      expect(r.formulaire).toBe("3916-bis");
      expect(valeur("Établissement")).toBe(c.designation);
      expect(valeur("Pays")).toBe(c.pays);
      if (c.adresse) {
        expect(valeur("Adresse de l'établissement")).toBe(c.adresse);
      } else {
        // Adresse non sourcée : « à renseigner », jamais l'adresse de l'intermédiaire.
        const champ = champs.find((ch) => ch.label === "Adresse de l'établissement")!;
        expect(champ.aRenseigner).toBe(true);
      }
      // L'intermédiaire n'apparaît jamais comme établissement ni via son adresse.
      expect(valeur("Établissement")).not.toBe(etab.designation);
      if (etab.adresse) expect(valeur("Adresse de l'établissement")).not.toBe(etab.adresse);
      expect(valeur("Compte")).toContain(etab.nomCourt ?? etab.designation);
      // Pas de code PSAN hérité de l'intermédiaire.
      expect(valeur("Code PSAN (3916-bis)")).toBeUndefined();
    });
  }

  it("teneurHorsDeFrancePourType : le teneur crypto est connu, le compte principal reste à deux branches", () => {
    const t = (id: string, type: TypeCompte) => teneurHorsDeFrancePourType(etablissementParId(id)!, type);
    expect(t("revolut", "exchange_crypto")).toBe(true);
    expect(t("revolut", "titres_cto")).toBe(true);
    expect(t("revolut", "neobanque")).toBeUndefined();
    expect(t("n26", "exchange_crypto")).toBe(true);
    expect(t("n26", "neobanque")).toBeUndefined();
    expect(t("degiro", "exchange_crypto")).toBe(true);
    expect(t("degiro", "titres_cto")).toBe(true);
    expect(t("degiro", "banque")).toBe(true);
    expect(t("ibkr", "exchange_crypto")).toBe(true);
    expect(t("ibkr", "titres_cto")).toBe(true);
    expect(t("bunq", "neobanque")).toBeUndefined();
  });

  it("le gabarit `comptes` prime : DEGIRO titres garde la succursale néerlandaise", () => {
    const { valeur } = fiche({ etablissementId: "degiro", type: "titres_cto" });
    expect(valeur("Établissement")).toBe("flatexDEGIRO Bank SE");
    expect(valeur("Adresse de l'établissement")).toBe(
      "flatexDEGIRO Bank Dutch Branch, Amstelplein 1, 1096 HA Amsterdam, Pays-Bas",
    );
    expect(valeur("Pays")).toBe("Pays-Bas");
  });

  it("le code PSAN n'apparaît que sur un compte 3916-bis, et c'est celui du teneur", () => {
    const tr = etablissementParId("trade-republic")!;
    const lTr: LigneFiche = { etablissementId: "trade-republic", type: "exchange_crypto" };
    const rTr = evalueCompte({ type: "exchange_crypto", etablissementId: tr.id, teneurHorsDeFrance: true });
    expect(ficheChamps(lTr, rTr, "x").find((c) => c.label === "Code PSAN (3916-bis)")?.value).toBe("029");
    const rTitres = evalueCompte({ type: "titres_cto", etablissementId: tr.id, teneurHorsDeFrance: true });
    expect(
      ficheChamps({ etablissementId: "trade-republic", type: "titres_cto" }, rTitres, "x").some((c) =>
        c.label.startsWith("Code PSAN"),
      ),
    ).toBe(false);
    expect(fiche({ etablissementId: "kraken", type: "exchange_crypto" }).valeur("Code PSAN (3916-bis)")).toBe("020");
  });

  it("le pays saisi par l'utilisateur prime sur celui du teneur", () => {
    const { valeur } = fiche({ etablissementId: "n26", type: "exchange_crypto", pays: "Autriche" });
    expect(valeur("Pays")).toBe("Autriche");
  });
});

describe("non-régression — établissements sans `entitesParType`", () => {
  it("teneurPourType reproduit l'ancienne résolution (gabarit puis établissement) pour tous les types", () => {
    for (const etab of ETABLISSEMENTS) {
      if (etab.entitesParType) continue;
      for (const type of typesDeEtablissement(etab)) {
        const g = etab.comptes?.find((x) => x.type === type);
        const t = teneurPourType(etab, type);
        expect(t.designation, `${etab.id}/${type}`).toBe(etab.designation);
        expect(t.adresse, `${etab.id}/${type}`).toBe(g?.adresse ?? etab.adresse ?? undefined);
        expect(t.pays, `${etab.id}/${type}`).toBe(g?.pays ?? etab.pays);
        expect(t.teneurHorsDeFrance, `${etab.id}/${type}`).toBe(g?.teneurHorsDeFrance ?? etab.teneurHorsDeFrance);
        expect(t.intermediaire, `${etab.id}/${type}`).toBeUndefined();
      }
    }
  });

  it("fiche d'un établissement simple : désignation, adresse et pays de l'établissement", () => {
    const { valeur } = fiche({ etablissementId: "wise", type: "neobanque" });
    expect(valeur("Établissement")).toBe("Wise Europe SA");
    expect(valeur("Adresse de l'établissement")).toBe("Rue du Trône 100, 1050 Bruxelles, Belgique");
    expect(valeur("Pays")).toBe("BE");
    expect(valeur("Compte")).toBeUndefined();
  });

  it("saisie libre : la désignation saisie, adresse et pays à renseigner", () => {
    const l: LigneFiche = { etablissementLibre: "Banque X", type: "banque" };
    const r = evalueCompte({ type: "banque", teneurHorsDeFrance: true });
    const champs = ficheChamps(l, r, "x");
    expect(champs.find((c) => c.label === "Établissement")?.value).toBe("Banque X");
    expect(champs.find((c) => c.label === "Pays")?.aRenseigner).toBe(true);
  });
});

describe("invariants de `entitesParType`", () => {
  it("chaque type est proposé, n'est pas le type par défaut, et n'a pas de gabarit (qui le masquerait)", () => {
    for (const etab of ETABLISSEMENTS) {
      for (const type of Object.keys(etab.entitesParType ?? {}) as TypeCompte[]) {
        expect(typesDeEtablissement(etab), `${etab.id}/${type} absent de typesCompatibles`).toContain(type);
        // Le type par défaut alimente la fiche statique (verdict, « Établissement situé »),
        // qui ne lit pas les entités : le réserver aux comptes facultatifs évite toute contradiction.
        expect(type, `${etab.id} : entitesParType sur le type par défaut`).not.toBe(etab.typeParDefaut);
        expect(
          etab.comptes?.some((g) => g.type === type) ?? false,
          `${etab.id}/${type} : un gabarit du même type rend l'entrée morte`,
        ).toBe(false);
      }
    }
  });
});

describe("bunq — deux branches selon l'IBAN", () => {
  it("verdict par défaut info_manquante, meta générée ≤ 160 et non affirmative", () => {
    const bunq = etablissementParId("bunq")!;
    const r = evalueCompte({
      type: bunq.typeParDefaut,
      etablissementId: bunq.id,
      teneurHorsDeFrance: teneurHorsDeFrancePourType(bunq, bunq.typeParDefaut),
    });
    expect(r.verdict).toBe("info_manquante");
    const d = descriptionFiche(bunq, r);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(/^non d[ée]clarable|à déclarer\b/i.test(d)).toBe(false);
  });
});
