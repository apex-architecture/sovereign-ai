import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Prompt enhancer powered by the internal AI gateway.
export const enhancePrompt = createServerFn({ method: "POST" })
  .validator(z.object({
    raw: z.string().min(3).max(2000),
    mode: z.enum(["cinematic", "trailer", "documentary", "surreal", "action"]).default("cinematic"),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway key missing. Enable AI in Cloud settings.");

    const systemPrompt = `You are a master cinematographer and prompt engineer for AI video models (Stable Video Diffusion / Sora / Runway). Transform the user's rough idea into a single dense, vivid prompt under 80 words. Include: subject, action, camera (lens, angle, movement), lighting, color palette, era/style, mood. Mode: ${data.mode}. Return ONLY the enhanced prompt — no preamble, no quotes.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: data.raw },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Oracle ${res.status}: ${await res.text()}`);
    const j = await res.json() as any;
    return { enhanced: j.choices?.[0]?.message?.content?.trim() ?? data.raw };
  });
