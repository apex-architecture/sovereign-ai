import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/beta")({
  head: () => ({
    meta: [
      { title: "Beta — Sovereign AI Filmverse" },
      { name: "description", content: "Closed-testing recruitment. Pick your platform: Android, iOS, or PWA." },
    ],
  }),
  component: BetaPage,
});

const PLATFORMS = ["Android", "iOS", "PWA"] as const;

function BetaPage() {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("PWA");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.object({
      email: z.string().trim().email().max(255),
      note: z.string().trim().max(500).optional(),
    }).safeParse({ email, note });
    if (!parsed.success) { toast.error("Enter a valid email."); return; }
    const { error } = await supabase.from("beta_signups").insert({
      email: parsed.data.email, platform, note: parsed.data.note || null,
    });
    if (error) {
      if (error.code === "23505") toast.error("Already signed up on this platform.");
      else toast.error(error.message);
    } else { toast.success("Enrolled. Standby for invite."); setEmail(""); setNote(""); }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <section className="brutal-border p-5 md:p-8 bg-card">
        <div className="text-xs neon-text font-bold">▮ CLOSED TESTING</div>
        <h1 className="text-3xl md:text-4xl mt-1">JOIN THE BETA</h1>
        <p className="text-sm text-muted-foreground mt-2">Pick a platform. Get keys to the foundry.</p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {PLATFORMS.map(p => (
            <button key={p} type="button" onClick={() => setPlatform(p)}
              className={`brutal-border py-4 text-xs font-bold uppercase ${platform === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {p}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full mt-1 brutal-border bg-background px-3 py-3 text-sm focus:outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Note (optional)</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              className="w-full mt-1 brutal-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </label>
          <button className="w-full brutal-border py-3 text-xs font-bold uppercase hover:bg-primary">
            ▸ Enlist for {platform}
          </button>
        </form>
      </section>
    </main>
  );
}
