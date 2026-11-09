/**
 * The Foreman — the resident agent that builds the platform, runs it, and tells the creator
 * what happens next.
 *
 * Three duties, in this order, because a builder that cannot measure is a source of bugs:
 *  1. AUDIT every stage through the real driver probes, so the report is what the machine says
 *     about itself right now, not what a document said last week.
 *  2. REPAIR the gaps that have a deterministic fix, then verify by re-probing — an action that
 *     cannot be re-measured is not offered as a fix, it is recorded as a question.
 *  3. BRIEF the creator in one plain sentence, sized to what only they can do.
 *
 * Two laws are hard-coded, not advised:
 *  - the Foreman never takes the screen. It has no path to foreground input; the desktop driver
 *    it uses refuses those commands before they reach the binary.
 *  - the Foreman never signs a licence. `licenseVerified` is a human statement, so an owner-only
 *    gap stays owner-only and is reported as such, even when that leaves a stage dead.
 */

import { appendFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ToolDriver } from "./drivers/contract.ts";
import { gateOnLicence } from "./drivers/contract.ts";
import { misdeclaredDrivers } from "./orchestrate.ts";

export interface StageAuditRow {
  stage: string;
  /** Answers the probe AND clears the licence gate for the stated intent — with the evidence. */
  up: { toolId: string; why: string }[];
  /** Answers the probe but is stopped by the licence gate — reachable is not the same as admitted. */
  gated: { toolId: string; why: string }[];
  down: { toolId: string; why: string }[];
  state: "reachable" | "licence-gated" | "dead-ended";
}

export interface Audit {
  at: string;
  drivers: number;
  rows: StageAuditRow[];
  reachable: string[];
  dead: string[];
  misdeclared: string[];
}

export interface Action {
  id: string;
  title: string;
  /** "agent" = the Foreman may attempt it; "owner" = only Master can, and it is asked, not done. */
  kind: "agent" | "owner";
  /** What it costs in seconds of wall clock, so a tick can stay inside its budget. */
  seconds: number;
  run: () => Promise<{ pass: boolean; evidence: string }>;
}

export interface TickResult {
  at: string;
  audit: Audit;
  acted: { id: string; title: string; pass: boolean; evidence: string }[];
  /** One sentence the creator can act on — the guiding half of the job. */
  briefing: string;
  next: string;
}

const SPINE_ORDER = ["story", "script", "shotlist", "storyboard", "character_lock", "motion", "dialogue", "music", "sound", "subtitles", "edit", "finish", "publish"];

export async function audit(drivers: ToolDriver[], routes: Record<string, ToolDriver[]>, intent: "personal" | "client-work" | "redistribute" = "personal"): Promise<Audit> {
  const rows: StageAuditRow[] = [];
  for (const stage of SPINE_ORDER) {
    const up: { toolId: string; why: string }[] = [];
    const gated: { toolId: string; why: string }[] = [];
    const down: { toolId: string; why: string }[] = [];
    for (const driver of routes[stage] ?? []) {
      const r = await driver.probe();
      if (!r.ok) {
        down.push({ toolId: driver.toolId, why: r.why });
        continue;
      }
      const block = gateOnLicence(driver, intent);
      if (block) gated.push({ toolId: driver.toolId, why: block.log });
      else up.push({ toolId: driver.toolId, why: r.why });
    }
    const state = up.length > 0 ? "reachable" : gated.length > 0 ? "licence-gated" : "dead-ended";
    rows.push({ stage, up, gated, down, state });
  }
  const reachable = rows.filter((r) => r.state === "reachable").map((r) => r.stage);
  return {
    at: new Date().toISOString(),
    drivers: drivers.length,
    rows,
    reachable,
    dead: rows.filter((r) => r.state !== "reachable").map((r) => r.stage),
    misdeclared: misdeclaredDrivers(drivers),
  };
}

/** What the dead stage costs the film, phrased the way a creator would act on it. */
const GAP_MEANING: Record<string, string> = {
  story: "nothing turns your sentence into a premise",
  script: "nothing turns a premise into scenes",
  shotlist: "nothing turns scenes into shots",
  music: "no score engine is reachable",
  dialogue: "no voice is reachable",
};

export function briefing(a: Audit): { sentence: string; next: string } {
  const gated = a.rows.filter((r) => r.state === "licence-gated");
  const dead = a.rows.filter((r) => r.state === "dead-ended");
  if (dead.length === 0 && gated.length === 0 && a.misdeclared.length === 0) {
    return { sentence: `Every one of the ${a.rows.length} spine stages has a live engine (${a.reachable.join(", ")}). The road is walkable end to end.`, next: "run the full spine on one idea" };
  }
  const blockersOf = (r: StageAuditRow) => [...r.down.map((d) => `${d.toolId}: ${d.why}`), ...r.gated.map((g) => `${g.toolId} answers but is licence-gated — a human must read its terms`)];
  const first = dead[0] ?? gated[0];
  const why = first ? GAP_MEANING[first.stage] ?? "no engine answers its probe" : "";
  const gateNote = gated.length > 0 ? ` ${gated.length} stage(s) have a live engine that only a human licence read can admit (${gated.map((g) => g.stage).join(", ")}).` : "";
  return {
    sentence: `${a.reachable.length} of ${a.rows.length} spine stages run today${dead.length > 0 ? `. The earliest hole is "${first?.stage}" — ${why}.` : "."}${gateNote}`,
    next: first ? blockersOf(first).join(" | ") : "licence reads",
  };
}

/**
 * The deterministic repair library. Each entry is a real operation with a re-measurable
 * success test — the Foreman is not allowed to call a patch "done" on the strength of having
 * written it.
 */
export function buildActions(deps: { repoRoot: string; drivers: ToolDriver[]; routes: Record<string, ToolDriver[]>; run: (cmd: string, sec: number) => Promise<{ code: number; out: string }> }): Record<string, Action> {
  const node = (args: string, sec: number) => deps.run(`node --experimental-strip-types ${args}`, sec);

  return {
    "refresh-availability": {
      id: "refresh-availability",
      title: "Refresh the engine availability probe so the pages stop printing a stale timestamp",
      kind: "agent",
      seconds: 90,
      run: async () => {
        const r = await node(`${path.join(deps.repoRoot, "scripts/availability.mjs")}`, 90);
        return { pass: r.code === 0, evidence: r.out.slice(-300) };
      },
    },
    "audit-spine": {
      id: "audit-spine",
      title: "Re-probe all thirteen stages and write the measured state the guide surface reads",
      kind: "agent",
      seconds: 60,
      run: async () => {
        const a = await audit(deps.drivers, deps.routes);
        return { pass: a.rows.length === 13, evidence: `${a.reachable.length}/13 reachable · dead: ${a.dead.join(", ") || "none"}` };
      },
    },
    "licence-read": {
      id: "licence-read",
      title: "Human read of the licences that gate client work (0 of 1,109 cleared)",
      kind: "owner",
      seconds: 0,
      run: async () => ({ pass: false, evidence: "owner-only: licenseVerified is a human statement; the Foreman cannot sign it" }),
    },
    "install-blender": {
      id: "install-blender",
      title: "Install Blender so the storyboard/motion fallback stops failing with ENOENT",
      kind: "owner",
      seconds: 0,
      run: async () => ({ pass: false, evidence: "owner-only: needs your consent to download an installer" }),
    },
  };
}

/**
 * One pass of the agent: measure, repair what it may repair inside its time budget, re-measure,
 * and write what the guide surface will show. An owner-only gap is never attempted silently —
 * it comes back in `next` as the thing only Master can decide.
 */
export async function tick(
  deps: { repoRoot: string; drivers: ToolDriver[]; routes: Record<string, ToolDriver[]>; run: (cmd: string, sec: number) => Promise<{ code: number; out: string }> },
  budgetSeconds = 120,
): Promise<TickResult> {
  const before = await audit(deps.drivers, deps.routes);
  const actions = buildActions(deps);
  const acted: TickResult["acted"] = [];
  let spent = 0;

  for (const stage of before.dead) {
    const candidate = Object.values(actions).find((a) => a.title.toLowerCase().includes(stage) || a.id.includes(stage));
    const general = actions["refresh-availability"];
    const action = candidate ?? general;
    if (!action || action.kind !== "agent") continue;
    if (spent + action.seconds > budgetSeconds) {
      acted.push({ id: action.id, title: action.title, pass: false, evidence: `skipped: ${budgetSeconds}s tick budget already spent` });
      break;
    }
    spent += action.seconds;
    const result = await action.run();
    acted.push({ id: action.id, title: action.title, pass: result.pass, evidence: result.evidence });
  }

  const after = await audit(deps.drivers, deps.routes);
  const brief = briefing(after);
  const ownerGaps = Object.values(actions).filter((a) => a.kind === "owner");
  const tickResult: TickResult = {
    at: after.at,
    audit: after,
    acted,
    briefing: brief.sentence + (acted.length === 0 ? " Nothing was agent-repairable this pass." : ""),
    next: brief.next || `owner decision: ${ownerGaps.map((g) => g.title).join(" · ")}`,
  };
  appendTick(deps.repoRoot, tickResult);
  // The before/after pair is the only honest proof a repair did anything; keep it in the journal line.
  if (before.reachable.length !== after.reachable.length) {
    appendFileSync(path.join(journalDir(deps.repoRoot), "ticks.jsonl"), JSON.stringify({ at: after.at, delta: `${before.reachable.length}→${after.reachable.length} reachable`, acted: acted.map((a) => a.id) }) + "\n", "utf8");
  }
  return tickResult;
}

export function journalDir(repoRoot: string): string {
  const d = path.join(repoRoot, ".apex-foreman");
  mkdirSync(d, { recursive: true });
  return d;
}

export function appendTick(repoRoot: string, tick: TickResult): void {
  const d = journalDir(repoRoot);
  appendFileSync(path.join(d, "ticks.jsonl"), JSON.stringify(tick) + "\n", "utf8");
  // Written through a temp name so a reader on the rail never sees a half-written latest.json.
  const latest = path.join(d, "latest.json");
  writeFileSync(`${latest}.tmp`, JSON.stringify(tick, null, 1), "utf8");
  renameSync(`${latest}.tmp`, latest);
}
