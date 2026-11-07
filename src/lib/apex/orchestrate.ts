/**
 * The one door. Everything a creator does goes through runStage(), whatever tool
 * is underneath it — that is what makes this a platform instead of a folder of links.
 *
 * Behaviour fixed here: licence gate first, reachability probe second, then the tool,
 * then the next candidate on failure. A stage with no driver is reported as a gap,
 * never silently skipped and never reported as done.
 */

import type { JobInput, JobResult, ToolDriver } from "./drivers/contract.ts";
import { DEPTH_LABEL, driverSatisfiesDepth, gateOnLicence } from "./drivers/contract.ts";

export interface Attempt {
  toolId: string;
  depth: ToolDriver["depth"];
  outcome: JobResult | string;
}

export interface StageRun {
  stage: string;
  state: "succeeded" | "failed" | "needs-human" | "no-driver";
  /** The tool that actually produced the artefact, if any. */
  used: string | null;
  attempts: Attempt[];
  usdSpent: number;
  wallClockSeconds: number;
  outputs: string[];
  /** Verbatim lines from the tools, for Creative Memory. */
  log: string[];
}

export interface RunHooks {
  /** Ledger write — called for every finished stage run, success or not. */
  onLedger?: (run: StageRun) => void;
  /** Memory write — failed attempts are the most valuable rows in the whole system. */
  onMemory?: (run: StageRun) => void;
}

export async function runStage(
  drivers: ToolDriver[],
  input: JobInput,
  intent: "personal" | "client-work" | "redistribute",
  hooks: RunHooks = {},
): Promise<StageRun> {
  const run: StageRun = {
    stage: input.stage,
    state: "no-driver",
    used: null,
    attempts: [],
    usdSpent: 0,
    wallClockSeconds: 0,
    outputs: [],
    log: [],
  };

  if (drivers.length === 0) {
    finish(run, hooks);
    return run;
  }

  for (const driver of drivers) {
    if (!driverSatisfiesDepth(driver)) {
      run.log.push(`${driver.toolId} declares ${DEPTH_LABEL[driver.depth]} but has no matching implementation`);
      continue;
    }

    const blocked = gateOnLicence(driver, intent);
    if (blocked) {
      run.attempts.push({ toolId: driver.toolId, depth: driver.depth, outcome: "blocked-by-licence" });
      run.log.push(blocked.log);
      continue;
    }

    if (driver.depth === "portal-only") {
      run.attempts.push({ toolId: driver.toolId, depth: "portal-only", outcome: driver.portalUrl?.(input) ?? "" });
      run.log.push(`${driver.toolId} is portal-only — a human publishes, APEX records the result`);
      continue;
    }

    const reach = await driver.probe();
    if (!reach.ok) {
      run.attempts.push({ toolId: driver.toolId, depth: driver.depth, outcome: "probed-unreachable" });
      run.log.push(`${driver.toolId} unreachable: ${reach.why}`);
      continue;
    }

    if (driver.depth === "file-exchange" || !driver.run) {
      const hand = await driver.handoff?.(input);
      run.attempts.push({ toolId: driver.toolId, depth: driver.depth, outcome: "handoff-issued" });
      run.state = "needs-human";
      run.used = driver.toolId;
      run.log.push(hand?.instructions ?? `${driver.toolId}: no handoff produced`);
      continue;
    }

    const result = await driver.run(input);
    run.attempts.push({ toolId: driver.toolId, depth: driver.depth, outcome: result });
    run.usdSpent += result.usdSpent;
    run.wallClockSeconds += result.wallClockSeconds;
    if (result.log) run.log.push(`${driver.toolId}: ${result.log}`);

    if (result.state === "succeeded") {
      run.state = "succeeded";
      run.used = driver.toolId;
      run.outputs = result.outputs;
      break;
    }
  }

  if (run.state === "no-driver" && run.attempts.length > 0) run.state = "failed";
  finish(run, hooks);
  return run;
}

/** Which stages of the film have no reachable tool at all — the real build backlog. */
export function uncoveredStages(routes: Record<string, ToolDriver[]>): string[] {
  return Object.entries(routes)
    .filter(([, drivers]) => drivers.length === 0)
    .map(([stage]) => stage);
}

/** Drivers that claim more than they implement, found before a creator meets them. */
export function misdeclaredDrivers(drivers: ToolDriver[]): string[] {
  return drivers.filter((d) => !driverSatisfiesDepth(d)).map((d) => `${d.toolId} (${d.depth})`);
}

export function totalSpend(runs: StageRun[]): number {
  return Math.round(runs.reduce((s, r) => s + r.usdSpent, 0) * 100) / 100;
}

export function needsHuman(runs: StageRun[]): StageRun[] {
  return runs.filter((r) => r.state === "needs-human");
}

function finish(run: StageRun, hooks: RunHooks): void {
  hooks.onLedger?.(run);
  hooks.onMemory?.(run);
}
