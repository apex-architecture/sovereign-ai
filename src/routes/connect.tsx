import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToolIcon, CATEGORY } from "@/components/tool-icons";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CONNECTIONS, STAGE_CONNECTION, depthCount, stageCoverage, type ConnectionRow, type ConnectionDepth } from "@/lib/apex/connection";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Corners, PanelHead, Pip, Stat, Tag, type Tone } from "@/components/hud";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect — The One Door · Sovereign AI Filmverse" },
      { name: "description", content: "Every tool the studio knows, the honest depth of each connection, and where to plug in your own machines." },
      { property: "og:title", content: "Connect — The One Door · Sovereign AI Filmverse" },
      { property: "og:description", content: "Every tool the studio knows, the honest depth of each connection, and where to plug in your own machines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Connect,
});

const DEPTH: Record<ConnectionDepth, { tone: Tone; label: string; note: string }> = {
  drivable: { tone: "ok", label: "Drivable", note: "The studio launches it and reads the result — no human hands." },
  "file-exchange": { tone: "signal", label: "Hand-off", note: "The studio prepares the files and takes them back; a person operates the app." },
  "portal-only": { tone: "warn", label: "Portal only", note: "The studio can link to it and record what happened — it cannot operate it." },
  "not-yet": { tone: "bad", label: "Catalogue only", note: "Listed, not built. No run button until a real driver exists." },
};

const STAGE_LABEL: Record<string, string> = {
  storyboard: "Storyboard", character_lock: "Character Lock", motion: "Motion", dialogue: "Dialogue", music: "Score",
  sound: "Sound", subtitles: "Subtitles", edit: "Edit", finish: "Finish", publish: "Publish",
};

/** Driver data is shared with the laptop-side repo; rebrand legacy wording at display time only. */
const say = (t: string) => t.replace(/\bAPEX\b/g, "The studio").replace(/The studio (verifies|records|builds|hands|prepares)/g, (_m, v) => `the studio ${v}`).replace(/^the studio/, "The studio");

const ORDER: ConnectionDepth[] = ["drivable", "file-exchange", "portal-only", "not-yet"];

function Connect() {
  const depths = depthCount();
  const coverage = stageCoverage();
  const [open, setOpen] = useState<ConnectionRow | null>(null);
  const [filter, setFilter] = useState<ConnectionDepth | "all">("all");
  const rows = CONNECTIONS.filter((c) => filter === "all" || c.depth === filter)
    .sort((a, b) => ORDER.indexOf(a.depth) - ORDER.indexOf(b.depth));

  return (
    <main className="mx-auto max-w-[1600px] space-y-3 overflow-x-hidden px-3 py-4 md:px-4 md:py-5">
      <section className="panel relative overflow-hidden">
        <Corners />
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative grid gap-6 p-5 md:p-7 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="font-display text-[34px] font-bold leading-none tracking-[0.02em] text-primary text-glow md:text-[52px]">Connect — the one door</h1>
            <p className="hud mt-3 text-[11px] tracking-[0.3em]">Tools. Media. Models. People. One flow.</p>
            <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              One job runner sits above every tool. It checks the licence, probes whether the tool is reachable, runs it,
              and falls through to the next candidate when it fails. A tool we can only hand files to is never called an integration.
            </p>
          </div>
          <div className="grid grid-cols-2 divide-hairline sm:grid-cols-4 sm:divide-x">
            {[
              { v: CONNECTIONS.length, l: "Tools", c: "text-foreground" },
              { v: depths.drivable, l: "Drivable", c: "text-ok" },
              { v: depths["file-exchange"], l: "Hand-off", c: "text-warn" },
              { v: `${coverage.wired}/${coverage.total}`, l: "Stages routed", c: "text-foreground" },
            ].map((s) => (
              <div key={s.l} className="px-5 py-2 text-center">
                <div className={cn("font-mono text-[34px] font-medium tabular-nums leading-none", s.c)}>{s.v}</div>
                <div className={cn("hud mt-2 text-[10px]", s.c !== "text-foreground" && s.c)}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_400px]">
        <div className="space-y-3 min-w-0">
          {/* Stage coverage */}
          <div className="panel">
            <PanelHead code="SPN" title={`Film stages — ${coverage.wired}/${coverage.total} have a tool behind them`} />
            <div className="grid gap-px bg-hairline sm:grid-cols-2">
              {Object.entries(STAGE_CONNECTION).map(([stage, tools], i) => {
                const best = tools.map((t) => CONNECTIONS.find((c) => c.toolId === t)).filter(Boolean) as ConnectionRow[];
                const top = best.sort((a, b) => ORDER.indexOf(a.depth) - ORDER.indexOf(b.depth))[0];
                const tone: Tone = top ? DEPTH[top.depth].tone : "bad";
                return (
                  <div key={stage} className={cn("flex items-center gap-3 bg-card px-3 py-2.5", tools.length === 0 && "hatch-danger")}>
                    <span className="font-display w-7 text-lg font-bold tabular-nums text-muted-foreground/50">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]"><Pip tone={tone} pulse={!tools.length} />{STAGE_LABEL[stage] ?? stage}</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {tools.length === 0 ? <span className="text-primary">No driver — this stage stops the pipeline</span>
                          : best.map((b) => b.name).join(" → ")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Equipment rack */}
          <div className="panel">
            <PanelHead code="RCK" title="Equipment rack"
              right={
                <div className="no-scrollbar flex overflow-x-auto border border-border">
                  {(["all", ...ORDER] as const).map((d) => (
                    <button key={d} onClick={() => setFilter(d)}
                      className={cn("whitespace-nowrap px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                        filter === d ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                      {d === "all" ? "All" : DEPTH[d].label}
                    </button>
                  ))}
                </div>
              } />
            <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {rows.map((c) => {
                const d = DEPTH[c.depth];
                const badge = d.tone === "ok" ? "border-ok/60 text-ok" : d.tone === "signal" ? "border-warn/60 text-warn" : d.tone === "warn" ? "border-foreground/30 text-foreground/80" : "border-primary/50 text-primary";
                return (
                  <button key={c.toolId} onClick={() => setOpen(c)}
                    className={cn("group relative flex min-h-[210px] flex-col rounded-sm border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-rack", c.depth === "not-yet" && "opacity-85")}>
                    <div className="flex items-start justify-between gap-2">
                      <ToolIcon id={c.toolId} className={cn("h-12 w-12", d.tone === "ok" ? "text-primary" : d.tone === "signal" ? "text-warn" : "text-foreground/70")} />
                      <span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em]", badge)}>
                        {d.label}{d.tone === "ok" && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
                      </span>
                    </div>
                    <div className="mt-4 font-display text-[18px] font-bold">{c.name}</div>
                    <span className="mt-1.5 w-fit rounded-sm bg-rack px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">{CATEGORY[c.toolId] ?? "Tool"}</span>
                    <p className="mt-3 line-clamp-2 flex-1 text-[11.5px] leading-snug text-foreground/80">{say(c.does)}</p>
                    <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                      <span className="truncate">{c.where}</span>
                      <span className="ml-2 shrink-0 group-hover:text-foreground">Details →</span>
                    </div>
                  </button>
                );
              })}
              <Link to="/registry" className="flex min-h-[210px] flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-foreground/20 p-4 text-center text-muted-foreground hover:border-foreground/40 hover:text-foreground">
                <span className="text-3xl font-light">+</span>
                <span className="font-mono text-[12px] tracking-[0.18em]">BROWSE THE MASTER REGISTRY</span>
                <span className="text-[11px]">Every catalogued tool, licence and exit.</span>
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <DriverFlow />
          <PlugMachine />
          <div className="panel">
            <PanelHead code="KEY" title="Keys & outside access" />
            <ul className="divide-y divide-hairline text-[11px]">
              <li className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div><div className="font-bold uppercase">Cloud video</div><div className="hud text-[8.5px]">Minimax · Kling — built in</div></div>
                <Tag tone="ok">Built in</Tag>
              </li>
              <li className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div><div className="font-bold uppercase">Coding agents & scripts</div><div className="hud text-[8.5px]">Operator token · render endpoint</div></div>
                <Tag tone="ok">Open</Tag>
              </li>
              <li className="px-3 py-2.5 text-muted-foreground">
                Other services (voice, music, editing apps) get a key slot the day their driver is built — until then they stay catalogue only.
              </li>
            </ul>
          </div>
          <div className="flex gap-1.5">
            <Link to="/registry" className="panel flex-1 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest hover:border-foreground">Master registry</Link>
            <Link to="/director" className="panel flex-1 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest hover:border-foreground">Director</Link>
          </div>
        </aside>
      </section>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full border-l border-border bg-card sm:max-w-md">
          {open && <ToolDetail c={open} />}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function ToolDetail({ c }: { c: ConnectionRow }) {
  const d = DEPTH[c.depth];
  const stages = Object.entries(STAGE_CONNECTION).filter(([, t]) => t.includes(c.toolId)).map(([s]) => STAGE_LABEL[s] ?? s);
  return (
    <div className="space-y-5">
      <SheetHeader className="text-left">
        <div className="hud text-primary">{c.toolId}</div>
        <SheetTitle className="font-display text-3xl uppercase">{c.name}</SheetTitle>
        <SheetDescription className="text-[12px]">{say(c.does)}</SheetDescription>
      </SheetHeader>

      <div className="rack space-y-2 p-3">
        <Tag tone={d.tone}>{d.label}</Tag>
        <p className="text-[12px] text-foreground/85">{d.note}</p>
      </div>

      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-[12px]">
        <dt className="hud pt-0.5">Runs on</dt><dd>{c.where}</dd>
        <dt className="hud pt-0.5">Stages</dt><dd>{stages.length ? stages.join(", ") : "—"}</dd>
        <dt className="hud pt-0.5">Still needs</dt><dd className="text-foreground/85">{say(c.needs)}</dd>
      </dl>

      {c.depth === "drivable" ? (
        <div className="border border-ok/40 bg-ok/10 p-3 text-[12px]">
          {c.toolId === "replicate"
            ? "Wired. Create, Director and the outside render endpoint already use it."
            : c.toolId === "comfyui"
              ? "Wired. Plug your ComfyUI address into the rack on the right and it joins the fleet."
              : "Wired through the local runner on your own computer. The studio calls it when that runner is online."}
        </div>
      ) : (
        <div className="hatch-danger border border-primary/40 p-3 text-[12px]">
          <div className="font-bold uppercase tracking-widest text-primary">No run button — on purpose</div>
          <p className="mt-1 text-foreground/85">
            {c.depth === "file-exchange"
              ? "The studio prepares the hand-off files; a person finishes the job in the app."
              : c.depth === "portal-only"
                ? "The studio records the link you publish to. It does not press the button for you."
                : "Catalogue only, awaiting a real driver. Nothing here will pretend to run."}
          </p>
        </div>
      )}
    </div>
  );
}

/** How a "Generate" job resolves today, from the real driver table and the real fleet. */
function DriverFlow() {
  const fleet = useQuery({
    queryKey: ["deck-fleet"],
    queryFn: async () => (await supabase.from("gpu_endpoints").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const comfyOnline = (fleet.data ?? []).some((e: any) => e.status === "active");
  const steps: { id: string; title: string; sub: string; verdict: "YES" | "NO" | "LISTED"; note: string }[] = [
    { id: "replicate", title: "Try driver: Replicate", sub: "Cloud video · built in", verdict: "YES", note: "Minimax / Kling ready" },
    { id: "comfyui", title: "Try driver: ComfyUI", sub: "Your GPU machine", verdict: comfyOnline ? "YES" : "NO", note: comfyOnline ? "Machine answered" : "No machine online" },
    { id: "licence", title: "Licence terms", sub: "From the tool catalogue", verdict: "LISTED", note: "Signed into the receipt by your laptop runner" },
  ];
  const [now, setNow] = useState("");
  useEffect(() => { setNow(new Date().toISOString().slice(11, 19)); }, []);
  return (
    <div className="panel">
      <div className="border-b border-hairline px-4 py-3">
        <div className="hud text-[9px]">Flow</div>
        <div className="mt-1 font-mono text-[15px] tracking-[0.08em]">RENDER JOB — DRIVER RESOLUTION</div>
        <div className="mt-1 text-[11px] text-muted-foreground">Try drivers in order. Check licence. Route or fall through.</div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-3 rounded-sm border border-primary/70 p-3 red-laser">
          <ToolIcon id="ffmpeg" className="h-8 w-8 text-primary" />
          <div className="font-mono text-[11px]"><div className="text-[13px] text-primary">Render job</div><div className="text-muted-foreground">stage: generate · type: video</div></div>
        </div>
        {steps.map((s) => (
          <div key={s.id}>
            <div className="ml-6 h-3 w-px bg-primary/60" />
            <div className="flex items-center gap-3 rounded-sm border border-border bg-card p-3">
              <ToolIcon id={s.id === "licence" ? "kdenlive" : s.id} className="h-7 w-7 shrink-0 text-foreground/80" />
              <div className="min-w-0 flex-1 font-mono">
                <div className="truncate text-[12px]">{s.title}</div>
                <div className="truncate text-[10px] text-muted-foreground">{s.sub}</div>
              </div>
              <span className={cn("shrink-0 rounded-sm border px-2 py-1 font-mono text-[11px] font-bold",
                s.verdict === "NO" ? "border-foreground/30 text-foreground/70" : "border-ok/70 bg-ok/10 text-ok")}>{s.verdict}</span>
            </div>
            <div className="ml-12 mt-1 font-mono text-[9.5px] text-muted-foreground">{s.note}</div>
          </div>
        ))}
        <div className="ml-6 h-3 w-px bg-primary/60" />
        <div className="flex items-center gap-3 rounded-sm border border-primary/70 p-3 red-laser">
          <ToolIcon id="replicate" className="h-8 w-8 text-primary" />
          <div className="font-mono"><div className="text-[13px]">Route to Replicate</div><div className="text-[10px] text-muted-foreground">Execute render workflow</div></div>
        </div>
      </div>
      <div className="border-t border-hairline px-4 py-3 font-mono text-[10px] leading-[1.9] text-muted-foreground">
        <div className="mb-1 flex items-center justify-between"><span className="text-foreground/80">FLOW LOG</span><span className="text-muted-foreground">next job · checked {now} UTC</span></div>
        <div>Checking driver: Replicate ..... <span className="text-ok">YES</span></div>
        <div>Checking driver: ComfyUI ...... <span className={comfyOnline ? "text-ok" : "text-primary"}>{comfyOnline ? "YES" : "NO"}</span></div>
        <div>Licence terms ................. <span className="text-ok">LISTED</span></div>
        <div>Would route to ................ <span className="text-ok">{comfyOnline ? "YOUR MACHINE / REPLICATE" : "REPLICATE"}</span></div>
      </div>
    </div>
  );
}

function PlugMachine() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fleet = useQuery({
    queryKey: ["deck-fleet"],
    queryFn: async () => (await supabase.from("gpu_endpoints").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const clean = url.trim().replace(/\/+$/, "");
    if (!name.trim() || !/^https?:\/\//.test(clean)) return toast.error("Give it a name and a full https:// address.");
    setBusy(true);
    const { error } = await supabase.from("gpu_endpoints").insert({ name: name.trim(), api_url: clean });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Machine plugged in. Pinging…");
    setName(""); setUrl("");
    await qc.invalidateQueries({ queryKey: ["deck-fleet"] });
  }

  async function ping(ep: any) {
    const t0 = performance.now();
    try {
      await fetch(`${ep.api_url}/system_stats`, { mode: "cors" });
      const ms = Math.round(performance.now() - t0);
      await supabase.from("gpu_endpoints").update({ status: "active", latency_ms: ms }).eq("id", ep.id);
      toast.success(`${ep.name} answered in ${ms} ms`);
    } catch {
      await supabase.from("gpu_endpoints").update({ status: "offline" }).eq("id", ep.id);
      toast.error(`${ep.name} didn't answer. Is ComfyUI running on port 8188 with CORS on?`);
    }
    qc.invalidateQueries({ queryKey: ["deck-fleet"] });
  }

  async function remove(id: string) {
    await supabase.from("gpu_endpoints").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["deck-fleet"] });
  }

  return (
    <div className="panel relative">
      <PanelHead code="GPU" title="Plug in a machine" />
      <form onSubmit={add} className="space-y-2 p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name — e.g. RunPod L4"
          className="w-full border border-border bg-screen px-3 py-2 text-[12px] focus:border-signal focus:outline-none" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://<pod>-8188.proxy.runpod.net"
          className="w-full border border-border bg-screen px-3 py-2 text-[12px] focus:border-signal focus:outline-none" />
        <button disabled={busy} className="w-full bg-signal py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-foreground glow-signal hover:brightness-110 disabled:opacity-50">
          {busy ? "…" : "＋ Add to fleet"}
        </button>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Use the ComfyUI address (port 8188), not the web terminal. Your pod must be running.
        </p>
      </form>
      <ul className="divide-y divide-hairline border-t border-hairline">
        {(fleet.data ?? []).map((ep: any) => {
          const tone: Tone = ep.status === "active" ? "ok" : ep.status === "offline" ? "bad" : "idle";
          return (
            <li key={ep.id} className="flex items-center gap-2 px-3 py-2">
              <Pip tone={tone} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-bold uppercase">{ep.name}</div>
                <div className="hud truncate text-[8.5px]">{ep.api_url}{ep.latency_ms != null ? ` · ${ep.latency_ms} ms` : ""}</div>
              </div>
              <button onClick={() => ping(ep)} className="hud border border-border px-1.5 py-1 hover:border-signal hover:text-signal">Ping</button>
              <button onClick={() => remove(ep.id)} aria-label={`Remove ${ep.name}`} className="hud border border-border px-1.5 py-1 hover:border-primary hover:text-primary">✕</button>
            </li>
          );
        })}
        {(fleet.data?.length ?? 0) === 0 && <li className="px-3 py-3 text-[11px] text-muted-foreground">No machines yet.</li>}
      </ul>
    </div>
  );
}
