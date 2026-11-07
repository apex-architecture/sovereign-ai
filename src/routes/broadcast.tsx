import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OwnerWall } from "@/components/OwnerWall";
import { toast } from "sonner";

export const Route = createFileRoute("/broadcast")({
  head: () => ({ meta: [{ title: "Broadcast — Sovereign AI Film Verse" }, { name: "description", content: "Share, embed, and broadcast your films." }]}),
  component: Broadcast,
});

function Broadcast() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => { supabase.auth.getUser().then(({data}) => setUserId(data.user?.id ?? null)); }, []);

  const jobs = useQuery({
    queryKey: ["bc-jobs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("render_jobs").select("*").eq("owner_id", userId!).eq("status", "done").order("created_at", { ascending: false }).limit(50);
      return (data ?? []).filter(j => (j.response_log as any)?.url);
    },
  });

  useEffect(() => { if (!selectedId && jobs.data?.[0]) setSelectedId(jobs.data[0].id); }, [jobs.data, selectedId]);

  const job = jobs.data?.find(j => j.id === selectedId);
  const url: string | undefined = (job?.response_log as any)?.url;
  const prompt: string = (job?.prompt as any)?.text ?? "";

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied`); };

  if (!userId) return <OwnerWall title="Broadcast" note="Sharing and exporting finished films is for the films' owner. Open Theater to see the showreel." />;const embed = url ? `<video src="${url}" controls style="width:100%;max-width:720px"></video>` : "";
  const shareText = `${prompt}\n\n— made in Sovereign AI Film Verse`;
  const twitter = url ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}` : "#";
  const reddit = url ? `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(prompt.slice(0,120))}` : "#";
  const fb = url ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` : "#";

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="brutal-border p-5 bg-card">
        <div className="text-xs neon-text font-bold">▮ BROADCAST</div>
        <h1 className="text-2xl">DISTRIBUTION HUB</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          {url && /\.(mp4|webm|mov)$/i.test(url)
            ? <video src={url} controls className="w-full brutal-border bg-black"/>
            : url ? <img src={url} className="w-full brutal-border"/> : <div className="brutal-border aspect-video flex items-center justify-center text-xs text-muted-foreground">Select a film</div>}

          {url && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <a href={twitter} target="_blank" rel="noreferrer" className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-primary text-center">▸ X / Twitter</a>
                <a href={reddit} target="_blank" rel="noreferrer" className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-primary text-center">▸ Reddit</a>
                <a href={fb} target="_blank" rel="noreferrer" className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-primary text-center">▸ Facebook</a>
                <a href={url} download className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-primary text-center">↓ Download</a>
              </div>
              <div className="brutal-border bg-card p-3 space-y-1">
                <div className="text-[10px] uppercase font-bold neon-text">Direct URL</div>
                <div className="text-[11px] font-mono break-all">{url}</div>
                <button onClick={() => copy(url, "URL")} className="brutal-border px-2 py-1 text-[10px] font-bold uppercase hover:bg-primary">Copy</button>
              </div>
              <div className="brutal-border bg-card p-3 space-y-1">
                <div className="text-[10px] uppercase font-bold neon-text">Embed Code</div>
                <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">{embed}</pre>
                <button onClick={() => copy(embed, "Embed")} className="brutal-border px-2 py-1 text-[10px] font-bold uppercase hover:bg-primary">Copy</button>
              </div>
            </>
          )}
        </div>

        <aside className="brutal-border bg-card p-3 max-h-[70vh] overflow-auto space-y-2">
          <div className="text-xs font-bold uppercase mb-2">▮ Pick A Film</div>
          {(jobs.data ?? []).map(j => (
            <button key={j.id} onClick={() => setSelectedId(j.id)}
              className={`block w-full text-left brutal-border p-2 ${j.id === selectedId ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <div className="text-[10px] uppercase font-bold opacity-70">{new Date(j.created_at).toLocaleDateString()}</div>
              <div className="text-[11px] line-clamp-2">{(j.prompt as any)?.text}</div>
            </button>
          ))}
          {(jobs.data ?? []).length === 0 && <div className="text-[11px] text-muted-foreground">No films yet.</div>}
        </aside>
      </div>
    </main>
  );
}
