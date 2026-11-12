import { createFileRoute } from "@tanstack/react-router";
import { nodeCors, requireNode, NODE_ID } from "@/lib/node-hub.server";

// A GPU node asks for work.
//   POST /api/public/nodes/claim  { node, gpu? }  → 200 { job: { id, workflow } } | 204 nothing waiting
export const Route = createFileRoute("/api/public/nodes/claim")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: nodeCors }),
      POST: async ({ request }) => {
        const no = requireNode(request);
        if (no) return no;
        let body: { node?: unknown; gpu?: unknown };
        try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: nodeCors }); }
        const node = typeof body.node === "string" ? body.node : "";
        if (!NODE_ID.test(node)) return Response.json({ error: "node must be 1-64 letters, digits, dot, dash or underscore" }, { status: 400, headers: nodeCors });
        const gpu = typeof body.gpu === "string" ? body.gpu.slice(0, 80) : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("claim_node_job", { _node: node, _gpu: gpu as string });
        if (error) return Response.json({ error: "Queue unavailable" }, { status: 500, headers: nodeCors });
        const job = Array.isArray(data) ? data[0] : null;
        if (!job) return new Response(null, { status: 204, headers: nodeCors });
        return Response.json({ job: { id: job.id, workflow: job.workflow } }, { headers: nodeCors });
      },
    },
  },
});
