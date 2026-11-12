import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Corners, Tag } from "@/components/hud";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/beta")({
  head: () => ({
    meta: [
      { title: "Early Access & Co-Production — Sovereign AI Filmverse" },
      { name: "description", content: "Apply for early access, pitch a co-production, or get the phone app first." },
      { property: "og:title", content: "Early Access & Co-Production — Sovereign AI Filmverse" },
      { property: "og:description", content: "Pitch your film to the studio or get the phone app first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplyPage,
});

const PLATFORMS = ["Android", "iOS", "PWA"] as const;

function ApplyPage() {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("PWA");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.object({
      email: z.string().trim().email().max(255),
      note: z.string().trim().max(500).optional(),
    }).safeParse({ email, note });
    if (!parsed.success) { toast.error("Enter a valid email."); return; }
    setBusy(true);
    const { error } = await supabase.from("beta_signups").insert({
      email: parsed.data.email, platform, note: parsed.data.note || null,
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") toast.error("You're already on the list for this platform.");
      else toast.error("Could not send that. Please try again.");
    } else { toast.success("You're on the list. We'll be in touch."); setEmail(""); setNote(""); }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <div className="hud text-[10px] tracking-[0.4em]">Early access · Co-production</div>
      <h1 className="mt-3 font-display text-[34px] font-bold leading-tight text-foreground sm:text-[48px]">
        Bring your film to the <span className="text-primary text-glow">studio</span>
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Pitch a co-production, or get the phone app first. Leave your email and a line about your project.
      </p>

      <section className="panel relative mt-8 p-5 sm:p-8">
        <Corners />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-[15px] font-semibold uppercase tracking-[0.12em] text-foreground">Your platform</span>
          <Tag tone="signal">Open</Tag>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {PLATFORMS.map((p) => (
            <button key={p} type="button" onClick={() => setPlatform(p)} aria-pressed={platform === p}
              className={cn(
                "border py-4 font-display text-[12px] font-bold uppercase tracking-[0.14em] transition-colors",
                platform === p ? "border-primary bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--primary)]" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}>
              {p === "PWA" ? "Web app" : p}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="hud text-[9px]">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="mt-1.5 w-full border border-border bg-background px-3 py-3 text-[15px] text-foreground focus:border-primary focus:outline-none" />
          </label>
          <label className="block">
            <span className="hud text-[9px]">Your project (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={500}
              placeholder="A sentence or two about the film you want to make."
              className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none" />
          </label>
          <button disabled={busy}
            className="w-full bg-primary py-4 font-display text-[13px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_0_32px_-6px_var(--primary)] transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-60">
            {busy ? "Sending…" : "Send application"}
          </button>
        </form>
      </section>
    </main>
  );
}
