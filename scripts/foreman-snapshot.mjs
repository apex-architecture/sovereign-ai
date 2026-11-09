/**
 * Freezes the Foreman's last measured pass into the static site.
 *
 * The live Foreman journal lives on the creator's engine room, so a published page has no
 * /api/agent to ask. This writes the last measured journal into the page as a snapshot, so
 * the published platform still shows the real numbers instead of an empty panel — and the
 * snapshot is stamped with the time it was taken so nobody mistakes it for a live answer.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const journal = path.resolve(root, ".apex-foreman", "latest.json");
const out = path.resolve(root, "verse-site", "foreman.generated.js");

if (!existsSync(journal)) {
  console.error("no Foreman journal to freeze — run the foreman tick first");
  process.exit(1);
}

const data = JSON.parse(readFileSync(journal, "utf8"));

/**
 * A journal is a measurement of a machine that has since moved. The page is told how old it is so
 * it can label itself, because a frozen number printed in the present tense is a lie.
 */
const ageMs = Date.now() - Date.parse(data.at);
const stale = !(ageMs >= 0) || ageMs > 60 * 60 * 1000;
const ageHours = Math.round(ageMs / 3600000);

const payload = {
  at: data.at,
  frozen: new Date().toISOString(),
  snapshot: true,
  stale,
  ageHours,
  briefing: data.briefing,
  next: data.next,
  acted: data.acted ?? [],
  audit: data.audit,
};

writeFileSync(out, `window.APEX_FOREMAN=${JSON.stringify(payload)};\n`, "utf8");
console.log(
  `ok    foreman.generated.js          ${out} · ${data.audit.reachable.length}/${data.audit.rows.length} stages · measured ${data.at}${stale ? ` · STALE (${ageHours}h old) — run the tick before publishing` : " · fresh"}`,
);
if (stale) {
  console.warn(
    `note  the journal is ${ageHours} hour(s) old. The page will say so, but a published snapshot of a machine that has moved is not a measurement.`,
  );
}
