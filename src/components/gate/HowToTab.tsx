import { useState, type ReactNode } from "react";
import { Building2, Code, Cpu, Wand2, type LucideIcon } from "lucide-react";
import img from "@/assets/gate-howto.webp";
import { Tag, type Tone } from "@/components/hud";
import { cn } from "@/lib/utils";
import { Banner, GoButton, GoLink, type GateTo } from "./shared";

type Path = {
  id: string; letter: string; icon: LucideIcon; who: string; tagline: string;
  status: { tone: Tone; label: string };
  steps: { t: string; d: ReactNode }[];
  cta: { to: GateTo; label: string };
};

const PATHS: Path[] = [
  {
    id: "creator", letter: "A", icon: Wand2, who: "Independent creator", tagline: "You have a story. Make it.",
    status: { tone: "ok", label: "Open now" },
    steps: [
      { t: "Open Create", d: <>Tap Enter below, then <GoLink to="/create">Create</GoLink>.</> },
      { t: "Describe your film", d: "Type the idea in plain words. The story assistant turns it into a sharp cinematic shot." },
      { t: "Pick a look", d: "Cinematic, anime, noir, documentary, cyberpunk or dream. One tap." },
      { t: "Generate", d: "Script and storyboard are free for everyone, every day. Video renders on cloud GPUs in a few minutes, opened by the studio." },
      { t: "Watch & keep", d: <>Play it in the <GoLink to="/theater">Theater</GoLink> and keep it in your <GoLink to="/vault">Vault</GoLink>.</> },
      { t: "Build & prove", d: <>Plan the whole film in <GoLink to="/director">Director</GoLink>, then check its passport on <GoLink to="/verify">Verify</GoLink>.</> },
    ],
    cta: { to: "/create", label: "Start creating" },
  },
  {
    id: "studio", letter: "B", icon: Building2, who: "Co-production studio", tagline: "Bring a feature. Build it together.",
    status: { tone: "signal", label: "By application" },
    steps: [
      { t: "Read the guide", d: <>See every step of the studio in the <GoLink to="/guide">Platform Guide</GoLink>.</> },
      { t: "Plan your scenes", d: <>Lay out the story and shot list in <GoLink to="/director">Director</GoLink>.</> },
      { t: "Apply", d: <>Pitch your project on the <GoLink to="/beta">application page</GoLink>.</> },
      { t: "Co-produce", d: "Studio-backed compute, talent and promotion with a shared split, agreed project by project." },
    ],
    cta: { to: "/beta", label: "Apply to co-produce" },
  },
  {
    id: "developer", letter: "C", icon: Code, who: "Open-source developer", tagline: "Plug in. Improve it. Make it yours.",
    status: { tone: "signal", label: "Foundation ready" },
    steps: [
      { t: "Explore the tool map", d: <>See every tool and its honest status on the <GoLink to="/registry">Registry</GoLink>.</> },
      { t: "Connect your machine", d: <>Point the studio at your ComfyUI or GPU server on <GoLink to="/connect">Connect</GoLink>.</> },
      { t: "Drive it by API", d: <>Send and track renders with <span className="font-mono text-signal">POST /api/public/render</span> using an owner-issued token.</> },
      { t: "Build on the code", d: <>Clone the open core from GitHub (<span className="font-mono text-signal">apex-architecture/sovereign-ai</span>) and follow the handover guide to run the whole studio your way.</> },
    ],
    cta: { to: "/connect", label: "Open Connect" },
  },
  {
    id: "node", letter: "D", icon: Cpu, who: "Compute provider", tagline: "Your idle GPU can power someone's film.",
    status: { tone: "signal", label: "Studio nodes live" },
    steps: [
      { t: "Run the node worker", d: "One small free program sits next to your ComfyUI, picks up shots from the studio queue and sends the finished file back." },
      { t: "Rent a GPU on Akash", d: "A ready-made Akash setup is included, so a rented GPU can join the grid by the hour." },
      { t: "Earn for renders", d: "Paid rendered minutes open with public node sign-up, the next release of the grid." },
    ],
    cta: { to: "/connect", label: "Register a machine" },
  },
];

export function HowToTab() {
  const [pick, setPick] = useState(PATHS[0].id);
  const p = PATHS.find((x) => x.id === pick) ?? PATHS[0];
  const I = p.icon;
  return (
    <div>
      <Banner img={img} kicker="04 · How to use" title={<>Four doors in.<br /><span className="text-primary text-glow">Pick yours.</span></>}
        sub="Whether you make films, run a studio, write code or own a powerful computer, there is a way into the Filmverse." />

      <div role="tablist" aria-label="Choose your path" className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PATHS.map((x) => {
          const XI = x.icon;
          const on = x.id === pick;
          return (
            <button key={x.id} type="button" role="tab" aria-selected={on} onClick={() => setPick(x.id)}
              className={cn("relative p-4 text-left transition-all", on ? "border border-primary bg-primary/10 red-laser" : "glass hover:border-primary/40")}>
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-[12px]", on ? "text-primary" : "text-muted-foreground")}>Path {x.letter}</span>
                <XI className={cn("h-5 w-5", on ? "text-primary" : "text-muted-foreground")} strokeWidth={1.4} />
              </div>
              <div className="mt-3 font-display text-[14px] font-semibold uppercase leading-tight text-foreground sm:text-[15px]">{x.who}</div>
            </button>
          );
        })}
      </div>

      <section key={p.id} className="panel relative mt-4 animate-fade-up p-6 text-left sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center border border-primary/60 bg-screen red-laser"><I className="h-6 w-6 text-primary" strokeWidth={1.4} /></span>
            <div>
              <div className="hud text-[9px] text-primary">Path {p.letter}</div>
              <h3 className="mt-1 font-display text-[22px] font-bold leading-tight text-foreground sm:text-[30px]">{p.who}</h3>
              <div className="text-[13px] text-muted-foreground">{p.tagline}</div>
            </div>
          </div>
          <Tag tone={p.status.tone}>{p.status.label}</Tag>
        </div>
        <ol className="relative mt-8 space-y-5 border-l border-primary/30 pl-6">
          {p.steps.map((s, k) => (
            <li key={s.t} className="relative">
              <span className="absolute -left-[33px] flex h-4 w-4 items-center justify-center rounded-full border border-primary bg-screen">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <div className="font-mono text-[10px] text-primary">STEP {String(k + 1).padStart(2, "0")}</div>
              <div className="mt-0.5 font-display text-[16px] font-semibold text-foreground sm:text-[18px]">{s.t}</div>
              <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">{s.d}</div>
            </li>
          ))}
        </ol>
        <div className="mt-8"><GoButton to={p.cta.to}>{p.cta.label}</GoButton></div>
      </section>

      <div className="glass mt-4 flex flex-col gap-3 p-5 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="hud text-[9px] text-primary">Fastest first look</div>
          <div className="mt-1 text-[14px] text-foreground">Want to see it in thirty seconds? Open the Theater and press play.</div>
        </div>
        <GoButton to="/theater" ghost>Open Theater</GoButton>
      </div>
    </div>
  );
}
