/**
 * agent.mjs — the resident body. Runs forever, does three things per tick:
 * protect (guard), improve (backlog), and remember (ledger). Nothing is decided in prose.
 *
 *   node agent/agent.mjs --once          one tick, printed, exit 0/1
 *   node agent/agent.mjs --loop          stay alive; APEX_AGENT_INTERVAL_S between ticks
 *   node agent/agent.mjs --once --think  ask the local open-weights model for the next move
 *
 * Write scope, stated so it can be audited: it regenerates the site's own numbers and
 * syncs the repo copy to the workspace copy. It does not push, publish, spend money, or
 * send anything to a third party. A git commit only happens when APEX_AGENT_COMMIT=1,
 * and even then it stays local.
 */

import { copyFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildBacklog, regenerateData, workspaceDrift } from "./backlog.mjs";
import { ROOT, STATE, elapsed, readJson, record, sh, writeJson } from "./lib.mjs";
import { runGuard } from "./guard.mjs";

const INTERVAL_S = Number(process.env.APEX_AGENT_INTERVAL_S || 900);

export async function tick({ think = false } = {}) {
  const started = Date.now();
  const guard = await runGuard();
  const backlog = await buildBacklog();
  let thought = null;
  if (think) {
    const brain = await import("./brain.mjs");
    thought = await brain.thinkAbout(backlog);
  }
  const prev = readJson(STATE, { ticks: 0, history: [] });
  const state = { ...prev };
  state.ticks = prev.ticks + 1;
  state.lastTick = new Date().toISOString();
  state.lastGuard = { ok: guard.ok, failing: guard.failing };
  state.openTasks = backlog.tasks.map((t) => t.id);
  state.thought = thought?.ok ? thought.text.slice(0, 500) : thought?.why ?? null;
  state.history = [...(prev.history ?? []), { at: state.lastTick, ok: guard.ok, failing: guard.failing, s: elapsed(started) }].slice(-96);
  writeJson(STATE, state);

  const line = { ticks: state.ticks, wallClockSeconds: elapsed(started), guard: guard.ok ? "PASS" : `FAIL ${guard.failing.join(" ")}`, tasks: backlog.tasks.length, agentTasks: backlog.tasks.filter((t) => t.doable).map((t) => t.id), ownerTasks: backlog.tasks.filter((t) => !t.doable).map((t) => t.id), thought: state.thought };
  record("tick", line);
  return { line, guard, backlog, thought };
}

/** Keep the published numbers equal to the measured ones, then mirror repo -> workspace. */
export async function selfImprove() {
  const made = [];
  const data = await regenerateData();
  if (data.ok) made.push("regenerated data.generated.js");
  const drift = workspaceDrift();
  const ws = path.join(ROOT, "film-verse-site");
  if (drift.drift && existsSync(ws)) {
    for (const f of readdirSync(path.join(ROOT, "verse-site"))) {
      copyFileSync(path.join(ROOT, "verse-site", f), path.join(ws, f));
    }
    made.push(`synced ${drift.differs.length} files repo -> workspace`);
  }
  if (made.length && process.env.APEX_AGENT_COMMIT === "1") {
    await sh("git", ["add", "verse-site", "film-verse-site"]);
    await sh("git", ["commit", "-m", `agent: keep the rail's numbers measured (${made.join("; ")})`]);
    made.push("committed locally (never pushed)");
  }
  return made;
}

async function main() {
  const args = process.argv.slice(2);
  const once = args.includes("--once") || !args.includes("--loop");
  const think = args.includes("--think");
  const improve = args.includes("--improve");

  const { line, guard } = await tick({ think });
  if (improve) console.log("improve:", (await selfImprove()).join(" | ") || "nothing to sync");
  console.log(JSON.stringify(line, null, 1));
  if (once) process.exit(guard.ok ? 0 : 1);

  for (;;) {
    await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
    const next = await tick({ think });
    console.log(next.line.at, next.line.guard, `${next.line.wallClockSeconds}s`, "| agent:", next.line.agentTasks.join(","), "| owner:", next.line.ownerTasks.join(","));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
