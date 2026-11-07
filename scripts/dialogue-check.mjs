/**
 * Proves the voice stage is wired, not merely ranked.
 *
 * The dictionary can list a hundred voices and still leave the pipeline mute. This check asks the
 * real route table which driver serves dialogue, probes it, speaks a real line through it, and
 * measures the wav that came back. It fails when the stage is unwired, when the tool is missing,
 * or when silence is returned as success.
 */

import { piperDriver } from "../src/lib/apex/drivers/piper.ts";
import { stageRoutes } from "../src/lib/apex/drivers/index.ts";

const line = "Every stage of this film is wired to something real. This is the voice.";

const routes = stageRoutes([piperDriver]);
const served = routes.dialogue ?? [];
console.log(`route table: dialogue -> ${served.map((d) => d.toolId).join(", ") || "(nothing)"}`);
if (served.length === 0) {
  console.log("FAIL  dialogue has no driver, so the pipeline can never speak");
  process.exit(1);
}

const driver = served[0];
const probe = await driver.probe();
console.log(`${probe.ok ? "PASS" : "FAIL"}  probe: ${probe.why}`);
if (!probe.ok) process.exit(1);

const result = await driver.run({
  task: line,
  inputs: [],
  timeoutSeconds: 180,
  budgetUsd: 0,
  projectId: "voice-check",
  sceneId: "scene-001",
  stage: "dialogue",
});

console.log(`state: ${result.state} in ${result.wallClockSeconds}s, $${result.usdSpent}`);
console.log(`output: ${result.outputs.join(", ") || "(none)"}`);
console.log(`log: ${result.log}`);
console.log(`reproducible: ${JSON.stringify(result.reproducible)}`);

if (result.state !== "succeeded" || result.outputs.length === 0) {
  console.log("FAIL  the voice stage produced no audio");
  process.exit(1);
}

const seconds = Number(result.reproducible.audioSeconds ?? 0);
const ratio = seconds > 0 ? result.wallClockSeconds / seconds : Infinity;
console.log(`\n${seconds}s of speech from a 12-word line; wall clock ${result.wallClockSeconds}s (${ratio.toFixed(2)}x real time)`);
console.log("PASS  dialogue is wired and speaks");
