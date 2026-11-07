/**
 * Ollama driver — the local brain. Text, script work and summaries with no internet
 * and no per-token invoice.
 */

import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { R } from "../schema.ts";

const record = R({
  name: "Ollama",
  category: "ai-runtime",
  officialUrl: "https://ollama.com",
  sourceRepository: "https://github.com/ollama/ollama",
  license: "MIT",
  licenseVerified: false,
  selfHosting: true,
  localExecution: true,
  apiAvailable: true,
  hardware: "RAM-sized by the model; quantised 7-14B fits 16GB machines",
  integrationMethod: "http-api",
  cost: "$0",
  capability: "script passes, shot notes, licence-text summarising, metadata drafting",
  priority: "now",
  replacementOptions: ["llama.cpp server", "LM Studio", "LocalAI", "vLLM (GPU box)"],
  dataPortability: "models are GGUF files; prompt history exportable as JSON",
});

const BASE = process.env.APEX_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.APEX_LOCAL_LLM ?? "qwen2.5";

export const ollamaDriver: ToolDriver = {
  toolId: "ollama",
  depth: "drivable",
  record,
  runsOn: "creator-machine",

  async probe() {
    try {
      const res = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return { ok: false, why: `HTTP ${res.status} from ${BASE}` };
      const body = (await res.json()) as { models?: Array<{ name: string }> };
      const names = (body.models ?? []).map((m) => m.name);
      return names.length > 0
        ? { ok: true, why: `${names.length} models loaded` }
        : { ok: false, why: "Ollama is up but has no model pulled" };
    } catch (e) {
      return { ok: false, why: `nothing listening on ${BASE} (${String(e)})` };
    }
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    try {
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: input.variant ?? MODEL, prompt: input.task, stream: false }),
        signal: AbortSignal.timeout(input.timeoutSeconds * 1000),
      });
      const text = await res.text();
      if (!res.ok) {
        return failed(input, started, `HTTP ${res.status}: ${text.slice(0, 500)}`);
      }
      const body = JSON.parse(text) as { response?: string };
      return {
        state: "succeeded",
        outputs: [],
        wallClockSeconds: (Date.now() - started) / 1000,
        usdSpent: 0,
        reproducible: { model: input.variant ?? MODEL, prompt: input.task },
        log: body.response ?? "",
      };
    } catch (e) {
      return failed(input, started, String(e));
    }
  },
};

function failed(input: JobInput, started: number, log: string): JobResult {
  return {
    state: "failed",
    outputs: [],
    wallClockSeconds: (Date.now() - started) / 1000,
    usdSpent: 0,
    reproducible: { stage: input.stage },
    log,
  };
}
