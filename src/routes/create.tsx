import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Dices, Download, FileText, Lightbulb, Lock, PenLine, Plus, RotateCcw, Sparkles, Trash2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startCloudRender, pollCloudRender } from "@/lib/render.functions";
import { drawFrame, getAllowance, writeScript } from "@/lib/preproduction.functions";
import { STYLE_IMAGES } from "@/lib/stills";
import { Pip, Tag } from "@/components/hud";
import { OwnerUnlockOverlay } from "@/components/OwnerWall";
import { Inspector, SequencePlayer, StepRail, Timeline, Viewport } from "@/components/monolith/parts";
import {
  EMPTY_FILM, EXAMPLES, STORE_KEY, STYLES, download, newScene, runtime, screenplay, slug,
  type Film, type Scene, type Step,
} from "@/components/monolith/film";
import { formatTimecode } from "@/components/hud";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Make a film — Sovereign AI Filmverse" },
      { name: "description", content: "Idea to script to storyboard to film in one screen. Writing and storyboarding are free for everyone." },
      { property: "og:title", content: "Make a film — Sovereign AI Filmverse" },
      { property: "og:description", content: "Idea to script to storyboard to film in one screen. Writing and storyboarding are free for everyone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

type Busy = null | "script" | "frames" | `frame:${string}` | `render:${string}`;

function CreatePage() {
  const [film, setFilm] = useState<Film>(EMPTY_FILM);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<Step>("script");
  const [sel, setSel] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [unlock, setUnlock] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [wanted, setWanted] = useState(4);
  const [tier, setTier] = useState<"fast" | "quality">("fast");
  const [ideaOpen, setIdeaOpen] = useState(false);

  const write = useServerFn(writeScript);
  const draw = useServerFn(drawFrame);
  const allowanceFn = useServerFn(getAllowance);
  const start = useServerFn(startCloudRender);
  const poll = useServerFn(pollCloudRender);

  // The film lives in this browser.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const f = JSON.parse(raw) as Film;
        if (f && Array.isArray(f.scenes)) {
          setFilm({ ...EMPTY_FILM, ...f });
          if (f.scenes.length) setStep("board");
        }
      }
    } catch { /* a broken save starts a fresh film */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(STORE_KEY, JSON.stringify(film));
  }, [film, loaded]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const allowance = useQuery({
    queryKey: ["free-allowance", userId],
    queryFn: () => allowanceFn(),
    staleTime: 30_000,
  });

  const scenes = film.scenes;
  const scene = scenes[Math.min(sel, Math.max(0, scenes.length - 1))];
  const idx = scene ? scenes.indexOf(scene) : 0;

  const patchScene = useCallback((id: string, patch: Partial<Scene>) => {
    setFilm((f) => ({ ...f, scenes: f.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }, []);

  const done = useMemo<Record<Step, boolean>>(() => ({
    script: scenes.length > 0,
    board: scenes.length > 0 && scenes.every((s) => !!s.frame),
    render: scenes.some((s) => s.clip?.status === "done"),
    cut: false,
  }), [scenes]);

  /* ── 01 Script ── */
  async function doWrite() {
    if (film.idea.trim().length < 8) return toast.error("Tell the story in a sentence or two first.");
    if (scenes.length && !window.confirm("Write a new script? Your current scenes will be replaced.")) return;
    setBusy("script");
    try {
      const r = await write({ data: { idea: film.idea.trim(), style: film.style, scenes: wanted } });
      setFilm((f) => ({
        ...f,
        title: r.script.title,
        logline: r.script.logline,
        scenes: r.script.scenes.map((s) => ({ ...s, id: crypto.randomUUID() })),
      }));
      setSel(0);
      setIdeaOpen(false);
      toast.success(`“${r.script.title}” — ${r.script.scenes.length} scenes written.`);
    } catch (e: any) {
      toast.error(e?.message ?? "The writer is unavailable right now.");
    } finally {
      setBusy(null);
      allowance.refetch();
    }
  }

  /* ── 02 Board ── */
  async function drawOne(s: Scene) {
    if (s.shot.trim().length < 4) return toast.error("Describe the shot first.");
    setBusy(`frame:${s.id}`);
    try {
      const r = await draw({ data: { shot: s.shot.trim(), style: film.style } });
      patchScene(s.id, { frame: r.src });
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "The artist is unavailable right now.");
      return false;
    } finally {
      setBusy(null);
      allowance.refetch();
    }
  }
  async function drawAll() {
    const missing = film.scenes.filter((s) => !s.frame && s.shot.trim().length >= 4);
    if (!missing.length) return toast("Every scene already has a frame.");
    setBusy("frames");
    let made = 0;
    for (const s of missing) {
      setSel(film.scenes.indexOf(s));
      try {
        const r = await draw({ data: { shot: s.shot.trim(), style: film.style } });
        patchScene(s.id, { frame: r.src });
        made++;
      } catch (e: any) {
        toast.error(e?.message ?? "The artist stopped.");
        break;
      }
    }
    setBusy(null);
    allowance.refetch();
    if (made) toast.success(`${made} frame${made > 1 ? "s" : ""} drawn.`);
  }

  /* ── 03 Render ── */
  async function renderOne(s: Scene) {
    if (!userId) return setUnlock(true);
    if (s.shot.trim().length < 4) return toast.error("This scene has no camera prompt yet.");
    setBusy(`render:${s.id}`);
    try {
      const suffix = STYLES.find((x) => x.id === film.style)?.suffix ?? "";
      const r = await start({ data: { prompt: `${s.shot.trim()}, ${suffix}`.slice(0, 1990), tier } });
      patchScene(s.id, { clip: { jobId: r.jobId, predictionId: r.predictionId, status: "rendering" } });
      toast.success("Camera rolling — usually 1–3 minutes.");
    } catch (e: any) {
      toast.error(e?.message ?? "Render failed.");
    } finally {
      setBusy(null);
    }
  }

  // Follow every clip still rendering, including ones started before a reload.
  const polling = useRef(false);
  useEffect(() => {
    if (!userId) return;
    const pending = film.scenes.filter((s) => s.clip?.status === "rendering");
    if (!pending.length) return;
    const id = setInterval(async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        for (const s of pending) {
          const c = s.clip!;
          const r = await poll({ data: { jobId: c.jobId, predictionId: c.predictionId } });
          if (r.status === "done") { patchScene(s.id, { clip: { ...c, status: "done", url: r.url } }); toast.success(`Scene ${film.scenes.indexOf(s) + 1} is in the can.`); }
          else if (r.status === "failed") patchScene(s.id, { clip: { ...c, status: "failed", error: r.error } });
        }
      } catch { /* try again next tick */ }
      finally { polling.current = false; }
    }, 5000);
    return () => clearInterval(id);
  }, [userId, film.scenes, poll, patchScene]);

  function addScene() {
    const s = newScene();
    setFilm((f) => ({ ...f, scenes: [...f.scenes, s] }));
    setSel(scenes.length);
    if (step !== "script" && step !== "board") setStep("board");
  }
  function removeScene(id: string) {
    setFilm((f) => ({ ...f, scenes: f.scenes.filter((s) => s.id !== id) }));
    setSel((n) => Math.max(0, n - 1));
  }
  function freshFilm() {
    if (scenes.length && !window.confirm("Start a new film? This one will be cleared from this device.")) return;
    setFilm({ ...EMPTY_FILM, style: film.style });
    setSel(0);
    setStep("script");
  }

  const prev = () => setSel((n) => (n - 1 + scenes.length) % Math.max(1, scenes.length));
  const next = () => setSel((n) => (n + 1) % Math.max(1, scenes.length));
  const owner = !!userId || !!allowance.data?.owner;
  const left = allowance.data;

  return (
    <main className="flex min-h-[calc(100vh-85px)] flex-col lg:min-h-[calc(100vh-85px-33px)]">
      {unlock && <OwnerUnlockOverlay onClose={() => setUnlock(false)} onUnlocked={() => { setUnlock(false); location.reload(); }} />}

      {/* Project bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-chassis/60 px-4 py-3 lg:px-6">
        <div className="min-w-[220px] flex-1">
          <div className="hud text-[9px] tracking-[0.35em]">Project</div>
          <div className="truncate font-display text-[20px] font-bold leading-tight md:text-[24px]">
            {film.title || <span className="text-muted-foreground">Untitled film</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="signal">{STYLES.find((s) => s.id === film.style)?.label}</Tag>
          <span className="hud tabular-nums text-[10px]">{formatTimecode(runtime(scenes))}</span>
          {owner ? <Tag tone="ok">Owner</Tag> : left ? <Tag tone="ok">Free · {left.script} scripts · {left.frame} frames</Tag> : null}
          <button type="button" onClick={freshFilm}
            className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:border-foreground/40 hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> New film
          </button>
        </div>
      </div>

      <div className="grid flex-1 gap-4 px-4 py-4 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-0 lg:p-0 xl:grid-cols-[200px_minmax(0,1fr)_300px]">
        <StepRail step={step} done={done} onPick={setStep} />

        <section className="min-w-0 lg:px-6 lg:py-5">
          {step === "script" && (
            <ScriptCanvas
              film={film} setFilm={setFilm} wanted={wanted} setWanted={setWanted}
              busy={busy === "script"} onWrite={doWrite} ideaOpen={ideaOpen || scenes.length === 0}
              setIdeaOpen={setIdeaOpen} sel={idx} setSel={setSel} patchScene={patchScene} removeScene={removeScene}
              addScene={addScene} left={left?.owner ? null : left?.script} onNext={() => setStep("board")}
            />
          )}

          {step === "board" && (
            <div className="space-y-4">
              <Viewport scene={scene} index={idx} total={scenes.length} onPrev={prev} onNext={next}
                badge={scene?.frame ? <Tag tone="signal" className="bg-background/85 backdrop-blur">Storyboard</Tag> : undefined}
                overlay={(busy === "frames" || busy === `frame:${scene?.id}`) && <Working label="Drawing the frame…" />} />
              {scene ? (
                <div className="panel p-4">
                  <label className="hud mb-2 block text-[9px] tracking-[0.3em]" htmlFor="shot">Camera prompt · scene {idx + 1}</label>
                  <textarea id="shot" value={scene.shot} rows={3} maxLength={600}
                    onChange={(e) => patchScene(scene.id, { shot: e.target.value })}
                    className="w-full resize-y border border-border bg-screen px-3 py-2.5 font-mono text-[13px] leading-relaxed focus:border-primary/60 focus:outline-none" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Primary onClick={() => drawOne(scene)} disabled={!!busy}>
                      <Wand2 className="h-4 w-4" /> {scene.frame ? "Redraw frame" : "Draw frame"} <Free />
                    </Primary>
                    <Ghost onClick={drawAll} disabled={!!busy}>
                      Draw all missing ({scenes.filter((s) => !s.frame).length})
                    </Ghost>
                    <span className="flex-1" />
                    <Ghost onClick={() => setStep("render")}>Next: Render <ArrowRight className="h-3.5 w-3.5" /></Ghost>
                  </div>
                  <p className="hud mt-3 text-[9px]">Artist FLUX schnell · free · {left?.owner ? "owner, no cap" : `${left?.frame ?? "…"} frames left today`}</p>
                </div>
              ) : <EmptyHint onGo={() => setStep("script")} />}
            </div>
          )}

          {step === "render" && (
            <div className="space-y-4">
              <Viewport scene={scene} index={idx} total={scenes.length} onPrev={prev} onNext={next} showClip
                badge={scene?.clip ? <Tag className="bg-background/85 backdrop-blur" tone={scene.clip.status === "done" ? "ok" : scene.clip.status === "failed" ? "bad" : "live"}>{scene.clip.status === "done" ? "Rendered clip" : scene.clip.status}</Tag> : undefined}
                overlay={
                  !owner ? <RenderLock onUnlock={() => setUnlock(true)} onCut={() => setStep("cut")} />
                  : (busy === `render:${scene?.id}` || scene?.clip?.status === "rendering") ? <Working label="GPU rendering — usually 1–3 minutes…" /> : null
                } />
              {scene ? (
                <div className="panel p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {([["fast", "6s · Minimax"], ["quality", "5s · Kling sharp"]] as const).map(([t, l]) => (
                      <button key={t} type="button" onClick={() => setTier(t)}
                        className={cn("border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]",
                          tier === t ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                        {l}
                      </button>
                    ))}
                    <span className="flex-1" />
                    <Primary onClick={() => renderOne(scene)} disabled={!!busy || scene.clip?.status === "rendering"}>
                      {owner ? <>Render scene {idx + 1} <ArrowRight className="h-4 w-4" /></> : <><Lock className="h-4 w-4" /> Owner unlock to render</>}
                    </Primary>
                  </div>
                  {scene.clip?.status === "failed" && <p className="mt-3 text-[12px] text-primary">{scene.clip.error ?? "The render failed."}</p>}
                  <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
                    Each clip is billed to the studio's cloud account. Bringing your own engine key or your own machine is part of the open core and is not connected in this studio yet.
                    {owner && <> Finished clips also land in <Link to="/theater" className="text-primary hover:underline">Theater</Link>.</>}
                  </p>
                </div>
              ) : <EmptyHint onGo={() => setStep("script")} />}
            </div>
          )}

          {step === "cut" && (
            <div className="space-y-4">
              <SequencePlayer scenes={scenes} />
              <div className="panel p-4">
                <div className="flex flex-wrap gap-2">
                  <Ghost onClick={() => download(`${slug(film.title)}-screenplay.txt`, screenplay(film))} disabled={!scenes.length}>
                    <FileText className="h-3.5 w-3.5" /> Screenplay (.txt)
                  </Ghost>
                  <Ghost onClick={() => download(`${slug(film.title)}-shotlist.json`, JSON.stringify({ title: film.title, logline: film.logline, style: film.style, scenes: scenes.map(({ id, clip, ...s }) => ({ ...s, clip: clip?.url ?? null })) }, null, 2), "application/json")} disabled={!scenes.length}>
                    <Download className="h-3.5 w-3.5" /> Shot list (.json)
                  </Ghost>
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
                  The player runs your rendered clips in order and holds a storyboard frame for any scene not rendered yet — an animatic. Stitching everything into one MP4 file belongs to the browser editor on the open core, which is not wired into this studio yet.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="hidden border-l border-hairline px-4 py-5 xl:block">
          <Inspector step={step} scene={scene} index={idx} style={film.style} allowance={allowance.data} owner={owner} />
        </aside>
      </div>

      {scenes.length > 0 && <Timeline scenes={scenes} sel={idx} onPick={setSel} onAdd={addScene} />}

      <details className="group mx-4 mb-6 mt-4 xl:hidden">
        <summary className="hud cursor-pointer list-none border border-border px-3 py-2.5 text-[10px] tracking-[0.3em] text-foreground/85">
          <span className="group-open:hidden">▸ Inspector · engine, allowance, fingerprint</span>
          <span className="hidden group-open:inline">▾ Inspector</span>
        </summary>
        <div className="mt-3"><Inspector step={step} scene={scene} index={idx} style={film.style} allowance={allowance.data} owner={owner} /></div>
      </details>
    </main>
  );
}

/* ───────────────────────── Script canvas ───────────────────────── */

function ScriptCanvas({
  film, setFilm, wanted, setWanted, busy, onWrite, ideaOpen, setIdeaOpen, sel, setSel, patchScene, removeScene, addScene, left, onNext,
}: {
  film: Film; setFilm: React.Dispatch<React.SetStateAction<Film>>; wanted: number; setWanted: (n: number) => void;
  busy: boolean; onWrite: () => void; ideaOpen: boolean; setIdeaOpen: (b: boolean) => void;
  sel: number; setSel: (n: number) => void; patchScene: (id: string, p: Partial<Scene>) => void;
  removeScene: (id: string) => void; addScene: () => void; left: number | null | undefined; onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      {ideaOpen ? (
        <div className="panel relative overflow-hidden p-5 md:p-7">
          <div className="hud text-[9px] tracking-[0.4em] text-primary">Step 01 · Free for everyone</div>
          <h1 className="mt-2 font-display text-[26px] font-bold leading-tight md:text-[34px]">What is your film about?</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">One or two sentences. The writer turns it into scenes, each with a camera prompt.</p>
          <textarea value={film.idea} rows={4} maxLength={1200}
            onChange={(e) => setFilm((f) => ({ ...f, idea: e.target.value }))}
            placeholder={EXAMPLES[0]}
            className="mt-4 w-full resize-y border border-border bg-screen px-4 py-3.5 font-mono text-[14px] leading-relaxed placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none md:text-[15px]" />
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Ghost onClick={() => setFilm((f) => ({ ...f, idea: EXAMPLES[0] }))}><Lightbulb className="h-3.5 w-3.5" /> Example</Ghost>
            <Ghost onClick={() => setFilm((f) => ({ ...f, idea: EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)] }))}><Dices className="h-3.5 w-3.5" /> Random</Ghost>
          </div>

          <div className="hud mb-2 mt-6 text-[9px] tracking-[0.3em]">Look</div>
          <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {STYLES.map((s) => {
              const on = film.style === s.id;
              return (
                <button key={s.id} type="button" onClick={() => setFilm((f) => ({ ...f, style: s.id }))} className="w-[92px] shrink-0 text-center">
                  <div className={cn("aspect-square overflow-hidden border-2 transition-all", on ? "border-primary shadow-[0_0_18px_-4px_var(--primary)]" : "border-transparent opacity-75 hover:opacity-100")}>
                    <img src={STYLE_IMAGES[s.id]} alt="" loading="lazy" width={816} height={816} className="h-full w-full object-cover" />
                  </div>
                  <div className={cn("mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em]", on ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="hud text-[9px] tracking-[0.3em]">Scenes</span>
            {[3, 4, 5, 6].map((n) => (
              <button key={n} type="button" onClick={() => setWanted(n)}
                className={cn("h-9 w-9 border font-mono text-[13px]", wanted === n ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{n}</button>
            ))}
          </div>

          <button type="button" onClick={onWrite} disabled={busy}
            className="group mt-6 flex w-full items-center justify-center gap-3 bg-primary px-6 py-4 font-mono text-[14px] font-medium uppercase tracking-[0.28em] text-primary-foreground shadow-[0_10px_40px_-12px_var(--primary)] transition-all hover:brightness-110 disabled:opacity-60">
            <Sparkles className="h-4 w-4" />
            <span>{busy ? "Writing your film…" : "Write my film"}</span>
            {!busy && <span className="border border-primary-foreground/40 px-1.5 py-0.5 text-[9px] tracking-[0.2em]">Free</span>}
          </button>
          {busy && <div className="mt-2 h-px overflow-hidden bg-primary/20"><div className="h-full w-1/4 animate-sweep bg-primary" /></div>}
          <p className="hud mt-3 text-[9px]">Writer DeepSeek V3 · Qwen3 fallback · {left == null ? "owner, no cap" : `${left} free scripts left today`}</p>
          {film.scenes.length > 0 && (
            <button type="button" onClick={() => setIdeaOpen(false)} className="hud mt-3 text-[9px] text-primary hover:text-foreground">← Back to my scenes</button>
          )}
        </div>
      ) : (
        <div className="panel p-5">
          <input value={film.title} maxLength={80} onChange={(e) => setFilm((f) => ({ ...f, title: e.target.value }))}
            aria-label="Film title" className="w-full bg-transparent font-display text-[24px] font-bold leading-tight focus:outline-none md:text-[30px]" />
          <textarea value={film.logline} rows={2} maxLength={300} onChange={(e) => setFilm((f) => ({ ...f, logline: e.target.value }))}
            aria-label="Logline" className="mt-1 w-full resize-none bg-transparent text-[13px] leading-relaxed text-muted-foreground focus:outline-none" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Ghost onClick={() => setIdeaOpen(true)}><PenLine className="h-3.5 w-3.5" /> New idea</Ghost>
            <Ghost onClick={addScene}><Plus className="h-3.5 w-3.5" /> Add scene</Ghost>
            <span className="flex-1" />
            <Primary onClick={onNext}>Next: Board <ArrowRight className="h-4 w-4" /></Primary>
          </div>
        </div>
      )}

      {!ideaOpen && film.scenes.map((s, i) => (
        <article key={s.id} onClick={() => setSel(i)}
          className={cn("panel relative cursor-text p-4 transition-colors md:p-5", i === sel && "border-primary/50")}>
          {i === sel && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-primary shadow-[0_0_12px_var(--primary)]" />}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[12px] tabular-nums text-primary">{String(i + 1).padStart(2, "0")}</span>
            <input value={s.heading} maxLength={120} onChange={(e) => patchScene(s.id, { heading: e.target.value })}
              aria-label={`Scene ${i + 1} heading`}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] font-bold uppercase tracking-[0.08em] focus:outline-none" />
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Seconds</span>
              <input type="number" min={3} max={10} value={s.seconds}
                onChange={(e) => patchScene(s.id, { seconds: Math.min(10, Math.max(3, Number(e.target.value) || 5)) })}
                className="w-12 border border-border bg-screen px-1.5 py-1 text-center font-mono text-[12px]" />
              <span className="hud text-[9px]">sec</span>
            </label>
            <button type="button" onClick={(e) => { e.stopPropagation(); removeScene(s.id); }} aria-label={`Remove scene ${i + 1}`}
              className="text-muted-foreground hover:text-primary"><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea value={s.action} rows={2} maxLength={600} onChange={(e) => patchScene(s.id, { action: e.target.value })}
            aria-label={`Scene ${i + 1} action`} placeholder="What happens in this scene…"
            className="mt-2 w-full resize-y bg-transparent text-[14px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none" />
          <div className="mt-2 border-l-2 border-signal/50 pl-3">
            <div className="hud text-[8.5px] text-signal">Camera prompt</div>
            <textarea value={s.shot} rows={2} maxLength={600} onChange={(e) => patchScene(s.id, { shot: e.target.value })}
              aria-label={`Scene ${i + 1} camera prompt`} placeholder="Subject, action, lens, light, colour…"
              className="mt-1 w-full resize-y bg-transparent font-mono text-[12px] leading-relaxed text-muted-foreground placeholder:text-muted-foreground/40 focus:text-foreground focus:outline-none" />
          </div>
        </article>
      ))}
    </div>
  );
}

/* ───────────────────────── Small pieces ───────────────────────── */

function RenderLock({ onUnlock, onCut }: { onUnlock: () => void; onCut: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/75 p-4 backdrop-blur-[3px]">
      <div className="max-w-sm text-center">
        <Lock className="mx-auto h-6 w-6 text-primary" strokeWidth={1.5} />
        <div className="hud mt-3 text-[9px] tracking-[0.35em]">Owner step</div>
        <p className="mt-2 font-display text-[17px] font-bold leading-snug md:text-[20px]">Video is the one step that costs real money.</p>
        <p className="mt-1.5 hidden text-[12px] leading-relaxed text-muted-foreground sm:block">Your script and storyboard stay free. Watch them as an animatic now.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onCut} className="bg-primary px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground">Watch animatic</button>
          <button type="button" onClick={onUnlock} className="border border-border bg-chassis/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] hover:border-foreground/50">Owner unlock</button>
        </div>
      </div>
    </div>
  );
}

function Working({ label }: { label: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent px-4 pb-4 pt-10">
      <div className="hud flex items-center gap-2 text-[10px] text-foreground/90"><Pip tone="live" /> {label}</div>
      <div className="mt-2 h-px overflow-hidden bg-primary/20"><div className="h-full w-1/4 animate-sweep bg-primary" /></div>
    </div>
  );
}

function EmptyHint({ onGo }: { onGo: () => void }) {
  return (
    <div className="panel p-6 text-center">
      <p className="text-[13px] text-muted-foreground">No scenes yet. Start with the script — it's free.</p>
      <button type="button" onClick={onGo} className="mt-3 bg-primary px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground">Write the script</button>
    </div>
  );
}

function Free() {
  return <span className="border border-primary-foreground/40 px-1.5 py-0.5 text-[9px] tracking-[0.2em]">Free</span>;
}

function Primary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground shadow-[0_8px_30px_-12px_var(--primary)] hover:brightness-110 disabled:opacity-50">
      {children}
    </button>
  );
}

function Ghost({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/85 hover:border-foreground/40 disabled:opacity-50">
      {children}
    </button>
  );
}
