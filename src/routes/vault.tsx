import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OwnerWall } from "@/components/OwnerWall";
import { toast } from "sonner";

export const Route = createFileRoute("/vault")({
  head: () => ({ meta: [{ title: "Vault — Sovereign AI Filmverse" }, { name: "description", content: "Searchable archive of every film you've forged." }]}),
  component: Vault,
});

function Vault() {
  const [userId, setUserId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "done" | "rendering" | "failed" | "fav">("all");
  const [favs, setFavs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => setUserId(data.user?.id ?? null));
    try { setFavs(JSON.parse(localStorage.getItem("apex.favs") || "{}")); } catch {}
  }, []);

  const toggleFav = (id: string) => {
    setFavs(prev => {
      const n = { ...prev, [id]: !prev[id] };
      if (!n[id]) delete n[id];
      localStorage.setItem("apex.favs", JSON.stringify(n));
      return n;
    });
  };

  const jobs = useQuery({
    queryKey: ["vault-jobs", userId],
    enabled: !!userId,
    queryFn: async () => (await supabase.from("render_jobs").select("*").eq("owner_id", userId!).order("created_at", { ascending: false }).limit(500)).data ?? [],
    refetchInterval: 6000,
  });

  const filtered = useMemo(() => {
    const all = jobs.data ?? [];
    return all.filter(j => {
      if (filter === "fav" && !favs[j.id]) return false;
      else if (filter !== "all" && filter !== "fav" && j.status !== filter) return false;
      if (q && !JSON.stringify(j.prompt).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [jobs.data, q, filter, favs]);

  if (!userId) return <OwnerWall title="The Vault" note="This is where the studio owner's finished films are kept. Visitors can explore the rest of the studio freely." />;return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="brutal-border p-4 bg-card">
        <div className="text-xs neon-text font-bold">▮ VAULT</div>
        <h1 className="text-2xl">FILM ARCHIVE</h1>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="search prompts…"
          className="flex-1 min-w-[180px] brutal-border bg-background px-3 py-2 text-sm" />
        {(["all","done","rendering","failed","fav"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`brutal-border px-3 py-2 text-[10px] uppercase font-bold ${filter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {f === "fav" ? "★ Favs" : f}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(j => {
          const u = (j.response_log as any)?.url as string | undefined;
          const isVid = u && /\.(mp4|webm|mov)$/i.test(u);
          const txt = (j.prompt as any)?.text ?? "—";
          return (
            <div key={j.id} className="brutal-border bg-card p-2 space-y-2">
              {u ? (isVid
                ? <video src={u} controls className="w-full brutal-border bg-black" />
                : <img src={u} className="w-full brutal-border" alt="" />)
                : <div className={`brutal-border aspect-video flex items-center justify-center text-[10px] uppercase ${j.status === "failed" ? "text-destructive" : "animate-pulse text-muted-foreground"}`}>● {j.status}</div>}
              <div className="text-[11px] line-clamp-3">{txt}</div>
              <div className="flex gap-1">
                <button onClick={() => toggleFav(j.id)} className={`brutal-border px-2 py-1 text-[10px] font-bold ${favs[j.id] ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>★</button>
                <button onClick={() => { navigator.clipboard.writeText(txt); toast.success("Prompt copied"); }} className="brutal-border px-2 py-1 text-[10px] font-bold uppercase hover:bg-muted flex-1">Copy Prompt</button>
                {u && <a href={u} download className="brutal-border px-2 py-1 text-[10px] font-bold uppercase hover:bg-primary">↓</a>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-xs text-muted-foreground col-span-full text-center py-12">Empty vault.</div>}
      </div>
    </main>
  );
}
