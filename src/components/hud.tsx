import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Four hairline corner brackets — the HUD frame used on monitors and hero panels. */
export function Corners({ className }: { className?: string }) {
  const base = "pointer-events-none absolute h-3 w-3 border-primary/70";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(base, "left-0 top-0 border-l border-t")} />
      <span className={cn(base, "right-0 top-0 border-r border-t")} />
      <span className={cn(base, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(base, "bottom-0 right-0 border-b border-r")} />
    </span>
  );
}

export type Tone = "ok" | "warn" | "bad" | "signal" | "idle" | "live";

const PIP: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-primary",
  signal: "bg-signal",
  idle: "bg-muted-foreground/40",
  live: "bg-primary",
};

export function Pip({ tone = "idle", pulse }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        PIP[tone],
        (pulse || tone === "live") && "animate-pulse-dot",
      )}
    />
  );
}

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-ok border-ok/40 bg-ok/10",
  warn: "text-warn border-warn/40 bg-warn/10",
  bad: "text-primary border-primary/50 bg-primary/10",
  signal: "text-signal border-signal/40 bg-signal/10",
  idle: "text-muted-foreground border-border bg-transparent",
  live: "text-primary border-primary/50 bg-primary/10",
};

export function Tag({ tone = "idle", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]",
        TONE_TEXT[tone],
        className,
      )}
    >
      <Pip tone={tone} />
      {children}
    </span>
  );
}

export function PanelHead({ code, title, right }: { code?: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2">
      <div className="flex items-baseline gap-2 min-w-0">
        {code && <span className="hud text-primary">{code}</span>}
        <span className="truncate text-[11px] font-bold uppercase tracking-[0.16em]">{title}</span>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

/** SMPTE-style running timecode from page open, 24 fps. */
export function useTimecode(fps = 24) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => { setT(performance.now() - start); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return formatTimecode(t / 1000, fps);
}

export function formatTimecode(seconds: number, fps = 24) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const f = Math.floor((s % 1) * fps);
  return [h, m, sec, f].map((n) => String(n).padStart(2, "0")).join(":");
}

export function Clock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const fmt = () => new Date().toISOString().slice(11, 19);
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{now} UTC</span>;
}

export function Stat({ label, value, tone, sub }: { label: string; value: ReactNode; tone?: Tone; sub?: ReactNode }) {
  const colour =
    tone === "bad" ? "text-primary" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : tone === "signal" ? "text-signal" : "text-foreground";
  return (
    <div className="rack px-3 py-2.5">
      <div className={cn("font-display text-2xl font-bold leading-none tabular-nums", colour)}>{value}</div>
      <div className="hud mt-1.5">{label}</div>
      {sub && <div className="mt-1 text-[10px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}
