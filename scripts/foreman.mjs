#!/usr/bin/env node
/**
 * The Foreman as an executable — so the platform can be built by the platform, not by a chat.
 *
 *   node scripts/foreman.mjs audit          what the drivers say about themselves right now
 *   node scripts/foreman.mjs tick           one measure → repair → re-measure pass
 *   node scripts/foreman.mjs watch --every 600   keep ticking; the journal is what the guide reads
 *
 * Nothing here opens a window, takes focus, or spends money. A tick that cannot be re-measured
 * is reported as an owner question, never as work done.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const here = (p) => path.join(ROOT, p);
/** On Windows a bare absolute path is read as a URL scheme, so every dynamic import is a file URL. */
const load = (p) => import(pathToFileURL(here(p)).href);

const { buildDrivers, stageRoutes } = await load("src/lib/apex/drivers/index.ts");
const { audit, tick, briefing } = await load("src/lib/apex/foreman.ts");

function runShell(cmd, timeoutSeconds) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, cwd: ROOT, windowsHide: true });
    let out = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      out += "\n[timed out]";
    }, timeoutSeconds * 1000);
    child.stdout?.on("data", (b) => (out += b.toString()));
    child.stderr?.on("data", (b) => (out += b.toString()));
    child.on("close", (code) => {
      clearTimeout(killer);
      resolve({ code: code ?? -1, out });
    });
  });
}

const drivers = buildDrivers({
  comfyGraphs: async () => null,
  replicate: { modelFor: () => "wan-video/wan-2.1-t2v", usdPerJob: () => 0.3 },
});
const routes = stageRoutes(drivers);
const deps = { repoRoot: ROOT, drivers, routes, run: runShell };

const mode = process.argv[2] ?? "audit";

if (mode === "audit") {
  const intentIndex = process.argv.indexOf("--intent");
  const intent = intentIndex > -1 ? process.argv[intentIndex + 1] : "personal";
  const a = await audit(drivers, routes, intent);
  for (const r of a.rows) {
    const reach = r.state === "reachable" ? "RUNS      " : r.state === "licence-gated" ? "GATED     " : "DEAD      ";
    console.log(`${reach} ${r.stage.padEnd(14)} up=[${r.up.join(", ")}] gated=[${r.gated.map((g) => g.toolId).join(", ")}] down=[${r.down.map((d) => d.toolId).join(", ")}]`);
  }
  console.log(`\n${a.reachable.length}/${a.rows.length} stages run for ${intent} use · not running: ${a.dead.join(", ") || "none"}`);
  console.log(`misdeclared drivers: ${a.misdeclared.join(", ") || "none"}`);
  console.log(`briefing: ${briefing(a).sentence}`);
  console.log(`next:     ${briefing(a).next}`);
  process.exit(0);
}

if (mode === "tick" || mode === "watch") {
  const everyIndex = process.argv.indexOf("--every");
  const everySeconds = everyIndex > -1 ? Number(process.argv[everyIndex + 1]) : 600;
  for (;;) {
    const t = await tick(deps);
    console.log(`[${t.at}] ${t.briefing}`);
    for (const a of t.acted) console.log(`   ${a.pass ? "did" : "not"} · ${a.id} · ${a.evidence.replace(/\s+/g, " ").slice(0, 160)}`);
    console.log(`   next: ${t.next}`);
    if (mode !== "watch") break;
    await new Promise((r) => setTimeout(r, Math.max(60, everySeconds) * 1000));
  }
  process.exit(0);
}

console.log(`unknown mode "${mode}" — use audit | tick | watch --every <seconds>`);
process.exit(2);
