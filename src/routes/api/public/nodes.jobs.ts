import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { nodeCors, requireOperator, JOB_ID, OUTPUT_BUCKET } from "@/lib/node-hub.server";

// Owner door to the GPU node queue.
//   POST /api/public/nodes/jobs   { workflow: {ComfyUI API graph}, label? }  → { id, status }
//   GET  /api/public/nodes/jobs?id=<uuid>                                    → one job (+ 1-hour download link when done)
//   GET  /api/public/nodes/jobs                                              → latest 25 jobs + every node seen
// Bearer OPERATOR_API_TOKEN on every call.

const Body = z.object({
  workflow: z.record(z.string(), z.unknown()).refine((w) => Object.keys(w).length > 0, "workflow is empty"),
  label: z.string().max(200).optional(),
});

export const Route = createFileRoute("/api/public/nodes/jobs")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: nodeCors }),

      POST: async ({ request }) => {
        const no = requireOperator(request);
        if (no) return no;
        const text = await request.text();
        if (text.length > 2_000_000) return Response.json({ error: "workflow too large (2 MB max)" }, { status: 413, headers: nodeCors });
        let raw: unknown;
        try { raw = JSON.parse(text); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: nodeCors }); }
        const parsed = Body.safeParse(raw);
        if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400, headers: nodeCors });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("node_jobs")
          .insert({ workflow: parsed.data.workflow as never, label: parsed.data.label ?? "" })
          .select("id, status")
          .single();
        if (error || !data) return Response.json({ error: "Could not queue the job" }, { status: 500, headers: nodeCors });
        return Response.json(data, { status: 201, headers: nodeCors });
      },

      GET: async ({ request }) => {
        const no = requireOperator(request);
        if (no) return no;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const id = new URL(request.url).searchParams.get("id");

        if (id) {
          if (!JOB_ID.test(id)) return Response.json({ error: "Bad id" }, { status: 400, headers: nodeCors });
          const { data: job } = await supabaseAdmin
            .from("node_jobs")
            .select("id, label, status, node_id, node_gpu, output_path, output_mime, error, created_at, claimed_at, finished_at")
            .eq("id", id)
            .maybeSingle();
          if (!job) return Response.json({ error: "Not found" }, { status: 404, headers: nodeCors });
          let output_url: string | undefined;
          if (job.status === "done" && job.output_path) {
            const { data: s } = await supabaseAdmin.storage.from(OUTPUT_BUCKET).createSignedUrl(job.output_path, 3600);
            output_url = s?.signedUrl;
          }
          return Response.json({ ...job, output_url }, { headers: nodeCors });
        }

        const [{ data: jobs }, { data: nodes }] = await Promise.all([
          supabaseAdmin.from("node_jobs").select("id, label, status, node_id, error, created_at, finished_at").order("created_at", { ascending: false }).limit(25),
          supabaseAdmin.from("compute_nodes").select("*").order("last_seen", { ascending: false }),
        ]);
        return Response.json({ jobs: jobs ?? [], nodes: nodes ?? [] }, { headers: nodeCors });
      },
    },
  },
});
