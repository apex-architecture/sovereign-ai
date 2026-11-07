/**
 * selftest.mjs — proves the agent's own instruments work, with no network and no side effects.
 *
 *   node agent/selftest.mjs
 *
 * Each case is binary. A case that cannot be proven is not written.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildBacklog, jargonLoad, linkCoverage } from "./backlog.mjs";
import { LEAK_RULES, runLeakOn } from "./guard.mjs";
import { ROOT } from "./lib.mjs";

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const dir = path.join(ROOT, "agent", ".selftest-fixture");
mkdirSync(dir, { recursive: true });
try {
  writeFileSync(path.join(dir, "planted.js"), `const k = "r8_${"A".repeat(24)}";\n`);
  writeFileSync(path.join(dir, "clean.js"), "export const x = 1;\n");
  const dirty = await runLeakOn(dir);
  check("the leak rule actually bites", dirty.hits.length === 1 && /planted\.js/.test(dirty.hits[0]), `${dirty.hits.length} hit(s)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const clean = await runLeakOn(path.join(ROOT, "verse-site"));
check("nothing published carries a secret", clean.pass, clean.hits.join(" "));
check("every leak rule is a valid regex", LEAK_RULES.every(([, p]) => { try { new RegExp(p); return true; } catch { return false; } }));

const pages = jargonLoad();
check("jargon count is measured, not assumed", pages.length >= 8 && pages.every((p) => Number.isInteger(p.hits)), `${pages.length} pages, worst ${Math.max(...pages.map((p) => p.hits))}`);

const links = linkCoverage();
check("link coverage returns real counts", links.total > 100 && links.withLink >= 0, `${links.withLink}/${links.total} tools have a home`);

const backlog = await buildBacklog();
check("every open task has exactly one owner", backlog.tasks.every((t) => t.owner === "agent" || t.owner === "master"), `${backlog.tasks.length} tasks`);
check("the licence read is never handed to the agent", backlog.tasks.filter((t) => t.id === "licence-read").every((t) => t.owner === "master" && !t.doable));
check("staged coverage is counted from the code", Number.isInteger(backlog.stages.wired) && backlog.stages.total > 0, `${backlog.stages.wired}/${backlog.stages.total} stages wired`);

const source = readFileSync(path.join(ROOT, "agent", "guard.mjs"), "utf8");
check("the guard reads licences from measured data, never a typed count", source.includes("readVerse(") && source.includes("r.v)") && !/clearedByAHuman:\s*\d/.test(source));

console.log(`\nTOTAL: ${passed} checks passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
