/**
 * Proves the switchboard tells the truth about what is connected.
 *
 * The failure this catches: a stage shown as runnable with nothing behind it, a route naming a
 * provider that does not exist, or a path claimed live from static hosting that the browser would
 * refuse. The platform's whole claim is that it routes and never fakes, so the routing is tested
 * before any interface is built on it.
 *
 *   node --experimental-strip-types scripts/switchboard-selftest.mjs
 */
import {
  STAGES,
  STAGE_BY_ID,
  resolveStage,
  resolveAll,
  pipelineCoverage,
  zeroPlugStages,
  undeclaredRoutes,
} from "../src/lib/apex/switchboard.ts";
import { CONNECTOR_BY_PROVIDER } from "../src/lib/apex/connectors.ts";

let failed = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`ok    ${label}${detail ? " — " + detail : ""}`);
  else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? " — " + detail : ""}`);
  }
}

/* ---------------------------------------------------------------- the pipeline is the canonical ten */

check("ten stages", STAGES.length === 10);
check("numbered 1 to 10 in order", STAGES.every((s, i) => s.n === i + 1));
check("stage ids are unique", new Set(STAGES.map((s) => s.id)).size === 10);
check("every stage declares at least one route", STAGES.every((s) => s.routes.length > 0));
const undeclared = undeclaredRoutes();
check("every route names a real connector", undeclared.length === 0, undeclared.join(", "));
check("the last stage is the seal", STAGES[9].id === "seal");
check("the first stage is the script", STAGES[0].id === "script");

/* ---------------------------------------------------------------- nothing plugged in */

const none = pipelineCoverage({});
const zero = zeroPlugStages().map((s) => s.id);
console.log(`\nnothing plugged in: ${none.connected}/${none.total} stages connected`);
console.log(`  live: ${zero.join(", ")}`);
console.log(`  empty: ${none.empty.join(", ")}\n`);

check(
  "only the seal works with nothing plugged in — the other browser contracts are not built",
  zero.length === 1 && zero[0] === "seal",
  zero.join(", "),
);
check(
  "the prompt stage admits it is not built rather than offering a run",
  resolveStage(STAGE_BY_ID.prompt, {}).says.includes("not built yet"),
  resolveStage(STAGE_BY_ID.prompt, {}).says,
);
check("no rig stage is claimed live with nothing plugged in", !zero.includes("generation"));
check("the script stage is not claimed live with nothing plugged in", !zero.includes("script"));
check(
  "a disconnected stage says why instead of offering a run",
  resolveStage(STAGE_BY_ID.generation, {}).says.startsWith("Not connected."),
  resolveStage(STAGE_BY_ID.generation, {}).says,
);

/* ---------------------------------------------------------------- a rig plugged in */

const rig = pipelineCoverage({ rig: "http://127.0.0.1:8188" });
console.log(`rig plugged in: ${rig.connected}/${rig.total} stages connected`);
console.log(`  empty: ${rig.empty.join(", ")}\n`);
check("a rig connects more stages than nothing", rig.connected > none.connected);
check("generation connects through the rig", resolveStage(STAGE_BY_ID.generation, { rig: "x" }).connected);
check("the rig route is preferred over the cloud route", resolveStage(STAGE_BY_ID.generation, { rig: "x", cloud: true }).chosen.provider === "ComfyUI");
check(
  "interpolation still states the node it needs",
  resolveStage(STAGE_BY_ID.interpolation, { rig: "x" }).says.includes("RIFE"),
);
check(
  "audio stays empty with a rig alone, because Piper and Whisper are processes",
  rig.empty.includes("audio"),
  "a process is not an endpoint",
);
check(
  "timeline and colour stay empty with a rig alone — FFmpeg is a process and the browser contracts are unbuilt",
  rig.empty.includes("timeline") && rig.empty.includes("color"),
  rig.empty.join(", "),
);

/* ---------------------------------------------------------------- a cloud key plugged in */

const cloud = pipelineCoverage({ cloud: true });
console.log(`cloud key plugged in: ${cloud.connected}/${cloud.total} stages connected`);
console.log(`  empty: ${cloud.empty.join(", ")}\n`);
check("a cloud key connects generation", resolveStage(STAGE_BY_ID.generation, { cloud: true }).connected);
check(
  "the cloud route is byok and never claims the platform pays",
  resolveStage(STAGE_BY_ID.generation, { cloud: true }).chosen.plug === "byok",
);
check(
  "a cloud-only creator is never told to put a model on a rig they do not have",
  !resolveStage(STAGE_BY_ID.generation, { cloud: true }).says.includes("rig"),
);
check(
  "script is not claimed live on a cloud key alone — the direct DeepSeek and Qwen contracts are unbuilt",
  !resolveStage(STAGE_BY_ID.script, { cloud: true }).connected,
  resolveStage(STAGE_BY_ID.script, { cloud: true }).says,
);

/* ---------------------------------------------------------------- the bridge plugged in */

const all = pipelineCoverage({ rig: "x", bridge: "http://127.0.0.1:8787", cloud: true });
console.log(`rig + bridge + key: ${all.connected}/${all.total} stages connected`);
console.log(`  empty: ${all.empty.join(", ") || "none"}\n`);
check("the bridge connects the audio stage", !all.empty.includes("audio"));
check("every built stage connects with all three plugs", all.connected === 9, `${all.connected}/10`);
check("the prompt stage is the one admitted gap", all.empty.join(", ") === "prompt", all.empty.join(", "));
const unbuiltChosen = resolveAll({ rig: "x", bridge: "y", cloud: true }).filter(
  (s) => s.chosen && !CONNECTOR_BY_PROVIDER[s.chosen.provider].built,
);
check("no unbuilt contract is ever the chosen route", unbuiltChosen.length === 0, unbuiltChosen.map((s) => s.stage.id).join(", "));

/* ---------------------------------------------------------------- the server path is never claimed live */

for (const p of [{}, { rig: "x" }, { cloud: true }, { rig: "x", bridge: "y", cloud: true }]) {
  const seal = resolveStage(STAGE_BY_ID.seal, p);
  const ots = seal.routes.find((r) => r.provider === "OpenTimestamps");
  check(
    `OpenTimestamps is not reachable from the rail (${JSON.stringify(p)})`,
    ots && !ots.available && ots.reach === "server",
  );
  check(`the seal still connects on device (${JSON.stringify(p)})`, seal.chosen.provider === "PSI Device Seal");
}

/* ---------------------------------------------------------------- no stage is connected without a route */

const inconsistent = resolveAll({ rig: "x", bridge: "y", cloud: true }).filter(
  (s) => s.connected !== (s.chosen !== null),
);
check("connected always means a chosen route exists", inconsistent.length === 0);
check(
  "every available route is actually reachable",
  resolveAll({}).every((s) => s.routes.every((r) => !r.available || r.reach === "device")),
);

console.log(
  failed === 0
    ? `\nSWITCHBOARD CLEAN — ten stages, ${none.connected} live with nothing plugged in, ${all.connected} with everything.`
    : `\nSWITCHBOARD FAILED — ${failed} check(s) did not pass.`,
);
process.exit(failed === 0 ? 0 : 1);