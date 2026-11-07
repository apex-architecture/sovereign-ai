/**
 * Proves the publish stage is wired to a body that runs, not only to a portal.
 *
 * The last mile used to be a YouTube tab: honest, but a link is not a delivery. This check asks the
 * real route table which driver serves publish, probes it, packages a finished master with it, and
 * reads the receipt back — duration, audio in the master, HLS segment count, one sha256 per artefact.
 * It fails when the stage is unwired, when the tool is missing, or when a package comes back short.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { deliveryDriver } from "../src/lib/apex/drivers/delivery.ts";
import { stageRoutes } from "../src/lib/apex/drivers/index.ts";

const SOURCE = process.argv[2] ?? "runs/2026-11-02T10-10/film01-finish-scene01.mp4";

const routes = stageRoutes([deliveryDriver]);
const served = routes.publish ?? [];
console.log(`route table: publish -> ${served.map((d) => d.toolId).join(", ") || "(nothing)"}`);
if (served.length === 0) {
  console.log("FAIL  publish has no driver, so a finished film can never leave the machine");
  process.exit(1);
}

const driver = served[0];
const probe = await driver.probe();
console.log(`${probe.ok ? "PASS" : "FAIL"}  probe: ${probe.why}`);
if (!probe.ok) process.exit(1);

if (!existsSync(SOURCE)) {
  console.log(`FAIL  no finished master at ${SOURCE} — this check packages a real film, not a fixture`);
  process.exit(1);
}

const result = await driver.run({
  task: "deliver",
  inputs: [SOURCE],
  timeoutSeconds: 600,
  budgetUsd: 0,
  projectId: "publish-check",
  sceneId: "scene-001",
  stage: "publish",
});

console.log(`state: ${result.state} in ${result.wallClockSeconds}s, $${result.usdSpent}`);
console.log(`output: ${result.outputs.join(", ") || "(none)"}`);
console.log(`log: ${result.log}`);
if (result.state !== "succeeded") {
  console.log("FAIL  the publish stage produced no deliverable");
  process.exit(1);
}

const [master, playlist, receiptPath] = result.outputs;
for (const file of [master, playlist, receiptPath]) {
  console.log(`${existsSync(file) ? "PASS" : "FAIL"}  exists ${file} (${existsSync(file) ? statSync(file).size : 0} bytes)`);
  if (!existsSync(file)) process.exit(1);
}

const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
const hlsDir = path.dirname(playlist);
const segments = readdirSync(hlsDir).filter((f) => f.endsWith(".ts"));
const hash = createHash("sha256").update(readFileSync(master)).digest("hex");

const checks = [
  ["the receipt names the source film", receipt.source?.path === SOURCE],
  ["the packaged master is as long as the film that went in", Math.abs(receipt.master.seconds - receipt.source.seconds) < 0.25],
  ["the master kept the sound", receipt.master.audio === receipt.source.audio],
  ["the receipt carries a 64-hex sha256", /^[0-9a-f]{64}$/.test(receipt.master.sha256)],
  ["that hash is the hash of the file on disk", receipt.master.sha256 === hash],
  ["HLS was cut into more than one segment", segments.length >= 2 && receipt.hls.segments === segments.length],
  ["the receipt states that nothing was uploaded", /Not uploaded/i.test(receipt.note)],
];
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);

console.log(
  `\n${receipt.source.seconds}s in -> ${receipt.master.seconds}s out, ${segments.length} HLS segments, ` +
    `${(receipt.master.bytes / 1048576).toFixed(1)} MB, 0 accounts, $${result.usdSpent}`,
);
console.log("PASS  publish is wired and a finished film leaves the machine as a deliverable");
