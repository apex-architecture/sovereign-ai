import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { enhancePrompt } from "@/lib/oracle.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/oracle")({
  head: () => ({ meta: [{ title: "Oracle — Sovereign AI Film Verse" }, { name: "description", content: "AI prompt enhancer. Rough idea in, cinematic prompt out." }]}),
  component: Oracle,
});

const MODES = ["cinematic","trailer","documentary","surreal","action"] as const;

function Oracle() {
  const enhance = useServerFn(enhancePrompt);
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<typeof MODES[number]>("cinematic");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!raw.trim()) return;
    setBusy(true);
    try {
      const r = await enhance({ data: { raw, mode } });
      setOut(r.enhanced);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="brutal-border p-5 bg-card">
        <div className="text-xs neon-text font-bold">▮ ORACLE</div>
        <h1 className="text-2xl">PROMPT ENHANCER</h1>
        <p className="text-xs text-muted-foreground mt-1">Drop a rough idea. The Oracle returns a master-grade cinematic prompt.</p>
      </div>

      <div className="brutal-border bg-card p-4 space-y-3">
        <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={4} placeholder="a samurai in a neon city…"
          className="w-full brutal-border bg-background px-3 py-2 text-sm font-mono" />
        <div className="flex gap-2 flex-wrap">
          {MODES.map(m => (
            <button key={m} onClick={() => setMode(m)} className={`brutal-border px-3 py-1 text-[10px] uppercase font-bold ${mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{m}</button>
          ))}
        </div>
        <button onClick={run} disabled={busy} className="w-full brutal-border bg-primary text-primary-foreground px-4 py-3 text-sm font-black uppercase hover:opacity-90 disabled:opacity-40">
          {busy ? "▸ CONSULTING…" : "▸ INVOKE ORACLE"}
        </button>
      </div>

      {out && (
        <div className="brutal-border bg-card p-4 space-y-2">
          <div className="text-xs font-bold uppercase neon-text">▮ Enhanced</div>
          <div className="text-sm font-mono whitespace-pre-wrap">{out}</div>
          <button onClick={() => { navigator.clipboard.writeText(out); toast.success("Copied to clipboard"); }}
            className="brutal-border px-3 py-1 text-[10px] font-bold uppercase hover:bg-primary">Copy</button>
        </div>
      )}
    </main>
  );
}
