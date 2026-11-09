import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { remainingFrom, type FreeKind } from "@/lib/free-quota";
import { callerIsOwner, claim, keepFrame, refund, runModel, used, visitorBucket, EngineError } from "@/lib/preproduction.server";

// Door C — free pre-production. Script and storyboard are open to every visitor inside a daily
// allowance; the video render stays behind the owner keypad. The brain is DeepSeek with Qwen as
// the open-weights fallback, per the build split. Frames are drawn by FLUX schnell.

const BRAIN = ["deepseek-ai/deepseek-v3", "qwen/qwen3-235b-a22b-instruct-2507"] as const;
const DRAW = "black-forest-labs/flux-schnell";

const STYLE_WORDS: Record<string, string> = {
  cinematic: "cinematic, 35mm film, dramatic light, anamorphic",
  anime: "anime film, painterly cel shading, expressive light",
  noir: "black and white film noir, hard light, deep shadow",
  doc: "documentary realism, natural light, candid framing",
  cyberpunk: "cyberpunk, neon, rain, volumetric haze",
  dream: "dreamlike, ethereal, soft focus, pastel",
};

export type ScriptScene = { heading: string; action: string; shot: string; seconds: number };
export type Script = { title: string; logline: string; scenes: ScriptScene[] };

type Allowance = { owner: boolean; script: number; frame: number };

async function gate(kind: FreeKind) {
  if (await callerIsOwner()) return { owner: true as const, bucket: "", remaining: -1 };
  const bucket = await visitorBucket();
  const c = await claim(bucket, kind);
  if (!c.ok) throw new Error(c.message);
  return { owner: false as const, bucket, remaining: c.remaining };
}

function parseScript(text: string, want: number): Script | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(text.slice(start, end + 1));
    const scenes: ScriptScene[] = (Array.isArray(j.scenes) ? j.scenes : [])
      .slice(0, want)
      .map((s: any) => ({
        heading: String(s.heading ?? "").slice(0, 120),
        action: String(s.action ?? "").slice(0, 600),
        shot: String(s.shot ?? s.action ?? "").slice(0, 600),
        seconds: Math.min(10, Math.max(3, Math.round(Number(s.seconds) || 5))),
      }))
      .filter((s: ScriptScene) => s.shot.trim().length > 3);
    if (!scenes.length) return null;
    return {
      title: String(j.title ?? "Untitled").slice(0, 80),
      logline: String(j.logline ?? "").slice(0, 300),
      scenes,
    };
  } catch {
    return null;
  }
}

export const getAllowance = createServerFn({ method: "GET" }).handler(async (): Promise<Allowance> => {
  if (await callerIsOwner()) return { owner: true, script: -1, frame: -1 };
  const bucket = await visitorBucket();
  const [s, f] = await Promise.all([used(bucket, "script"), used(bucket, "frame")]);
  return { owner: false, script: remainingFrom("script", s), frame: remainingFrom("frame", f) };
});

export const writeScript = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z.object({
      idea: z.string().trim().min(8, "Tell the story in a sentence or two.").max(1200),
      style: z.string().max(20).default("cinematic"),
      scenes: z.number().int().min(3).max(6).default(4),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    const g = await gate("script");
    const look = STYLE_WORDS[data.style] ?? STYLE_WORDS.cinematic;
    const prompt = `You are a film writer and storyboard artist. Turn the idea below into a short film of exactly ${data.scenes} scenes.
Return ONLY one JSON object, no prose, no code fences, in this shape:
{"title": string (max 6 words), "logline": string (one sentence), "scenes": [{"heading": string (screenplay slug like "EXT. ROOFTOP - NIGHT"), "action": string (2 sentences of what happens), "shot": string (one vivid visual prompt for an AI camera: subject, action, lens, angle, movement, light, colour; under 60 words), "seconds": number (4 to 8)}]}
Visual style for every shot: ${look}.
Do not name real people, brands or existing film characters.
Idea: ${data.idea}`;
    let lastErr: unknown = null;
    try {
      for (const model of BRAIN) {
        try {
          const out = await runModel(model, { prompt, max_tokens: 1800, temperature: 0.7, top_p: 0.9 });
          const text = Array.isArray(out) ? out.join("") : String(out ?? "");
          const script = parseScript(text, data.scenes);
          if (script) return { script, engine: model, remaining: g.remaining };
          lastErr = new EngineError("The writer returned something unreadable. Try again.");
        } catch (e) {
          lastErr = e;
          if (e instanceof EngineError && e.noCredit) break;
        }
      }
      throw lastErr ?? new Error("The writer is unavailable.");
    } catch (e) {
      if (!g.owner) await refund(g.bucket, "script");
      throw e instanceof Error ? new Error(e.message) : new Error("The writer is unavailable.");
    }
  });

export const drawFrame = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z.object({
      shot: z.string().trim().min(4).max(700),
      style: z.string().max(20).default("cinematic"),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    const g = await gate("frame");
    const look = STYLE_WORDS[data.style] ?? STYLE_WORDS.cinematic;
    try {
      const out = await runModel(DRAW, {
        prompt: `Storyboard frame, film still, ${data.shot}. ${look}. No text, no watermark.`,
        aspect_ratio: "16:9",
        output_format: "webp",
        output_quality: 82,
        num_outputs: 1,
        go_fast: true,
      });
      const url = Array.isArray(out) ? String(out[0]) : String(out ?? "");
      if (!/^https:\/\//.test(url)) throw new EngineError("The artist returned no frame. Try again.");
      const id = await keepFrame(url);
      return { src: `/api/public/frame/${id}`, engine: DRAW, remaining: g.remaining };
    } catch (e) {
      if (!g.owner) await refund(g.bucket, "frame");
      throw e instanceof Error ? new Error(e.message) : new Error("The artist is unavailable.");
    }
  });
