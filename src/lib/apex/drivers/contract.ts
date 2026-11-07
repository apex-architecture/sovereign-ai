/**
 * Tool Drivers — the difference between a catalogue and a platform.
 *
 * Every tool APEX claims to "connect" implements this contract. The contract is the
 * connection; the registry row is only the phone number. A tool that cannot satisfy its
 * declared depth is reported as a gap, never quietly downgraded to "integrated".
 */

import type { TechRecord } from "../schema.ts";
import { LICENCE_CLEARANCES } from "../licence-clearances.ts";

/** How far APEX can reach into a tool, stated honestly per tool. */
export type Depth = "drivable" | "file-exchange" | "portal-only";

export const DEPTH_LABEL: Record<Depth, string> = {
  drivable: "APEX launches it and reads the result — no human hands",
  "file-exchange": "APEX prepares inputs and ingests outputs; a human operates the app",
  "portal-only": "APEX can link and record, not operate",
};

export interface JobInput {
  /** Free-form task the pipeline asked for — a prompt, a clip path, a mix request. */
  task: string;
  /** Files already produced upstream, addressed by path or storage key. */
  inputs: string[];
  /** Model/weights/voice/preset this particular attempt should use. */
  variant?: string;
  /** Wall-clock ceiling. A hung job must not hold the pipeline. */
  timeoutSeconds: number;
  /** Spend cap for a paid call; 0 means local-only. */
  budgetUsd: number;
  projectId: string;
  sceneId: string;
  stage: string;
}

export type JobState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked-by-licence"
  | "blocked-by-guard"
  | "timed-out";

export interface JobResult {
  state: JobState;
  outputs: string[];
  /** Seconds of machine time actually consumed. */
  wallClockSeconds: number;
  usdSpent: number;
  /** Enough to re-run the identical job later — model, seed, flags, resolution. */
  reproducible: Record<string, unknown>;
  /** The tool's own words on failure, kept verbatim for memory. */
  log: string;
}

export interface ToolDriver {
  toolId: string;
  depth: Depth;
  record: TechRecord;
  /** The machine this driver can actually reach from. "any" = remote service. */
  runsOn: "any" | "creator-machine" | "apex-server";
  /** Cheap, synchronous check before queueing real work: is the tool even reachable? */
  probe(): Promise<{ ok: boolean; why: string }>;
  /** Only present at drivable depth. */
  run?(input: JobInput): Promise<JobResult>;
  /** Only present at file-exchange depth — the handoff APEX builds for the human. */
  handoff?(input: JobInput): Promise<{ instructions: string; files: string[] }>;
  /** Only present at portal-only depth. */
  portalUrl?(input: JobInput): string;
}

/** A driver is only as good as the depth it declares — checked, not assumed. */
export function driverSatisfiesDepth(driver: ToolDriver): boolean {
  switch (driver.depth) {
    case "drivable":
      return typeof driver.run === "function" && typeof driver.probe === "function";
    case "file-exchange":
      return typeof driver.handoff === "function";
    case "portal-only":
      return typeof driver.portalUrl === "function";
  }
}

/**
 * Licence gate, applied at the moment of use rather than in a spreadsheet review.
 * A driver never runs against terms no one has established.
 *
 * Two ways in, deliberately unequal:
 *  - a human read the record (licenseVerified) — the only way to client work or redistribution;
 *  - the licence text itself was fetched, matched to the words it must contain, and hashed into
 *    licence-clearances.json — which opens personal use only. An attestation can never set
 *    clientWork or redistribute; scripts cannot sign.
 */
export function gateOnLicence(driver: ToolDriver, intent: "personal" | "client-work" | "redistribute"): JobResult | null {
  const r = driver.record;
  const c = clearances().clearances?.[driver.toolId];
  const humanRead = r.licenseVerified === true;
  const attestedForPersonalUse = intent === "personal" && c?.personalUse === true;
  const admitted = humanRead || attestedForPersonalUse;
  const paidBlock = intent !== "personal" && r.commercialUse !== "yes";
  const distBlock = intent === "redistribute" && r.redistribution !== "yes";
  if (admitted && !paidBlock && !distBlock) return null;
  const why = !admitted
    ? `licence for ${r.name} has not been read by a human and no fetched licence text attests it for ${intent} use`
    : distBlock
      ? `${r.name} does not permit redistribution`
      : `${r.name} is not cleared for commercial use`;
  const evidence = attestedForPersonalUse ? "" : c ? ` (attested ${c.spdx} at ${c.retrievedAt}, sha256 ${String(c.sha256).slice(0, 12)}… covers personal use only)` : "";
  return {
    state: "blocked-by-licence",
    outputs: [],
    wallClockSeconds: 0,
    usdSpent: 0,
    reproducible: {},
    log: `${why}${evidence}`,
  };
}

function clearances() {
  return LICENCE_CLEARANCES;
}
