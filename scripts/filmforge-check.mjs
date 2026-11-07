import { readFileSync, readdirSync } from "node:fs";

import { pathToFileURL } from "node:url";

const ROOT = pathToFileURL("D:/ApexEmpire/films/lllppp/src/lib/filmforge/").href;
const FILM = "D:/ApexEmpire/film-forge/itnol-production";

const { CATALOG, TOOL_BY_ID } = await import(`${ROOT}catalog.ts`);
const { check } = await import(`${ROOT}licenseguard.ts`);
const { planFilm, stagesForScene } = await import(`${ROOT}planner.ts`);
const { STAGES_IN_ORDER } = await import(`${ROOT}registry.ts`);

let failures = 0;
const ok = (label, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};

console.log("\n=== 1. CATALOGUE SHAPE ===");
const needsExit = CATALOG.filter((t) => !t.exit || t.exit.length < 15).map((t) => t.id);
ok(`every tool has a real exit strategy (${CATALOG.length} tools)`, needsExit.length === 0, needsExit.join(","));
const needsCost = CATALOG.filter((t) => !["$0", "per-job", "subscription"].includes(t.cost)).map((t) => t.id);
ok("every tool has a cost basis", needsCost.length === 0, needsCost.join(","));
const noStage = CATALOG.filter((t) => !Array.isArray(t.stage) || t.stage.length === 0).map((t) => t.id);
ok("every tool lands on at least one film stage", noStage.length === 0, noStage.join(","));
const badStage = CATALOG
  .flatMap((t) => t.stage.map((s) => [t.id, s]))
  .filter(([, s]) => !STAGES_IN_ORDER.includes(s))
  .map(([id, s]) => `${id}:${s}`);
ok("every stage name is a real stage", badStage.length === 0, badStage.join(","));
const dupes = CATALOG.map((t) => t.id).filter((id, i, a) => a.indexOf(id) !== i);
ok("no duplicate tool ids", dupes.length === 0, dupes.join(","));
const free = CATALOG.filter((t) => t.cost === "$0").length;
const local = CATALOG.filter((t) => t.local).length;
const open = CATALOG.filter((t) => !t.license.startsWith("proprietary")).length;
console.log(
  `      ${CATALOG.length} tools | ${free} at $0 | ${local} run on your machine | ${open} open source`,
);

console.log("\n=== 2. LICENCE GUARD (never invent permission) ===");
const unknowns = CATALOG.filter((t) => t.commercial === "unknown");
const leaky = unknowns
  .filter((t) => ["client-work", "platform-bundle"].some((u) => check(t, u).verdict === "allowed"))
  .map((t) => t.id);
ok(
  `unverified licences never clear paid work (${unknowns.length} tools: ${unknowns.map((t) => t.id).join(", ")})`,
  leaky.length === 0,
  leaky.join(","),
);
const bundledService = CATALOG
  .filter((t) => t.license.startsWith("proprietary"))
  .filter((t) => check(t, "platform-bundle").verdict === "allowed")
  .map((t) => t.id);
ok("no proprietary tool or rented GPU is ever offered as a bundle", bundledService.length === 0, bundledService.join(","));
const gated = CATALOG.filter((t) => check(t, "client-work").verdict !== "allowed").map((t) => t.id);
console.log(`      needs permission read before paid client work: ${gated.join(", ") || "none"}`);

console.log("\n=== 3. THE REAL FILM (ITNOL) ===");
const scenes = readdirSync(`${FILM}/scenes`)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(`${FILM}/scenes/${f}`, "utf8")));
const chars = readdirSync(`${FILM}/characters`)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(`${FILM}/characters/${f}`, "utf8")));
const summary = JSON.parse(readFileSync(`${FILM}/production_summary.json`, "utf8"));

ok(`scene files match the summary (${scenes.length} vs ${summary.total_scenes})`, scenes.length === summary.total_scenes);
ok(`character files match the summary (${chars.length} vs ${summary.total_characters})`, chars.length === summary.total_characters);
const counted = scenes.reduce((m, s) => ((m[s.priority] = (m[s.priority] ?? 0) + 1), m), {});
console.log(`      priorities: ${JSON.stringify(counted)} | acts ${Math.min(...scenes.map((s) => s.act))}-${Math.max(...scenes.map((s) => s.act))}`);
const sceneIds = new Set(scenes.map((s) => s.id));
ok("every scene id is unique", sceneIds.size === scenes.length);
const nameKeys = chars.map((c) => c.name.toLowerCase().split(/[^a-z0-9]+/));
const orphanRefs = scenes
  .flatMap((s) => s.characters.map((c) => [s.id, c]))
  .filter(([, c]) => !nameKeys.some((tokens) => tokens.includes(c.toLowerCase())));
ok(
  "every character named in a scene has a reference sheet",
  orphanRefs.length === 0,
  orphanRefs.map(([sid, c]) => `${sid}:${c}`).join(","),
);
const claimed = Number((summary.step3 ?? JSON.stringify(summary).match(/critical priority scenes first \((\d+)/)?.[1] ?? "0"));
const actualCritical = scenes.filter((s) => s.priority === "critical").length;
console.log(
  `FACT  paper says render ${claimed} critical scenes; the files on disk hold ${actualCritical} — planner uses ${actualCritical}`,
);

console.log("\n=== 4. PLAN EVERY SCENE, FOUR WAYS ===");
for (const use of ["personal", "client-work"]) {
  for (const budget of ["free-only", "max-quality"]) {
    const plan = planFilm(scenes, chars, { use, budget }, summary.title);
    const badTools = plan.perScene
      .flatMap((p) => p.steps.map((s) => s.toolId))
      .filter((id) => !TOOL_BY_ID[id]);
    const emptyScenes = plan.perScene.filter((p) => p.steps.length === 0).map((p) => p.sceneId);
    ok(
      `${use} / ${budget}: ${plan.sceneCount} scenes -> ${plan.shotCount} steps, $0 cash: ${
        plan.perScene.every((p) => p.steps.every((s) => s.cost === "$0")) ? "all steps" : "some paid"
      }`,
      badTools.length === 0 && emptyScenes.length === 0,
      [...badTools, ...emptyScenes].join(","),
    );
    if (use === "personal" && budget === "free-only") {
      console.log(`      stage totals: ${JSON.stringify(plan.stageTotals)}`);
      console.log(`      first six in the shoot order: ${plan.order.slice(0, 6).join(" ")}`);
      console.log(`      ${plan.blocked.length} steps need a licence read or a missing asset`);
    }
  }
}

console.log("\n=== 5. S001 THROUGH THE MACHINE ===");
const s1 = planFilm([scenes[0]], chars, { use: "personal", budget: "free-only" }).perScene[0];
console.log(`      ${s1.sceneId} "${s1.title}" (${s1.duration}, ${s1.priority}) | speakers: ${s1.characters.length ? s1.characters.join(",") : "none"}`);
for (const st of s1.steps)
  console.log(`        ${st.stage.padEnd(15)} ${st.tool.padEnd(22)} ${st.cost.padEnd(6)} ${st.runOn.padEnd(12)} fallback: ${st.fallback}`);
for (const w of s1.waitingOn) console.log(`        WAIT ${w}`);
console.log(`      stages chosen: ${stagesForScene(scenes[0]).join(" > ")}`);

console.log("\n=== 6. ASSEMBLY COVERAGE ===");
const allStages = new Set(
  (() => {
    const film = planFilm(scenes, chars, { use: "personal", budget: "free-only" });
    return [...film.perScene.flatMap((p) => p.steps.map((s) => s.stage)), ...film.release.map((s) => s.stage)];
  })(),
);
const covered = STAGES_IN_ORDER.filter((s) => allStages.has(s));
const notCovered = STAGES_IN_ORDER.filter((s) => !allStages.has(s));
ok("the film pipeline reaches every stage a cut needs", notCovered.length === 0, `missing: ${notCovered.join(", ") || "publish (done once per film, not per scene)"}`);
console.log(`      covered per scene: ${covered.join(", ")}`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECKS FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
