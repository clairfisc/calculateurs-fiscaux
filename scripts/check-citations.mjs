#!/usr/bin/env node
// Hygiène de citation — garde-fou de qualité (et de confidentialité).
//
// Règle : toute citation « §N » dans le code ou la documentation doit se
// **résoudre à une source publique** — soit une section réellement présente dans
// un fichier `.md` du dépôt (SOURCES-*.md, DEPLOY.md, …), soit un renvoi ancré à
// une source officielle citée sur la même ligne (BOFiP, BOI-…, CGI, notice, art.).
//
// Un renvoi « §N.N » qui ne correspond à AUCUNE section publique pointe un
// document externe non versionné : il est rejeté. La règle ne liste aucun terme :
// elle vérifie seulement que chaque citation est traçable vers une source du dépôt.
//
// Usage : node scripts/check-citations.mjs   (exit 1 si une citation orpheline).

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SCAN_EXT = [".ts", ".tsx", ".astro", ".md"];
const CITATION = /§\s?([0-9]+(?:\.[0-9]+)*(?:\s?(?:bis|ter))?)/g;
const HEADING = /^\s{0,3}#{1,6}\s+.*?([0-9]+(?:\.[0-9]+)*(?:\s?(?:bis|ter))?)/;
// Ancres « source publique » admises sur la ligne, avant le § :
const ANCHOR = /(?:[\w.-]+\.md|BOFiP|BOI[-\s]|\bCGI\b|notice|\bart\.|décret|\bLPF\b|\bRM\b|\bRES\b)/i;

const norm = (s) => s.replace(/\s+/g, "").toLowerCase();

function tracked() {
  return execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((f) => SCAN_EXT.some((e) => f.endsWith(e)));
}

const files = tracked();

// 1. Index de toutes les sections définies par un titre Markdown public.
const validSections = new Set();
for (const f of files) {
  if (!f.endsWith(".md")) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(HEADING);
    if (m) validSections.add(norm(m[1]));
  }
}

// 2. Vérifie chaque citation.
const orphans = [];
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (HEADING.test(line)) return; // une ligne de titre définit, ne cite pas
    let m;
    CITATION.lastIndex = 0;
    while ((m = CITATION.exec(line)) !== null) {
      const token = norm(m[1]);
      const before = line.slice(0, m.index);
      if (validSections.has(token)) continue; // section publique existante
      if (ANCHOR.test(before)) continue; // renvoi à une source officielle
      orphans.push({ file: f, line: i + 1, token: m[0].trim(), text: line.trim() });
    }
  });
}

if (orphans.length > 0) {
  console.error(`\n✖ ${orphans.length} citation(s) orpheline(s) — ne résolvent à aucune source publique :\n`);
  for (const o of orphans) {
    console.error(`  ${o.file}:${o.line}  « ${o.token} »`);
    console.error(`      ${o.text}`);
  }
  console.error(
    `\nUne citation « §N » doit pointer une section d'un .md du dépôt, ou une source\n` +
      `officielle citée sur la même ligne (BOFiP / BOI- / CGI / notice / art.).\n` +
      `Un renvoi vers un document externe non versionné n'a pas sa place dans le dépôt public.\n`,
  );
  process.exit(1);
}

console.log(`✓ ${files.length} fichiers scannés — toutes les citations §N sont traçables.`);
