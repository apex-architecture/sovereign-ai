import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Database, Globe, Lock, ShieldCheck } from "lucide-react";
import { checkReceipt } from "@/lib/apex/verify.fn";
import { SHOWREEL } from "@/lib/stills";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify — Film Passport · Sovereign AI Film Verse" },
      { name: "description", content: "Paste a sealed receipt and check the film's chain of title. Free forever, no login." },
      { property: "og:title", content: "Verify — Film Passport · Sovereign AI Film Verse" },
      { property: "og:description", content: "Paste a sealed receipt and check the film's chain of title. Free forever, no login." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verify,
});

type CheckState = "pass" | "fail" | "cannot-check";

interface Verdict {
  signature: CheckState;
  file: CheckState;
  anchor: CheckState;
  sealedOn: string;
  title: string;
  attribution: string;
  toolDeclarations: string[];
  claims: string[];
  notClaims: string[];
}

const EXAMPLE = `{
  "format": "apex-psi/1",
  "contentHash": "<64 hex characters>",
  "creatorPublicKey": "<base64 key>",
  "algorithm": "ed25519",
  "signature": "<base64 signature>",
  "manifest": { "title": "…", "toolDeclarations": [ … ] },
  "sealedOn": "2026-11-01T00:00:00Z"
}`;

function Verify() {
  const [raw, setRaw] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsedHash = useMemo(() => {
    try { const j = JSON.parse(raw); return typeof j?.contentHash === "string" ? j.contentHash : null; } catch { return null; }
  }, [raw]);

  const run = async () => {
    setError(null);
    setVerdict(null);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch (e) { setError(`That is not JSON yet — ${String(e)}`); return; }
    if (contentHash && !/^[0-9a-f]{64}$/.test(contentHash.trim())) {
      setError("A content hash is 64 hex characters — paste the sha256 of the file, or leave it blank.");
      return;
    }
    setBusy(true);
    try {
      setVerdict(await checkReceipt({ data: { receipt: parsed as never, contentHash: contentHash.trim() || undefined } }));
    } catch (e) {
      setError(String(e));
    } finally { setBusy(false); }
  };

  const stamp: { label: string; sub: string; cls: string } = !verdict
    ? { label: "AWAITING", sub: "paste a receipt", cls: "border-dashed border-foreground/25 text-muted-foreground" }
    : verdict.signature === "pass" && verdict.file !== "fail"
      ? { label: "PASS", sub: verdict.file === "pass" ? "authentic + file matches" : "signature authentic", cls: "border-ok text-ok shadow-[0_0_30px_-8px_var(--ok)]" }
      : verdict.signature === "fail" || verdict.file === "fail"
        ? { label: "FAIL", sub: "does not verify", cls: "border-primary text-primary shadow-[0_0_30px_-8px_var(--primary)]" }
        : { label: "UNSURE", sub: "cannot check", cls: "border-warn text-warn" };

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6 md:py-7">
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        {/* Left: input */}
        <section>
          <h1 className="font-mono text-[34px] font-medium leading-[1.1] tracking-[0.04em] md:text-[40px]">Verify —<br />Film passport</h1>
          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
            Paste a sealed receipt to check the chain of title, from prompt to final film. The same check runs offline on any machine.
          </p>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={EXAMPLE} rows={8}
            className="mt-5 w-full rounded-md border border-border bg-card p-3 font-mono text-[11px] leading-relaxed focus:border-primary/60 focus:outline-none" />
          <input value={contentHash} onChange={(e) => setContentHash(e.target.value)}
            placeholder="sha256 of the file you hold (optional)"
            className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-[11px] focus:border-primary/60 focus:outline-none" />
          <button onClick={run} disabled={busy || !raw.trim()}
            className="mt-4 w-full rounded-md bg-primary py-3.5 font-mono text-[14px] tracking-[0.3em] text-primary-foreground shadow-[0_10px_34px_-12px_var(--primary)] hover:brightness-110 disabled:opacity-50">
            {busy ? "CHECKING…" : "VERIFY"}
          </button>
          <p className="mt-3 font-mono text-[13px] text-muted-foreground">Free forever. No login.</p>
          {error && <p className="mt-3 text-[12px] text-primary">{error}</p>}

          <ul className="mt-6 space-y-4">
            {[
              { I: ShieldCheck, t: "Open standards", s: "PSI · RFC 8785 · Ed25519" },
              { I: Database, t: "Independently verifiable", s: "Anchored, offline-checkable" },
              { I: Lock, t: "You own your story", s: "Export anytime" },
            ].map(({ I, t, s }) => (
              <li key={t} className="flex items-center gap-4">
                <I className="h-7 w-7 shrink-0 text-foreground/80" strokeWidth={1.25} />
                <div><div className="font-mono text-[12px] uppercase tracking-[0.14em]">{t}</div><div className="hud text-[9px]">{s}</div></div>
              </li>
            ))}
          </ul>
        </section>

        {/* Center: the passport */}
        <section className="min-w-0">
          <div className="relative overflow-hidden rounded-md border border-border bg-gradient-to-b from-card to-screen p-5 shadow-[var(--shadow-deck)] md:p-7">
            <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
              <img src={SHOWREEL[4].src} alt="Passport cover still" loading="lazy" className="aspect-[4/3] w-full rounded-sm object-cover" />
              <div className="relative min-w-0">
                <div className="flex justify-between font-mono text-[11px] tracking-[0.2em] text-muted-foreground"><span>SOVEREIGN</span><span>PSI · v1</span></div>
                <h2 className="mt-4 font-mono text-[30px] font-medium leading-none tracking-[0.06em] 2xl:text-[40px]">FILM PASSPORT</h2>
                <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground">A PROOF OF ORIGIN FOR AI-NATIVE CINEMA</p>
                <div className={cn("mt-6 inline-flex -rotate-6 flex-col items-center rounded-md border-[3px] px-5 py-2", stamp.cls)}>
                  <span className="font-display text-[36px] font-bold leading-none tracking-[0.08em]">{stamp.label}</span>
                  <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em]">{stamp.sub}</span>
                </div>
              </div>
            </div>

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-hairline pb-6 sm:grid-cols-3">
              <Field k="Title" v={verdict?.title} wide />
              <Field k="Attribution" v={verdict?.attribution} />
              <Field k="Sealed" v={verdict?.sealedOn?.slice(0, 10)} />
              <Field k="Signature" v={verdict && <State s={verdict.signature} />} />
              <Field k="File" v={verdict && <State s={verdict.file} />} />
              <Field k="Anchor" v={verdict && <State s={verdict.anchor} />} />
            </dl>

            <div className="border-b border-hairline py-5">
              <div className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">RECEIPT HASH</div>
              <div className="mt-2 flex items-center gap-3">
                <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-foreground/90 md:text-[15px]">{parsedHash ?? "— paste a receipt to read its hash —"}</code>
                {parsedHash && (
                  <button onClick={() => { navigator.clipboard.writeText(parsedHash); toast.success("Hash copied"); }} aria-label="Copy hash" className="shrink-0 text-muted-foreground hover:text-foreground"><Copy className="h-5 w-5" /></button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
              <div className="flex items-center gap-4">
                <Globe className="h-12 w-12 text-foreground/40" strokeWidth={0.75} />
                <div className="font-mono text-[11px] leading-relaxed tracking-[0.14em] text-muted-foreground">SIGNED BY THE CREATOR'S OWN KEY<br />CHECKED BY SOVEREIGN AI FILM VERSE</div>
              </div>
              <div className="text-right font-mono text-[11px] tracking-[0.14em] text-muted-foreground">PSI · ED25519 · SHA-256<br /><span className="text-[9px]">aigovernancestandard.com</span></div>
            </div>
          </div>

          {verdict && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="panel p-4">
                <div className="font-mono text-[11px] tracking-[0.2em] text-ok">WHAT THIS PROVES</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-foreground/85">{verdict.claims.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
              <div className="panel p-4">
                <div className="font-mono text-[11px] tracking-[0.2em] text-warn">WHAT IT DOES NOT PROVE</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-muted-foreground">{verdict.notClaims.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/seal" className="rounded-md border border-primary/60 px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-primary hover:bg-primary hover:text-primary-foreground">ISSUE A PASSPORT</Link>
            <Link to="/registry" className="rounded-md border border-border px-4 py-2 font-mono text-[11px] tracking-[0.18em] hover:border-foreground">MASTER REGISTRY</Link>
            <Link to="/connect" className="rounded-md border border-border px-4 py-2 font-mono text-[11px] tracking-[0.18em] hover:border-foreground">WHAT WE CAN DRIVE</Link>
          </div>
        </section>

        {/* Right: chain of title */}
        <section>
          <h2 className="font-mono text-[20px] font-medium tracking-[0.08em]">CHAIN OF TITLE</h2>
          <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">EACH STAGE. EACH TOOL. EACH DECLARATION.</p>
          <ol className="relative mt-6 space-y-6 pl-8">
            <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-primary/70 shadow-[0_0_8px_var(--primary)]" />
            {(verdict?.toolDeclarations.length ? verdict.toolDeclarations : ["Prompt", "Storyboard", "Generation", "Edit & score", "Final render"]).map((t, i) => (
              <li key={t + i} className="relative">
                <span className={cn("absolute -left-8 top-0.5 h-[15px] w-[15px] rounded-full border-2", verdict ? "border-primary bg-primary shadow-[0_0_10px_var(--primary)]" : "border-foreground/30 bg-screen")} />
                <div className="flex gap-4">
                  <span className={cn("font-mono text-[13px]", verdict ? "text-primary" : "text-muted-foreground")}>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="font-mono text-[13px] uppercase tracking-[0.12em]">{t}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{verdict ? "declared in receipt" : "awaiting receipt"}</div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

function Field({ k, v, wide }: { k: string; v?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2 sm:col-span-1")}>
      <dt className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">{k.toUpperCase()}</dt>
      <dd className="mt-1.5 truncate font-mono text-[14px] text-foreground/90">{v ?? "—"}</dd>
    </div>
  );
}

function State({ s }: { s: CheckState }) {
  return <span className={s === "pass" ? "text-ok" : s === "fail" ? "text-primary" : "text-warn"}>{s === "cannot-check" ? "n/a" : s.toUpperCase()}</span>;
}
