/**
 * The local model bus — 9router, OpenAI-compatible, on the creator's own machine.
 *
 * Why this exists: story, script and shotlist were dead-ended because the only writer engine APEX
 * was wired to was Ollama, and Ollama is not installed here. The creator's machine already runs a
 * router that lists 417 models across 56 providers, so the spine's first three rungs need a driver,
 * not an install.
 *
 * Two rules are written into the probe rather than trusted to memory:
 *  - a router that lists models is not a router that answers. The probe asks for one completion and
 *    reads the provider's own words, so "up but uncredentialed" is reported as DOWN instead of a
 *    stage that queues work and returns nothing.
 *  - the house list applies here too: Claude/Anthropic, OpenAI, Gemini, Grok/xAI are never offered,
 *    so a provider configured on the bus cannot make the platform recommend a banned brain.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { R } from "../schema.ts";

const BASE = process.env.APEX_ROUTER_URL ?? "http://127.0.0.1:20128";
const OUT = process.env.APEX_OUT_DIR ?? ".apex-out";

/** Providers the house does not route to, whatever the machine has configured. */
const BANNED_PROVIDER = /^(anthropic|openai|gemini|google|vertex|xai|grok|azure|bedrock)/i;
/** Preferred open-weight families, ranked the way the dictionary ranks them. */
const PREFERRED = /(deepseek|qwen|kimi|moonshot|glm|zhipu|minimax|hunyuan|llama|mistral)/i;

interface RouterModel {
  id: string;
  owned_by?: string;
}

/** Ranked list of usable models on this bus: allowed provider, preferred family first. */
export function chooseModel(models: RouterModel[]): RouterModel | null {
  const allowed = models.filter((m) => !BANNED_PROVIDER.test((m.id.split("/")[0] ?? "").toLowerCase()) && !BANNED_PROVIDER.test((m.owned_by ?? "").toLowerCase()));
  if (allowed.length === 0) return null;
  const wanted = process.env.APEX_ROUTER_MODEL;
  if (wanted) {
    const exact = allowed.find((m) => m.id === wanted || m.id.endsWith(`/${wanted}`));
    if (exact) return exact;
  }
  return allowed.find((m) => PREFERRED.test(m.id)) ?? allowed[0] ?? null;
}

async function listModels(): Promise<RouterModel[]> {
  const r = await fetch(`${BASE}/v1/models`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`router answered HTTP ${r.status}`);
  const body = (await r.json()) as { data?: RouterModel[] };
  return Array.isArray(body.data) ? body.data : [];
}

interface Completion {
  text: string;
  seconds: number;
  error?: string;
}

async function complete(model: string, system: string, user: string, maxTokens = 900): Promise<Completion> {
  const started = Date.now();
  try {
    const r = await fetch(`${BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTokens, temperature: 0.8 }),
    });
    const raw = await r.text();
    let json: any = null;
    try {
      json = JSON.parse(raw);
    } catch {
      /* keep the raw body below */
    }
    const text = json?.choices?.[0]?.message?.content;
    return {
      text: typeof text === "string" ? text : "",
      seconds: (Date.now() - started) / 1000,
      error: typeof text === "string" && text.length > 0 ? undefined : json?.error?.message ?? raw.slice(0, 200),
    };
  } catch (e) {
    return { text: "", seconds: (Date.now() - started) / 1000, error: String(e).slice(0, 200) };
  }
}

/** What each writing stage asks for. Kept here so a stage change is one line, not a new engine. */
const STAGE_BRIEF: Record<string, { system: string; ext: string }> = {
  story: {
    system: "You are a film development writer. Answer as a one-paragraph story premise in plain present-tense prose. No headings, no notes about yourself.",
    ext: "md",
  },
  script: {
    system: "You are a screenwriter. Turn the premise into numbered scenes, each with a slug line, action in present tense, and at most three lines of dialogue.",
    ext: "md",
  },
  shotlist: {
    system: "You are a shot list writer. Output one shot per line: number | frame size | camera move | what is in frame | sound. No prose around the list.",
    ext: "md",
  },
};

export const routerDriver: ToolDriver = {
  toolId: "router",
  depth: "drivable",
  record: R({
    name: "9router (local model bus)",
    category: "ai-runtime",
    officialUrl: "https://www.npmjs.com/package/9router",
    license: "unverified",
    licenseVerified: false,
    selfHosting: true,
    localExecution: true,
    apiAvailable: true,
    hardware: "none locally — the bus addresses whichever provider the creator credentials",
    integrationMethod: "http-api",
    cost: "$0",
    capability: "one OpenAI-compatible door onto hundreds of writing models, from the creator's machine — the bus costs nothing; provider usage is billed to the creator's own key",
    priority: "now",
    replacementOptions: ["Ollama (local, nothing leaves the machine)", "DeepSeek direct on your key", "vLLM on a rented card"],
    dataPortability: "plain OpenAI-format requests; outputs are markdown text files in the project",
    outputConditions: "the provider you credential sets the terms — the bus itself adds none",
  }),
  runsOn: "creator-machine",

  async probe() {
    let models: RouterModel[];
    try {
      models = await listModels();
    } catch (e) {
      return { ok: false, why: `no router on ${BASE}: ${String(e).slice(0, 120)}` };
    }
    const pick = chooseModel(models);
    if (!pick) return { ok: false, why: `router lists ${models.length} models but none outside the house ban list` };
    const test = await complete(pick.id, "Reply with exactly: ready", "ready check", 8);
    return test.text.trim().length > 0
      ? { ok: true, why: `${models.length} models on the bus; ${pick.id} answered in ${test.seconds.toFixed(1)}s` }
      : { ok: false, why: `router is up with ${models.length} models but no provider has credentials (${test.error ?? "empty reply"}) — credential one in 9router and this stage comes alive` };
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    const brief = STAGE_BRIEF[input.stage];
    if (!brief) {
      return { state: "failed", outputs: [], wallClockSeconds: 0, usdSpent: 0, reproducible: { base: BASE }, log: `the router writes story, script and shotlist — not ${input.stage}` };
    }
    let pick: RouterModel | null = null;
    try {
      pick = chooseModel(await listModels());
    } catch (e) {
      return { state: "failed", outputs: [], wallClockSeconds: 0, usdSpent: 0, reproducible: { base: BASE }, log: `router unreachable: ${String(e).slice(0, 200)}` };
    }
    if (!pick) {
      return { state: "failed", outputs: [], wallClockSeconds: 0, usdSpent: 0, reproducible: {}, log: "no allowed model on the bus" };
    }

    const upstream = input.inputs.length ? input.inputs.map((f) => `from ${f}`).join(", ") : "from the creator's own sentence";
    const res = await complete(pick.id, brief.system, `${input.task} (${upstream})`);
    if (!res.text.trim()) {
      return {
        state: "failed",
        outputs: [],
        wallClockSeconds: (Date.now() - started) / 1000,
        usdSpent: 0,
        reproducible: { base: BASE, model: pick.id },
        log: `no text back: ${res.error ?? "empty"}`,
      };
    }

    const dir = path.resolve(OUT, "writing", input.projectId);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${input.sceneId}-${input.stage}.${brief.ext}`);
    writeFileSync(file, `# ${input.stage} — ${input.sceneId}\n\nmodel: ${pick.id}\n\n${res.text.trim()}\n`, "utf8");

    return {
      state: "succeeded",
      outputs: [file],
      wallClockSeconds: (Date.now() - started) / 1000,
      usdSpent: 0,
      reproducible: { base: BASE, model: pick.id, stage: input.stage, bytes: res.text.length },
      log: `${pick.id} wrote ${res.text.trim().split("\n").length} lines of ${input.stage} in ${res.seconds.toFixed(1)}s`,
    };
  },
};
