import { createFileRoute } from "@tanstack/react-router";
import { nodeCors, requireNode, NODE_ID, JOB_ID } from "@/lib/node-hub.server";

// A GPU node reports that a job could not be finished.
//   POST /api/public/nodes/fail  { id, node, error }
export const Route = createFileRoute("/api/public/nodes/fail")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: nodeCors }),
      POST: async ({ request }) => {
        const no = requireNode(request);
        if (no) return no;
        let body: { id?: unknown; node?: unknown; error?: unknown };
        try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: nodeCors }); }
        const id = typeof body.id === "string" ? body.id : "";
        const node = typeof body.node === "string" ? body.node : "";
        if (!JOB_ID.test(id) || !NODE_ID.test(node)) return Response.json({ error: "Bad id or node" }, { status: 400, headers: nodeCors });
        const message = (typeof body.error === "string" ? body.error : "Node reported a failure").slice(0, 500);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows } = await supabaseAdmin.from("node_jobs")
          .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
          .eq("id", id).eq("node_id", node).eq("status", "claimed")
          .select("id");
        if (!rows?.length) return Response.json({ error: "This job is not claimed by this node" }, { status: 409, headers: nodeCors });
        const { data: n } = await supabaseAdmin.from("compute_nodes").select("jobs_failed").eq("node_id", node).maybeSingle();
        await supabaseAdmin.from("compute_nodes").update({ jobs_failed: (n?.jobs_failed ?? 0) + 1, last_seen: new Date().toISOString() }).eq("node_id", node);
        return Response.json({ ok: true }, { headers: nodeCors });
      },
    },
  },
});
