import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { REPLICATE_API, replicateHeaders, replicateError } from "@/lib/replicate-gateway";

// Text-to-video models exposed through Replicate. Fast first, quality second.
const MODELS = {
  fast: "minimax/video-01",          // ~1-2 min, solid quality
  quality: "kwaivgi/kling-v2.5-turbo-pro", // sharper, 5s
} as const;
export type ModelKey = keyof typeof MODELS;

const headers = replicateHeaders;

export const startCloudRender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z.object({
      prompt: z.string().min(3).max(2000),
      tier: z.enum(["fast", "quality"]).default("fast"),
    }).parse(v)
  )
  .handler(async ({ data, context }) => {
    const model = MODELS[data.tier];
    const res = await fetch(`${REPLICATE_API}/models/${model}/predictions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ input: { prompt: data.prompt } }),
    });
    const j = await res.json() as any;
    if (!res.ok || !j.id) {
      throw replicateError(res.status, j);
    }

    const { data: row, error } = await context.supabase
      .from("render_jobs")
      .insert({
        owner_id: context.userId,
        status: "rendering",
        prompt: { text: data.prompt, tier: data.tier, model } as any,
        external_job_id: j.id,
        response_log: { provider: "replicate", model } as any,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return { jobId: row!.id as string, predictionId: j.id as string };
  });

export const pollCloudRender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z.object({ jobId: z.string(), predictionId: z.string() }).parse(v)
  )
  .handler(async ({ data, context }) => {
    const r = await fetch(`${REPLICATE_API}/predictions/${data.predictionId}`, { headers: headers() });
    const j = await r.json() as any;
    const status: string = j.status;

    if (status === "succeeded") {
      const url = Array.isArray(j.output) ? j.output[0] : j.output;
      await context.supabase.from("render_jobs")
        .update({ status: "done", response_log: { url, provider: "replicate", model: j.model } as any })
        .eq("id", data.jobId);
      return { status: "done" as const, url: url as string };
    }
    if (status === "failed" || status === "canceled") {
      await context.supabase.from("render_jobs")
        .update({ status: "failed", response_log: { error: j.error ?? status } as any })
        .eq("id", data.jobId);
      return { status: "failed" as const, error: String(j.error ?? status) };
    }
    return { status: status as "starting" | "processing" };
  });
