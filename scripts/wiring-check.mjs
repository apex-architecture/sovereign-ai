/**
 * Proves every stage the pipeline names is wired to something that can actually run it.
 *
 * A ranked dictionary can offer a hundred engines for a stage and still leave the pipeline mute,
 * because the dictionary ranks and the driver table executes. This check reads the real driver
 * table and asks, stage by stage, whether a driver is present and whether that driver satisfies
 * the depth it declares. It fails on the first empty stage — that is the one to build next.
 */

import { buildDrivers, STAGES_THE_PIPELINE_NAMES, stageRoutes } from "../src/lib/apex/drivers/index.ts";
import { driverSatisfiesDepth } from "../src/lib/apex/drivers/contract.ts";

const drivers = buildDrivers({
  comfyGraphs: async () => null,
  replicate: { modelFor: () => "none", usdPerJob: () => Number.NaN },
});
const routes = stageRoutes(drivers);

let gaps = 0;
let unwired = 0;
console.log(`stages named by the pipeline: ${STAGES_THE_PIPELINE_NAMES.length}\n`);
for (const stage of STAGES_THE_PIPELINE_NAMES) {
  const wired = routes[stage] ?? [];
  if (wired.length === 0) {
    unwired += 1;
    console.log(`FAIL  ${stage.padEnd(15)} nothing is wired to this stage`);
    continue;
  }
  const broken = wired.filter((d) => !driverSatisfiesDepth(d));
  gaps += broken.length;
  const listed = wired.map((d) => `${d.toolId}:${d.depth}`).join(", ");
  console.log(`${broken.length ? "FAIL" : "PASS"}  ${stage.padEnd(15)} ${listed}${broken.length ? `  (declares a depth it cannot satisfy: ${broken.map((d) => d.toolId).join(", ")})` : ""}`);
}

const covered = STAGES_THE_PIPELINE_NAMES.length - unwired;
console.log(`\n${covered} of ${STAGES_THE_PIPELINE_NAMES.length} stages wired; ${gaps} driver(s) overstate their depth.`);
if (unwired || gaps) process.exit(1);
console.log("PASS  every stage the pipeline names has a driver that can run it");
