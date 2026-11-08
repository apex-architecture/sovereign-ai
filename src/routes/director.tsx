import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OwnerWall } from "@/components/OwnerWall";
import { toast } from "sonner";

export const Route = createFileRoute("/director")({
  head: () => ({ meta: [{ title: "Director — Sovereign AI Filmverse" }, { name: "description", content: "Multi-shot storyboard sequencer. Chain prompts into films." }]}),
  component: Director,
});

type Shot = { id: string; prompt: string; motion: number };
const blank = (): Shot => ({ id: crypto.randomUUID(), prompt: "", motion: 127 });

function buildWorkflow(prompt: string, motion: number) {
  return {
    "3": { class_type: "KSampler", inputs: { seed: Math.floor(Math.random()*1e9), steps: 25, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 1, model: ["4",0], positive: ["6",0], negative: ["7",0], latent_image: ["5",0] } },
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "svd_xt.safetensors" } },
    "5": { class_type: "EmptyLatentImage", inputs: { width: 1024, height: 576, batch_size: 1 } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4",1] } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: "low quality, blurry, watermark", clip: ["4",1] } },
    "8": { class_type: "VAEDecode", inputs: { samples: ["3",0], vae: ["4",2] } },
    "9": { class_type: "SVD_img2vid_Conditioning", inputs: { motion_bucket_id: Math.round(motion), fps: 24, augmentation_level: 0 } },
    "10": { class_type: "SaveAnimatedWEBP", inputs: { filename_prefix: "filmverse_dir", fps: 24, lossless: false, quality: 90, method: "default", images: ["8",0] } },
  };
}

function Director() {
  const [userId, setUserId] = useState<string | null>(null);
  const [endpointId, setEndpointId] = useState("");
  const [shots, setShots] = useState<Shot[]>([blank(), blank(), blank()]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Untitled Sequence");

  useEffect(() => { supabase.auth.getUser().then(({data}) => setUserId(data.user?.id ?? null)); }, []);

  const endpoints = useQuery({
    queryKey: ["dir-endpoints"],
    queryFn: async () => (await supabase.from("gpu_endpoints").select("*")).data ?? [],
  });

  useEffect(() => { if (!endpointId && endpoints.data?.length) setEndpointId(endpoints.data[0].id); }, [endpoints.data, endpointId]);

  async function dispatch() {
    if (!userId) return toast.error("Login required.");
    const ep = endpoints.data?.find(e => e.id === endpointId);
    if (!ep) return toast.error("Add a GPU endpoint in /admin.");
    const valid = shots.filter(s => s.prompt.trim());
    if (!valid.length) return toast.error("Add at least one shot.");

    setBusy(true);
    let project_id: string | null = null;
    try {
      const { data: proj } = await supabase.from("projects").insert({ owner_id: userId, title }).select().single();
      project_id = proj?.id ?? null;
    } catch {}

    let queued = 0;
    for (let i = 0; i < valid.length; i++) {
      const s = valid[i];
      const wf = buildWorkflow(s.prompt, s.motion);
      const clientId = crypto.randomUUID();
      const { data: jobRow } = await supabase.from("render_jobs").insert({
        owner_id: userId, endpoint_id: ep.id, project_id, status: "queued",
        prompt: { text: s.prompt, motion: s.motion, shot_index: i, sequence_title: title, workflow: wf },
      }).select().single();
      if (!jobRow) continue;
      try {
        const base = ep.api_url.replace(/\/+$/, "");
        const res = await fetch(`${base}/prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: wf, client_id: clientId }) });
        const j = await res.json() as any;
        await supabase.from("render_jobs").update({ external_job_id: j.prompt_id, status: "rendering", response_log: { client_id: clientId, base } }).eq("id", jobRow.id);
        queued++;
      } catch (e: any) {
        await supabase.from("render_jobs").update({ status: "failed", response_log: { error: String(e.message) } }).eq("id", jobRow.id);
      }
    }
    setBusy(false);
    toast.success(`Sequence dispatched: ${queued}/${valid.length} shots → GPU. View in /theater.`);
  }

  if (!userId) return <OwnerWall title="Director" note="The storyboard sequencer builds multi-shot films on the owner's GPU machines, so it opens for the owner only." />;return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="brutal-border p-5 bg-card">
        <div className="text-xs neon-text font-bold">▮ DIRECTOR</div>
        <h1 className="text-2xl">STORYBOARD SEQUENCER</h1>
        <p className="text-xs text-muted-foreground mt-1">Chain multiple shots. One click dispatches the entire sequence to your GPU.</p>
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} className="w-full brutal-border bg-background px-3 py-2 text-sm font-bold" placeholder="Sequence title"/>

      <select value={endpointId} onChange={e => setEndpointId(e.target.value)} className="w-full brutal-border bg-background px-3 py-2 text-sm">
        {(endpoints.data ?? []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>

      <div className="space-y-3">
        {shots.map((s, i) => (
          <div key={s.id} className="brutal-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase neon-text">▮ Shot {i+1}</div>
              <button onClick={() => setShots(shots.filter(x => x.id !== s.id))} className="text-[10px] uppercase font-bold hover:text-destructive">✕ remove</button>
            </div>
            <textarea value={s.prompt} onChange={e => setShots(shots.map(x => x.id === s.id ? {...x, prompt: e.target.value} : x))}
              rows={2} placeholder="Wide shot: hero walks through neon rain…" className="w-full brutal-border bg-background px-2 py-1 text-sm font-mono"/>
            <label className="block text-[10px] uppercase font-bold">Motion: {s.motion}
              <input type="range" min={1} max={255} value={s.motion} onChange={e => setShots(shots.map(x => x.id === s.id ? {...x, motion: +e.target.value} : x))} className="w-full"/>
            </label>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShots([...shots, blank()])} className="brutal-border px-4 py-2 text-xs font-bold uppercase hover:bg-muted flex-1">+ Add Shot</button>
        <button onClick={dispatch} disabled={busy} className="brutal-border bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase hover:opacity-90 disabled:opacity-40 flex-1">
          {busy ? "▸ DISPATCHING…" : `▸ Render All (${shots.filter(s=>s.prompt.trim()).length})`}
        </button>
      </div>
    </main>
  );
}
