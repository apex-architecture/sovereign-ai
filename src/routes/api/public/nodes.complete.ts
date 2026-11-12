import { createFileRoute } from "@tanstack/react-router";
import { nodeCors, requireNode, NODE_ID, JOB_ID, MAX_OUTPUT_BYTES, OUTPUT_BUCKET, safeFilename, ALLOWED_MIME } from "@/lib/node-hub.server";

// A GPU node hands back its finished file.
//   POST /api/public/nodes/complete?id=<job>&node=<node>   raw body = file bytes
//   headers: Content-Type (video/*, image/*, audio/*), X-Filename
// Only the node that claimed the job can complete it.
export const Route = createFileRoute("/api/public/nodes/complete")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: nodeCors }),
      POST: async ({ request }) => {
        const no = requireNode(request);
        if (no) return no;
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        const node = url.searchParams.get("node") ?? "";
        if (!JOB_ID.test(id) || !NODE_ID.test(node)) return Response.json({ error: "Bad id or node" }, { status: 400, headers: nodeCors });
        const mime = (request.headers.get("content-type") ?? "application/octet-stream").split(";")[0].trim();
        if (!ALLOWED_MIME.test(mime)) return Response.json({ error: "Only video, image or audio files" }, { status: 415, headers: nodeCors });
        const declared = Number(request.headers.get("content-length") ?? "0");
        if (declared > MAX_OUTPUT_BYTES) return Response.json({ error: "File too large (95 MB max)" }, { status: 413, headers: nodeCors });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: job } = await supabaseAdmin.from("node_jobs").select("id, status, node_id").eq("id", id).maybeSingle();
        if (!job) return Response.json({ error: "Not found" }, { status: 404, headers: nodeCors });
        if (job.status !== "claimed" || job.node_id !== node) return Response.json({ error: "This job is not claimed by this node" }, { status: 409, headers: nodeCors });

        const bytes = await request.arrayBuffer();
        if (bytes.byteLength === 0) return Response.json({ error: "Empty file" }, { status: 400, headers: nodeCors });
        if (bytes.byteLength > MAX_OUTPUT_BYTES) return Response.json({ error: "File too large (95 MB max)" }, { status: 413, headers: nodeCors });

        const path = `${id}/${safeFilename(request.headers.get("x-filename"))}`;
        const up = await supabaseAdmin.storage.from(OUTPUT_BUCKET).upload(path, bytes, { contentType: mime, upsert: true });
        if (up.error) return Response.json({ error: "Could not store the file" }, { status: 500, headers: nodeCors });

        await supabaseAdmin.from("node_jobs")
          .update({ status: "done", output_path: path, output_mime: mime, finished_at: new Date().toISOString(), error: null })
          .eq("id", id).eq("node_id", node);
        const { data: n } = await supabaseAdmin.from("compute_nodes").select("jobs_done").eq("node_id", node).maybeSingle();
        await supabaseAdmin.from("compute_nodes").update({ jobs_done: (n?.jobs_done ?? 0) + 1, last_seen: new Date().toISOString() }).eq("node_id", node);
        return Response.json({ ok: true }, { headers: nodeCors });
      },
    },
  },
});
