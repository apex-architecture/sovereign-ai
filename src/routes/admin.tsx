import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Control — Sovereign AI Film Verse" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/", replace: true }); return; }
      setUserId(user.id);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin((roles ?? []).some(r => r.role === "admin"));
      setReady(true);
    })();
  }, [navigate]);

  const endpoints = useQuery({
    queryKey: ["endpoints"], enabled: ready && isAdmin,
    queryFn: async () => (await supabase.from("gpu_endpoints").select("*").order("created_at",{ascending:false})).data ?? [],
    refetchInterval: 10000,
  });
  const jobs = useQuery({
    queryKey: ["jobs"], enabled: ready,
    queryFn: async () => (await supabase.from("render_jobs").select("*").order("created_at",{ascending:false}).limit(50)).data ?? [],
    refetchInterval: 5000,
  });
  const influencers = useQuery({
    queryKey: ["adm-infl"], enabled: ready && isAdmin,
    queryFn: async () => (await supabase.from("influencers").select("*").order("vote_count",{ascending:false})).data ?? [],
  });
  const beta = useQuery({
    queryKey: ["beta"], enabled: ready && isAdmin,
    queryFn: async () => (await supabase.from("beta_signups").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const projects = useQuery({
    queryKey: ["adm-projects"], enabled: ready,
    queryFn: async () => (await supabase.from("projects").select("*").order("created_at",{ascending:false})).data ?? [],
  });

  if (!ready) return <div className="p-10 text-center text-xs uppercase neon-text">Authenticating…</div>;
  if (!isAdmin) return (
    <main className="max-w-xl mx-auto p-10 text-center">
      <div className="brutal-border p-6 bg-card">
        <h1 className="text-xl">ACCESS DENIED</h1>
        <p className="text-xs text-muted-foreground mt-2">This operator does not hold admin clearance.</p>
        <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
          className="mt-4 brutal-border px-4 py-2 text-xs font-bold uppercase hover:bg-primary">Sign Out</button>
      </div>
    </main>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <div className="brutal-border p-5 bg-card flex flex-wrap justify-between gap-3 items-center">
        <div>
          <div className="text-xs neon-text font-bold">▮ COMMAND CENTER</div>
          <h1 className="text-2xl">ADMIN CONTROL</h1>
          <div className="text-[10px] text-muted-foreground mt-1">UID: {userId?.slice(0,8)}…</div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
          className="brutal-border px-4 py-2 text-xs font-bold uppercase hover:bg-primary">Sign Out</button>
      </div>

      <EndpointsPanel data={endpoints.data ?? []} onChange={() => qc.invalidateQueries({ queryKey: ["endpoints"] })} />
      <JobsPanel data={jobs.data ?? []} endpoints={endpoints.data ?? []} userId={userId!} onChange={() => qc.invalidateQueries({ queryKey: ["jobs"] })} />
      <ProjectsPanel data={projects.data ?? []} userId={userId!} onChange={() => qc.invalidateQueries({ queryKey: ["adm-projects"] })} />
      <InfluencersPanel data={influencers.data ?? []} onChange={() => qc.invalidateQueries({ queryKey: ["adm-infl"] })} />
      <BetaPanel data={beta.data ?? []} />
    </main>
  );
}

function Panel({ title, sub, children }: any) {
  return (
    <section className="brutal-border bg-card">
      <div className="border-b-2 border-border px-4 py-3 flex justify-between items-baseline">
        <h2 className="text-sm font-bold uppercase">▮ {title}</h2>
        {sub && <span className="text-[10px] text-muted-foreground uppercase">{sub}</span>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EndpointsPanel({ data, onChange }: any) {
  const [name, setName] = useState(""); const [url, setUrl] = useState("");
  const [cost, setCost] = useState(""); 
  async function add() {
    if (!name || !url) return toast.error("Name and API URL required.");
    const { error } = await supabase.from("gpu_endpoints").insert({
      name, api_url: url, cost_per_minute: cost ? Number(cost) : null,
    });
    if (error) toast.error(error.message); else { toast.success("Endpoint added."); setName(""); setUrl(""); setCost(""); onChange(); }
  }
  async function ping(ep: any) {
    const t0 = Date.now();
    try {
      await fetch(ep.api_url, { method: "GET", mode: "no-cors" });
      const latency = Date.now() - t0;
      await supabase.from("gpu_endpoints").update({ status: "active", latency_ms: latency }).eq("id", ep.id);
      toast.success(`Ping ${latency}ms`);
    } catch {
      await supabase.from("gpu_endpoints").update({ status: "offline" }).eq("id", ep.id);
      toast.error("Ping failed.");
    }
    onChange();
  }
  async function del(id: string) {
    if (!confirm("Delete endpoint?")) return;
    await supabase.from("gpu_endpoints").delete().eq("id", id);
    onChange();
  }
  return (
    <Panel title="GPU Endpoints" sub={`${data.length} registered`}>
      <div className="grid md:grid-cols-[1fr_2fr_120px_auto] gap-2 mb-4">
        <input placeholder="Name (e.g. RunPod-A)" value={name} onChange={e=>setName(e.target.value)} className="brutal-border bg-background px-3 py-2 text-sm"/>
        <input placeholder="ComfyUI API URL" value={url} onChange={e=>setUrl(e.target.value)} className="brutal-border bg-background px-3 py-2 text-sm"/>
        <input placeholder="$/min" value={cost} onChange={e=>setCost(e.target.value)} className="brutal-border bg-background px-3 py-2 text-sm"/>
        <button onClick={add} className="brutal-border px-4 py-2 text-xs font-bold uppercase hover:bg-primary">+ Add</button>
      </div>
      <div className="space-y-2">
        {data.map((e: any) => (
          <div key={e.id} className="brutal-border p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${e.status==="active"?"neon-text":"text-muted-foreground"}`}>● {e.status}</span>
                <span className="font-bold text-sm">{e.name}</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{e.api_url}</div>
              <div className="text-[10px] text-muted-foreground">{e.latency_ms ? `${e.latency_ms}ms` : "—"} · {e.cost_per_minute ? `$${e.cost_per_minute}/min` : "—"}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={()=>ping(e)} className="brutal-border px-3 py-1 text-[10px] font-bold uppercase hover:bg-primary">Ping</button>
              <button onClick={()=>del(e.id)} className="brutal-border px-3 py-1 text-[10px] font-bold uppercase hover:bg-destructive">×</button>
            </div>
          </div>
        ))}
        {data.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No GPU endpoints. Plug in a ComfyUI/RunPod API URL to bridge the foundry.</div>}
      </div>
    </Panel>
  );
}

function JobsPanel({ data, endpoints, userId, onChange }: any) {
  const [endpointId, setEndpointId] = useState("");
  const [promptText, setPromptText] = useState("");
  async function trigger() {
    if (!promptText) return toast.error("Prompt required.");
    const { error } = await supabase.from("render_jobs").insert({
      owner_id: userId,
      endpoint_id: endpointId || null,
      prompt: { text: promptText },
      status: "queued",
    });
    if (error) toast.error(error.message); else { toast.success("Job queued."); setPromptText(""); onChange(); }
  }
  async function setStatus(id: string, status: string) {
    await supabase.from("render_jobs").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    onChange();
  }
  return (
    <Panel title="Render Jobs" sub={`${data.length} recent`}>
      <div className="grid md:grid-cols-[200px_1fr_auto] gap-2 mb-4">
        <select value={endpointId} onChange={e=>setEndpointId(e.target.value)} className="brutal-border bg-background px-3 py-2 text-sm">
          <option value="">(Any endpoint)</option>
          {endpoints.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input placeholder="Prompt — e.g. cinematic dystopian noir, 24fps" value={promptText} onChange={e=>setPromptText(e.target.value)} className="brutal-border bg-background px-3 py-2 text-sm"/>
        <button onClick={trigger} className="brutal-border px-4 py-2 text-xs font-bold uppercase hover:bg-primary">▸ Trigger Render</button>
      </div>
      <div className="space-y-1 max-h-96 overflow-auto">
        {data.map((j: any) => (
          <div key={j.id} className="brutal-border p-2 flex justify-between items-center gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${j.status==="failed"?"text-destructive":j.status==="done"?"neon-text":"text-muted-foreground"}`}>● {j.status}</span>
                <span className="truncate">{j.prompt?.text ?? "—"}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{new Date(j.created_at).toLocaleString()}</div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={()=>setStatus(j.id,"queued")} className="brutal-border px-2 py-1 text-[10px] uppercase hover:bg-primary">↻</button>
              <button onClick={()=>setStatus(j.id,"done")} className="brutal-border px-2 py-1 text-[10px] uppercase hover:bg-primary">✓</button>
              <button onClick={()=>setStatus(j.id,"failed")} className="brutal-border px-2 py-1 text-[10px] uppercase hover:bg-destructive">✕</button>
            </div>
          </div>
        ))}
        {data.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No jobs yet. Trigger one above.</div>}
      </div>
    </Panel>
  );
}

function ProjectsPanel({ data, userId, onChange }: any) {
  const [title, setTitle] = useState(""); const [tags, setTags] = useState("");
  async function add() {
    if (!title) return;
    const { error } = await supabase.from("projects").insert({
      owner_id: userId, title, style_tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
    });
    if (error) toast.error(error.message); else { setTitle(""); setTags(""); onChange(); }
  }
  async function toggleFeature(id: string, v: boolean) {
    await supabase.from("projects").update({ featured: !v }).eq("id", id);
    onChange();
  }
  return (
    <Panel title="Projects" sub={`${data.length} tracked`}>
      <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2 mb-4">
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} className="brutal-border bg-background px-3 py-2 text-sm"/>
        <input placeholder="style tags, comma separated" value={tags} onChange={e=>setTags(e.target.value)} className="brutal-border bg-background px-3 py-2 text-sm"/>
        <button onClick={add} className="brutal-border px-4 py-2 text-xs font-bold uppercase hover:bg-primary">+ New</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {data.map((p: any) => (
          <div key={p.id} className="brutal-border p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{p.title}</div>
                <div className="text-[10px] text-muted-foreground">{(p.style_tags??[]).join(" · ") || "—"}</div>
              </div>
              <button onClick={()=>toggleFeature(p.id, p.featured)}
                className={`brutal-border px-2 py-1 text-[10px] uppercase ${p.featured?"bg-primary":"hover:bg-primary"}`}>★</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function InfluencersPanel({ data, onChange }: any) {
  async function setStatus(id: string, status: string) {
    await supabase.from("influencers").update({ status }).eq("id", id);
    onChange();
  }
  async function del(id: string) {
    if (!confirm("Delete nominee?")) return;
    await supabase.from("influencers").delete().eq("id", id);
    onChange();
  }
  return (
    <Panel title="Public Verdict — Override" sub={`${data.length} nominees`}>
      <div className="space-y-1 max-h-96 overflow-auto">
        {data.map((i: any) => (
          <div key={i.id} className="brutal-border p-2 flex justify-between items-center gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${i.status==="live"?"neon-text":"text-muted-foreground"}`}>● {i.status}</span>
                <span className="font-bold">{i.name}</span>
                <span className="text-muted-foreground">{i.vote_count}</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{i.handle} · {i.platform}</div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={()=>setStatus(i.id,"live")} className="brutal-border px-2 py-1 text-[10px] uppercase hover:bg-primary">Live</button>
              <button onClick={()=>setStatus(i.id,"pending")} className="brutal-border px-2 py-1 text-[10px] uppercase hover:bg-primary">Hold</button>
              <button onClick={()=>del(i.id)} className="brutal-border px-2 py-1 text-[10px] uppercase hover:bg-destructive">×</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BetaPanel({ data }: any) {
  return (
    <Panel title="Beta Registry" sub={`${data.length} enlisted`}>
      <div className="space-y-1 max-h-80 overflow-auto">
        {data.map((b: any) => (
          <div key={b.id} className="brutal-border p-2 flex justify-between gap-2 text-xs">
            <div className="min-w-0">
              <div className="font-bold truncate">{b.email}</div>
              {b.note && <div className="text-[10px] text-muted-foreground truncate">{b.note}</div>}
            </div>
            <span className="text-[10px] font-bold uppercase neon-text shrink-0">{b.platform}</span>
          </div>
        ))}
        {data.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No beta signups yet.</div>}
      </div>
    </Panel>
  );
}
