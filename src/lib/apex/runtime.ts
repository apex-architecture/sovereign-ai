/**
 * The runtime that makes the driver table real.
 *
 * drivers/index.ts can build ten drivers and orchestrate.ts can gate them perfectly, but
 * until something calls buildDrivers() the platform has a map and no vehicle. This is that
 * something: it reads the operator's environment, assembles the drivers, and hands a stage
 * to the one door. Server-only — the drivers it builds touch child_process and live keys.
 */

import type { JobInput } from "./drivers/contract.ts";
import { buildDrivers, stageRoutes, type DriverConfig } from "./drivers/index.ts";
import type { ToolDriver } from "./drivers/contract.ts";
import { runStage, type StageRun, type RunHooks } from "./orchestrate.ts";

/**
 * Prices a human has verified, in USD per job.
 *
 * Deliberately empty. Every figure that has ever appeared here was a guess dressed as a
 * price, and the doctrine is that an unpriced tool makes a quote unquotable rather than
 * free. Fill this from the operator's own Replicate bill, per model, and nothing else.
 */
export const VERIFIED_PRICES_USD: Record<string, number> = {};

/** Which hosted model serves a stage. Overridable so the operator can move without a deploy. */
const MODEL_BY_STAGE: Record<string, string> = {
  motion: "minimax/video-01",
  storyboard: "black-forest-labs/flux-dev",
  dialogue: "fishaudio/fish-speech-1.5",
};

function usdCap(): number {
  const raw = process.env.APEX_JOB_CAP_USD;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function timeoutSeconds(): number {
  const n = Number(process.env.APEX_JOB_TIMEOUT_S ?? 900);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 3600) : 900;
}

export function driverConfig(): DriverConfig {
  return {
    // No Comfy graph is stored in the project yet, so the driver must say so rather than
    // invent one — the connection table already advertises "none stored yet".
    comfyGraphs: async () => null,
    replicate: {
      modelFor: (input) => process.env[`APEX_MODEL_${input.stage.toUpperCase()}`] ?? MODEL_BY_STAGE[input.stage] ?? `unmapped:${input.stage}`,
      usdPerJob: (model) => VERIFIED_PRICES_USD[model] ?? Number.NaN,
    },
  };
}

let cached: ToolDriver[] | null = null;

export function drivers(): ToolDriver[] {
  if (!cached) cached = buildDrivers(driverConfig());
  return cached;
}

export function routesFor(stage: string): ToolDriver[] {
  return stageRoutes(drivers())[stage] ?? [];
}

/**
 * The only way anything outside this module may ask for work: a stage, a task, and the
 * intent that decides how hard the licence gate falls. Budget and ceiling come from the
 * operator's environment, never from the caller, so no request can raise its own cap.
 */
export async function runStageJob(
  stage: string,
  task: string,
  opts: { inputs?: string[]; variant?: string; projectId?: string; sceneId?: string; intent?: "personal" | "client-work" | "redistribute"; hooks?: RunHooks } = {},
): Promise<StageRun> {
  const input: JobInput = {
    task,
    inputs: opts.inputs ?? [],
    variant: opts.variant,
    timeoutSeconds: timeoutSeconds(),
    budgetUsd: usdCap(),
    projectId: opts.projectId ?? "unscoped",
    sceneId: opts.sceneId ?? "unscoped",
    stage,
  };
  return runStage(routesFor(stage), input, opts.intent ?? "personal", opts.hooks ?? {});
}

/** What the operator's environment currently permits — printed, never assumed. */
export function runtimePosture() {
  const cap = usdCap();
  return {
    capUsd: cap,
    pricedModels: Object.keys(VERIFIED_PRICES_USD).length,
    timeoutSeconds: timeoutSeconds(),
    paidWorkPossible: cap > 0 && Object.keys(VERIFIED_PRICES_USD).length > 0,
    note: cap === 0
      ? "APEX_JOB_CAP_USD is 0 — paid tools are refused before any call is made"
      : "paid work is allowed up to the cap, but only for models with a verified price",
  };
}
