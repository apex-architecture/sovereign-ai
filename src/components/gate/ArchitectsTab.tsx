import { Clapperboard, Code, Compass, Cpu, Globe2, Megaphone, Users } from "lucide-react";
import img from "@/assets/gate-architects.webp";
import { Corners, Tag } from "@/components/hud";
import { Banner, SectionTitle, useGate } from "./shared";

const COFOUNDERS = [
  {
    icon: Clapperboard,
    title: "Head of Studio & Originals",
    line: "Leads creative production, stress-tests the pipeline and develops the flagship films.",
    leads: ["Creative direction of studio originals", "Testing every step of the pipeline on real films", "Creator workshops and the quality bar"],
    first: ["Direct the first flagship short made fully on the platform", "Report what works and what breaks, step by step", "Host a monthly creator showcase"],
  },
  {
    icon: Megaphone,
    title: "Head of Distribution & Guild",
    line: "Takes the films to the world and grows the global community of creators.",
    leads: ["Festivals, premieres and screenings", "The creator guild and partner communities", "Awareness, press and partnerships"],
    first: ["Bring the first platform films to festivals and screenings", "Grow the first circle of guild creators", "Open conversations with creator communities and partners"],
  },
];

export function ArchitectsTab() {
  const { showTab } = useGate();
  return (
    <div>
      <Banner img={img} kicker="01 · The Architects" title={<>Three pillars.<br /><span className="text-primary text-glow">One vision.</span></>}
        sub="Every great studio starts with a few people who refuse to accept limits. This is who is building the Filmverse." />

      {/* Founder */}
      <section className="panel relative mt-8 overflow-hidden p-6 text-left sm:p-10">
        <Corners className="m-2" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="relative mx-auto h-36 w-36 sm:mx-0 sm:h-44 sm:w-44">
            <span className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-primary/60" />
            <span className="absolute inset-3 rounded-full border border-signal/30" />
            <span className="absolute inset-6 flex items-center justify-center rounded-full bg-screen red-laser">
              <span className="font-display text-[40px] font-bold tracking-tight text-primary text-glow sm:text-[52px]">KS</span>
            </span>
          </div>
          <div className="text-center sm:text-left">
            <Tag tone="live">Founder · Pillar one</Tag>
            <h3 className="mt-4 font-display text-[34px] font-bold leading-none text-foreground sm:text-[52px]">Kawaljeet Singh</h3>
            <div className="mt-3 font-display text-[15px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[18px]">Founder & Chief Architect</div>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-foreground/85 sm:text-[16px]">
              Creator of Sovereign AI Filmverse and author of Proof of Stateful Integrity (PSI), published as the
              IETF Internet-Draft <span className="font-mono text-signal">draft-singh-psi</span>. Holds the blueprint: how the
              studio is built, how every film is proven, and where the platform goes next.
            </p>
          </div>
        </div>
        <div className="relative mt-8 grid gap-2 sm:grid-cols-3">
          {[
            { i: Compass, t: "Platform architecture", d: "The ten-step studio and how every tool plugs in." },
            { i: Cpu, t: "PSI protocol & proof", d: "The receipts that show who made what, and when." },
            { i: Globe2, t: "Brand & direction", d: "Final say on architecture, protocol and brand." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rack flex gap-3 p-4">
              <I className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
              <div>
                <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-foreground">{t}</div>
                <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Co-founders */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {COFOUNDERS.map((c, n) => {
          const I = c.icon;
          return (
            <section key={c.title} className="glass relative p-6 text-left">
              <Corners className="m-1.5 opacity-60" />
              <div className="flex items-center justify-between gap-3">
                <Tag tone="signal">Co-Founder · Pillar {n === 0 ? "two" : "three"}</Tag>
                <I className="h-6 w-6 text-signal" strokeWidth={1.25} />
              </div>
              <div className="hud mt-5 text-[10px]">Name to be announced</div>
              <h4 className="mt-2 font-display text-[22px] font-bold leading-tight text-foreground sm:text-[26px]">{c.title}</h4>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{c.line}</p>
              <div className="hud mt-5 text-[9px] text-foreground/70">Leads</div>
              <ul className="mt-2 space-y-1.5">
                {c.leads.map((l) => (
                  <li key={l} className="flex gap-2 text-[13px] text-foreground/90"><span className="mt-[7px] h-1 w-1 shrink-0 bg-primary" />{l}</li>
                ))}
              </ul>
              <div className="hud mt-5 text-[9px] text-foreground/70">First milestones</div>
              <ol className="mt-2 space-y-1.5">
                {c.first.map((l, k) => (
                  <li key={l} className="flex gap-2 text-[13px] text-muted-foreground"><span className="font-mono text-[11px] text-signal">0{k + 1}</span>{l}</li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      {/* Pillar four */}
      <section className="relative mt-4 overflow-hidden border border-primary/40 bg-primary/[0.06] p-6 text-left sm:p-8">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <Tag tone="bad">Pillar four · You</Tag>
            <h4 className="mt-4 font-display text-[24px] font-bold leading-tight text-foreground sm:text-[30px]">The open community</h4>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              Creators who make films, developers who connect new tools, and people who lend their computers to render.
              The studio is meant to be built with the world, not only for it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[{ i: Users, t: "Creators" }, { i: Code, t: "Developers" }, { i: Cpu, t: "Compute providers" }].map(({ i: I, t }) => (
                <span key={t} className="rack inline-flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground/90"><I className="h-3.5 w-3.5 text-primary" />{t}</span>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => showTab("howto")}
            className="border border-primary/60 px-5 py-3 font-display text-[12px] font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            Find your way in →
          </button>
        </div>
      </section>

      <SectionTitle eyebrow="How we work together" title="Ownership without pressure" />
      <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
        {[
          { n: "01", t: "Clear domains", d: "Each pillar owns its area from end to end. Nobody micromanages anybody." },
          { n: "02", t: "Milestones, not quotas", d: "Shared goals that feel like creative wins: a finished film, a premiere, a growing guild." },
          { n: "03", t: "One architect", d: "Final say on architecture, protocol and brand stays with the founder, so the vision stays whole." },
        ].map((s) => (
          <div key={s.n} className="glass p-5">
            <div className="font-mono text-[12px] text-primary">{s.n}</div>
            <div className="mt-2 font-display text-[17px] font-semibold text-foreground">{s.t}</div>
            <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
