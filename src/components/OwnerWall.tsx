import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { PinGate } from "@/components/PinGate";
import { Corners } from "@/components/hud";

/** Full-screen owner keypad on top of any page; closes itself once signed in. */
export function OwnerUnlockOverlay({ onClose, onUnlocked }: { onClose: () => void; onUnlocked: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-screen">
      <button type="button" onClick={onClose}
        className="fixed right-4 top-4 z-[101] border border-border bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        Close
      </button>
      <PinGate><Done run={onUnlocked} /></PinGate>
    </div>
  );
}

function Done({ run }: { run: () => void }) {
  useEffect(() => { run(); }, [run]);
  return null;
}

/** Shown to visitors on pages that hold the owner's private films and projects. */
export function OwnerWall({ title, note }: { title: string; note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <section className="panel relative p-8 text-center">
        <Corners />
        <Lock className="mx-auto h-6 w-6 text-primary" strokeWidth={1.5} />
        <div className="hud mt-4 text-[10px] tracking-[0.4em]">Owner space</div>
        <h1 className="mt-2 font-display text-[26px] font-bold text-foreground">{title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-muted-foreground">{note}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/create" className="bg-primary px-5 py-3 font-mono text-[12px] uppercase tracking-[0.2em] text-primary-foreground">Try Create</Link>
          <button type="button" onClick={() => setOpen(true)}
            className="border border-border px-5 py-3 font-mono text-[12px] uppercase tracking-[0.2em] text-foreground hover:border-foreground/50">
            Owner unlock
          </button>
        </div>
      </section>
      {open && <OwnerUnlockOverlay onClose={() => setOpen(false)} onUnlocked={() => location.reload()} />}
    </main>
  );
}
