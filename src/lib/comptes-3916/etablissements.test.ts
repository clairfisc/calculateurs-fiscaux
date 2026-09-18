import { describe, it, expect } from "vitest";
import { ETABLISSEMENTS, teneurHorsDeFrancePourType, descriptionFiche } from "./etablissements";
import { evalueCompte } from "./regles";
import { libelleVerdict, libelleVerdictCourt } from "./libelles";
import type { Verdict } from "./types";

/**
 * Invariants sur les surcharges SEO (`nomCourt`, `descriptionSeo`) des fiches
 * établissement. Gèle les garde-fous manquants lors de la 1ʳᵉ version de la fiche
 * Revolut (revue adversariale du 18/09/2026) : une description sur mesure ne doit
 * jamais contredire le verdict par défaut du moteur, ni dépasser la longueur d'une
 * meta description, et un nom court inutile (identique à la raison sociale) est du
 * bruit dans le modèle.
 */
describe("etablissements — invariants des surcharges SEO", () => {
  it("descriptionSeo ≤ 160 caractères (contrainte meta description)", () => {
    for (const etab of ETABLISSEMENTS) {
      if (etab.descriptionSeo === undefined) continue;
      expect(etab.descriptionSeo.length, `descriptionSeo trop longue pour ${etab.id}`).toBeLessThanOrEqual(160);
    }
  });

  /**
   * I5 (revue du 19/09/2026) : le test ci-dessus ne couvrait QUE les fiches à
   * `descriptionSeo` explicite (3 sur 12 à l'origine) — les 9 autres passent par le
   * gabarit de repli. Contre-vérification du 19/09/2026 (mineur, en marge d'I4) : ce
   * test recopiait le gabarit de `[etablissement].astro` dans une chaîne séparée, donc
   * il ne cassait PAS si la page divergeait du texte qu'il était censé garantir. Les
   * deux surfaces appellent désormais `descriptionFiche` (`etablissements.ts`), source
   * UNIQUE du gabarit : un changement de gabarit sur la page fait mécaniquement
   * échouer ce test s'il dépasse 160 caractères, il ne peut plus lui échapper en silence.
   */
  it("meta description effective (explicite ou générée) ≤ 160 caractères, pour TOUTES les fiches", () => {
    for (const etab of ETABLISSEMENTS) {
      const r = evalueCompte({
        type: etab.typeParDefaut,
        etablissementId: etab.id,
        teneurHorsDeFrance: teneurHorsDeFrancePourType(etab, etab.typeParDefaut),
      });
      const description = descriptionFiche(etab, r);
      expect(description.length, `meta description trop longue pour ${etab.id} : « ${description} »`).toBeLessThanOrEqual(
        160,
      );
    }
  });

  it("descriptionSeo ne contredit pas le verdict par défaut du moteur", () => {
    for (const etab of ETABLISSEMENTS) {
      if (etab.descriptionSeo === undefined) continue;
      const r = evalueCompte({
        type: etab.typeParDefaut,
        etablissementId: etab.id,
        teneurHorsDeFrance: teneurHorsDeFrancePourType(etab, etab.typeParDefaut),
      });
      if (r.verdict !== "a_declarer") continue;
      // Heuristique volontairement simple : une description qui OUVRE sur « non déclarable »
      // affirme sans nuance le contraire du verdict par défaut affiché dans l'encadré de la
      // fiche (cf. contradiction Revolut encadré « Oui » / section « Non » en dessous).
      // Une mention de « non déclarable » plus loin dans le texte, encadrée par un « : » ou
      // une parenthèse qualifiant un cas particulier (ex. sous-compte IBAN FR), reste admise.
      expect(
        /^non déclarable/i.test(etab.descriptionSeo.trim()),
        `descriptionSeo de ${etab.id} commence par « non déclarable » alors que le verdict par défaut est « à déclarer »`,
      ).toBe(false);
    }
  });

  it("nomCourt, quand défini, diffère de designation (sinon champ mort)", () => {
    for (const etab of ETABLISSEMENTS) {
      if (etab.nomCourt === undefined) continue;
      expect(etab.nomCourt, `nomCourt inutile pour ${etab.id} (identique à designation)`).not.toBe(etab.designation);
    }
  });

  /**
   * Garde-fou du 18/09/2026. La fiche N26 affirmait « la rumeur d'un IBAN français
   * depuis 2023 est infirmée » — dans sa `note` ET dans sa meta description — alors que
   * N26 documente cet IBAN depuis juin 2023 et que sa succursale française est inscrite
   * au REGAFI depuis 2018. Une erreur de FAIT sur une page YMYL est plus grave qu'une
   * imprécision de droit : elle est vérifiable en trente secondes par le lecteur.
   */
  it("aucune fiche ne nie l'existence d'un IBAN français (fait vérifiable, faux sur N26)", () => {
    for (const etab of ETABLISSEMENTS) {
      const textes = [etab.note, etab.descriptionSeo, ...(etab.sections ?? []).map((s) => s.corps)];
      for (const t of textes) {
        if (t === undefined) continue;
        expect(
          /IBAN fran[çc]ais[^.]{0,80}(infirm|r[ée]fut|rumeur)/i.test(t),
          `${etab.id} : nie l'existence d'un IBAN français`,
        ).toBe(false);
      }
    }
  });

  /**
   * Un établissement dont la base ne connaît PAS le lieu de tenue pour tous ses clients
   * doit expliquer les deux branches quelque part sur sa fiche, sinon le lecteur reçoit un
   * « selon votre situation » sans savoir comment lever le doute — le « à vérifier »
   * que cette révision supprime, sous un autre nom.
   *
   * L'explication peut vivre dans `note` OU dans `sections` : Revolut, par exemple,
   * la met délibérément en avant en sections (cf. commentaire dans `etablissements.ts`)
   * plutôt que de l'enfouir dans `note` — les deux surfaces sont rendues sur la fiche
   * (`[etablissement].astro`), donc les deux comptent pour cet invariant.
   */
  it("un établissement à lieu de tenue indéterminé documente les deux branches", () => {
    for (const etab of ETABLISSEMENTS) {
      const r = evalueCompte({
        type: etab.typeParDefaut,
        etablissementId: etab.id,
        teneurHorsDeFrance: teneurHorsDeFrancePourType(etab, etab.typeParDefaut),
      });
      if (r.verdict !== "info_manquante") continue;
      const texteComplet = [etab.note, ...(etab.sections ?? []).map((s) => s.corps)].join(" ");
      expect(
        etab.note !== undefined || (etab.sections?.length ?? 0) > 0,
        `${etab.id} rend « info_manquante » sans note ni section explicative`,
      ).toBe(true);
      expect(
        /non d[ée]clarable|hors champ|tenu en France|succursale fran[çc]aise|dispens/i.test(texteComplet),
        `${etab.id} : ni la note ni les sections ne disent dans quel cas le compte n'est PAS à déclarer`,
      ).toBe(true);
    }
  });
});

/**
 * Les libellés sont EMPRUNTÉS par toutes les fiches qui tombent dans leur état : ils
 * doivent être définis pour chacun des cinq états, et ne jamais réintroduire le « en
 * principe » (qui suggérait une réserve de droit là où l'inconnue est un fait) ni un
 * « à vérifier » indifférencié (qui amalgamait trois incertitudes distinctes).
 */
describe("libellés de verdict — invariants de rédaction", () => {
  const TOUS: readonly Verdict[] = ["a_declarer", "hors_champ", "dispense", "info_manquante", "non_tranche"];

  it("chaque état a un libellé long et un libellé court non vides", () => {
    for (const v of TOUS) {
      for (const f of [null, "3916", "3916-bis", "1649AA"] as const) {
        expect(libelleVerdict(v, f).length, `libelleVerdict(${v}, ${f})`).toBeGreaterThan(0);
        expect(libelleVerdictCourt(v, f).length, `libelleVerdictCourt(${v}, ${f})`).toBeGreaterThan(0);
      }
    }
  });

  it("aucun libellé ne contient « en principe » ni « à vérifier »", () => {
    for (const v of TOUS) {
      for (const f of [null, "3916", "3916-bis", "1649AA"] as const) {
        for (const texte of [libelleVerdict(v, f), libelleVerdictCourt(v, f)]) {
          expect(/en principe/i.test(texte), `« en principe » dans « ${texte} »`).toBe(false);
          expect(/à v[ée]rifier/i.test(texte), `« à vérifier » dans « ${texte} »`).toBe(false);
        }
      }
    }
  });

  it("le libellé « à déclarer » parle de CONTRAT pour le 1649 AA, de COMPTE sinon", () => {
    expect(libelleVerdict("a_declarer", "1649AA")).toMatch(/contrat/i);
    expect(libelleVerdict("a_declarer", "1649AA")).not.toMatch(/compte/i);
    expect(libelleVerdict("a_declarer", "3916")).toMatch(/compte/i);
  });
});
