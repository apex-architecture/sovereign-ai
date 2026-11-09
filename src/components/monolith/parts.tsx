import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Lock, Pause, Play, Plus } from "lucide-react";
import { Corners, Pip, Tag, formatTimecode } from "@/components/hud";
import { stageCoverage } from "@/lib/apex/connection";
import { cn } from "@/lib/utils";
import { STEPS, STYLES, fingerprint, runtime, type Scene, type Step } from "./film";

/* ───────────────────────── Step rail ───────────────────────── */

export function StepRail({ step, done, onPick }: { step: Step; done: Record<Step, boolean>; onPick: (s: Step) => void }) {
  return (
    <nav aria-label="Film steps"
      className="grid grid-cols-4 gap-1.5 lg:flex lg:flex-col lg:gap-0 lg:border-r lg:border-hairline lg:pr-0">
      {STEPS.map((s) => {
        const on = s.id === step;
        return (
          <button key={s.id} type="button" onClick={() => onPick(s.id)} aria-current={on ? "step" : undefined}
            className={cn(
              "group relative flex flex-col items-start gap-1 border px-2.5 py-2.5 text-left transition-colors lg:border-0 lg:border-b lg:border-hairline lg:px-5 lg:py-5",
              on ? "border-primary/60 bg-primary/[0.08] text-foreground" : "border-border bg-card/40 text-muted-foreground hover:text-foreground lg:bg-transparent",
            )}>
            {on && <span aria-hidden className="absolute inset-y-0 left-0 hidden w-[3px] bg-primary shadow-[0_0_14px_var(--primary)] lg:block" />}
            <span className="flex w-full items-center justify-between gap-2">
              <span className={cn("font-mono text-[11px] tabular-nums", on ? "text-primary" : "")}>{s.n}</span>
              {done[s.id] ? <Check className="h-3.5 w-3.5 text-ok" /> : s.cost === "owner" ? <Lock className="h-3 w-3 opacity-70" /> : null}
            </span>
            <span className="font-display text-[14px] font-bold uppercase tracking-[0.08em] lg:text-[19px]">{s.label}</span>
            <span className="hud hidden text-[9px] tracking-[0.2em] lg:block">{s.sub}</span>
            <span className={cn("hud hidden text-[8.5px] lg:block", s.cost === "free" ? "text-ok" : "text-warn")}>
              {s.cost === "free" ? "Free for everyone" : "Owner · costs money"}
            </span>
          </button>
        );
      })}
      <div className="hidden px-5 py-5 lg:block">
        <span className="mb-3 block h-px w-10 bg-primary" />
        <p className="hud text-[9px] leading-[1.8] tracking-[0.3em]">Idea<br />→ script<br />→ frames<br />→ film</p>
      </div>
    </nav>
  );
}

/* ───────────────────────── Viewport ───────────────────────── */

export function Viewport({
  scene, index, total, onPrev, onNext, showClip, overlay, badge,
}: {
  scene?: Scene; index: number; total: number; onPrev: () => void; onNext: () => void;
  showClip?: boolean; overlay?: ReactNode; badge?: ReactNode;
}) {
  const clip = showClip && scene?.clip?.status === "done" ? scene.clip.url : undefined;
  return (
    <div className="relative overflow-hidden border border-border bg-screen shadow-[var(--shadow-deck)]">
      <div className="relative aspect-video w-full">
        {clip ? (
          <video key={clip} src={clip} controls playsInline className="h-full w-full object-cover" />
        ) : scene?.frame ? (
          <img key={scene.frame} src={scene.frame} alt={scene.heading} className="h-full w-full animate-kenburns object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-grid px-6 text-center">
            <span className="hud text-[10px] tracking-[0.4em]">{scene ? "No frame yet" : "No scenes yet"}</span>
            {scene && <p className="max-w-md font-display text-[15px] text-foreground/70 md:text-[18px]">{scene.heading}</p>}
          </div>
        )}
        <span aria-hidden className="pointer-events-none absolute inset-0 vignette" />
        <Corners className="m-3" />
        <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
          {scene && <Tag tone="live" className="bg-background/85 backdrop-blur">Scene {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</Tag>}
          {badge}
        </div>
        {scene && (
          <span className="hud absolute bottom-4 right-4 text-[10px] text-foreground/80">{scene.seconds}s · 16:9 · 24fps</span>
        )}
        {overlay}
      </div>
      {total > 1 && (
        <>
          <button type="button" onClick={onPrev} aria-label="Previous scene"
            className="absolute left-2 top-1/2 -translate-y-1/2 border border-border bg-chassis/70 p-1.5 text-foreground backdrop-blur hover:border-primary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={onNext} aria-label="Next scene"
            className="absolute right-2 top-1/2 -translate-y-1/2 border border-border bg-chassis/70 p-1.5 text-foreground backdrop-blur hover:border-primary">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Sequence player (the cut) ───────────────────────── */

export function SequencePlayer({ scenes }: { scenes: Scene[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number | null>(null);
  const s = scenes[i];
  const clipUrl = s?.clip?.status === "done" ? s.clip.url : undefined;
  const before = scenes.slice(0, i).reduce((t, x) => t + x.seconds, 0);

  useEffect(() => { if (i >= scenes.length) setI(0); }, [scenes.length, i]);

  // Frames hold for the scene's length; clips advance when the video ends.
  useEffect(() => {
    if (!playing || !s || clipUrl) return;
    const started = performance.now();
    const tick = () => {
      const t = (performance.now() - started) / 1000;
      setElapsed(t);
      if (t >= s.seconds) { advance(); return; }
      timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
    return () => { if (timer.current) cancelAnimationFrame(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, i, clipUrl]);

  function advance() {
    setElapsed(0);
    setI((n) => {
      if (n + 1 >= scenes.length) { setPlaying(false); return 0; }
      return n + 1;
    });
  }

  const usesFrames = scenes.some((x) => !(x.clip?.status === "done"));
  const total = runtime(scenes);

  return (
    <div className="relative overflow-hidden border border-border bg-screen shadow-[var(--shadow-deck)]">
      <div className="relative aspect-video w-full">
        {!s ? (
          <div className="flex h-full items-center justify-center bg-grid"><span className="hud">Nothing to play yet</span></div>
        ) : clipUrl ? (
          <video key={clipUrl} src={clipUrl} autoPlay={playing} playsInline muted={false}
            onEnded={advance} onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
            className="h-full w-full object-cover" />
        ) : s.frame ? (
          <img key={s.frame + i} src={s.frame} alt={s.heading} className={cn("h-full w-full object-cover", playing && "animate-kenburns")} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-screen px-6 text-center">
            <span className="hud text-[10px]">Slate</span>
            <p className="font-display text-[18px] text-foreground/80 md:text-[26px]">{s.heading}</p>
          </div>
        )}
        <span aria-hidden className="pointer-events-none absolute inset-0 vignette" />
        <Corners className="m-3" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Tag tone={usesFrames ? "warn" : "ok"} className="bg-background/85 backdrop-blur">{usesFrames ? "Animatic · storyboard frames" : "Cut · rendered clips"}</Tag>
        </div>
        {s && <p className="absolute inset-x-4 bottom-14 hidden line-clamp-2 sm:block text-[12px] text-foreground/85 md:text-[14px]">{s.action}</p>}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-background/90 to-transparent px-4 pb-3 pt-6">
          <button type="button" onClick={() => setPlaying((p) => !p)} disabled={!s} aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground shadow-[0_0_20px_-4px_var(--primary)] disabled:opacity-50">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="h-1 flex-1 bg-foreground/15">
            <div className="h-full bg-primary" style={{ width: total ? `${Math.min(100, ((before + Math.min(elapsed, s?.seconds ?? 0)) / total) * 100)}%` : "0%" }} />
          </div>
          <span className="hud tabular-nums text-[10px] text-foreground/80">{formatTimecode(before + elapsed)} / {formatTimecode(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Timeline strip ───────────────────────── */

export function Timeline({ scenes, sel, onPick, onAdd }: { scenes: Scene[]; sel: number; onPick: (i: number) => void; onAdd: () => void }) {
  return (
    <div className="border-t border-border bg-chassis/70">
      <div className="flex items-center justify-between px-4 pt-2.5 lg:px-5">
        <span className="hud text-[9px] tracking-[0.3em]">Timeline · {scenes.length} scenes</span>
        <span className="hud tabular-nums text-[9px]">Runtime {formatTimecode(runtime(scenes))}</span>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 lg:px-5">
        {scenes.map((s, i) => {
          const on = i === sel;
          const tone = s.clip?.status === "done" ? "ok" : s.clip?.status === "rendering" ? "live" : s.frame ? "signal" : "idle";
          return (
            <button key={s.id} type="button" onClick={() => onPick(i)}
              className={cn("group w-[132px] shrink-0 text-left transition-all md:w-[152px]", on ? "" : "opacity-75 hover:opacity-100")}>
              <div className={cn("relative aspect-video overflow-hidden border bg-screen", on ? "border-primary shadow-[0_0_18px_-4px_var(--primary)]" : "border-border")}>
                {s.frame ? <img src={s.frame} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-grid" />}
                <span className="absolute left-1.5 top-1.5 bg-background/80 px-1 font-mono text-[9px] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="absolute right-1.5 top-1.5"><Pip tone={tone} /></span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-[10px] uppercase tracking-[0.08em] text-foreground/85">{s.heading}</span>
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{s.seconds}s</span>
              </div>
            </button>
          );
        })}
        <button type="button" onClick={onAdd} aria-label="Add a scene"
          className="flex aspect-video w-[90px] shrink-0 flex-col items-center justify-center gap-1 border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
          <Plus className="h-4 w-4" /><span className="hud text-[8.5px]">Scene</span>
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Inspector ───────────────────────── */

const ENGINE: Record<Step, { name: string; via: string; cost: string; tone: "ok" | "warn" | "signal" }> = {
  script: { name: "DeepSeek V3", via: "Qwen3 as open-weights fallback · hosted cloud", cost: "Free", tone: "ok" },
  board: { name: "FLUX schnell", via: "Storyboard frames · hosted cloud", cost: "Free", tone: "ok" },
  render: { name: "Minimax video-01 · Kling 2.5", via: "Text-to-video · hosted cloud", cost: "Owner pays per clip", tone: "warn" },
  cut: { name: "Your browser", via: "Animatic playback and export, no server", cost: "Free", tone: "ok" },
};

export function Inspector({
  step, scene, index, style, allowance, owner,
}: {
  step: Step; scene?: Scene; index: number; style: string;
  allowance?: { owner: boolean; script: number; frame: number }; owner: boolean;
}) {
  const [fp, setFp] = useState("");
  useEffect(() => {
    let live = true;
    if (!scene) { setFp(""); return; }
    fingerprint({ heading: scene.heading, action: scene.action, shot: scene.shot, seconds: scene.seconds, frame: scene.frame ?? null })
      .then((h) => { if (live) setFp(h); });
    return () => { live = false; };
  }, [scene]);
  const e = ENGINE[step];
  const cov = stageCoverage();
  const look = STYLES.find((s) => s.id === style)?.label ?? "Cinematic";
  const isOwner = owner || allowance?.owner;

  return (
    <div className="space-y-3">
      <Block title="Engine" right={<Tag tone={e.tone}>{e.cost}</Tag>}>
        <div className="font-display text-[17px] font-bold text-foreground">{e.name}</div>
        <div className="hud mt-1 text-[9px] tracking-[0.16em]">{e.via}</div>
      </Block>

      <Block title="Free today">
        {isOwner ? (
          <p className="text-[12px] text-foreground/85">Owner session · no daily cap</p>
        ) : allowance ? (
          <div className="grid grid-cols-2 gap-2">
            <Meter label="Scripts left" value={allowance.script} />
            <Meter label="Frames left" value={allowance.frame} />
          </div>
        ) : (
          <p className="hud text-[9px]">Checking…</p>
        )}
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">Script and storyboard are free for everyone. Video costs real money per clip, so it opens with the owner key.</p>
      </Block>

      <Block title={scene ? `Scene ${String(index + 1).padStart(2, "0")}` : "Scene"}>
        {scene ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px]">
            <dt className="hud text-[9px]">Length</dt><dd className="font-mono">{scene.seconds}s</dd>
            <dt className="hud text-[9px]">Format</dt><dd className="font-mono">16:9 · 24 fps</dd>
            <dt className="hud text-[9px]">Look</dt><dd className="font-mono">{look}</dd>
            <dt className="hud text-[9px]">Frame</dt><dd className="font-mono">{scene.frame ? "drawn" : "—"}</dd>
            <dt className="hud text-[9px]">Clip</dt><dd className="font-mono">{scene.clip?.status ?? "—"}</dd>
          </dl>
        ) : <p className="text-[11px] text-muted-foreground">Write the script to fill your scenes.</p>}
      </Block>

      <Block title="Fingerprint">
        <p className="break-all font-mono text-[10.5px] text-signal">{fp ? `${fp.slice(0, 24)}…${fp.slice(-8)}` : "—"}</p>
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
          SHA-256 of this scene, worked out in your browser. A fingerprint, not a seal — it is not signed or timestamped.
        </p>
        <Link to="/seal" className="hud mt-2 inline-block text-[9px] text-primary hover:text-foreground">Seal a record in Passport →</Link>
      </Block>

      <Block title="Pipeline">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[22px] font-bold tabular-nums">{cov.wired}/{cov.total}</span>
          <Link to="/connect" className="hud text-[9px] text-primary hover:text-foreground">Connect →</Link>
        </div>
        <p className="hud mt-1 text-[9px]">Film stages with a tool behind them</p>
      </Block>
    </div>
  );
}

function Block({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel relative">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/85">{title}</span>
        {right}
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rack px-2.5 py-2">
      <div className={cn("font-display text-[22px] font-bold leading-none tabular-nums", value > 0 ? "text-ok" : "text-primary")}>{value}</div>
      <div className="hud mt-1 text-[8.5px]">{label}</div>
    </div>
  );
}
