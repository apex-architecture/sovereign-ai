/**
 * Verifies the upstream homes the rail links to — by opening them.
 *   node scripts/verify-links.mjs [source-tool-links.js]
 *
 * A name enters the published file only if its URL answers 200 AND the page it returns
 * names the project. Memory is a hypothesis; the fetch is the evidence; a miss is
 * reported in tool-links.rejected.json rather than quietly dropped.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.resolve(process.argv[2] ?? path.join(ROOT, "film-verse-site", "tool-links.js"));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Some projects are named on their page differently from how our registry names them. */
const ALIAS = {
  "Wan 2.x": ["wan"], "Mochi 1": ["mochi"], "IP-Adapter": ["ip-adapter"], "PuLID": ["pulid"],
  "SDXL": ["sdxl", "generative-models", "stability"], "FLUX": ["flux"], "RVC": ["retrieval-based"],
  "Coqui TTS": ["coqui"], "Faster-Whisper": ["faster-whisper"], "WhisperX": ["whisperx"],
  "MusicGen": ["audiocraft", "musicgen"], "AudioCraft": ["audiocraft"], "Stable Audio": ["stable-audio", "stability"],
  "USD": ["openusd", "usd", "pixar"], "Qwen": ["qwen"], "DeepSeek": ["deepseek"], "llama.cpp": ["llama"],
  "llamafile": ["llamafile"], "C2PA": ["c2pa"], "YouTube Studio": ["youtube"],
  "DaVinci Resolve": ["resolve", "blackmagic"], "Open-Sora": ["sora"], "CogVideoX": ["cogvideo"],
  "LTX-Video": ["ltx"], "HunyuanVideo": ["hunyuan"], "AnimateDiff": ["animatediff"],
  "Fish Speech": ["fishspeech", "fish-audio"], "CosyVoice": ["cosyvoice"], "Demucs": ["demucs"],
  "Piper": ["piper"], "Real-ESRGAN": ["esrgan"], "CodeFormer": ["codeformer"], "GFPGAN": ["gfpgan"],
  "PhotoMaker": ["photomaker"], "InstantID": ["instantid"], "Kdenlive": ["kdenlive"], "Ardour": ["ardour"],
  "Olive": ["olive"], "Natron": ["natron"], "Owncast": ["owncast"], "PeerTube": ["peertube"],
  "n8n": ["n8n"], "MinIO": ["minio"], "Modal": ["modal"], "Meshy": ["meshy"], "Tripo": ["tripo"],
  "Viggle": ["viggle"], "ACE-Step": ["ace-step"], "Subtitle Edit": ["subtitle"], "So-VITS-SVC": ["so-vits"],
  "TuxGuitar": ["tuxguitar"], "Reaper": ["reaper", "cockos"], "Spek": ["spek"], "MakeHuman": ["makehuman"],
  "ComfyUI": ["comfyui", "comfy"], "Ollama": ["ollama"], "FFmpeg": ["ffmpeg"], "Blender": ["blender"],
  "Whisper": ["whisper"], "Replicate": ["replicate"], "Loudness": ["loudness"],
  "ffmpeg-normalize": ["ffmpeg-normalize"], "OpenClaw": ["openclaw"], "Zrythm": ["zrythm"],
};

const source = readFileSync(SRC, "utf8");
const entries = [...source.matchAll(/"([^"]+)"\s*:\s*"(https:[^"]+)"/g)].map((m) => [m[1], m[2]]);
const seen = new Map(entries);

const verified = {};
const rejected = [];
for (const [name, url] of seen) {
  const needles = (ALIAS[name] ?? [name]).map((s) => s.toLowerCase());
  needles.push(name.toLowerCase(), name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  if (name.includes(" ")) needles.push(name.split(" ")[0].toLowerCase());
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(25_000) });
    const body = (await res.text()).slice(0, 220_000).toLowerCase();
    if (!res.ok) {
      rejected.push([name, url, `HTTP ${res.status}`]);
      continue;
    }
    if (!needles.some((n) => n && body.includes(n))) {
      rejected.push([name, url, "opened, but the page does not name it"]);
      continue;
    }
    verified[name] = url;
  } catch (e) {
    rejected.push([name, url, String(e.message ?? e).slice(0, 40)]);
  }
}

const decl = `/* Verified by opening each upstream home: scripts/verify-links.mjs.\n   A tool appears here only if its URL answered 200 and the page named the project. ${Object.keys(verified).length} of ${seen.size} passed. */\nwindow.APEX_LINKS = ${JSON.stringify(verified, null, 1)};\n`;

for (const dir of ["verse-site", "film-verse-site"]) {
  const base = path.join(ROOT, dir);
  if (!existsSync(base)) continue;
  writeFileSync(path.join(base, "tool-links.js"), decl);
  writeFileSync(path.join(base, "tool-links.rejected.json"), JSON.stringify(rejected, null, 1));
}

console.log(`candidates=${seen.size} verified=${Object.keys(verified).length} rejected=${rejected.length}`);
for (const [n, u, why] of rejected) console.log("  REJECT", n, "→", why);
