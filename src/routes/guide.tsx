import { createFileRoute, Link } from "@tanstack/react-router";
import { CONNECTIONS } from "@/lib/apex/connection";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Platform Guide — Sovereign AI Filmverse" },
      { name: "description", content: "What Sovereign AI Filmverse does, how to use it, what it offers creators and studios, and how the open-source model works." },
      { property: "og:title", content: "Platform Guide — Sovereign AI Filmverse" },
      { property: "og:description", content: "The world studio, open to everyone — how it works, in plain words." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guide,
});

const DEPTH_LABEL: Record<string, string> = {
  drivable: "Ready",
  "file-exchange": "Hand-off",
  "portal-only": "Portal only",
  "not-yet": "Not built yet",
};

function Card({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <section className="glass border border-hairline p-5 sm:p-6">
      <h2 className="font-display text-[20px] font-bold text-foreground sm:text-[24px]">{t}</h2>
      <div className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Guide() {
  const tools = CONNECTIONS;
  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-8">
      <div className="hud text-[10px] tracking-[0.4em]">Platform guide · Blueprint</div>
      <h1 className="mt-3 font-display text-[34px] font-bold leading-tight text-foreground sm:text-[52px]">
        How the <span className="text-primary">Sovereign AI Filmverse</span> works
      </h1>
      <p className="mt-3 text-[16px] text-foreground/85">The world studio, open to everyone. Short version: describe it, style it, render it, watch it, prove it's yours.</p>

      <div className="mt-8 space-y-4">
        <Card t="What it does for the world">
          <p>Filmmaking has always needed money, gear and gatekeepers. This platform puts a full film studio in a browser, so anyone with a vision — from a kid with a phone to a large production house — works with the same tools. Talent decides, not budget.</p>
        </Card>

        <Card t="How to use it — 6 steps">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li><b className="text-foreground">Create</b> — type your idea in plain words. The story assistant (Oracle) turns it into a cinematic shot.</li>
            <li><b className="text-foreground">Pick a look</b> — cinematic, anime, noir, documentary, cyberpunk or dream.</li>
            <li><b className="text-foreground">Render</b> — the shot is made on cloud GPUs, or on your own machine if you connect one.</li>
            <li><b className="text-foreground">Theater & Vault</b> — watch, keep and download your films.</li>
            <li><b className="text-foreground">Director</b> — line shots up into scenes along the 10-stage film pipeline.</li>
            <li><b className="text-foreground">Verify</b> — check a film's PSI receipt: what existed, when, signed by whom.</li>
          </ol>
        </Card>

        <Card t="What it offers">
          <p><b className="text-foreground">Creators:</b> a studio with no upfront cost for the tools, from any phone.</p>
          <p><b className="text-foreground">Studios:</b> fast previews, storyboards and test shots, and one pipeline that can drive their own machines.</p>
          <p><b className="text-foreground">Collaborations:</b> teams anywhere can share shots and scenes, with receipts that keep a record of who made what and when.</p>
          <p><b className="text-foreground">Developers:</b> an open API and open source code to plug in new tools and engines.</p>
        </Card>

        <Card t="Backed by PSI — Proof of Stateful Integrity">
          <p>Receipts use <a className="text-primary" href="https://www.ai-governance-standard.com/" target="_blank" rel="noreferrer">PSI</a>, the open protocol published at ai-governance-standard.com as IETF Internet-Draft <a className="text-primary" href="https://www.ai-governance-standard.com/draft" target="_blank" rel="noreferrer">draft-singh-psi</a> — built from RFC 8785 canonical JSON, SHA-256, Merkle inclusion proofs, Ed25519 signatures and Bitcoin timestamping via OpenTimestamps. Anyone can verify a receipt free, offline, with no account.</p>
          <p>A receipt proves a file existed in that exact state at that time and who signed it. It does not judge whether the content is true. The draft is an individual submission, not yet an official IETF standard.</p>
        </Card>

        <Card t="The open-source model">
          <p>The platform is built to be open: anyone can download the code, run it on their own computer or server, connect their own tools, and send improvements back on GitHub. Business, governance and the hosted studio stay with the founding company; the code and the receipt format stay open.</p>
          <p>Ways to connect: plug in your own machine running ComfyUI on <Link to="/connect" className="text-primary">Connect</Link>, call the render API from scripts or IDEs, or add a new tool driver in the code.</p>
        </Card>

        <Card t="Tools — honest status today">
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {tools.map((c, i) => (
              <li key={c.toolId ?? i} className="flex justify-between gap-3 border-b border-hairline/60 py-1">
                <span className="text-foreground">{c.name}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider">{DEPTH_LABEL[c.depth] ?? c.depth}{c.depth === "drivable" ? ` · ${c.where}` : ""}</span>
              </li>
            ))}
          </ul>
          <p className="pt-2 text-[13px]">"Ready · your machine" means it runs once you connect a computer with that tool; "Ready · your account" runs from this website. Others or are hand-offs to the tool's own app. Nothing is shown as working when it isn't.</p>
        </Card>
      </div>

      <p className="mt-8 text-[12px] text-muted-foreground">Prototype. See <Link to="/legal" className="text-primary">Legal &amp; Disclaimers</Link>.</p>
    </main>
  );
}
