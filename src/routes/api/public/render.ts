import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Sovereign external render endpoint. Bearer-auth with OPERATOR_API_TOKEN so
// OpenCode / Coder / any agentic IDE can drive film production over HTTPS.
//
//   curl -X POST https://<host>/api/public/render \
//     -H "Authorization: Bearer $OPERATOR_API_TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"prompt":"...", "stage":"motion"}'
//
//   GET /api/public/render?id=<predictionId>   → { status, url?, error? }
//
// Every job goes through the one door (runStageJob): licence gate, declared depth,
// reachability probe, budget cap, then the tool. Nothing here talks to a provider
// directly — an endpoint that did would spend the operator's money past every gate,
// which is exactly what this file used to do.

import { REPLICATE_API, replicateHeaders } from "@/lib/replicate-gateway";

const gwHeaders = replicateHeaders;

function authorize(request: Request): Response | null {
  const expected = process.env.OPERATOR_API_TOKEN;
  if (!expected) return new Response("Server not provisioned", { status: 503 });
  const h = request.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token || token.length !== expected.length) return new Response("Unauthorized", { status: 401 });
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return new Response("Unauthorized", { status: 401 });
  return null;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export const Route = createFileRoute("/api/public/render")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),

      POST: async ({ request }) => {
        const unauth = authorize(request);
        if (unauth) return unauth;
        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors }); }
        const parsed = z.object({
          prompt: z.string().min(3).max(2000),
          stage: z.enum(["storyboard", "character_lock", "motion", "dialogue", "music", "sound", "subtitles", "edit", "finish"]).default("motion"),
          variant: z.string().max(120).optional(),
          intent: z.enum(["personal", "client-work", "redistribute"]).default("personal"),
          projectId: z.string().max(80).default("api"),
          sceneId: z.string().max(80).default("unscoped"),
        }).safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400, headers: cors });

        const { runStageJob, runtimePosture } = await import("@/lib/apex/runtime");
        const run = await runStageJob(parsed.data.stage, parsed.data.prompt, {
          variant: parsed.data.variant,
          projectId: parsed.data.projectId,
          sceneId: parsed.data.sceneId,
          intent: parsed.data.intent,
        });

        const predictionId = typeof run.attempts.at(-1)?.outcome === "object"
          ? String((run.attempts.at(-1)!.outcome as { reproducible?: { predictionId?: string } }).reproducible?.predictionId ?? "")
          : "";

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
          const owner = users?.users?.[0]?.id;
          if (owner) {
            await supabaseAdmin.from("render_jobs").insert({
              owner_id: owner,
              status: run.state === "succeeded" ? "done" : run.state,
              prompt: { ...parsed.data, source: "api", door: true } as any,
              external_job_id: predictionId,
              response_log: { used: run.used, usdSpent: run.usdSpent, wallClockSeconds: run.wallClockSeconds, log: run.log, source: "api" } as any,
            });
          }
        } catch { /* logging is best-effort; the run result is still returned honestly */ }

        return Response.json(
          {
            state: run.state,
            used: run.used,
            outputs: run.outputs,
            usdSpent: run.usdSpent,
            wallClockSeconds: Math.round(run.wallClockSeconds * 10) / 10,
            why: run.log,
            predictionId: predictionId || undefined,
            posture: runtimePosture(),
          },
          { status: run.state === "succeeded" ? 200 : 502, headers: cors },
        );
      },

      GET: async ({ request }) => {
        const unauth = authorize(request);
        if (unauth) return unauth;
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return Response.json({ error: "id required" }, { status: 400, headers: cors });
        const r = await fetch(`${REPLICATE_API}/predictions/${id}`, { headers: gwHeaders() });
        const j = await r.json() as any;
        const status: string = j.status;
        if (status === "succeeded") {
          const out = Array.isArray(j.output) ? j.output[0] : j.output;
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("render_jobs")
              .update({ status: "done", response_log: { url: out, provider: "replicate", source: "api" } as any })
              .eq("external_job_id", id);
          } catch { /* best-effort */ }
          return Response.json({ status: "done", url: out }, { headers: cors });
        }
        if (status === "failed" || status === "canceled") {
          return Response.json({ status: "failed", error: String(j.error ?? status) }, { headers: cors });
        }
        return Response.json({ status }, { headers: cors });
      },
    },
  },
});
