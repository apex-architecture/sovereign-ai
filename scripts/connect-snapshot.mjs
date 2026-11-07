/**
 * Freeze the engine room's probe into the published site.
 *
 *   node --experimental-strip-types scripts/connect-snapshot.mjs
 *
 * The published site has no engine room behind it — there is no driver, no ffmpeg, no ComfyUI on a
 * public web host. But the probe is a fact about the creator's machine, and a fact worth keeping:
 * which tools answered, what they said, and where each one lives. So the last measured probe is
 * written to verse-site/connect.generated.js and the Connect grid falls back to it.
 *
 * Nothing here is invented. Every row is the driver's own record plus the result of its own probe.
 */
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { siteDir } from "./site-dir.mjs";
import { pathToFileURL } from "node:url";

const { buildDrivers, stageRoutes } = await import(pathToFileURL(path.resolve("src/lib/apex/drivers/index.ts")).href);
const { gateOnLicence } = await import(pathToFileURL(path.resolve("src/lib/apex/drivers/contract.ts")).href);

const drivers = buildDrivers({
  comfyGraphs: async () => null,
  replicate: { modelFor: () => "", usdPerJob: () => Number.NaN },
});

const routes = stageRoutes(drivers);
const stageOf = {};
for (const [stage, list] of Object.entries(routes)) for (const d of list) (stageOf[d.toolId] ??= []).push(stage);

const rows = [];
for (const d of drivers) {
  let probe = { ok: false, why: "not probed" };
  try {
    probe = await d.probe();
  } catch (e) {
    probe = { ok: false, why: String(e?.message ?? e).slice(0, 180) };
  }
  rows.push({
    toolId: d.toolId,
    name: d.record.name,
    depth: d.depth,
    stages: stageOf[d.toolId] ?? [],
    ok: probe.ok === true,
    why: String(probe.why ?? "").slice(0, 220),
    cost: d.record.cost,
    licence: String(d.record.license ?? "").slice(0, 140),
    licenceVerified: d.record.licenseVerified === true,
    gated: gateOnLicence(d, "personal") !== null,
    url: d.record.officialUrl || d.record.sourceRepository || "",
    runnable: d.depth === "drivable" && typeof d.run === "function",
  });
}

const body = { at: new Date().toISOString(), snapshot: true, drivers: rows };
const out = path.join(siteDir(), "connect.generated.js");
writeFileSync(out, `window.APEX_DRIVERS=${JSON.stringify(body)};\n`);

const up = rows.filter((r) => r.ok).length;
console.log(`ok    connect.generated.js          ${rows.length} tools, ${up} answered on this machine`);
if (!existsSync(out)) process.exit(1);
