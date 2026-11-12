import { Building2, Cloud, Code, Cpu, Fingerprint, Network, Server, Users } from "lucide-react";
import img from "@/assets/gate-engine.webp";
import { Tag, type Tone } from "@/components/hud";
import { CONNECTIONS, STAGE_CONNECTION, depthCount } from "@/lib/apex/connection";
import { Banner, GoButton, SectionTitle } from "./shared";

const STAGES: { id: string; name: string; does: string }[] = [
  { id: "storyboard", name: "Storyboard", does: "Turn the idea into frames and shots." },
  { id: "character_lock", name: "Characters", does: "Keep faces and looks the same in every scene." },
  { id: "motion", name: "Motion", does: "Bring each shot to life as video." },
  { id: "dialogue", name: "Voice", does: "Lines and performances for the cast." },
  { id: "music", name: "Music", does: "Score and themes for the film." },
  { id: "sound", name: "Sound", does: "Effects, ambience and the final mix." },
  { id: "subtitles", name: "Subtitles", does: "Captions in any language." },
  { id: "edit", name: "Edit", does: "Cut the shots into a story." },
  { id: "finish", name: "Finish", does: "Colour, master and export." },
  { id: "publish", name: "Publish", does: "Put it in front of the world." },
];

const BY_ID = new Map(CONNECTIONS.map((c) => [c.toolId, c]));

/** Honest per-stage status, straight from the connection table. */
function stageStatus(id: string): { tone: Tone; label: string; tools: string[] } {
  const rows = (STAGE_CONNECTION[id] ?? []).flatMap((t) => {
    const r = BY_ID.get(t);
    return r ? [r] : [];
  });
  const tools = rows.map((r) => r.name);
  if (rows.some((r) => r.depth === "drivable")) return { tone: "ok", label: "Driver ready", tools };
  if (rows.some((r) => r.depth === "file-exchange")) return { tone: "signal", label: "Hand-off", tools };
  if (rows.some((r) => r.depth === "portal-only")) return { tone: "warn", label: "Portal only", tools };
  return { tone: "bad", label: "No driver yet", tools };
}

export function EngineTab() {
  const d = depthCount();
  return (
    <div>
      <Banner img={img} kicker="03 · What it does" title={<>One studio.<br /><span className="text-primary text-glow">Ten steps.</span> Every tool.</>}
        sub="Not a single prompt box. A full production line from the first idea to a finished, proven film." />

      <SectionTitle eyebrow="The production line" title="From idea to finished film"
        sub="Every film moves through the same ten steps. Each step shows honestly whether a tool can already run it." />
      <ol className="mt-6 grid grid-cols-2 gap-2 text-left sm:grid-cols-5">
        {STAGES.map((s, n) => {
          const st = stageStatus(s.id);
          return (
            <li key={s.id} className="rack relative flex flex-col p-4">
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/80 to-transparent" />
              <div className="font-mono text-[22px] font-bold leading-none text-primary/90">{String(n + 1).padStart(2, "0")}</div>
              <div className="mt-3 font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-foreground">{s.name}</div>
              <div className="mt-1 flex-1 text-[12px] leading-snug text-muted-foreground">{s.does}</div>
              <div className="mt-3"><Tag tone={st.tone}>{st.label}</Tag></div>
              <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground/80">{st.tools.length ? st.tools.join(" · ") : "—"}</div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-left text-[11px] leading-relaxed text-muted-foreground">
        Driver ready: a tool can run the step. Hand-off: the studio prepares the files and you finish in that tool.
        Most drivers run on your own computer; cloud video already runs from the browser.
      </p>

      <SectionTitle eyebrow="Where films are rendered" title="Three engines of compute" />
      <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
        {[
          { i: Cloud, t: "Cloud GPUs", tag: <Tag tone="ok">Live</Tag>, d: "Video shots render on powerful cloud graphics machines through Replicate. Working today." },
          { i: Server, t: "Your own machine", tag: <Tag tone="signal">Connect</Tag>, d: "Link a ComfyUI computer or a rented GPU on Connect, and the studio sends work to it." },
          { i: Network, t: "Render grid", tag: <Tag tone="signal">Studio nodes</Tag>, d: "GPU machines run a small worker that picks shots off one shared queue. Public sign-up for idle gaming and studio GPUs opens next." },
        ].map(({ i: I, t, tag, d }) => (
          <div key={t} className="glass p-6">
            <div className="flex items-center justify-between"><I className="h-6 w-6 text-primary" strokeWidth={1.4} />{tag}</div>
            <div className="mt-4 font-display text-[18px] font-semibold text-foreground">{t}</div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>

      <SectionTitle eyebrow="The film passport" title={<>Proof of Stateful <span className="text-primary">Integrity</span></>}
        sub="PSI is an open protocol for verifiable records. In the studio it becomes a passport for your film: what was made, by which key, and when." />
      <div className="mt-6 grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
        {[
          { n: "State", d: "Your project, prompts and files as they are." },
          { n: "Transition", d: "Each change, recorded as a step." },
          { n: "Proof", d: "Hashed, signed and timestamped." },
          { n: "Verification", d: "Anyone checks it, free and offline." },
        ].map((s, k) => (
          <div key={s.n} className="relative border border-primary/40 bg-primary/[0.06] p-4">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span className="font-mono text-[10px] text-muted-foreground">0{k + 1}</span>
            </div>
            <div className="mt-2 font-display text-[16px] font-semibold uppercase text-foreground">{s.n}</div>
            <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{s.d}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["RFC 8785 canonical JSON", "SHA-256 Merkle proofs", "Ed25519 signatures", "Bitcoin timestamps"].map((c) => (
          <span key={c} className="rack px-2.5 py-1 font-mono text-[10.5px] text-signal">{c}</span>
        ))}
      </div>
      <blockquote className="mt-5 border-l-2 border-primary pl-4 text-left text-[14px] italic leading-relaxed text-foreground/85">
        “A seal proves a record was made and has not changed since its timestamp. It never proves that what the record says is true.”
      </blockquote>
      <div className="mt-5 text-left"><GoButton to="/verify" ghost>See a film passport</GoButton></div>

      <SectionTitle eyebrow="The tool map" title="Every tool, honestly labelled"
        sub="The studio keeps a map of the creative tools on the planet and says plainly which ones it can drive and which it cannot." />
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { v: "1,100+", l: "Tools mapped", c: "text-foreground" },
          { v: String(CONNECTIONS.length), l: "Core tools tracked", c: "text-foreground" },
          { v: String(d.drivable), l: "Drivers ready", c: "text-ok" },
          { v: String(d["file-exchange"]), l: "Hand-off tools", c: "text-signal" },
        ].map((s) => (
          <div key={s.l} className="rack px-4 py-4 text-left">
            <div className={`font-display text-[30px] font-bold leading-none tabular-nums ${s.c}`}>{s.v}</div>
            <div className="hud mt-2 text-[9px]">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 text-left"><GoButton to="/registry" ghost>Open the tool map</GoButton></div>

      <SectionTitle eyebrow="Who it is for" title="Built for every kind of maker" />
      <div className="mt-6 grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
        {[
          { i: Users, t: "Creators", d: "Make a film from a phone, keep the credit." },
          { i: Building2, t: "Studios", d: "Run whole productions with proof built in." },
          { i: Code, t: "Developers", d: "Connect new tools and improve the studio." },
          { i: Cpu, t: "Compute providers", d: "Run the node worker and lend spare GPUs to the render grid." },
        ].map(({ i: I, t, d }) => (
          <div key={t} className="glass p-4">
            <I className="h-5 w-5 text-primary" strokeWidth={1.4} />
            <div className="mt-3 font-display text-[15px] font-semibold text-foreground">{t}</div>
            <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
