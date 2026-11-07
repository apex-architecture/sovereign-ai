/**
 * The free public bus — the brain that answers with no account, no key and no download.
 *
 * Finding it was the task; stating its terms is the responsibility. Measured on this machine:
 * an OpenAI-compatible endpoint that replied in 750 ms to a one-word prompt, listing
 * `openai-fast`, with no credential of ours anywhere in the request.
 *
 * What that costs the creator is explicit, because a free rail is not a private one:
 *  - the sentence you send leaves this machine and is processed by someone else's service;
 *  - there is no contract, no rate guarantee, and the model behind it can change;
 *  - therefore the record is marked for personal drafting only. Client material — a commission,
 *    a studio script, anything with a name attached — must not be typed into a free public bus.
 *
 * So this engine is a draftsman, not a delivery truck. The writer's own key (DeepSeek, Qwen, a
 * local Ollama) is what the paid road runs on, and the spine prefers those ahead of this.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { R } from "../schema.ts";

const BASE = process.env.APEX_FREE_BUS_URL ?? "https://text.pollinations.ai/openai";
const MODEL = process.env.APEX_FREE_BUS_MODEL ?? "openai-fast";
const OUT = process.env.APEX_OUT_DIR ?? ".apex-out";

const STAGE_BRIEF: Record<string, { system: string }> = {
  story: { system: "You are a film development writer. Answer as one plain present-tense paragraph: the premise. No headings, no self-reference." },
  script: { system: "You are a screenwriter. Output numbered scenes; each has a slug line, action in present tense, at most three lines of dialogue." },
  shotlist: { system: "You are a shot list writer. One shot per line: number | frame size | camera move | what is in frame | sound. No prose around it." },
};

async function ask(system: string, user: string, maxTokens = 900): Promise<{ text: string; seconds: number; error?: string }> {
  const started = Date.now();
  try {
    const r = await fetch(BASE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTokens }),
    });
    const raw = await r.text();
    let j: any = null;
    try {
      j = JSON.parse(raw);
    } catch {
      /* a free rail sometimes answers in plain text */
    }
    const content = j?.choices?.[0]?.message?.content ?? (r.ok && !j ? raw : "");
    return {
      text: typeof content === "string" ? content : "",
      seconds: (Date.now() - started) / 1000,
      error: typeof content === "string" && content.trim() ? undefined : `HTTP ${r.status}: ${(j?.error?.message ?? raw).toString().replace(/\s+/g, " ").slice(0, 180)}`,
    };
  } catch (e) {
    return { text: "", seconds: (Date.now() - started) / 1000, error: String(e).slice(0, 160) };
  }
}

export const freeBusDriver: ToolDriver = {
  toolId: "free_bus",
  depth: "drivable",
  record: R({
    name: "Free public model bus (pollinations text)",
    category: "ai-runtime",
    officialUrl: "https://github.com/pollinations/pollinations",
    license: "unverified — the service's own terms must be read before any work beyond personal drafting",
    licenseVerified: false,
    selfHosting: false,
    localExecution: false,
    apiAvailable: true,
    hardware: "none on this machine — the call leaves the house",
    integrationMethod: "http-api",
    cost: "$0",
    capability: "draft a premise, a scene page or a shot list when nothing else is credentialled — the bus is free and needs no key and no account",
    priority: "after-foundation",
    replacementOptions: ["Ollama with a local GGUF (private, $0)", "DeepSeek on your own key", "the 9router bus once a provider is credentialled"],
    dataPortability: "plain OpenAI-format request; output kept as a markdown file in the project",
    outputConditions: "PERSONAL DRAFTING ONLY — do not send client or commissioned material through a free public rail",
    geographicRestrictions: "public internet service; availability is not guaranteed",
  }),
  runsOn: "any",

  async probe() {
    const r = await ask("Reply with exactly: ready", "ready check", 8);
    return r.text.trim().length > 0
      ? { ok: true, why: `no key needed; ${MODEL} answered in ${r.seconds.toFixed(2)}s` }
      : { ok: false, why: `free bus not answering: ${r.error ?? "empty reply"}` };
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    const brief = STAGE_BRIEF[input.stage];
    if (!brief) {
      return { state: "failed", outputs: [], wallClockSeconds: 0, usdSpent: 0, reproducible: {}, log: `the free bus drafts story, script and shotlist — not ${input.stage}` };
    }
    const res = await ask(brief.system, input.task);
    if (!res.text.trim()) {
      return { state: "failed", outputs: [], wallClockSeconds: (Date.now() - started) / 1000, usdSpent: 0, reproducible: { base: BASE, model: MODEL }, log: `no text back: ${res.error ?? "empty"}` };
    }
    const dir = path.resolve(OUT, "writing", input.projectId);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${input.sceneId}-${input.stage}.md`);
    writeFileSync(file, `# ${input.stage} — ${input.sceneId}\n\nengine: free public bus (${MODEL}) — personal draft, not a delivery\n\n${res.text.trim()}\n`, "utf8");
    return {
      state: "succeeded",
      outputs: [file],
      wallClockSeconds: (Date.now() - started) / 1000,
      usdSpent: 0,
      reproducible: { base: BASE, model: MODEL, stage: input.stage, chars: res.text.length },
      log: `${MODEL} drafted ${input.stage}: ${res.text.trim().split("\n").length} lines in ${res.seconds.toFixed(1)}s, 0 USD — written to ${file}`,
    };
  },
};
