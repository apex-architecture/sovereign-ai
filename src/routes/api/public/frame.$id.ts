import { createFileRoute } from "@tanstack/react-router";

// Serves a storyboard frame from the private studio bucket. Frames are visitor drafts with
// random ids, so this read-only door returns nothing else and accepts nothing else.
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export const Route = createFileRoute("/api/public/frame/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!ID.test(params.id)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("storyboards").download(params.id);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
