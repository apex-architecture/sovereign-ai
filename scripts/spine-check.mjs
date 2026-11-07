/**
 * The spine walked on paper. No render, no GPU, no money: this proves the road hands each stage to
 * the next one in order, stops where a human has to read something, and offers a body the creator
 * actually has. Run it after touching spine.ts or engines.ts.
 */

import { ENGINES } from "../src/lib/apex/engines.ts";
import { dictionaryShape, handoffFor, missionFromIdea, nextAction, planMission } from "../src/lib/apex/spine.ts";

const GATES = [];
const gate = (name, pass, detail) => {
  GATES.push({ name, pass, detail });
};

function walk(mission) {
  const plan = planMission(mission);
  console.log(`\n${"=".repeat(100)}\nTHE SPINE — "${mission.idea}"`);
  console.log(
    `${mission.filmType ?? "type not chosen"} · ${mission.runtimeSeconds}s in ${mission.shotCount} shots · ${mission.qualityEdge}px · ` +
      `${mission.territory} · ${mission.intent} · budget $${mission.budgetUsd} · body: ${describeBody(mission)}`,
  );
  console.log("-".repeat(100));
  for (const step of plan) {
    const top = step.ranking?.offers[0];
    const engine =
      step.state === "waiting" || step.state === "skipped"
        ? "not ranked yet"
        : top
          ? `${top.engine.name} [${top.engine.licence.spdx}]`
          : step.ranking
            ? `no engine on this body (${step.ranking.refused.length} refused)`
            : "no engine in the dictionary yet";
    const quote = top ? (top.quoteUsd === null ? "price unmeasured" : `$${top.quoteUsd.toFixed(2)}`) : "—";
    const note = step.blocker ?? (step.state === "done" ? "accepted by you" : (top?.engine.fits.split(".")[0] ?? step.spec.ask));
    console.log(`  ${step.spec.stage.padEnd(15)} ${step.state.padEnd(8)} ${engine.padEnd(44)} ${quote.padEnd(16)} ${note}`);
    for (const c of top?.caveats ?? []) console.log(`  ${"".padEnd(15)} ${"".padEnd(8)} ${"".padEnd(44)} ${"".padEnd(16)} caveat: ${c}`);
  }
  const action = nextAction(plan);
  console.log(`  NEXT: ${action.label}${action.how ? ` — ${action.how}` : ""}`);
  const escape = plan.find((s) => s.escapes.length > 0);
  if (escape) {
    console.log(`  ESCAPE from ${escape.spec.stage}: ${escape.escapes.slice(0, 2).map((e) => `${e.engine.name} — ${e.precondition}`).join(" · ")}`);
  }
  return plan;
}

const describeBody = (m) =>
  `${m.vramGb === null ? "no local GPU" : `${m.vramGb} GB GPU`} · ${m.executors.length ? m.executors.join(", ") : "no credentials declared"}`;

const WRITING = ["idea", "story", "script", "shotlist"];

// 1. A creator with an idea and nothing else: the spine must stop at the idea, not render blind.
const bare = missionFromIdea("a detective chases a figure across neon rooftops in the rain");
const p1 = walk(bare);
gate("only one stage is next", p1.filter((s) => s.state === "next").length === 1, `${p1.filter((s) => s.state === "next").length} found`);
gate("the idea comes first", p1[0].state === "next" && p1[0].spec.stage === "idea", p1[0].state);
gate(
  "storyboard waits for the script to be read",
  p1.find((s) => s.spec.stage === "storyboard").state === "waiting",
  p1.find((s) => s.spec.stage === "storyboard").blocker,
);

// 2. The same mission, writing and boards accepted, on a laptop with ComfyUI and 6 GB.
const laptop = missionFromIdea(bare.idea, {
  filmType: "human",
  vramGb: 6,
  executors: ["local-comfy", "local-cli"],
  accepted: [...WRITING, "storyboard", "character_lock"],
  delivered: ["text", "image"],
  budgetUsd: 0,
});
const p2 = walk(laptop);
const motion2 = p2.find((s) => s.spec.stage === "motion");
gate("motion is offered an engine on a 6 GB laptop", (motion2.ranking?.offers.length ?? 0) > 0, motion2.ranking?.refused.map((r) => `${r.engine.name}:${r.gate}`).join(", "));
const under = (motion2.ranking?.offers ?? []).filter(
  (o) => o.engine.ceiling.maxEdge !== null && o.engine.ceiling.maxEdge < laptop.qualityEdge,
);
gate(
  "an engine under the ask is offered with the gap printed, not hidden",
  under.every((o) => o.caveats.length > 0),
  under.length
    ? under.map((o) => `${o.engine.name}: ${o.caveats.join("; ")}`).join(" | ")
    : `no offer is under the ${laptop.qualityEdge}px ask; top offer is ${motion2.ranking?.offers[0]?.engine.name ?? "none"}`,
);
gate("accepted stages read as done", p2.find((s) => s.spec.stage === "script").state === "done", p2.find((s) => s.spec.stage === "script").state);
gate("motion is the one next thing", motion2.state === "next", motion2.state);
gate("the handoff names a body the creator has", ["local-comfy", "local-cli"].includes(handoffFor(motion2, laptop)?.body), handoffFor(motion2, laptop)?.body);
gate("a $0 budget quotes $0", handoffFor(motion2, laptop)?.quoteUsd === 0, handoffFor(motion2, laptop)?.quoteUsd);
gate(
  "shot seconds come from the shot list, not a guess",
  motion2.context?.seconds === Math.round(laptop.runtimeSeconds / laptop.shotCount),
  `${motion2.context?.seconds}s per shot`,
);
gate("cartoon skips the voices", planMission({ ...laptop, filmType: "cartoon" }).find((s) => s.spec.stage === "dialogue").state === "skipped", "dialogue");
// A friendly code licence (MIT) sitting on non-commercial weights is the classic trap: the row says
// needs-licence-read, so money work must not be offered it.
const money = planMission({ ...laptop, intent: "client", budgetUsd: 20 }).find((s) => s.spec.stage === "dialogue");
gate(
  "client work is never offered an engine whose licence nobody has cleared",
  (money.ranking?.offers ?? []).every((o) => o.engine.driver === "drivable"),
  money.ranking?.offers.filter((o) => o.engine.driver !== "drivable").map((o) => `${o.engine.name}:${o.engine.licence.spdx}`).join(", ") || "no offers at all",
);
gate(
  "a blocker names one thing, not the whole mission",
  (p1.find((s) => s.spec.stage === "motion").blocker ?? "").split(" and ").length <= 2,
  p1.find((s) => s.spec.stage === "motion").blocker,
);

// 3. Marvel ask: 1080p, 30-second shots, nothing installed locally, the creator's own cloud keys.
const cloud = missionFromIdea(bare.idea, {
  filmType: "hybrid",
  runtimeSeconds: 120,
  shotCount: 4,
  qualityEdge: 1920,
  vramGb: null,
  executors: ["vendor-api", "rented-gpu"],
  accepted: [...WRITING, "storyboard", "character_lock"],
  delivered: ["text", "image"],
  budgetUsd: 40,
});
const p3 = walk(cloud);
const motion3 = p3.find((s) => s.spec.stage === "motion");
gate("no local hardware is not a dead end", (motion3.ranking?.offers.length ?? 0) + motion3.escapes.length > 0, `offers ${motion3.ranking?.offers.length}, escapes ${motion3.escapes.length}`);
gate("a 30-second shot asks for 30 seconds of engine", motion3.context?.seconds === 30, motion3.context?.seconds);
gate("a cloud handoff is addressed to a rented or vendor body", ["vendor-api", "rented-gpu"].includes(handoffFor(motion3, cloud)?.body), handoffFor(motion3, cloud)?.body);
gate(
  "every refusal names its gate and its reason",
  [...p2, ...p3].every((s) => (s.ranking?.refused ?? []).every((r) => r.gate && r.why)),
  "refusal records",
);

// 4. Where the dictionary is wide and where it is still a footpath.
console.log(`\n${"=".repeat(100)}\nTHE DICTIONARY — ${ENGINES.length} engines over ${dictionaryShape().length} stages`);
console.log("-".repeat(100));
for (const row of dictionaryShape()) {
  const bar = "█".repeat(row.engines);
  console.log(`  ${row.stage.padEnd(15)} ${String(row.engines).padStart(2)} engine  ${String(row.openSource).padStart(2)} open source  ${String(row.priced).padStart(2)} priced  ${String(row.drivable).padStart(2)} drivable  ${bar}`);
}
const empty = dictionaryShape().filter((r) => r.engines === 0);
console.log(`  stages of the spine still without a single engine: ${empty.map((e) => e.stage).join(", ") || "none"}`);

console.log(`\n${"=".repeat(100)}`);
for (const g of GATES) console.log(`  ${g.pass ? "PASS" : "FAIL"}  ${g.name}${g.pass ? "" : ` — ${g.detail}`}`);
const failed = GATES.filter((g) => !g.pass);
console.log(`\n${GATES.length - failed.length} of ${GATES.length} gates passed.`);
process.exit(failed.length ? 1 : 0);
