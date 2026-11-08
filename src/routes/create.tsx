import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Dices, Download, Lightbulb, Sparkle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startCloudRender, pollCloudRender } from "@/lib/render.functions";
import { enhancePrompt } from "@/lib/oracle.functions";
import { STYLE_IMAGES, SHOWREEL } from "@/lib/stills";
import { Pip, Tag } from "@/components/hud";
import { cn } from "@/lib/utils";
import { PinGate } from "@/components/PinGate";
import { toast } from "sonner";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create — Sovereign AI Filmverse" },
      { name: "description", content: "Describe your vision, pick a look, and roll camera on the built-in cloud GPU." },
      { property: "og:title", content: "Create — Sovereign AI Filmverse" },
      { property: "og:description", content: "Describe your vision, pick a look, and roll camera on the built-in cloud GPU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

const STYLES = [
  { id: "cinematic", label: "Cinematic", suffix: "cinematic, 35mm film grain, dramatic lighting, anamorphic, shallow depth of field" },
  { id: "anime", label: "Anime", suffix: "anime film style, painterly cel shading, expressive lighting, Makoto Shinkai inspired" },
  { id: "noir", label: "Noir", suffix: "black and white film noir, hard side light, venetian blind shadows, smoke, high contrast" },
  { id: "doc", label: "Documentary", suffix: "handheld documentary realism, natural colors, candid framing" },
  { id: "cyberpunk", label: "Cyberpunk", suffix: "cyberpunk, neon, rain, atmospheric haze, blade-runner aesthetic, volumetric lighting" },
  { id: "dream", label: "Dreamlike", suffix: "ethereal surreal, soft focus, pastel, slow drifting motion" },
];

// Clip length is set by the engine; only lengths a real engine makes are selectable.
const LENGTHS = [
  { id: "fast", label: "6s", sub: "Fast · Minimax", tier: "fast" as const },
  { id: "quality", label: "5s", sub: "Sharp · Kling", tier: "quality" as const },
  { id: "10", label: "10s", sub: "Needs driver", tier: null },
  { id: "30", label: "30s", sub: "Use Director", tier: null },
];

const EXAMPLES = [
  "A lone astronaut walks through a massive, abandoned space station, cinematic lighting, 35mm film look, moody, mysterious",
  "Rain hammers a neon alley at 3am; a courier in a red coat stops, looks up as a drone sweeps its light across her face",
  "Dawn over a crimson forest on an alien world, a traveller in a long coat walks toward gothic spires in the mist",
  "An old lighthouse keeper climbs the spiral stairs as a storm swallows the coast, lantern light flickering on wet stone",
  "A child releases a paper boat into a flooded city street, the camera follows it past drowned cars and glowing windows",
];

function CreatePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0].id);
  const [tier, setTier] = useState<"fast" | "quality">("fast");
  const [busy, setBusy] = useState(false);
  const [improving, setImproving] = useState(false);
  const [phase, setPhase] = useState("");

  const start = useServerFn(startCloudRender);
  const poll = useServerFn(pollCloudRender);
  const improve = useServerFn(enhancePrompt);

  const [unlock, setUnlock] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const jobs = useQuery({
    queryKey: ["create-jobs", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase.from("render_jobs").select("*").eq("owner_id", userId!).order("created_at", { ascending: false }).limit(12)).data ?? [],
    refetchInterval: 4000,
  });

  async function doImprove() {
    if (prompt.trim().length < 3) return toast.error("Write a few words first.");
    setImproving(true);
    try {
      const mode = style === "doc" ? "documentary" : style === "dream" ? "surreal" : "cinematic";
      const { enhanced } = await improve({ data: { raw: prompt.trim(), mode } });
      setPrompt(enhanced.slice(0, 1000));
      toast.success("Oracle rewrote your shot.");
    } catch (e: any) {
      toast.error(e?.message ?? "Oracle is unavailable right now.");
    } finally { setImproving(false); }
  }

  async function generate() {
    if (!userId) return toast.error("Session expired. Reload to re-enter PIN.");
    if (!prompt.trim()) return toast.error("Describe your vision first.");
    setBusy(true);
    setPhase("Dispatching to cloud GPU…");
    try {
      const suffix = STYLES.find((s) => s.id === style)!.suffix;
      const { jobId, predictionId } = await start({ data: { prompt: `${prompt.trim()}, ${suffix}`, tier } });
      toast.success("Camera rolling.");
      setPhase("Rendering — usually 1–3 minutes…");
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await poll({ data: { jobId, predictionId } });
        if (s.status === "done") { setPhase("Done — it's in Theater."); toast.success("Film ready."); break; }
        if (s.status === "failed") { setPhase(""); toast.error(s.error ?? "Failed"); break; }
        setPhase(`Rendering · ${s.status} · ${(i + 1) * 5}s`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Render failed");
      setPhase("");
    } finally {
      setBusy(false);
      jobs.refetch();
    }
  }

  const list = jobs.data ?? [];

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-5 md:px-6 md:py-6">
      {unlock && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-screen">
          <button type="button" onClick={() => setUnlock(false)}
            className="fixed right-4 top-4 z-[101] border border-border bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
            Close
          </button>
          <PinGate><Unlocked onDone={() => setUnlock(false)} /></PinGate>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0 space-y-7">
          {/* Vision */}
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h1 className="font-mono text-[13px] font-medium tracking-[0.2em]">Describe your vision</h1>
              <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{prompt.length}/1000</span>
            </div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value.slice(0, 1000))} rows={6}
              placeholder={EXAMPLES[0]}
              className="w-full resize-y rounded-md border border-border bg-card px-4 py-4 font-mono text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none md:text-[16px]" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip onClick={() => setPrompt(EXAMPLES[0])}><Lightbulb className="h-3.5 w-3.5" /> Example</Chip>
              <Chip onClick={() => setPrompt(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)])}><Dices className="h-3.5 w-3.5" /> Random</Chip>
              <span className="flex-1" />
              <Chip onClick={doImprove} disabled={improving}><Sparkle className="h-3.5 w-3.5" /> {improving ? "Improving…" : "Improve"}</Chip>
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="mb-3 font-mono text-[13px] tracking-[0.2em]">DURATION</div>
            <div className="grid grid-cols-4 gap-2.5">
              {LENGTHS.map((l) => {
                const on = l.tier === tier;
                return (
                  <button key={l.id} disabled={!l.tier} onClick={() => l.tier && setTier(l.tier)}
                    className={cn("rounded-md border px-2 py-3 text-center transition-all",
                      on ? "border-primary bg-primary/15 text-primary red-laser" : l.tier ? "border-border bg-card hover:border-foreground/40" : "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground/50")}>
                    <div className="font-mono text-[16px]">{l.label}</div>
                    <div className="hud mt-0.5 text-[8px]">{l.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style */}
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <div className="font-mono text-[13px] tracking-[0.2em]">STYLE</div>
              <span className="hud text-[10px]">{STYLES.length} looks</span>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
              {STYLES.map((s) => {
                const on = style === s.id;
                return (
                  <button key={s.id} onClick={() => setStyle(s.id)} className="group w-[104px] shrink-0 text-center sm:w-auto">
                    <div className={cn("relative aspect-square overflow-hidden rounded-md border-2 transition-all",
                      on ? "border-primary shadow-[0_0_20px_-4px_var(--primary)]" : "border-transparent group-hover:border-foreground/30")}>
                      <img src={STYLE_IMAGES[s.id]} alt={s.label} loading="lazy" width={816} height={816}
                        className={cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-105", !on && "opacity-80")} />
                    </div>
                    <div className={cn("mt-2 font-mono text-[11px] uppercase tracking-[0.14em]", on ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate */}
          <div>
            <button onClick={userId ? generate : () => setUnlock(true)} disabled={busy}
              className="group flex w-full items-center justify-center gap-3 rounded-md bg-primary px-6 py-5 font-mono text-[15px] font-medium tracking-[0.3em] text-primary-foreground shadow-[0_10px_40px_-12px_var(--primary)] transition-all hover:brightness-110 disabled:opacity-60">
              <span className="flex-1 text-center">{busy ? "RENDERING…" : userId ? "GENERATE" : "OWNER UNLOCK TO RENDER"}</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            {!userId && (
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                Preview mode: every video costs real money on cloud GPUs, so only the studio owner can press Generate for now. You can still write, improve and style a shot.
              </p>
            )}
            {phase && (
              <div className="mt-3">
                <div className="hud flex items-center gap-2 text-[10px] text-foreground/80"><Pip tone="live" /> {phase}</div>
                {busy && <div className="mt-2 h-px overflow-hidden bg-primary/20"><div className="h-full w-1/4 animate-sweep bg-primary" /></div>}
              </div>
            )}
            <div className="hud mt-4 flex items-center justify-between text-[9px]">
              <span>Ideas · become · worlds</span>
              <span>Runs on the built-in cloud GPU</span>
            </div>
          </div>
        </section>

        {/* Latest renders */}
        <aside className="panel h-fit">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <span className="font-display text-[14px] font-bold uppercase tracking-[0.12em]">Latest renders</span>
            <Link to="/theater" className="hud text-[9px] text-primary hover:text-foreground">Theater →</Link>
          </div>
          <div className="max-h-[78vh] space-y-3 overflow-auto p-3">
            {list.map((j: any) => <RenderCard key={j.id} job={j} />)}
            {list.length === 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 opacity-40">
                  {SHOWREEL.slice(0, 4).map((s) => <img key={s.id} src={s.src} alt="" loading="lazy" className="aspect-video w-full rounded-sm object-cover grayscale" />)}
                </div>
                <p className="text-center text-[11px] text-muted-foreground">Your shots land here the moment the GPU finishes.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Unlocked({ onDone }: { onDone: () => void }) {
  useEffect(() => { onDone(); }, [onDone]);
  return null;
}

function Chip({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/85 hover:border-foreground/40 disabled:opacity-50">
      {children}
    </button>
  );
}

function RenderCard({ job }: { job: any }) {
  const url: string | undefined = job.response_log?.url;
  const txt: string = job.prompt?.text ?? "—";
  const status: string = job.status;
  const isVid = url && !/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
  const tone = status === "done" ? "ok" : status === "failed" ? "bad" : "live";
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-screen">
      <div className="relative aspect-video bg-screen">
        {url ? (isVid
          ? <video src={url} controls playsInline className="h-full w-full object-cover" />
          : <img src={url} alt="render" className="h-full w-full object-cover" />)
          : <div className="flex h-full items-center justify-center bg-grid"><span className="hud text-[9px]">{status === "failed" ? "No frames" : "GPU rendering…"}</span></div>}
        <span className="absolute left-2 top-2"><Tag tone={tone}>{status}</Tag></span>
      </div>
      <div className="flex items-start gap-2 p-2.5">
        <p className="line-clamp-2 flex-1 text-[11px] text-foreground/85">{txt}</p>
        {url && <a href={url} download aria-label="Download" className="shrink-0 text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></a>}
      </div>
      {status === "failed" && job.response_log?.error && <p className="px-2.5 pb-2.5 text-[10px] text-primary">{String(job.response_log.error)}</p>}
    </div>
  );
}
