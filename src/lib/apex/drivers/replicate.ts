/**
 * Replicate driver — BYO-key remote models (video, voice, upscale).
 *
 * The key is read from the environment at run time and never stored in a record,
 * a log line, or a result. A paid call is refused before it is made when the job's
 * budget cap is lower than the model's known price.
 */

import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { R } from "../schema.ts";

const record = R({
  name: "Replicate",
  category: "video-generation",
  officialUrl: "https://replicate.com",
  sourceRepository: "proprietary service",
  license: "proprietary SaaS; per-model licences vary",
  licenseVerified: false,
  selfHosting: false,
  localExecution: false,
  apiAvailable: true,
  hardware: "provider GPUs",
  integrationMethod: "http-api",
  cost: "per-job",
  capability: "hosted video/voice/upscale models without owning hardware",
  priority: "after-foundation",
  replacementOptions: ["RunPod + ComfyUI self-hosted", "Fal.ai", "Hugging Face Inference", "local ComfyUI"],
  dataPortability: "returned files are ordinary media; prediction history is account-bound",
  apiTerms: "restricted",
  outputConditions: "each model carries its own licence; verify per model, not per host",
});

const API = "https://api.replicate.com/v1";

export function makeReplicateDriver(modelFor: (input: JobInput) => string, usdPerJob: (model: string) => number): ToolDriver {
  return {
    toolId: "replicate",
    depth: "drivable",
    record,
    runsOn: "any",

    async probe() {
      const key = process.env.REPLICATE_API_KEY;
      if (!key) return { ok: false, why: "REPLICATE_API_KEY not set — creator must connect their own account" };
      try {
        const res = await fetch(`${API}/account`, {
          headers: { Authorization: `Token ${key}` },
          signal: AbortSignal.timeout(8000),
        });
        return res.ok ? { ok: true, why: "key authenticates" } : { ok: false, why: `HTTP ${res.status}` };
      } catch (e) {
        return { ok: false, why: `could not reach Replicate (${String(e)})` };
      }
    },

    async run(input: JobInput): Promise<JobResult> {
      const started = Date.now();
      const key = process.env.REPLICATE_API_KEY;
      const model = modelFor(input);
      const price = usdPerJob(model);
      if (!key) return fail(input, started, 0, "no API key — BYO required, APEX does not lend compute");
      // A model with no verified price is unquotable, not free. `NaN > cap` is false, so
      // checking the cap alone would wave an unknown price straight through to a paid call.
      if (!Number.isFinite(price)) {
        return fail(input, started, 0, `refused: nobody has priced ${model}. An unpriced model is unquotable, never free.`);
      }
      if (price > input.budgetUsd) {
        return fail(input, started, 0, `refused: ${model} costs $${price}, this job is capped at $${input.budgetUsd}`);
      }
      try {
        const res = await fetch(`${API}/models/${model}/predictions`, {
          method: "POST",
          headers: { Authorization: `Token ${key}`, "Content-Type": "application/json", Prefer: "wait" },
          body: JSON.stringify({ input: { prompt: input.task, ...(input.variant ? { variant: input.variant } : {}) } }),
          signal: AbortSignal.timeout(input.timeoutSeconds * 1000),
        });
        const text = await res.text();
        if (!res.ok) return fail(input, started, 0, `HTTP ${res.status}: ${redact(text, key)}`);
        const body = JSON.parse(text) as { output?: unknown; id?: string; status?: string; error?: string };
        const outputs = toStringList(body.output);
        if (body.error || outputs.length === 0) {
          return fail(input, started, price, redact(String(body.error ?? "prediction returned no output"), key));
        }
        return {
          state: "succeeded",
          outputs,
          wallClockSeconds: (Date.now() - started) / 1000,
          usdSpent: price,
          reproducible: { model, predictionId: body.id ?? "", status: body.status ?? "" },
          log: "",
        };
      } catch (e) {
        return fail(input, started, 0, redact(String(e), key));
      }
    },
  };
}

function fail(input: JobInput, started: number, usdSpent: number, log: string): JobResult {
  return { state: "failed", outputs: [], wallClockSeconds: (Date.now() - started) / 1000, usdSpent, reproducible: {}, log };
}

/** Never let a credential echo back through an error body into Creative Memory. */
function redact(s: string, key: string): string {
  return key ? s.split(key).join("[redacted]") : s;
}

function toStringList(output: unknown): string[] {
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) return output.filter((x): x is string => typeof x === "string");
  return [];
}
