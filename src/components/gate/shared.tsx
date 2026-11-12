import { createContext, useContext, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Corners } from "@/components/hud";
import { cn } from "@/lib/utils";

/** Pages the welcome gate may open directly. Every one is a real route. */
export type GateTo =
  | "/" | "/create" | "/theater" | "/vault" | "/director" | "/oracle"
  | "/connect" | "/verify" | "/registry" | "/guide" | "/legal" | "/beta";

export type TabId = "architects" | "vision" | "engine" | "howto";

type GateApi = { go: (to?: GateTo) => void; showTab: (t: TabId) => void };
export const GateCtx = createContext<GateApi>({ go: () => {}, showTab: () => {} });
export const useGate = () => useContext(GateCtx);

/**
 * Widescreen key-art banner that opens every tab. Labelled "Key art" so it never passes as a render.
 * The art is a background layer and the words flow in normal layout, so the banner grows with its
 * text and the headline can never ride over the label or spill out of the frame on any screen.
 */
export function Banner({ img, kicker, title, sub }: { img: string; kicker: string; title: ReactNode; sub: string }) {
  return (
    <figure className="relative isolate flex min-h-[340px] flex-col overflow-hidden border border-border bg-screen shadow-[var(--shadow-deck)] vignette grain sm:min-h-[400px] lg:min-h-[460px]">
      <img src={img} alt="" aria-hidden loading="lazy" width={1600} height={693}
        className="absolute inset-0 -z-10 h-full w-full animate-kenburns object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-screen via-screen/70 to-screen/10" />
      <Corners className="z-[4] m-3" />
      <div className="relative z-[4] flex items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-6">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full bg-primary" />
          <span className="hud truncate text-[9px] tracking-[0.35em] text-foreground/80">{kicker}</span>
        </span>
        <span className="hud shrink-0 border border-border bg-screen/60 px-1.5 py-0.5 text-[8px]">Key art</span>
      </div>
      <figcaption className="relative z-[4] mt-auto px-5 pb-6 pt-24 text-left sm:px-8 sm:pb-8 sm:pt-32">
        <h2 className="font-display text-[30px] font-bold leading-[0.98] text-foreground sm:text-[46px] lg:text-[56px]">{title}</h2>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-foreground/85 sm:text-[17px]">{sub}</p>
      </figcaption>
    </figure>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="h-px w-8 bg-primary shadow-[0_0_8px_var(--primary)]" />
      <span className="hud text-[10px] tracking-[0.4em] text-primary">{children}</span>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mt-14 text-left">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className="mt-3 font-display text-[26px] font-bold leading-tight text-foreground sm:text-[38px]">{title}</h3>
      {sub && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[16px]">{sub}</p>}
    </div>
  );
}

/** Button that leaves the gate and opens a real page. */
export function GoButton({ to, children, ghost }: { to: GateTo; children: ReactNode; ghost?: boolean }) {
  const { go } = useGate();
  return (
    <button type="button" onClick={() => go(to)}
      className={cn(
        "group inline-flex items-center gap-2 px-4 py-3 font-display text-[12px] font-bold uppercase tracking-[0.18em] transition-all active:scale-95",
        ghost
          ? "border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
          : "bg-primary text-primary-foreground shadow-[0_0_28px_-6px_var(--primary)] hover:scale-[1.02]",
      )}>
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </button>
  );
}

/** Inline text link that leaves the gate and opens a real page. */
export function GoLink({ to, children }: { to: GateTo; children: ReactNode }) {
  const { go } = useGate();
  return (
    <button type="button" onClick={() => go(to)} className="text-primary underline-offset-4 hover:underline">
      {children}
    </button>
  );
}
