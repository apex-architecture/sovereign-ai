import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/nominate")({
  head: () => ({
    meta: [
      { title: "Nominate — Sovereign AI Filmverse" },
      { name: "description", content: "Nominate AI film creators. Auto-promotion to Live at 1,000 votes." },
    ],
  }),
  component: NominatePage,
});

function getFingerprint() {
  if (typeof window === "undefined") return "ssr";
  let fp = localStorage.getItem("apex_fp");
  if (!fp) { fp = crypto.randomUUID(); localStorage.setItem("apex_fp", fp); }
  return fp;
}

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  handle: z.string().trim().max(80).optional(),
  platform: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(500).optional(),
});

function NominatePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", handle: "", platform: "YouTube", bio: "" });
  const fp = typeof window !== "undefined" ? getFingerprint() : "ssr";

  const { data: list = [] } = useQuery({
    queryKey: ["influencers"],
    queryFn: async () => {
      const { data } = await supabase.from("influencers")
        .select("id,name,handle,platform,vote_count,status")
        .order("vote_count", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const ch = supabase.channel("infl-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "influencers" },
        () => qc.invalidateQueries({ queryKey: ["influencers"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" },
        () => qc.invalidateQueries({ queryKey: ["influencers"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error("Check the form fields."); return; }
    const { error } = await supabase.from("influencers").insert({
      name: parsed.data.name,
      handle: parsed.data.handle || null,
      platform: parsed.data.platform || null,
      bio: parsed.data.bio || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Nominated."); setForm({ name: "", handle: "", platform: "YouTube", bio: "" }); }
  }

  async function vote(id: string) {
    const { error } = await supabase.from("votes").insert({ influencer_id: id, voter_fingerprint: fp });
    if (error) {
      if (error.code === "23505") toast.error("Already voted for this creator.");
      else toast.error(error.message);
    } else toast.success("Vote cast.");
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-10 grid lg:grid-cols-[1fr_2fr] gap-6">
      <section className="brutal-border p-5 bg-card h-fit">
        <div className="text-xs neon-text font-bold">▮ SUBMIT NOMINATION</div>
        <h1 className="text-2xl mt-1">CREATOR INTAKE</h1>
        <p className="text-xs text-muted-foreground mt-2">Reach 1,000 votes → auto-promoted to LIVE index.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Input label="Name" value={form.name} onChange={v => setForm({...form, name: v})} />
          <Input label="Handle" value={form.handle} onChange={v => setForm({...form, handle: v})} />
          <Input label="Platform" value={form.platform} onChange={v => setForm({...form, platform: v})} />
          <Textarea label="Bio" value={form.bio} onChange={v => setForm({...form, bio: v})} />
          <button className="w-full brutal-border py-3 text-xs font-bold uppercase hover:bg-primary">▸ Submit</button>
        </form>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl">▮ LEADERBOARD <span className="text-xs text-muted-foreground font-normal">(realtime)</span></h2>
          <span className="text-xs text-muted-foreground">{list.length} creators</span>
        </div>
        <div className="space-y-2">
          {list.map((i, idx) => {
            const pct = Math.min(100, (i.vote_count / 1000) * 100);
            return (
              <div key={i.id} className="brutal-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                      <span className="text-muted-foreground">#{idx+1}</span>
                      <span className={i.status === "live" ? "neon-text" : "text-muted-foreground"}>● {i.status}</span>
                    </div>
                    <div className="font-bold mt-1 truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{i.handle} · {i.platform}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-lg tabular-nums">{i.vote_count.toLocaleString()}</div>
                    <button onClick={() => vote(i.id)} className="mt-1 brutal-border px-3 py-1 text-[10px] font-bold uppercase hover:bg-primary">+ Vote</button>
                  </div>
                </div>
                <div className="mt-3 h-1 bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="brutal-card p-6 text-center text-sm text-muted-foreground">No nominees yet — be first.</div>
          )}
        </div>
      </section>
    </main>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 brutal-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
    </label>
  );
}
function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full mt-1 brutal-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
    </label>
  );
}
