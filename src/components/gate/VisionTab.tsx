import { GitFork, Globe2, Infinity as InfinityIcon, ShieldCheck } from "lucide-react";
import img from "@/assets/gate-vision.webp";
import { Tag } from "@/components/hud";
import { Banner, GoLink, SectionTitle } from "./shared";

const PILLARS = [
  { i: Globe2, t: "Open to everyone", d: "Any phone, any country, any budget. If you have a vision, you have a studio." },
  { i: ShieldCheck, t: "Proof belongs to the maker", d: "Every film can carry a PSI receipt showing what was made, by which key, and when." },
  { i: GitFork, t: "Open source, open world", d: "The studio code is meant to be public, so anyone can run it, improve it and plug in new tools." },
  { i: InfinityIcon, t: "Grows with AI", d: "Each better AI model becomes one more engine inside the studio, for every creator at once." },
];

function Split({ a, b, la, lb }: { a: number; b: number; la: string; lb: string }) {
  return (
    <div className="mt-4">
      <div className="flex h-3 w-full overflow-hidden border border-border">
        <div className="bg-primary shadow-[0_0_14px_var(--primary)]" style={{ width: `${a}%` }} />
        <div className="bg-signal/70" style={{ width: `${b}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px]">
        <span className="text-primary">{a}% {la}</span><span className="text-signal">{b}% {lb}</span>
      </div>
    </div>
  );
}

export function VisionTab() {
  return (
    <div>
      <Banner img={img} kicker="02 · The Vision" title={<>No gatekeepers.<br /><span className="text-primary text-glow">Only storytellers.</span></>}
        sub="One studio for the whole planet, from a kid with big dreams and no money to the largest production houses in the world." />

      <div className="mx-auto mt-12 max-w-3xl text-left sm:text-center">
        <p className="font-display text-[24px] font-semibold leading-snug text-foreground sm:text-[34px]">
          Filmmaking, content and art should have <span className="text-primary">no barriers</span>.
        </p>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
          For a hundred years, making a film meant money, equipment and permission. AI is breaking those walls.
          The Filmverse puts a complete studio behind every person with a vision, the willpower and the desire,
          and lets them show their work to the world while keeping credit for it.
        </p>
      </div>

      <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
        {PILLARS.map(({ i: I, t, d }, n) => (
          <div key={t} className="glass group relative p-6 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between">
              <I className="h-6 w-6 text-primary" strokeWidth={1.4} />
              <span className="font-mono text-[11px] text-muted-foreground">0{n + 1}</span>
            </div>
            <div className="mt-4 font-display text-[19px] font-semibold text-foreground">{t}</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>

      <SectionTitle eyebrow="The future" title={<>Built to grow with AI,<br />not be replaced by it</>}
        sub="AI models change every few months. The Filmverse does not bet on one model. It is the studio and the proof layer that sits above all of them." />
      <div className="mt-6 space-y-2 text-left">
        <div className="rack relative p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-display text-[16px] font-semibold uppercase tracking-[0.1em] text-foreground">Layer 1 · AI models</span>
            <Tag tone="warn">Changes constantly</Tag>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">Video, voice and music models arrive and get replaced. Each new one becomes another engine the studio can call.</p>
        </div>
        <div className="flex justify-center"><span className="h-6 w-px bg-primary shadow-[0_0_8px_var(--primary)]" /></div>
        <div className="relative border border-primary/50 bg-primary/[0.07] p-5 red-laser">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-display text-[16px] font-semibold uppercase tracking-[0.1em] text-foreground">Layer 2 · Studio + proof</span>
            <Tag tone="ok">Built to last</Tag>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">The ten-step pipeline, your projects, your credits and your PSI receipts stay with you, whichever model made the pixels.</p>
        </div>
        <p className="pt-3 text-center font-display text-[18px] text-foreground sm:text-[22px]">The smarter AI gets, the more every creator here can do.</p>
      </div>

      <SectionTitle eyebrow="The economics" title="How the money is meant to flow"
        sub={<>Creators keep the majority. The platform earns only when the people on it earn. <Tag tone="warn" className="ml-1 align-middle">Planned · not live</Tag></>} />
      <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
        <div className="panel p-6">
          <div className="hud text-[9px] text-primary">Channel 01</div>
          <div className="mt-2 font-display text-[20px] font-semibold text-foreground">Open Creator</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">Bring your own computer or pay cost-price rendering. Keep 85% of tickets, rentals and tips.</p>
          <Split a={85} b={15} la="creator" lb="platform" />
        </div>
        <div className="panel p-6">
          <div className="hud text-[9px] text-primary">Channel 02</div>
          <div className="mt-2 font-display text-[20px] font-semibold text-foreground">Studio Co-Production</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">The studio backs your film with compute, talent and promotion, and shares in what it earns.</p>
          <Split a={50} b={50} la="creator" lb="studio" />
        </div>
        <div className="panel p-6">
          <div className="hud text-[9px] text-primary">Channel 03</div>
          <div className="mt-2 font-display text-[20px] font-semibold text-foreground">Community Compute Grid</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">People with idle graphics cards render for creators through one shared grid. A small fee per rendered minute keeps it running.</p>
        </div>
        <div className="panel p-6">
          <div className="hud text-[9px] text-primary">Channel 04</div>
          <div className="mt-2 font-display text-[20px] font-semibold text-foreground">Enterprise Proof</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">Studios and platforms license PSI sealing and verification at scale for their own catalogues.</p>
        </div>
      </div>
      <p className="mt-4 text-left text-[11px] leading-relaxed text-muted-foreground">
        This is the planned business model, shared for discussion. Nothing here is an offer, a price list or an investment
        promise, and no payments run on the platform today. See <GoLink to="/legal">Legal &amp; disclaimers</GoLink>.
      </p>
    </div>
  );
}
