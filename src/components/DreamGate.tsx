import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import gatewaySky from "@/assets/gateway-projector-dream.jpg";
import logoMark from "@/assets/logo-mark.webp";
import { useTimecode } from "@/components/hud";
import { cn } from "@/lib/utils";
import { GateCtx, GoLink, type GateTo, type TabId } from "@/components/gate/shared";
import { ArchitectsTab } from "@/components/gate/ArchitectsTab";
import { VisionTab } from "@/components/gate/VisionTab";
import { EngineTab } from "@/components/gate/EngineTab";
import { HowToTab } from "@/components/gate/HowToTab";

const KEY = "sovereign.entered";
const Ctx = createContext<() => void>(() => {});
/** Call to bring the welcome page back (e.g. during a pitch). */
export const useShowIntro = () => useContext(Ctx);

const TABS: { id: TabId; n: string; label: string; short: string; sub: string }[] = [
  { id: "architects", n: "01", label: "The Architects", short: "Team", sub: "Who builds it" },
  { id: "vision", n: "02", label: "The Vision", short: "Vision", sub: "Why it exists" },
  { id: "engine", n: "03", label: "What it does", short: "Engine", sub: "The studio inside" },
  { id: "howto", n: "04", label: "How to use", short: "Use it", sub: "Your way in" },
];

const STAGES = ["Storyboard", "Characters", "Motion", "Voice", "Music", "Sound", "Subtitles", "Edit", "Finish", "Publish", "PSI Passport"];

function Timecode() {
  const tc = useTimecode();
  return <span className="tabular-nums text-foreground/80">{tc}</span>;
}

function EnterButton({ onClick, big }: { onClick: () => void; big?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center gap-3 overflow-hidden bg-primary font-display font-bold uppercase text-primary-foreground shadow-[0_0_48px_-6px_var(--primary)] transition-all hover:scale-[1.03] active:scale-95",
        big ? "px-7 py-5 text-[13px] tracking-[0.2em] sm:px-10 sm:py-6 sm:text-[16px]" : "px-5 py-3.5 text-[12px] tracking-[0.18em]",
      )}>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-sweep bg-gradient-to-r from-transparent via-primary-foreground/25 to-transparent" />
      <span className="relative">Enter the Sovereign AI Filmverse</span>
      <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
    </button>
  );
}

export function DreamGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [tab, setTab] = useState<TabId>("architects");
  const [floatCta, setFloatCta] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const heroCta = useRef<HTMLDivElement>(null);
  const endCta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(KEY) === "1") setOpen(true);
  }, []);

  // Floating "Enter" bar on phones once the hero button has scrolled away, hidden again at the final button.
  useEffect(() => {
    if (open) return;
    const seen = { hero: true, end: false };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === heroCta.current) seen.hero = e.isIntersecting;
        if (e.target === endCta.current) seen.end = e.isIntersecting;
      }
      setFloatCta(!seen.hero && !seen.end);
    });
    if (heroCta.current) io.observe(heroCta.current);
    if (endCta.current) io.observe(endCta.current);
    return () => io.disconnect();
  }, [open]);

  const go = (to?: GateTo) => {
    setLeaving(true);
    sessionStorage.setItem(KEY, "1");
    setTimeout(() => {
      setOpen(true);
      setLeaving(false);
      window.scrollTo(0, 0);
      if (to) navigate({ to });
    }, 500);
  };
  const showIntro = () => { sessionStorage.removeItem(KEY); setOpen(false); setTab("architects"); window.scrollTo(0, 0); };

  const showTab = (t: TabId) => {
    setTab(t);
    const el = tabsRef.current;
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (open) return <Ctx.Provider value={showIntro}>{children}</Ctx.Provider>;

  return (
    <GateCtx.Provider value={{ go, showTab }}>
      <main className={`relative min-h-[100dvh] overflow-x-clip bg-screen transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}>
        <img src={gatewaySky} alt="" aria-hidden width={1920} height={1088}
          className="pointer-events-none fixed inset-0 h-full w-full animate-kenburns object-cover object-[22%_60%] opacity-90 sm:object-center" />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-screen/80 via-screen/60 to-screen/95" />
        <div className="pointer-events-none fixed inset-0 vignette" />

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative flex min-h-[100dvh] flex-col">
          <div className="hud relative z-10 flex items-center justify-between gap-3 border-b border-hairline bg-screen/40 px-4 py-2.5 text-[9px] backdrop-blur sm:px-8">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" /> Live prototype</span>
            <span className="hidden sm:inline">24 fps · 2.39:1 · Reel 01</span>
            <Timecode />
          </div>

          <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14 text-center">
            <img src={logoMark} alt="Sovereign AI Filmverse logo" width={256} height={256}
              className="mx-auto mb-6 h-20 w-20 rounded-2xl shadow-[0_0_60px_-8px_var(--primary)] animate-fade-up sm:h-24 sm:w-24" />
            <div className="hud text-[10px] tracking-[0.5em] animate-fade-up">A global open film platform</div>
            <h1 className="mt-6 font-display text-[40px] font-bold leading-[0.98] tracking-tight text-foreground animate-fade-up sm:text-[76px] lg:text-[100px]">
              Welcome to the <span className="text-primary text-glow">Sovereign</span><br />AI Filmverse
            </h1>
            <div className="mt-5 font-display text-[16px] font-medium uppercase tracking-[0.3em] text-foreground/90 animate-fade-up sm:text-[24px]">
              The world studio, open to everyone
            </div>
            <p className="mx-auto mt-7 max-w-2xl text-[16px] leading-relaxed text-foreground/85 animate-fade-up sm:text-[20px]">
              A complete film studio for every person on the planet. If you have a vision, the willpower and the desire,
              you can make your film here and show it to the world.
            </p>

            <div ref={heroCta} className="mt-10 flex flex-col items-center gap-4 animate-fade-up">
              <EnterButton onClick={() => go()} big />
              <button type="button" onClick={() => showTab("architects")}
                className="hud inline-flex items-center gap-2 text-[10px] tracking-[0.35em] text-foreground/80 hover:text-primary">
                Discover the Filmverse <ChevronDown className="h-4 w-4 animate-bounce" />
              </button>
            </div>

            <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { v: "10", l: "Steps, idea to film" },
                { v: "1,100+", l: "Tools mapped" },
                { v: "PSI", l: "Open proof standard" },
                { v: "Any", l: "Phone or browser" },
              ].map((s) => (
                <div key={s.l} className="glass px-3 py-3 text-left">
                  <div className="font-display text-[24px] font-bold leading-none text-foreground sm:text-[28px]">{s.v}</div>
                  <div className="hud mt-1.5 text-[8.5px]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline ticker */}
          <div className="relative overflow-hidden border-y border-hairline bg-screen/70 py-3 backdrop-blur">
            <div className="flex w-max animate-ticker gap-8">
              {[...STAGES, ...STAGES, ...STAGES, ...STAGES].map((s, k) => (
                <span key={k} className="hud flex items-center gap-8 whitespace-nowrap text-[10px] tracking-[0.35em] text-foreground/70">
                  {s}<span className="text-primary">◆</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOUR TABS ────────────────────────────────────── */}
        <div ref={tabsRef} className="sticky top-0 z-30 scroll-mt-0 border-b border-border bg-screen/85 backdrop-blur-xl">
          <div role="tablist" aria-label="About the Filmverse" className="mx-auto grid max-w-6xl grid-cols-4">
            {TABS.map((t) => {
              const on = t.id === tab;
              return (
                <button key={t.id} type="button" role="tab" id={`gate-tab-${t.id}`} aria-selected={on} aria-controls="gate-panel"
                  onClick={() => showTab(t.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 px-1 py-3 transition-colors sm:items-start sm:px-5 sm:py-4",
                    on ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}>
                  <span className={cn("font-mono text-[10px]", on ? "text-primary" : "text-muted-foreground/70")}>{t.n}</span>
                  <span className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] sm:hidden">{t.short}</span>
                  <span className="hidden font-display text-[16px] font-semibold uppercase tracking-[0.06em] sm:block">{t.label}</span>
                  <span className="hud hidden text-[8.5px] lg:block">{t.sub}</span>
                  {on && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary shadow-[0_0_12px_var(--primary)] sm:inset-x-5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative bg-gradient-to-b from-screen/80 via-screen/70 to-screen/85">
        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-8 sm:pb-12 sm:pt-12">
          <div id="gate-panel" role="tabpanel" aria-labelledby={`gate-tab-${tab}`} key={tab} className="animate-fade-up">
            {tab === "architects" && <ArchitectsTab />}
            {tab === "vision" && <VisionTab />}
            {tab === "engine" && <EngineTab />}
            {tab === "howto" && <HowToTab />}
          </div>

          {/* Next tab */}
          {tab !== "howto" && (
            <div className="mt-10 flex justify-end">
              {(() => {
                const i = TABS.findIndex((t) => t.id === tab);
                const next = TABS[i + 1];
                return (
                  <button type="button" onClick={() => showTab(next.id)}
                    className="group flex items-center gap-4 border border-border bg-screen/60 px-5 py-4 text-left backdrop-blur transition-colors hover:border-primary/60">
                    <span>
                      <span className="hud block text-[9px]">Next · {next.n}</span>
                      <span className="mt-1 block font-display text-[16px] font-semibold uppercase text-foreground">{next.label}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
                  </button>
                );
              })()}
            </div>
          )}

          {/* ── PSI + FINAL ENTER ─────────────────────────── */}
          <a href="https://www.ai-governance-standard.com/" target="_blank" rel="noreferrer"
            className="glass mx-auto mt-16 block max-w-3xl border-primary/40 p-5 text-left transition-colors hover:border-primary">
            <div className="hud text-[10px] tracking-[0.35em] text-primary">World first · Proof of Stateful Integrity</div>
            <div className="mt-2 font-display text-[18px] font-semibold text-foreground sm:text-[22px]">Backed by PSI — the open protocol for verifiable records</div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">Film receipts follow PSI (IETF Internet-Draft draft-singh-psi, ai-governance-standard.com): canonical JSON, SHA-256 Merkle proofs, Ed25519 signatures and Bitcoin timestamps. Anyone can check one free, offline. A receipt proves what existed and when — it never judges whether content is true.</p>
          </a>

          <div ref={endCta} className="mt-14 flex flex-col items-center gap-4 text-center">
            <p className="max-w-2xl font-display text-[20px] leading-snug text-foreground sm:text-[28px]">
              A kid with a phone and a major studio use the same tools. <span className="text-primary">Talent decides, not money.</span>
            </p>
            <div className="mt-4"><EnterButton onClick={() => go()} big /></div>
            <div className="hud text-[9.5px] tracking-[0.35em]">Your ideas · your control · no limits</div>
            <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
              Prototype creative tool, provided as is. Independent — not affiliated with any studio or trademark owner.
              All characters are original. You own and are responsible for what you create. Business plans shown are
              plans, not offers. <GoLink to="/guide">Guide</GoLink> · <GoLink to="/legal">Legal &amp; disclaimers</GoLink>
            </p>
          </div>
        </div>
        </div>

        {/* Floating enter bar (phones) */}
        <div className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-screen/90 p-3 backdrop-blur-xl transition-transform duration-300 sm:hidden",
          floatCta ? "translate-y-0" : "translate-y-full",
        )}>
          <button type="button" onClick={() => go()}
            className="flex w-full items-center justify-center gap-2 bg-primary py-3.5 font-display text-[12px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_0_28px_-6px_var(--primary)] active:scale-[0.98]">
            Enter the Filmverse <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </GateCtx.Provider>
  );
}
