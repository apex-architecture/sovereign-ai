import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Heart, Maximize, MoreHorizontal, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { THEATER_STILL } from "@/lib/stills";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/theater")({
  head: () => ({
    meta: [
      { title: "Theater — Sovereign AI Film Verse" },
      { name: "description", content: "Your private cinema: every finished reel, full screen, back to back." },
      { property: "og:title", content: "Theater — Sovereign AI Film Verse" },
      { property: "og:description", content: "Your private cinema: every finished reel, full screen, back to back." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Theater,
});

const FAV_KEY = "apex.favs"; // shared with Vault — legacy key kept on purpose
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Theater() {
  const [userId, setUserId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);
  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || "{}")); } catch { /* empty */ } }, []);

  const jobs = useQuery({
    queryKey: ["theater-jobs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("render_jobs").select("*").eq("owner_id", userId!).eq("status", "done").order("created_at", { ascending: false }).limit(200);
      return (data ?? []).filter((j) => j.response_log && (j.response_log as any).url);
    },
    refetchInterval: 8000,
  });

  const playlist = jobs.data ?? [];
  const current = playlist[idx];
  const url: string | undefined = (current?.response_log as any)?.url;
  const isVid = !!url && !/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
  const title = ((current?.prompt as any)?.text as string | undefined) ?? "The weight of silence";
  const meta = current ? `${dur ? Math.round(dur) + "s" : "—"} · ${(current.response_log as any)?.model ?? "render"}` : "Showreel still · your first reel plays here";

  const next = () => playlist.length && setIdx((i) => (i + 1) % playlist.length);
  const prev = () => playlist.length && setIdx((i) => (i - 1 + playlist.length) % playlist.length);
  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const fav = () => {
    if (!current) return;
    const n = { ...favs, [current.id]: !favs[current.id] };
    setFavs(n); localStorage.setItem(FAV_KEY, JSON.stringify(n));
  };

  return (
    <main className="mx-auto max-w-[1500px] px-3 py-4 md:px-6 md:py-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div ref={frame} className="relative overflow-hidden rounded-md bg-screen">
            <div className="vignette relative aspect-[4/5] w-full sm:aspect-video">
              {url ? (isVid
                ? <video key={url} ref={ref} src={url} autoPlay playsInline muted={muted}
                    className="absolute inset-0 h-full w-full object-contain"
                    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                    onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
                    onEnded={next} />
                : <img src={url} alt={title} className="absolute inset-0 h-full w-full object-contain" />)
                : <img src={THEATER_STILL} alt="Showreel still: astronaut in a space station" width={1088} height={1600} className="absolute inset-0 h-full w-full object-cover sm:object-[50%_60%]" />}

              <div className="absolute inset-x-0 top-0 z-[3] flex items-start justify-between gap-4 bg-gradient-to-b from-screen/80 to-transparent p-4 pb-12 md:p-6">
                <div className="min-w-0">
                  <h1 className="line-clamp-1 font-mono text-[14px] font-medium tracking-[0.18em] md:text-[17px]">{title}</h1>
                  <p className="mt-1 font-mono text-[12px] text-muted-foreground">{meta}</p>
                </div>
                <button onClick={() => frame.current?.requestFullscreen?.()} aria-label="Full screen" className="shrink-0 text-foreground/90 hover:text-foreground"><Maximize className="h-5 w-5" /></button>
              </div>
              {!url && (
                <div className="absolute inset-x-0 bottom-0 z-[3] flex justify-center p-6">
                  <Link to="/create" className="rounded-md bg-primary px-5 py-3 font-mono text-[12px] tracking-[0.25em] text-primary-foreground shadow-[0_10px_40px_-10px_var(--primary)]">ROLL YOUR FIRST REEL →</Link>
                </div>
              )}
            </div>
          </div>

          {/* scrub */}
          <div className="mt-5 px-1">
            <div className="relative h-5">
              <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-foreground/20" />
              <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-primary" style={{ width: `${dur ? (t / dur) * 100 : 0}%` }} />
              <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" style={{ left: `${dur ? (t / dur) * 100 : 0}%` }} />
              <input type="range" aria-label="Scrub" min={0} max={dur || 1} step={0.01} value={Math.min(t, dur || 1)} disabled={!isVid}
                onChange={(e) => { const v = ref.current; if (v) v.currentTime = Number(e.target.value); }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[12px] tabular-nums text-muted-foreground"><span>{fmt(t)}</span><span>{fmt(dur)}</span></div>
          </div>

          {/* controls */}
          <div className="mt-4 flex items-center justify-between px-2 md:justify-center md:gap-14">
            <button onClick={fav} disabled={!current} aria-label="Favourite" className="disabled:opacity-30">
              <Heart className={cn("h-6 w-6", current && favs[current.id] ? "fill-primary text-primary" : "text-foreground/90")} strokeWidth={1.5} />
            </button>
            <button onClick={prev} disabled={playlist.length < 2} aria-label="Previous" className="disabled:opacity-30"><SkipBack className="h-7 w-7 fill-current" /></button>
            <button onClick={toggle} disabled={!isVid} aria-label={playing ? "Pause" : "Play"}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-foreground/80 transition-colors hover:border-primary hover:text-primary disabled:opacity-40">
              {playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
            </button>
            <button onClick={next} disabled={playlist.length < 2} aria-label="Next" className="disabled:opacity-30"><SkipForward className="h-7 w-7 fill-current" /></button>
            <button onClick={() => setMuted(!muted)} disabled={!isVid} aria-label={muted ? "Unmute" : "Mute"} className="disabled:opacity-30">
              {muted ? <VolumeX className="h-6 w-6" strokeWidth={1.5} /> : <Volume2 className="h-6 w-6" strokeWidth={1.5} />}
            </button>
            {url
              ? <a href={url} download aria-label="Download" className="hidden md:block"><Download className="h-6 w-6" strokeWidth={1.5} /></a>
              : <MoreHorizontal className="hidden h-6 w-6 text-muted-foreground md:block" />}
          </div>
        </section>

        <aside className="panel h-fit">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <span className="font-display text-[14px] font-bold uppercase tracking-[0.12em]">Up next</span>
            <span className="hud text-[9px]">{playlist.length} reels</span>
          </div>
          <div className="max-h-[70vh] space-y-1 overflow-auto p-2">
            {playlist.map((j, i) => {
              const u = (j.response_log as any)?.url as string;
              const vid = !/\.(png|jpe?g|webp|gif)(\?|$)/i.test(u);
              return (
                <button key={j.id} onClick={() => setIdx(i)}
                  className={cn("flex w-full gap-3 rounded-sm p-2 text-left transition-colors", i === idx ? "bg-primary/15 ring-1 ring-primary/60" : "hover:bg-rack")}>
                  <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-sm bg-screen">
                    {vid ? <video src={u} muted preload="metadata" className="h-full w-full object-cover" /> : <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-[11px] text-foreground/90">{(j.prompt as any)?.text ?? "—"}</div>
                    <div className="hud mt-1 text-[8.5px]">{new Date(j.created_at).toLocaleDateString()}{favs[j.id] ? " · ♥" : ""}</div>
                  </div>
                </button>
              );
            })}
            {playlist.length === 0 && <div className="p-4 text-center text-[11px] text-muted-foreground">No finished reels yet. <Link to="/create" className="text-primary">Create one →</Link></div>}
          </div>
        </aside>
      </div>
    </main>
  );
}
