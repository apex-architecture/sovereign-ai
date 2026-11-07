/**
 * Absorb a research pass into the dictionary.
 *
 * Each cluster survey in docs/ is written as a fenced TypeScript block by the pass that measured it.
 * This script lifts that block, unchanged, into src/lib/apex/engines/<cluster>.ts and points its type
 * import at the shared contract. It does not summarise, reword or invent: a row that the survey left
 * with a null keeps its null, and the count printed here is the count of rows in the file, not the
 * count the survey claimed.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
const OUT = path.join(ROOT, "src", "lib", "apex", "engines");

const only = process.argv[2];
const files = readdirSync(DOCS)
  .filter((f) => f.startsWith("engine-survey-") && f.endsWith(".md"))
  .filter((f) => !only || f.includes(only));

if (files.length === 0) console.log(`no engine-survey-*.md matched${only ? ` "${only}"` : ""}`);

for (const file of files) {
  const slug = file.replace(/^engine-survey-/, "").replace(/\.md$/, "");
  const md = readFileSync(path.join(DOCS, file), "utf8");
  const block = /```ts\r?\n([\s\S]*?)```/.exec(md);
  if (!block) {
    console.log(`SKIP ${file} — no fenced TypeScript block to absorb`);
    continue;
  }
  const code = block[1]
    .replace(/^\s*import\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?\s*$/gm, "")
    .replace(/^\s*import\s+type\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?\s*$/gm, "")
    .replace(/^\s*\/\/\s*Paste target:.*$/gm, "")
    .trimStart();
  // A survey written to be pasted into engines.ts leans on that file's MEASURED date. Absorbed into its
  // own module it would be an undefined name, so the date the survey itself declared is carried over.
  let measuredFrom = "declared in the block";
  let measured = "";
  if (/\bmeasuredAt:\s*MEASURED\b/.test(code) && !/^\s*const MEASURED\s*=/m.test(code)) {
    measured = /Compiled\s+(\d{4}-\d{2}-\d{2})/.exec(md)?.[1] ?? new Date().toISOString().slice(0, 10);
    measuredFrom = measured === new Date().toISOString().slice(0, 10) ? "today (no Compiled date in the doc)" : "the doc's Compiled date";
    measured = `const MEASURED = "${measured}";\n\n`;
  }
  const named = /export const (\w+)\s*:\s*Engine\[]/.exec(code)?.[1];
  if (!named) {
    console.log(`SKIP ${file} — the block does not export a typed Engine[]`);
    continue;
  }
  const rows = (code.match(/^\s+id:\s*"/gm) || []).length;
  const out = `${OUT}/${slug}.ts`;
  writeFileSync(
    out,
    `/**\n * Absorbed verbatim from docs/${file} — ${rows} engine rows, one per tool the survey measured.\n * Re-run: node scripts/absorb-survey.mjs ${slug}\n * Nothing in this file was written from memory; every null in it means the figure was never found.\n */\n\nimport type { Engine } from "./contract.ts";\n\n${measured}${code.trimEnd()}\n`,
  );
  console.log(
    `OK ${slug}.ts — export ${named}: ${rows} rows, ${existsSync(out) ? "written" : "FAILED TO WRITE"}` +
      (measured ? ` (MEASURED injected from ${measuredFrom})` : ""),
  );
}
