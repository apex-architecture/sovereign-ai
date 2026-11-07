import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Globe2, ShieldCheck, Clapperboard } from "lucide-react";
import gatewaySky from "@/assets/gateway-projector-dream.jpg";

const KEY = "sovereign.entered";
const Ctx = createContext<() => void>(() => {});
/** Call to bring the welcome page back (e.g. during a pitch). */
export const useShowIntro = () => useContext(Ctx);

export function DreamGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(KEY) === "1") setOpen(true);
  }, []);

  const enter = () => {
    setLeaving(true);
    sessionStorage.setItem(KEY, "1");
    setTimeout(() => { setOpen(true); setLeaving(false); window.scrollTo(0, 0); }, 600);
  };
  const showIntro = () => { sessionStorage.removeItem(KEY); setOpen(false); window.scrollTo(0, 0); };

  if (open) return <Ctx.Provider value={showIntro}>{children}</Ctx.Provider>;

  return (
    <main className={`relative min-h-[100dvh] overflow-hidden bg-screen transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}>
      <img src={gatewaySky} alt="" aria-hidden width={1920} height={1088}
        className="pointer-events-none fixed inset-0 h-full w-full animate-kenburns object-cover object-[22%_60%] opacity-90 sm:object-center" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-screen/80 via-screen/55 to-screen/95" />
      <div className="pointer-events-none fixed inset-0 vignette" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-6 pb-16 pt-[10vh] text-center">
        <div className="hud text-[10px] tracking-[0.5em] animate-fade-up">A global open film platform</div>
        <h1 className="mt-6 font-display text-[40px] font-bold leading-[0.98] tracking-tight text-foreground sm:text-[76px] lg:text-[100px] animate-fade-up">
          Welcome to the <span className="text-primary text-glow">Sovereign</span><br />AI Filmverse
        </h1>
        <div className="mt-5 font-display text-[18px] font-medium uppercase tracking-[0.3em] text-foreground/90 sm:text-[24px] animate-fade-up">
          The world studio, open to everyone
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-[17px] leading-relaxed text-foreground/85 sm:text-[20px]">
          One studio for everyone on the planet — from a kid with big dreams and no money,
          to the biggest film companies in the world.
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
          Filmmaking, content and art should have no barriers. If you have a vision, the willpower
          and the desire, you can make your film here and show it to the world.
        </p>

        <div className="mx-auto mt-12 grid w-full max-w-4xl gap-3 text-left sm:grid-cols-3">
          {[
            { icon: Globe2, t: "No money barrier", d: "Start from any phone or browser, anywhere." },
            { icon: Clapperboard, t: "A full studio", d: "Ten steps, from idea to finished film, in one place." },
            { icon: ShieldCheck, t: "Proof it's yours", d: "Every film can carry a passport showing who made it." },
          ].map(({ icon: I, t, d }) => (
            <div key={t} className="glass border border-hairline p-5">
              <I className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <div className="mt-3 font-display text-[16px] font-semibold text-foreground">{t}</div>
              <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>

        <section className="mx-auto mt-16 w-full max-w-4xl text-left">
          <div className="hud text-center text-[10px] tracking-[0.45em]">How it works</div>
          <h2 className="mt-3 text-center font-display text-[28px] font-bold leading-tight text-foreground sm:text-[44px]">
            From one idea to a finished film
          </h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { n: "01", t: "Describe your film", d: "Type your idea in plain words. Our story assistant turns it into a sharp, cinematic shot." },
              { n: "02", t: "Pick a look", d: "Cinematic, anime, noir, documentary, cyberpunk or dream. One tap sets the style." },
              { n: "03", t: "Render on cloud GPUs", d: "Your shot is made on powerful graphics machines in the cloud. No expensive computer needed." },
              { n: "04", t: "Watch, save & share", d: "Play it in the Theater, keep it in your Vault and share it with the world." },
              { n: "05", t: "Build the whole film", d: "Ten steps: storyboard, characters, motion, voice, music, sound, subtitles, edit, finish and publish." },
              { n: "06", t: "Prove it's yours", d: "A film passport records who made what, so creators keep credit for their work." },
            ].map((s) => (
              <li key={s.n} className="glass flex gap-4 border border-hairline p-5">
                <span className="font-mono text-[13px] text-primary">{s.n}</span>
                <div>
                  <div className="font-display text-[16px] font-semibold text-foreground">{s.t}</div>
                  <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-10 max-w-2xl text-center font-display text-[18px] leading-snug text-foreground sm:text-[22px]">
            A kid with a phone and a studio like the biggest in Hollywood use the same tools. Talent decides, not money.
          </p>
        </section>

        <div className="mt-14 flex flex-col items-center gap-4">
          <button type="button" onClick={enter}
            className="group inline-flex items-center gap-3 bg-primary px-7 py-5 font-display text-[13px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-[0_0_48px_-6px_var(--primary)] transition-all hover:scale-[1.03] active:scale-95 sm:px-9 sm:text-[15px]">
            Enter the Sovereign AI Filmverse
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <div className="hud text-[9.5px] tracking-[0.35em]">Your ideas · your control · no limits</div>
        </div>
      </div>
    </main>
  );
}
