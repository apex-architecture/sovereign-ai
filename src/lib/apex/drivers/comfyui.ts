/**
 * ComfyUI driver — drivable depth over its local HTTP API.
 *
 * The workflow graph is supplied per stage; the driver submits, polls, and pulls the
 * finished artefact. No cloud, no per-job fee, nothing leaves the machine.
 */

import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { R } from "../schema.ts";

const record = R({
  name: "ComfyUI",
  category: "image-generation",
  officialUrl: "https://www.comfy.org",
  sourceRepository: "https://github.com/comfyanonymous/ComfyUI",
  license: "GPL-3.0",
  licenseVerified: false,
  selfHosting: true,
  localExecution: true,
  apiAvailable: true,
  hardware: "CUDA/ROCm GPU recommended; CPU works, slowly",
  integrationMethod: "http-api",
  cost: "$0",
  capability: "node-graph generation: stills, storyboard panels, controlnet passes, inpainting",
  priority: "now",
  replacementOptions: ["InvokeAI", "StableSwarmUI", "Automatic1111 WebUI"],
  dataPortability: "workflows export as JSON; models are separate files",
});

const BASE = process.env.APEX_COMFY_URL ?? "http://127.0.0.1:8188";

/** Stage id -> saved graph, kept next to the project rather than baked into code. */
export type GraphResolver = (input: JobInput) => Promise<Record<string, unknown> | null>;

export function makeComfyDriver(resolveGraph: GraphResolver): ToolDriver {
  return {
    toolId: "comfyui",
    depth: "drivable",
    record,
    runsOn: "creator-machine",

    async probe() {
      try {
        const res = await fetch(`${BASE}/system_stats`, { signal: AbortSignal.timeout(4000) });
        return res.ok
          ? { ok: true, why: `ComfyUI responding at ${BASE}` }
          : { ok: false, why: `HTTP ${res.status} from ${BASE}` };
      } catch (e) {
        return { ok: false, why: `nothing listening on ${BASE} (${String(e)})` };
      }
    },

    async run(input: JobInput): Promise<JobResult> {
      const started = Date.now();
      const graph = await resolveGraph(input);
      if (!graph) {
        return {
          state: "failed",
          outputs: [],
          wallClockSeconds: 0,
          usdSpent: 0,
          reproducible: {},
          log: `no ComfyUI graph stored for stage ${input.stage} — the pipeline cannot invent one`,
        };
      }
      const submitted = await postJson(`${BASE}/prompt`, { prompt: graph, client_id: input.projectId });
      if (!submitted.ok) return fail(started, submitted.text);

      const promptId = String((submitted.data as { prompt_id?: string }).prompt_id ?? "");
      const done = await wait(promptId, input.timeoutSeconds);
      if (!done.ok) return fail(started, done.text);

      const saved = artifacts(done.data as HistoryEntry);
      const outputs = pull(saved, input);
      // The server's own execution_start/execution_success stamps, not our wristwatch: a run left
      // overnight on a laptop that sleeps reports 11,173 s for a render the GPU did in 371. The
      // wall clock is honest about the calendar and useless about the tool, so the tool's number
      // is printed next to it instead of being replaced by it.
      const seconds = renderSeconds(done.data as HistoryEntry);
      const log = outputs.length === 0
        ? `the server wrote ${saved.join(", ") || "nothing"} but none of it is under ${process.env.APEX_COMFY_OUTPUT ?? "D:/ComfyUI/output"} — point APEX_COMFY_OUTPUT at the folder ComfyUI writes into`
        : wasCached(done.data as HistoryEntry)
          ? `${outputs.join(", ")} — served from ComfyUI's cache, the GPU did not work this time`
          : seconds === null
            ? `${outputs.length} artefact(s) pulled into the run dir; the server reported no execution stamps`
            : `${outputs.join(", ")} — ${seconds.toFixed(1)}s of GPU render, measured by ComfyUI's own stamps`;
      return {
        state: outputs.length > 0 ? "succeeded" : "failed",
        outputs,
        wallClockSeconds: (Date.now() - started) / 1000,
        usdSpent: 0,
        reproducible: { promptId, variant: input.variant ?? "default", renderSeconds: seconds, graph },
        log,
      };
    },
  };
}

interface HistoryEntry {
  outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }>;
  status?: { messages?: Array<[string, { timestamp?: number }]> };
}

/**
 * ComfyUI replays a graph it has already run instead of putting the GPU to work. The wall clock
 * then reads as a few seconds and the GPU did nothing, so the cache is named rather than measured.
 */
function wasCached(entry: HistoryEntry): boolean {
  return (entry.status?.messages ?? []).some((m) => m[0] === "execution_cached");
}

/** Seconds between the server's execution_start and its final stamp. Null when either is absent. */
function renderSeconds(entry: HistoryEntry): number | null {
  const at = new Map((entry.status?.messages ?? []).map((m) => [m[0], m[1]?.timestamp]));
  const start = at.get("execution_start");
  const end = at.get("execution_success") ?? at.get("execution_interrupted") ?? at.get("execution_error");
  if (!start || !end) return null;
  return Math.max(0, (end - start) / 1000);
}

async function wait(promptId: string, timeoutSeconds: number) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    // GET, not POST: ComfyUI answers a POST to /history/<id> with 405, and a driver that reads
    // that as "not finished yet" polls a render that is already on disk until its own timeout.
    const res = await getJson(`${BASE}/history/${promptId}`);
    const entry = (res.data as Record<string, HistoryEntry> | null)?.[promptId];
    if (entry) return { ok: true as const, data: entry };
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { ok: false as const, text: `timed out after ${timeoutSeconds}s waiting on prompt ${promptId}` };
}

function artifacts(entry: HistoryEntry): string[] {
  const out: string[] = [];
  for (const node of Object.values(entry.outputs ?? {})) {
    for (const img of node.images ?? []) out.push(`${img.subfolder ? `${img.subfolder}/` : ""}${img.filename}`);
  }
  return out;
}

function fail(started: number, log: string): JobResult {
  return { state: "failed", outputs: [], wallClockSeconds: (Date.now() - started) / 1000, usdSpent: 0, reproducible: {}, log };
}

/**
 * ComfyUI writes into its own output tree; the pipeline reads the run directory. A path the next
 * stage cannot open is not an output, so the artefact is copied in under the name every other
 * driver uses — <project>-<stage>-<scene>.<ext> — and that name is what the run sheet records.
 */
function pull(files: string[], input: JobInput): string[] {
  const outDir = process.env.APEX_RUN_DIR ?? ".";
  const kept: string[] = [];
  for (const f of files) {
    const src = path.join(process.env.APEX_COMFY_OUTPUT ?? "D:/ComfyUI/output", f);
    if (!existsSync(src)) continue;
    const dest = path.join(outDir, `${input.projectId}-${input.stage}-${input.sceneId}${path.extname(src)}`);
    copyFileSync(src, dest);
    kept.push(path.basename(dest));
  }
  return kept;
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: unknown; text: string }> {
  return send(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === null ? "{}" : JSON.stringify(body),
  });
}

async function getJson(url: string): Promise<{ ok: boolean; data: unknown; text: string }> {
  return send(url, { method: "GET" });
}

async function send(url: string, init: RequestInit): Promise<{ ok: boolean; data: unknown; text: string }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
    const text = await res.text();
    if (!res.ok) return { ok: false, data: null, text: `HTTP ${res.status}: ${text.slice(0, 400)}` };
    return { ok: true, data: JSON.parse(text), text };
  } catch (e) {
    return { ok: false, data: null, text: String(e) };
  }
}
