import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Delete, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ownerExists, resetOwner } from "@/lib/gate.functions";
import { toast } from "sonner";
import { HORIZON_BG } from "@/lib/stills";
import { cn } from "@/lib/utils";

// The sovereign operator's fixed identity. The PIN is the only credential
// exposed to the user; it becomes the password behind the scenes.
// Legacy names kept on purpose — renaming would lock the operator out.
const OPERATOR_EMAIL = "owner@apex-empire.app";
const pwFromPin = (pin: string) => `apex-empire::${pin}`;

type Phase = "loading" | "set" | "confirm" | "unlock" | "open";
const MAX = 10;
const MIN = 4;

export function PinGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        if (data.session) { setPhase("open"); return; }
        const { exists } = await ownerExists();
        if (!alive) return;
        setPhase(exists ? "unlock" : "set");
      } catch (e: any) {
        toast.error(e?.message ?? "Gate offline");
        setPhase("unlock");
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setPhase((p) => (session ? "open" : p === "open" ? "unlock" : p));
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const fail = (msg: string) => {
    toast.error(msg);
    setShake((n) => n + 1);
    navigator.vibrate?.([30, 40, 30]);
    setPin("");
  };

  const submit = useCallback(async () => {
    if (busy) return;
    if (pin.length < MIN) return fail(`PIN needs at least ${MIN} digits.`);
    if (phase === "set") { setFirst(pin); setPin(""); setPhase("confirm"); return; }
    setBusy(true);
    try {
      if (phase === "confirm") {
        if (pin !== first) { setFirst(""); setPhase("set"); throw new Error("PINs did not match. Start again."); }
        const { error } = await supabase.auth.signUp({ email: OPERATOR_EMAIL, password: pwFromPin(pin) });
        if (error) throw error;
        await supabase.auth.signInWithPassword({ email: OPERATOR_EMAIL, password: pwFromPin(pin) });
        toast.success("Studio sealed. Welcome, Operator.");
      } else if (phase === "unlock") {
        const { error } = await supabase.auth.signInWithPassword({ email: OPERATOR_EMAIL, password: pwFromPin(pin) });
        if (error) throw new Error("Invalid PIN.");
      }
      setPin(""); setFirst("");
    } catch (err: any) {
      fail(err?.message ?? "Access denied.");
    } finally { setBusy(false); }
  }, [busy, pin, phase, first]);

  const press = useCallback((d: string) => {
    navigator.vibrate?.(8);
    setPin((p) => (p.length >= MAX ? p : p + d));
  }, []);
  const back = useCallback(() => setPin((p) => p.slice(0, -1)), []);

  useEffect(() => {
    if (phase === "open" || phase === "loading") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, press, back, submit]);

  if (phase === "open") return <>{children}</>;

  const dots = Math.max(MIN, pin.length);
  const heading =
    phase === "loading" ? "Contacting the studio" :
    phase === "set" ? "Choose your PIN" :
    phase === "confirm" ? "Confirm your PIN" : "Enter your PIN";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-screen">
      <img src={HORIZON_BG} alt="" aria-hidden width={1088} height={1920}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-bottom opacity-90 md:object-[30%_80%]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-screen/40 via-transparent to-screen/20" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-sm flex-col items-center px-6 pb-10 pt-[12vh]">
        <h1 className="font-display text-[54px] font-bold leading-none tracking-[0.12em] text-primary text-glow">SOVEREIGN</h1>
        <div className="hud mt-2 text-[10px] tracking-[0.5em]">AI Filmverse</div>

        <div className="mt-10 text-center">
          <div className="text-[13px] uppercase tracking-[0.3em] text-foreground/90">Private studio</div>
          <div className="mt-1.5 text-[13px] uppercase tracking-[0.3em] text-muted-foreground">{heading}</div>
        </div>

        <div key={shake} className={cn("mt-8 flex h-5 items-center gap-4", shake > 0 && "animate-shake")} aria-live="polite" aria-label={`${pin.length} digits entered`}>
          {Array.from({ length: dots }).map((_, i) => (
            <span key={i}
              className={cn("h-[18px] w-[18px] rounded-full border transition-all duration-150",
                i < pin.length ? "border-primary bg-primary shadow-[0_0_14px_var(--primary)]" : "border-foreground/40 bg-transparent")} />
          ))}
        </div>

        {phase !== "loading" ? (
          <>
            <div className="mt-10 grid grid-cols-3 gap-x-7 gap-y-5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <Key key={d} onClick={() => press(d)}>{d}</Key>)}
              <button type="button" onClick={submit} disabled={busy || pin.length < MIN} aria-label="Unlock"
                className={cn("flex h-[76px] w-[76px] items-center justify-center rounded-full transition-all",
                  pin.length >= MIN ? "bg-primary text-primary-foreground shadow-[0_0_28px_-4px_var(--primary)]" : "text-muted-foreground/30")}>
                <ArrowRight className="h-7 w-7" strokeWidth={1.5} />
              </button>
              <Key onClick={() => press("0")}>0</Key>
              <button type="button" onClick={back} aria-label="Delete digit"
                className="flex h-[76px] w-[76px] items-center justify-center rounded-full text-foreground/80 active:bg-foreground/10">
                <Delete className="h-7 w-7" strokeWidth={1.25} />
              </button>
            </div>

            <p className="mt-6 h-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {busy ? "Opening…" : phase === "set" ? "4–10 digits · it cannot be recovered" : phase === "confirm" ? "Type it once more" : ""}
            </p>

            {phase === "unlock" && (
              <button type="button" disabled={busy}
                onClick={async () => {
                  if (!window.confirm("Wipe the studio and set a fresh PIN? This deletes the current operator identity.")) return;
                  setBusy(true);
                  try {
                    await resetOwner({ data: { confirm: "WIPE" } });
                    toast.success("Studio wiped. Set a new PIN.");
                    setPin(""); setPhase("set");
                  } catch (e: any) {
                    toast.error(e?.message ?? "Reset failed");
                  } finally { setBusy(false); }
                }}
                className="mt-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                Forgot PIN? Wipe &amp; re-seal
              </button>
            )}
          </>
        ) : (
          <div className="mt-12 h-px w-40 overflow-hidden bg-primary/20"><div className="h-full w-1/3 animate-sweep bg-primary" /></div>
        )}

        <div className="mt-auto flex w-full items-end justify-between pt-10">
          <p className="hud text-[9.5px] leading-[1.8] tracking-[0.28em]">Your ideas<br />your control</p>
          <p className="hud text-right text-[9.5px] leading-[1.8] tracking-[0.28em]">Secure<br />creative<br />freedom</p>
        </div>
      </div>
    </div>
  );
}

function Key({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.035] font-display text-[30px] font-light text-foreground backdrop-blur-sm transition-all active:scale-95 active:border-primary active:bg-primary/20 hover:border-foreground/30">
      {children}
    </button>
  );
}
