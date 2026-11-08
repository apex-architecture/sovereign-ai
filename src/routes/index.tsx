import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown, Eye, FastForward, Lock, Maximize, MoreVertical, Pause, Play, Plus, RectangleHorizontal, Rewind, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CONNECTIONS, STAGE_CONNECTION, depthCount, type ConnectionDepth } from "@/lib/apex/connection";
import { Pip, Tag, formatTimecode, type Tone } from "@/components/hud";
import { ToolIcon, CATEGORY } from "@/components/tool-icons";
import { SHOWREEL, type Shot } from "@/lib/stills";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sovereign AI Filmverse — The World Studio, Open to Everyone" },
      { name: "description", content: "A global open film studio for everyone. From a kid with a big dream to major productions — art has no barriers. Make films with AI from any phone or browser." },
      { property: "og:title", content: "Sovereign AI Filmverse — The World Studio, Open to Everyone" },
      { property: "og:description", content: "A global open film studio for everyone. From a kid with a big dream to major productions — art has no barriers." },
      { name: "twitter:title", content: "Sovereign AI Filmverse — The World Studio, Open to Everyone" },
      { name: "twitter:description", content: "A global open film studio for everyone. From a kid with a big dream to major productions — art has no barriers." },
      { property: "og:url", content: "https://sovereignfilmverse.tech/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://sovereignfilmverse.tech/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://sovereignfilmverse.tech/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://sovereignfilmverse.tech/" }],
  }),
  component: Foundry,
});

type Job = { id: string; status: string; created_at: string; prompt: any; response_log: any };

const STAGE_LABEL: Record<string, string> = {
  storyboard: "Storyboard", character_lock: "Character", motion: "Generate", dialogue: "Dialogue", music: "Score",
  sound: "Sound", subtitles: "Subtitles", edit: "Edit", finish: "Master", publish: "Deliver",
};
const DEPTH_RANK: Record<ConnectionDepth, number> = { drivable: 3, "file-exchange": 2, "portal-only": 1, "not-yet": 0 };
const DEPTH_LABEL: Record<ConnectionDepth, { tone: Tone; label: string }> = {
  drivable: { tone: "ok", label: "Drivable" },
  "file-exchange": { tone: "signal", label: "Hand-off" },
  "portal-only": { tone: "warn", label: "Portal only" },
  "not-yet": { tone: "bad", label: "Catalogue" },
};

function stageState(tools: string[]): { tone: Tone; label: string } {
  if (tools.length === 0) return { tone: "bad", label: "No driver" };
  const best = Math.max(...tools.map((t) => DEPTH_RANK[CONNECTIONS.find((c) => c.toolId === t)?.depth ?? "not-yet"]));
  if (best === 3) return { tone: "ok", label: "Drivable" };
  if (best === 2) return { tone: "signal", label: "Hand-off" };
  if (best === 1) return { tone: "warn", label: "Portal" };
  return { tone: "bad", label: "Not built" };
}
const jobTone = (s: string): Tone => (s === "done" ? "ok" : s === "failed" || s === "canceled" ? "bad" : "live");
const promptText = (j: Job) => (j.prompt?.text ?? j.prompt?.prompt ?? "Untitled shot") as string;
const isImg = (u: string) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u);

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

/** A clip on the deck — either one of the operator's renders, or a labelled showreel still. */
type Clip = { key: string; title: string; src: string; video: boolean; scene: string; meta: string };

const SHOT_SECONDS = 7;

function Foundry() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const jobs = useQuery({
    queryKey: ["deck-jobs", userId],
    enabled: !!userId,
    refetchInterval: 6000,
    queryFn: async () =>
      ((await supabase.from("render_jobs").select("id,status,created_at,prompt,response_log")
        .eq("owner_id", userId!).order("created_at", { ascending: false }).limit(40)).data ?? []) as Job[],
  });
  const fleet = useQuery({
    queryKey: ["deck-fleet"],
    queryFn: async () => (await supabase.from("gpu_endpoints").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const all = jobs.data ?? [];
  const inFlight = all.filter((j) => jobTone(j.status) === "live").length;
  const reels = useMemo(() => all.filter((j) => j.status === "done" && j.response_log?.url), [all]);
  const showreel = reels.length === 0;

  const clips: Clip[] = useMemo(() =>
    showreel
      ? SHOWREEL.map((s: Shot, i) => ({ key: s.id, title: s.title, src: s.src, video: false, scene: `Scene 01 · Shot ${String(i + 1).padStart(2, "0")}`, meta: s.scene }))
      : reels.slice(0, 12).map((j, i) => ({
          key: j.id, title: promptText(j), src: j.response_log.url, video: !isImg(j.response_log.url),
          scene: `Reel ${String(i + 1).padStart(2, "0")}`, meta: j.response_log?.model ?? "render",
        })),
  [showreel, reels]);

  const [sel, setSel] = useState(0);
  useEffect(() => { if (sel >= clips.length) setSel(0); }, [clips.length, sel]);

  return (
    <main className="space-y-3 px-3 py-3 md:px-5 md:py-4">
      <header className="panel relative overflow-hidden bg-grid px-5 py-4 md:px-7 md:py-5">
        <p className="hud text-primary">Studio / make</p>
        <h1 className="mt-2 text-3xl leading-[0.95] md:text-5xl">The <span className="text-primary text-glow">Studio</span></h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
          Your desk: ideas, renders and the pipeline. Start at the top — the ten stages run left to right —
          or drop straight into Create and shoot one shot.
        </p>
      </header>

      <Spine inFlight={inFlight} />

      <section className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <Monitor clips={clips} sel={sel} setSel={setSel} showreel={showreel} />
          <Timeline clips={clips} sel={sel} setSel={setSel} showreel={showreel} />
        </div>
        <aside className="space-y-3">
          <ToolRail />
          <GpuMonitor endpoints={fleet.data ?? []} />
          <Dailies jobs={all} />
        </aside>
      </section>

      <Storyboard clips={clips} sel={sel} setSel={setSel} showreel={showreel} />
    </main>
  );
}

/* ───────────── The spine: ten numbered stages ───────────── */

function Spine({ inFlight }: { inFlight: number }) {
  const stages = Object.entries(STAGE_CONNECTION);
  return (
    <section className="panel overflow-hidden">
      <div className="no-scrollbar overflow-x-auto">
        <ol className="relative flex min-w-[900px] px-4 pb-4 pt-5">
          {stages.map(([stage, tools], i) => {
            const st = stageState(tools);
            const live = stage === "motion";
            const next = stages[i + 1];
            const nextOk = next && stageState(next[1]).tone === "ok" && st.tone === "ok";
            return (
              <li key={stage} className="relative flex flex-1 flex-col items-center text-center">
                {next && (
                  <span aria-hidden className={cn("absolute left-1/2 top-[17px] h-px w-full",
                    nextOk ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-foreground/15")} />
                )}
                <Link to="/connect" title={`${STAGE_LABEL[stage]} — ${st.label}`}
                  className={cn("relative z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full border font-display text-[14px] font-bold tabular-nums transition-transform hover:scale-110",
                    live ? "border-primary bg-primary text-primary-foreground shadow-[0_0_22px_var(--primary)]"
                      : st.tone === "ok" ? "border-primary bg-screen text-primary"
                      : st.tone === "signal" ? "border-signal/70 bg-screen text-signal"
                      : st.tone === "warn" ? "border-warn/70 bg-screen text-warn"
                      : "border-dashed border-foreground/30 bg-screen text-muted-foreground")}>
                  {i + 1}
                  {live && <span className="absolute inset-0 animate-ping rounded-full border border-primary/60" />}
                </Link>
                <div className={cn("mt-2.5 font-display text-[13px] font-semibold uppercase tracking-[0.06em]", live ? "text-foreground" : st.tone === "bad" ? "text-muted-foreground" : "text-foreground/90")}>
                  {STAGE_LABEL[stage] ?? stage}
                </div>
                <div className={cn("hud mt-0.5 text-[8.5px]", live ? "text-primary" : st.tone === "bad" && "text-primary/80")}>
                  {live ? (inFlight ? `${inFlight} rendering` : "Live · cloud") : st.label}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── Master monitor ───────────── */

function Monitor({ clips, sel, setSel, showreel }: { clips: Clip[]; sel: number; setSel: (n: number) => void; showreel: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const [scope, setScope] = useState<"239" | "169">("239");
  const [speed, setSpeed] = useState(1);
  const clip = clips[sel];

  const elapsed = useRef(0);
  useEffect(() => { elapsed.current = 0; setT(0); }, [clip?.key]);

  // Showreel stills advance on a clock; real videos report their own time.
  useEffect(() => {
    if (!clip || clip.video || !playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      elapsed.current += ((now - last) / 1000) * speed;
      last = now;
      if (elapsed.current >= SHOT_SECONDS) { elapsed.current = 0; setSel((sel + 1) % clips.length); return; }
      setT(elapsed.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.key, playing, speed]);
  useEffect(() => { if (vidRef.current) vidRef.current.playbackRate = speed; }, [speed, clip?.key]);

  const toggle = () => {
    const v = vidRef.current;
    if (clip?.video && v) { if (v.paused) v.play().catch(() => {}); else v.pause(); }
    setPlaying((p) => !p);
  };
  const step = (d: number) => clips.length && setSel((sel + d + clips.length) % clips.length);
  const absolute = sel * SHOT_SECONDS + t + 3600 + 2 * 60;

  return (
    <div className="panel overflow-hidden">
      <div ref={frameRef} className="bg-screen">
        <div className={cn("vignette relative w-full overflow-hidden bg-screen", scope === "239" ? "aspect-[2.39/1]" : "aspect-video")}>
          {clip && (clip.video ? (
            <video key={clip.key} ref={vidRef} src={clip.src} muted loop playsInline autoPlay
              className="absolute inset-0 h-full w-full object-cover"
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} />
          ) : (
            <img key={clip.key} src={clip.src} alt={clip.title} fetchPriority="high"
              className={cn("absolute inset-0 h-full w-full object-cover", playing && "animate-kenburns")} />
          ))}

          {/* HUD overlays */}
          <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col justify-between p-3 md:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="font-mono text-[10px] leading-[1.7] text-foreground/90 md:text-[12px]">
                <div className="text-[12px] font-bold tracking-[0.12em] md:text-[15px]">SVRN_{String(sel + 1).padStart(4, "0")}</div>
                <div className="hidden sm:block">{scope === "239" ? "3840 × 1608" : "3840 × 2160"}</div>
                <div className="hidden sm:block">24 FPS</div>
                {showreel && <div className="mt-1 inline-block whitespace-nowrap border border-warn/50 bg-screen/60 px-1.5 text-[9px] tracking-[0.18em] text-warn">SHOWREEL<span className="hidden sm:inline"> · CONCEPT STILL</span></div>}
              </div>
              <div className="text-right font-mono text-[10px] leading-[1.7] text-foreground/90 md:text-[12px]">
                <div className="whitespace-nowrap text-[11px] tracking-[0.12em] md:text-[14px]">{clip?.scene.toUpperCase()}</div>
                <div className="hidden max-w-[260px] truncate uppercase sm:block">{clip?.meta}</div>
                <div className="hidden sm:block">TAKE 01</div>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="line-clamp-1 max-w-[70%] font-display text-[13px] uppercase tracking-[0.08em] text-foreground/90 md:text-[16px]">{clip?.title}</p>
              <span className="flex items-center gap-1.5 bg-screen/60 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.2em]"><Pip tone={playing ? "live" : "idle"} /> {playing ? "PGM" : "HOLD"}</span>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-[7%] z-[3] border border-dashed border-foreground/[0.05]" />
        </div>
      </div>

      {/* Transport */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-hairline px-3 py-3 md:grid-cols-[1fr_auto_1fr] md:px-5">
        <div className="font-mono text-[22px] font-medium tabular-nums tracking-[0.04em] text-primary text-glow md:text-[30px]">
          {formatTimecode(absolute)}
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={() => step(-1)} aria-label="Previous shot" className="text-foreground/80 hover:text-foreground"><Rewind className="h-5 w-5 fill-current" /></button>
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/20 hover:border-primary hover:text-primary">
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </button>
          <button onClick={() => step(1)} aria-label="Next shot" className="text-foreground/80 hover:text-foreground"><FastForward className="h-5 w-5 fill-current" /></button>
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
          <button onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 0.5 : 1)} className="h-8 border border-border px-2.5 text-[11px] tabular-nums text-muted-foreground hover:text-foreground">{speed.toFixed(1)}x</button>
          <button onClick={() => setScope(scope === "239" ? "169" : "239")} className="inline-flex h-8 items-center gap-1 border border-border px-2.5 text-[11px] hover:border-foreground">
            {scope === "239" ? "2.39:1" : "16:9"} <ChevronDown className="h-3 w-3" />
          </button>
          <Link to="/theater" aria-label="Open in Theater" className="flex h-8 w-8 items-center justify-center text-foreground/80 hover:text-foreground"><RectangleHorizontal className="h-4 w-4" /></Link>
          <button onClick={() => frameRef.current?.requestFullscreen?.()} aria-label="Full screen" className="flex h-8 w-8 items-center justify-center text-foreground/80 hover:text-foreground"><Maximize className="h-4 w-4" /></button>
          <Link to="/vault" aria-label="More" className="flex h-8 w-8 items-center justify-center text-foreground/80 hover:text-foreground"><MoreVertical className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Timeline ───────────── */

function seeded(seed: string, n: number) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const r = ((h >>> 0) % 1000) / 1000;
    const env = 0.35 + 0.65 * Math.abs(Math.sin(i / 7 + seed.length));
    out.push(Math.max(0.08, r * env));
  }
  return out;
}

function Wave({ seed, className, bars = 120 }: { seed: string; className?: string; bars?: number }) {
  const v = useMemo(() => seeded(seed, bars), [seed, bars]);
  return (
    <svg viewBox={`0 0 ${bars} 20`} preserveAspectRatio="none" className={cn("h-full w-full", className)} aria-hidden>
      {v.map((h, i) => <rect key={i} x={i + 0.15} width={0.7} y={10 - h * 9} height={h * 18} fill="currentColor" />)}
    </svg>
  );
}

const AUDIO = [
  { id: "A1", stage: "dialogue", title: "Dialogue", cls: "border-ok/50 bg-ok/[0.12] text-ok", clips: [[0.01, 0.24, "DIA_hero_01.wav"], [0.27, 0.53, "DIA_hero_02.wav"], [0.56, 0.86, "DIA_hero_03.wav"]] },
  { id: "A2", stage: "sound", title: "Foley", cls: "border-violet/50 bg-violet/[0.14] text-violet", clips: [[0.01, 0.27, "FOL_boots_rock.wav"], [0.5, 0.82, "FOL_wind.wav"]] },
  { id: "A3", stage: "music", title: "Score", cls: "border-primary/50 bg-primary/[0.12] text-primary", clips: [[0.0, 0.97, "SCORE_theme_v2.wav"]] },
] as const;

function Timeline({ clips, sel, setSel, showreel }: { clips: Clip[]; sel: number; setSel: (n: number) => void; showreel: boolean }) {
  const [mute, setMute] = useState<Record<string, boolean>>({});
  const [solo, setSolo] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const n = Math.max(1, clips.length);
  const play = (sel + 0.5) / n;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-0 border-b border-hairline">
        <span className="flex items-center gap-1.5 px-4 py-2.5 font-display text-[13px] font-bold uppercase tracking-[0.12em] text-primary">Timeline <span className="h-1.5 w-1.5 rounded-full bg-primary" /></span>
        <span className="flex items-center gap-3 border-x border-hairline bg-rack px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-foreground/80">
          {showreel ? "Showreel" : "Your reels"} <X className="h-3 w-3 text-muted-foreground" />
        </span>
        <Link to="/director" aria-label="New sequence" className="px-4 py-2.5 text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4" /></Link>
        <div className="ml-auto hidden items-center gap-2 px-4 text-muted-foreground sm:flex">
          <button onClick={() => setZoom(Math.max(1, zoom - 0.25))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
          <input type="range" min={1} max={2} step={0.25} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" className="h-0.5 w-20 accent-foreground" />
          <button onClick={() => setZoom(Math.min(2, zoom + 0.25))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto">
        <div className="relative [--lane:128px] md:[--lane:210px]" style={{ minWidth: `${900 * zoom}px` }}>
          {/* ruler */}
          <div className="flex h-8 border-b border-hairline">
            <div className="w-[var(--lane)] shrink-0 border-r border-hairline bg-rack/50" />
            <div className="relative flex flex-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="relative flex-1 border-l border-hairline">
                  <span className="absolute left-1.5 top-1 font-mono text-[9.5px] tabular-nums text-muted-foreground">{formatTimecode(3720 + i * 10)}</span>
                  <div className="absolute inset-x-0 bottom-0 flex h-2 justify-between">
                    {Array.from({ length: 10 }).map((_, k) => <span key={k} className="w-px bg-foreground/15" style={{ height: k === 0 ? 8 : 4 }} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <TrackRow id="V1" title="Video" tone="ok" muted={!!mute.V1} solo={solo === "V1"} onMute={() => setMute({ ...mute, V1: !mute.V1 })} onSolo={() => setSolo(solo === "V1" ? null : "V1")} tall>
            <div className="flex h-full gap-[3px] px-1">
              {clips.map((c, i) => (
                <button key={c.key} onClick={() => setSel(i)} title={c.title}
                  className={cn("relative flex min-w-0 flex-1 overflow-hidden border text-left transition-all",
                    i === sel ? "border-signal/80 shadow-[0_0_0_1px_var(--signal)]" : "border-signal/25 hover:border-signal/60")}>
                  {c.video
                    ? <video src={c.src} muted preload="metadata" className="h-full w-[46%] shrink-0 object-cover" />
                    : <img src={c.src} alt="" loading="lazy" className="h-full w-[46%] shrink-0 object-cover" />}
                  <span className="flex min-w-0 flex-1 items-center bg-signal/[0.08] px-2 font-mono text-[10px] text-signal/90">
                    <span className="truncate">{showreel ? `C${String(i + 1).padStart(3, "0")}.mov` : c.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </TrackRow>

          {AUDIO.map((a) => {
            const st = stageState(STAGE_CONNECTION[a.stage] ?? []);
            const dim = mute[a.id] || (solo && solo !== a.id);
            return (
              <TrackRow key={a.id} id={a.id} title={a.title} tone={st.tone} status={st.label}
                muted={!!mute[a.id]} solo={solo === a.id}
                onMute={() => setMute({ ...mute, [a.id]: !mute[a.id] })} onSolo={() => setSolo(solo === a.id ? null : a.id)}>
                {showreel && st.tone !== "bad" ? (
                  <div className={cn("relative h-full", dim && "opacity-30")}>
                    {a.clips.map(([s, e, name]) => (
                      <div key={name} className={cn("absolute inset-y-1 overflow-hidden border", a.cls)} style={{ left: `${s * 100}%`, width: `${(e - s) * 100}%` }}>
                        <span className="absolute left-1.5 top-0.5 z-10 font-mono text-[9.5px] text-foreground/85">{name}</span>
                        <Wave seed={name} className="absolute inset-x-0 bottom-0 top-3 opacity-90" bars={Math.round((e - s) * 260)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cn("flex h-full items-center gap-2 px-2 text-[10px]",
                    st.tone === "bad" ? "hatch-danger text-primary" : st.tone === "ok" ? "bg-ok/[0.07] text-ok/90" : st.tone === "signal" ? "bg-signal/[0.06] text-signal/90" : "bg-warn/[0.07] text-warn")}>
                    <Pip tone={st.tone} />
                    <span className="font-bold uppercase tracking-widest">{st.label}</span>
                    <span className="truncate text-muted-foreground">
                      {(STAGE_CONNECTION[a.stage] ?? []).map((t) => CONNECTIONS.find((c) => c.toolId === t)?.name ?? t).join(" › ") || "no voice driver yet — this lane stays empty until one is built"}
                    </span>
                  </div>
                )}
              </TrackRow>
            );
          })}

          {/* playhead */}
          <div className="pointer-events-none absolute bottom-0 top-0 z-20" style={{ left: `calc(var(--lane) + (100% - var(--lane)) * ${play})` }}>
            <span className="absolute -left-[6px] top-[18px] h-0 w-0 border-x-[6px] border-t-[9px] border-x-transparent border-t-primary" />
            <span className="absolute left-0 top-[18px] bottom-0 w-px bg-primary shadow-[0_0_8px_var(--primary)]" />
          </div>
        </div>
      </div>
      {showreel && (
        <div className="hud border-t border-hairline px-4 py-2 text-[9px]">
          Showreel layout with concept stills — your finished renders replace these clips automatically. Audio lanes show each stage's real status.
        </div>
      )}
    </div>
  );
}

function TrackRow({ id, title, children, tone, status, muted, solo, onMute, onSolo, tall }: {
  id: string; title: string; children: React.ReactNode; tone: Tone; status?: string;
  muted: boolean; solo: boolean; onMute: () => void; onSolo: () => void; tall?: boolean;
}) {
  return (
    <div className={cn("flex border-b border-hairline last:border-b-0", tall ? "h-[62px]" : "h-[52px]")}>
      <div className="flex w-[var(--lane)] shrink-0 items-center gap-2 border-r border-hairline bg-rack/50 px-2 md:gap-3 md:px-3">
        <span className="w-5 shrink-0 font-mono text-[11px] text-muted-foreground md:w-6 md:text-[12px]">{id}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] uppercase tracking-[0.08em] md:text-[12px]">{title}</span>
          {status && <span className={cn("hud block text-[8px]", tone === "ok" ? "text-ok" : tone === "bad" ? "text-primary" : tone === "signal" ? "text-signal" : "text-warn")}>{status}</span>}
        </span>
        <Lock className="hidden h-3 w-3 shrink-0 text-muted-foreground md:block" />
        <Eye className="hidden h-3 w-3 shrink-0 text-muted-foreground md:block" />
        <button onClick={onMute} aria-label={`Mute ${title}`} className={cn("text-[10px] font-bold", muted ? "text-warn" : "text-muted-foreground hover:text-foreground")}>M</button>
        <button onClick={onSolo} aria-label={`Solo ${title}`} className={cn("text-[10px] font-bold", solo ? "text-signal" : "text-muted-foreground hover:text-foreground")}>S</button>
      </div>
      <div className="min-w-0 flex-1 py-1">{children}</div>
    </div>
  );
}

/* ───────────── Tool rail ───────────── */

function ToolRail() {
  const d = depthCount();
  const ORDER: ConnectionDepth[] = ["drivable", "file-exchange", "portal-only", "not-yet"];
  const rows = [...CONNECTIONS].sort((a, b) => ORDER.indexOf(a.depth) - ORDER.indexOf(b.depth)).slice(0, 7);
  return (
    <div className="panel">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="flex items-center gap-1.5 font-display text-[14px] font-bold uppercase tracking-[0.12em] text-primary">Tool rail <span className="h-1.5 w-1.5 rounded-full bg-primary" /></span>
        <span className="hud flex items-center gap-2 text-[9.5px]"><Pip tone="ok" pulse /> {d.drivable}/{CONNECTIONS.length} drivable</span>
      </div>
      <ul className="divide-y divide-hairline">
        {rows.map((c) => {
          const dl = DEPTH_LABEL[c.depth];
          return (
            <li key={c.toolId}>
              <Link to="/connect" className="flex items-center gap-3 px-4 py-2.5 hover:bg-rack/60">
                <ToolIcon id={c.toolId} className="h-7 w-7 shrink-0 text-foreground/80" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{c.name}</span>
                  <span className="hud block truncate text-[8.5px]">{CATEGORY[c.toolId] ?? c.where}</span>
                </span>
                <span className="text-right">
                  <span className={cn("flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                    dl.tone === "ok" ? "text-ok" : dl.tone === "signal" ? "text-signal" : dl.tone === "warn" ? "text-warn" : "text-primary")}>
                    <Pip tone={dl.tone} /> {dl.label}
                  </span>
                  <span className="hud block text-[8px]">{c.where}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link to="/connect" className="hud block border-t border-hairline px-4 py-2 text-center text-[9px] hover:text-foreground">All {CONNECTIONS.length} tools →</Link>
    </div>
  );
}

/* ───────────── GPU monitor (real fleet only) ───────────── */

function GpuMonitor({ endpoints }: { endpoints: any[] }) {
  const online = endpoints.filter((e) => e.status === "active");
  const lat = online.map((e) => e.latency_ms).filter((n: any) => typeof n === "number") as number[];
  const best = lat.length ? Math.min(...lat) : null;
  const pts = useMemo(() => {
    if (!online.length) return "0,38 100,38";
    const v = seeded(online.map((e) => e.id).join(""), 40);
    return v.map((y, i) => `${(i / 39) * 100},${38 - y * 30}`).join(" ");
  }, [online.length]);

  return (
    <div className="panel">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="font-display text-[14px] font-bold uppercase tracking-[0.12em] text-primary">GPU monitor</span>
        <span className="hud text-[9.5px]">{endpoints.length ? `${online.length} of ${endpoints.length} machines online` : "Cloud only"}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-4 p-4">
        <div className="relative h-[92px]">
          <div className="absolute inset-y-0 left-0 flex flex-col justify-between font-mono text-[9px] text-muted-foreground"><span>100%</span><span>50%</span><span>0%</span></div>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-y-0 left-8 right-0 h-full w-[calc(100%-2rem)]" aria-hidden>
            <defs>
              <linearGradient id="gpuFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[2, 20, 38].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" className="text-foreground/10" strokeWidth="0.3" />)}
            <polygon points={`0,40 ${pts} 100,40`} fill="url(#gpuFill)" />
            <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          </svg>
          {!online.length && (
            <Link to="/connect" className="absolute inset-0 left-8 flex items-center justify-center text-center">
              <span className="hud bg-card/80 px-2 py-1 text-[9px]">No machine of yours online<br /><span className="text-signal">Plug one in →</span></span>
            </Link>
          )}
        </div>
        <dl className="space-y-2 text-[10px]">
          <Row k="Cloud video" v={<span className="text-ok">Ready</span>} />
          <Row k="Your machines" v={<span className="text-primary">{endpoints.length}</span>} />
          <Row k="Online" v={<span className="text-primary">{online.length}</span>} />
          <Row k="Best ping" v={<span className="text-primary">{best != null ? `${best} ms` : "—"}</span>} />
        </dl>
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><dt className="hud text-[8.5px]">{k}</dt><dd className="font-mono tabular-nums">{v}</dd></div>;
}

/* ───────────── Dailies ───────────── */

function Dailies({ jobs }: { jobs: Job[] }) {
  const list = jobs.slice(0, 5);
  return (
    <div className="panel">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="font-display text-[14px] font-bold uppercase tracking-[0.12em]">Dailies</span>
        <Link to="/vault" className="hud text-[9px] hover:text-foreground">Vault →</Link>
      </div>
      {list.length === 0 ? (
        <div className="px-4 py-5 text-center text-[11px] text-muted-foreground">
          Nothing rendered yet. <Link to="/create" className="text-primary hover:underline">Roll camera →</Link>
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {list.map((j) => {
            const tone = jobTone(j.status);
            return (
              <li key={j.id} className="relative overflow-hidden px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Tag tone={tone}>{j.status}</Tag>
                  <span className="hud text-[9px]">{ago(j.created_at)} ago</span>
                </div>
                <p className="mt-1.5 line-clamp-1 text-[11px] text-foreground/90">{promptText(j)}</p>
                {tone === "live" && (
                  <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden bg-primary/20"><div className="h-full w-1/4 animate-sweep bg-primary" /></div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Storyboard strip ───────────── */

function Storyboard({ clips, sel, setSel, showreel }: { clips: Clip[]; sel: number; setSel: (n: number) => void; showreel: boolean }) {
  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="font-display text-[15px] font-bold uppercase tracking-[0.1em]">
          Storyboard <span className="font-mono text-[12px] font-normal text-muted-foreground">({clips.length} shots{showreel ? " · showreel" : ""})</span>
        </span>
        <Link to="/director" className="hud text-[10px] text-primary hover:text-foreground">Open Director →</Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto p-4">
        {clips.map((c, i) => (
          <button key={c.key} onClick={() => setSel(i)} className="group w-[210px] shrink-0 text-left">
            <div className={cn("relative aspect-video overflow-hidden border transition-all", i === sel ? "border-primary red-laser" : "border-border group-hover:border-foreground/40")}>
              {c.video
                ? <video src={c.src} muted preload="metadata" className="h-full w-full object-cover" />
                : <img src={c.src} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
            </div>
            <div className="mt-2 flex items-baseline gap-2 font-mono text-[11px]">
              <span className="text-primary">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-muted-foreground">{showreel ? SHOWREEL[i]?.tc : c.meta}</span>
            </div>
            <div className="line-clamp-1 text-[12px] text-foreground/85">{c.title}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
