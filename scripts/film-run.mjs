/**
 * Runs the platform. Not a diagram, not a test double — the real one door, for a real scene,
 * producing a file you can play.
 *
 *   node --experimental-strip-types scripts/film-run.mjs
 *
 * Every stage goes through runStage(): licence gate, declared depth, reachability probe, the
 * tool itself, then the next candidate when that one fails. Stages that cannot be done today
 * are reported as they were met — refused, unreachable, or no driver at all — and the run still
 * finishes with what the reachable tools could make.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDrivers, STAGES_THE_PIPELINE_NAMES, stageRoutes } from "../src/lib/apex/drivers/index.ts";
import { runStage, totalSpend } from "../src/lib/apex/orchestrate.ts";
import { exec } from "../src/lib/apex/drivers/exec.ts";
import { escapeRoutes, rankEngines, rankLines } from "../src/lib/apex/engines.ts";

const PLATES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [path.resolve("demo-plates/rooftop.jpg"), path.resolve("demo-plates/hall.jpg")];

const REPO = path.resolve(".");

const PROJECT = "film01";
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
const runDir = path.resolve("runs", stamp);
mkdirSync(runDir, { recursive: true });

/**
 * The shot list and the graph are files, not code. A prompt you can diff is a prompt you can argue
 * with, and the graph the driver submits is written into the run directory so a render can be
 * re-run byte for byte months later.
 */
const WORKFLOWS = path.resolve("workflows");
const shotList = JSON.parse(readFileSync(path.join(WORKFLOWS, "shots.json"), "utf8"));
const graphTemplate = JSON.parse(readFileSync(path.join(WORKFLOWS, "wan-t2v-1.3b.json"), "utf8"));

function graphFor(input) {
  const shot = shotList.shots.find((s) => s.scene === input.sceneId);
  if (!shot) return null;
  const tokens = {
    PROMPT: shot.prompt,
    NEGATIVE: shot.negative ?? shotList.negative_default,
    WIDTH: shot.width,
    HEIGHT: shot.height,
    FRAMES: shot.frames,
    STEPS: shot.steps,
    SEED: shot.seed,
    FPS: shot.fps,
    TAG: `${stamp}-${input.sceneId}`,
  };
  const filled = JSON.parse(JSON.stringify(graphTemplate));
  for (const node of Object.values(filled)) {
    delete node._note;
    for (const [key, value] of Object.entries(node.inputs)) {
      // A placeholder that owns the whole field is replaced by its real type — ComfyUI wants an
      // integer for steps and seed, and a bare string there is a validation error, not a hint.
      if (typeof value === "string" && /^\{\{(\w+)\}\}$/.test(value)) node.inputs[key] = tokens[/^{{(\w+)}}$/.exec(value)[1]];
      else if (typeof value === "string") node.inputs[key] = value.replace(/\{\{(\w+)\}\}/g, (m, n) => tokens[n] ?? m);
    }
  }
  writeFileSync(path.join(runDir, `graph-${input.sceneId}.json`), `${JSON.stringify(filled, null, 2)}\n`);
  return filled;
}

const drivers = buildDrivers({
  comfyGraphs: async (input) => graphFor(input),
  replicate: {
    // No model is priced here on purpose. An unpriced model is refused by the driver rather than
    // guessed at, so a run on this machine cannot become a bill by accident.
    modelFor: () => "minimax/video-01",
    usdPerJob: () => Number.NaN,
  },
});
const routes = stageRoutes(drivers);

/**
 * Before any tool runs, the road decides which tool the job gets — from the machine actually in
 * front of it, not from a config file that might be lying. VRAM is read off the GPU, presence of a
 * key is checked as a boolean and the key itself is never read, and the ask comes from the shot
 * list. Whatever the ranking refuses, it refuses out loud, with the escape route attached.
 */
async function machineFacts() {
  const gpu = await exec("nvidia-smi", ["--query-gpu=memory.total", "--format=csv,noheader,nounits"], 20);
  const mib = Number.parseInt(String(gpu.stdout).trim().split(/\r?\n/)[0] ?? "", 10);
  const comfyUrl = process.env.APEX_COMFY_URL ?? "http://127.0.0.1:8188";
  let comfy = false;
  try {
    comfy = (await fetch(`${comfyUrl}/system_stats`, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {}
  const executors = [
    comfy && "local-comfy",
    !Number.isNaN(mib) && "local-cli",
    process.env.APEX_RENTED_GPU_URL && "rented-gpu",
    (process.env.REPLICATE_API_TOKEN ?? process.env.APEX_API_TOKEN) && "vendor-api",
  ].filter(Boolean);
  return {
    // Rounded, not floored: this card reports 6141 MiB, and calling a 6 GB GPU "5 GB" refused the
    // one engine measured running on it. A body fact read off hardware has to round the way the
    // hardware is sold, or the ranking argues with a machine that is not there.
    vramGb: Number.isNaN(mib) ? null : Math.round(mib / 1024),
    executors,
    // Where the creator is, for licence purposes. Declared, not geo-guessed — a wrong answer here
    // changes what the platform is allowed to offer, so it is written down rather than inferred.
    territory: process.env.APEX_TERRITORY ?? "Australia",
  };
}

const machine = await machineFacts();
const ask = shotList.shots.map((s) => ({ edge: Math.max(s.width, s.height), seconds: s.frames / s.fps }));
const motionContext = {
  stage: "motion",
  seconds: Math.round(Math.max(...ask.map((a) => a.seconds))),
  qualityEdge: Math.max(...ask.map((a) => a.edge)),
  needsAudio: false,
  territory: machine.territory,
  intent: "personal",
  budgetUsd: 0,
  vramGb: machine.vramGb,
  executors: machine.executors,
  drivableOnly: false,
};
const road = rankEngines(motionContext);
const escapes = escapeRoutes(motionContext);

const ledger = [];
const memory = [];

function job(stage, sceneId, task, inputs, variant, timeoutSeconds = 600) {
  return { stage, sceneId, task, inputs, variant, timeoutSeconds, budgetUsd: 0, projectId: PROJECT };
}

const plan = [
  // A generated shot is streamed off disk on this GPU, so one take costs minutes, not seconds. The
  // ceiling is the measured render time with room, not a guess: 33 frames took 480s to make.
  job("motion", "shot01", "t2v", ["plate-01.jpg"], undefined, 3600),
  job("motion", "shot02", "t2v", ["plate-02.jpg"], undefined, 3600),
  job("storyboard", "board01", "keyframe", [], undefined),
  job("character_lock", "cast01", "identity-lock", [], undefined),
  job("edit", "scene01", "concat", ["shots.txt", "n/a"], undefined),
  job("sound", "scene01", "loudnorm", ["film01-edit-scene01.mp4"], undefined),
  job("subtitles", "scene01", "burn-subs", ["film01-sound-scene01.mp4", "dialogue.srt"], undefined),
  job("finish", "scene01", "finish", ["film01-subtitles-scene01.mp4"], process.env.APEX_SHUTTER ?? undefined),
  job("music", "scene01", "score", ["film01-subtitles-scene01.mp4"], undefined),
  job("dialogue", "scene01", "lines", [], undefined),
  job("publish", "scene01", "upload", ["film01-finish-scene01.mp4"], undefined),
];

for (const p of PLATES.slice(0, 2).entries()) {
  const [i, plate] = p;
  const dest = path.join(runDir, `plate-0${i + 1}.jpg`);
  if (!existsSync(plate)) {
    console.log(`ABORT: plate ${plate} is not on this disk, so there is nothing to cut`);
    process.exit(1);
  }
  copyFileSync(plate, dest);
}

writeFileSync(
  path.join(runDir, "shots.txt"),
  "file 'film01-motion-shot01.mp4'\nfile 'film01-motion-shot02.mp4'\n",
);
writeFileSync(
  path.join(runDir, "dialogue.srt"),
  "1\n00:00:01,000 --> 00:00:04,500\nEvery tool here is one someone else built\n\n2\n00:00:05,000 --> 00:00:09,500\nand none of them are the point\n\n",
);

process.chdir(runDir);

/**
 * The lineage of one scene, oldest first. When a stage asks for a file that a refusal upstream
 * kept from being written, the fallback walks forward from that name to the furthest-along
 * artefact that does exist — so a refused mix hands the cut a picture it can actually open.
 */
const MIX_ORDER = [
  "film01-motion-shot01.mp4",
  "film01-motion-shot02.mp4",
  "film01-edit-scene01.mp4",
  "film01-sound-scene01.mp4",
  "film01-subtitles-scene01.mp4",
  "film01-finish-scene01.mp4",
];

console.log(`\nAPEX RUN ${stamp}`);
console.log(`door: runStage() · plates: ${PLATES.length} · stages named by the pipeline: ${STAGES_THE_PIPELINE_NAMES.length}`);
console.log(`route table: ${Object.keys(routes).length} of ${STAGES_THE_PIPELINE_NAMES.length} stages have a driver`);
console.log(
  `\nTHE ROAD — motion, ${motionContext.seconds}s at ${motionContext.qualityEdge}px, in ${machine.territory}, for ${motionContext.intent} use`,
);
console.log(`  body on hand: ${machine.vramGb ? `${machine.vramGb} GB GPU` : "no GPU reported"} · reachable: ${machine.executors.join(", ") || "nothing"}`);
for (const line of rankLines(road)) console.log(`  ${line}`);
if (road.offers.length === 0) console.log(`  no engine on this body can serve the ask. All ${road.counted.engines} were met and refused:`);
for (const r of road.refused) console.log(`    refused ${r.engine.name} at the ${r.gate} gate — ${r.why}`);
for (const e of escapes.slice(0, 3)) console.log(`  ESCAPE  ${e.engine.name}: ${e.quoteUsd === null ? e.quoteBasis : e.quoteUsd === 0 ? "$0" : `$${e.quoteUsd}`} — ${e.precondition}`);
console.log("");

const runs = [];
const timings = [];
for (const input of plan) {
  // A stage asks for a specific upstream file. When that stage was refused — the mix, say, because
  // nothing audible has been cleared — the film does not stop: the input falls back to the newest
  // file that actually exists, and the refusal stays printed in the row above. Naming a file that
  // was never written and then reporting "no such file" is not a pipeline, it is a typo with a log.
  if (input.inputs) {
    input.inputs = input.inputs.map((f) => {
      if (!f.endsWith(".mp4") || existsSync(f)) return f;
      const at = MIX_ORDER.indexOf(f);
      if (at === -1) return f;
      return MIX_ORDER.slice(at + 1).find(existsSync) ?? f;
    });
  }
  const at = Date.now();
  const r = await runStage(routes[input.stage] ?? [], input, "personal", {
    onLedger: (run) => ledger.push(run),
    onMemory: (run) => run.state !== "succeeded" && memory.push(`${run.stage}/${run.sceneId ?? ""}: ${run.log.join(" | ").slice(0, 160)}`),
  });
  runs.push(r);
  const secs = (Date.now() - at) / 1000;
  timings.push(Number(secs.toFixed(1)));
  const outcome = r.state === "succeeded" ? `OK ${r.used} → ${r.outputs.join(",")}` : `${r.state.toUpperCase()}${r.used ? ` via ${r.used}` : ""}`;
  console.log(
    `${String(input.stage).padEnd(14)} ${String(input.sceneId).padEnd(8)} ${outcome.padEnd(46)} ${secs.toFixed(1)}s  attempts: ${r.attempts.map((a) => a.toolId).join(">") || "none"}`,
  );
  for (const l of r.log) console.log(`    ${l}`);
}

// The receipt names the last file the rail actually produced. If the finishing pass was refused,
// the master is the pre-grade cut and the sheet says so — naming a graded file that does not exist
// would sign the receipt for bytes that were never written.
const master = ["film01-finish-scene01.mp4", "film01-subtitles-scene01.mp4"].find((f) => existsSync(f)) ?? "none";
const got = master === "none" ? 0 : readFileSync(master).byteLength;
const probe = got ? await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=width,height,codec_name", "-of", "default=noprint_wrappers=1", master], 30) : { stdout: "" };

/**
 * The run judges its own picture before anyone else does. qc-gate.mjs measures the master with
 * ffmpeg and writes qc.json beside it; the verdict travels into the run sheet so the rail can
 * print "not deliverable" in the platform's own words instead of a person deciding it looks fine.
 */
let qc = null;
if (got) {
  const q = await exec(process.execPath, [path.join(REPO, "scripts", "qc-gate.mjs"), path.join(runDir, master)], 900);
  for (const l of String(q.stdout).split(/\r?\n/).filter(Boolean)) console.log(`    ${l}`);
  if (existsSync(path.join(runDir, "qc.json"))) qc = JSON.parse(readFileSync(path.join(runDir, "qc.json"), "utf8"));
  else console.log(`    QC produced no sheet: ${String(q.stderr).slice(0, 200)}`);
}
const sheet = {
  run: stamp,
  project: PROJECT,
  plates: PLATES,
  stagesNamed: STAGES_THE_PIPELINE_NAMES,
  routed: Object.keys(routes),
  totalUsdSpent: totalSpend(runs),
  succeeded: runs.filter((r) => r.state === "succeeded").map((r) => `${r.stage}:${r.used}`),
  needsHuman: runs.filter((r) => r.state === "needs-human").map((r) => `${r.stage}:${r.used}`),
  refused: runs.filter((r) => r.state !== "succeeded" && r.state !== "needs-human").map((r) => `${r.stage}:${r.state}`),
  master: got ? { file: path.join(runDir, master), bytes: got, probe: probe.stdout.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean) } : null,
  // The gate table travels with the run, not beside it: a page that prints yesterday's verdict
  // against today's file is exactly the kind of number this rail stopped allowing.
  qc: qc ? { verdict: qc.summary.verdict, gates: qc.gates, summary: qc.summary, raw: qc.raw, tags: qc.tags, measured_at: qc.measured_at } : null,
  // The ranking the road printed before anything ran, kept with the run so an offer can be audited
  // against the file it produced. Refusals are recorded because a shortlist without them is marketing.
  road: {
    context: motionContext,
    bodyOnHand: machine,
    counted: road.counted,
    offers: road.offers.map((o) => ({
      id: o.engine.id,
      name: o.engine.name,
      spdx: o.engine.licence.spdx,
      quoteUsd: o.quoteUsd,
      quoteBasis: o.quoteBasis,
      quality: o.engine.board ? `${o.engine.board.name} ${o.engine.board.elo} (rank ${o.engine.board.rank}, ${o.engine.board.asOf})` : "no independent measurement on record",
      ceiling: o.engine.ceiling,
    })),
    refused: road.refused.map((x) => ({ name: x.engine.name, spdx: x.engine.licence.spdx, gate: x.gate, why: x.why })),
    escapes: escapes.map((x) => ({ name: x.engine.name, quoteUsd: x.quoteUsd, quoteBasis: x.quoteBasis, precondition: x.precondition })),
  },
  // Which engine the road would have picked versus which body was actually under the run. Where
  // those differ, the difference is the product: the platform's job is to close it, not hide it.
  mission: {
    asked: `${motionContext.seconds}s at ${motionContext.qualityEdge}px`,
    rankedFirst: road.offers[0]?.engine.name ?? "nothing on this body",
    actuallyUsed: runs.find((r) => r.stage === "motion" && r.state === "succeeded")?.used ?? null,
    spentUsd: totalSpend(runs),
  },
  // The page is drawn from these rows, not from a person remembering them. `tried` is the
  // fall-through chain the door actually walked; `note` is the tool's own last line, unedited.
  rows: runs.map((r, i) => ({
    stage: r.stage,
    scene: plan[i]?.sceneId ?? r.sceneId ?? "",
    task: r.task,
    state: r.state,
    used: r.used ?? null,
    tried: r.attempts.map((a) => a.toolId),
    outputs: r.outputs,
    seconds: timings[i],
    note: r.log.length ? r.log[r.log.length - 1] : "",
  })),
  memory,
};
writeFileSync(path.join(runDir, "run.json"), `${JSON.stringify(sheet, null, 2)}\n`);

console.log(`\nRESULT  succeeded ${sheet.succeeded.length}/${plan.length}  needs a human ${sheet.needsHuman.length}  refused/failed ${sheet.refused.length}  spent $${sheet.totalUsdSpent}`);
if (qc) {
  console.log(`QC      ${qc.summary.verdict.toUpperCase()} — ${qc.summary.passed}/${qc.summary.gates} gates passed`);
  for (const g of qc.gates.filter((x) => !x.pass)) console.log(`        RED  ${g.id.padEnd(13)} ${g.measured}  (want ${g.limit})`);
}
console.log(`MASTER  ${sheet.master ? `${master} ${(got / 1048576).toFixed(2)} MB` : "none produced"}`);
if (sheet.master) for (const l of sheet.master.probe) console.log(`        ${l}`);
console.log(`SHEET   ${path.join(runDir, "run.json")}`);
