/**
 * brain.mjs — the free local model the platform thinks with.
 *
 * Open weights, no per-call price, no account, no provider that can flag us. If the
 * runtime is not installed the answer is "not installed", never a silent fallback to a
 * paid API and never a pretend success.
 */

const HOST = process.env.APEX_OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.APEX_LOCAL_MODEL || "qwen3:14b";

export async function reach() {
  try {
    const res = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ok: false, why: `runtime answered HTTP ${res.status}` };
    const body = await res.json();
    return { ok: true, models: (body.models ?? []).map((m) => m.name) };
  } catch (e) {
    return { ok: false, why: `no local runtime at ${HOST} (${String(e.message ?? e)})` };
  }
}

export async function ask(prompt, opts = {}) {
  const got = await reach();
  if (!got.ok) return { ok: false, why: got.why };
  const model = opts.model ?? (got.models.includes(MODEL) ? MODEL : got.models[0]);
  if (!model) return { ok: false, why: "runtime is up but holds no model — pull one first" };
  const started = Date.now();
  try {
    const res = await fetch(`${HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, options: { num_ctx: opts.ctx ?? 4096 } }),
      signal: AbortSignal.timeout((opts.timeoutSeconds ?? 300) * 1000),
    });
    if (!res.ok) return { ok: false, why: `generate answered HTTP ${res.status}` };
    const body = await res.json();
    return { ok: true, model, text: String(body.response ?? ""), wallClockSeconds: Math.round((Date.now() - started) / 100) / 10 };
  } catch (e) {
    return { ok: false, why: `generate failed (${String(e.message ?? e)})` };
  }
}

/** A thought the agent can act on: what is the single next useful change to the rail? */
export async function thinkAbout(backlog) {
  const open = backlog.tasks.filter((t) => t.doable).map((t) => `- ${t.id}: ${t.why}`).join("\n");
  return ask(
    `You are the resident engineer of a film platform. These measured tasks are open:\n${open}\n` +
      "Pick the one that changes what a visitor can do today. Answer in three lines: the task, the first file to touch, how to prove it worked.",
    { timeoutSeconds: 240 },
  );
}
