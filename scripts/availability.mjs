/**
 * Measures what this machine can actually run, right now, and writes the answer to the rail.
 *
 *   node --experimental-strip-types scripts/availability.mjs
 *
 * The dictionary knows 182 engines. Until something probes the disk, "182 engines" is a brochure.
 * This script is the probe: it looks for the binaries on PATH, the weights in the model trees, the
 * ComfyUI server on its port, the GPU behind it, and the keys in .env — by NAME only, never by
 * value — and then labels every engine in the dictionary with one of five states:
 *
 *   ready   the artefact is verified on this machine, with its path and its bytes
 *   fetch   open source and licence-clean for you; the weights are simply not here yet
 *   key     a hosted API that runs on your own key — the platform quotes, it does not bill
 *   manual  a desktop application you drive yourself; not a server-side tool
 *   blocked the licence itself excludes your territory, so the platform will not offer it
 *
 * Nothing here is typed by hand: every state is the result of a probe that either returned a
 * path or returned nothing.
 */

import { execSync, execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { siteDir } from "./site-dir.mjs";
import { pathToFileURL } from "node:url";

const APEX = path.resolve("src/lib/apex");
const SITE = siteDir();
const { ENGINES } = await import(pathToFileURL(path.join(APEX, "engines.ts")).href);
const { rankEngines } = await import(pathToFileURL(path.join(APEX, "engines.ts")).href);

const TERRITORY = process.env.APEX_TERRITORY ?? "Australia";
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const WINDOWS = process.platform === "win32";

/* ------------------------------------------------------------------ helpers */

function sh(cmd, args, timeoutMs = 15000) {
  try {
    return execFileSync(cmd, args, { timeout: timeoutMs, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  } catch {
    return null;
  }
}

/** Resolves a binary on PATH. Returns the absolute path or null. */
function which(bin) {
  const raw = WINDOWS ? sh("where.exe", [bin]) : sh("which", [bin]);
  if (!raw) return null;
  const line = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0];
  if (!line) return null;
  if (WINDOWS && !existsSync(line)) return null;
  return line;
}

function version(bin, args = ["-version"]) {
  const out = sh(bin, args, 8000);
  if (!out) return null;
  const line = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] ?? "";
  return line.slice(0, 90) || null;
}

/**
 * The number a human would say out loud. "ffmpeg version 8.1.2-full_build-www.gyan.dev Copyright
 * (c) 2000-2026 the FFmpeg developers" is a legal notice, not a version.
 */
function shortVersion(raw) {
  if (!raw) return null;
  const m = /(\d+\.\d+(?:\.\d+)?)/.exec(raw);
  return m ? m[1] : raw.split(/\s+/)[0].slice(0, 24);
}

/** The capability a rule proves, phrased as the thing the tool can now do. */
function needText(rule) {
  const parts = [];
  for (const e of rule.need?.encoders ?? []) parts.push(`encoder ${e}`);
  for (const f of rule.need?.filters ?? []) parts.push(`filter ${f}`);
  for (const m of rule.need?.formats ?? []) parts.push(`muxer ${m}`);
  return parts.join(", ");
}

/** Every file under a tree that looks like a model, with its byte size. */
function modelFiles(root, depth = 4) {
  const found = [];
  if (!existsSync(root)) return found;
  const walk = (dir, d) => {
    if (d > depth) return;
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        walk(full, d + 1);
        continue;
      }
      if (!/\.(safetensors|gguf|ckpt|pth|pt|bin|onnx|engine)$/i.test(e.name)) continue;
      try {
        found.push({ file: e.name, path: full, bytes: statSync(full).size });
      } catch {}
    }
  };
  walk(root, 0);
  return found;
}

/* ------------------------------------------------------------------ probes */

const tools = [];
const note = (id, name, bin, verArgs) => {
  const p = which(bin);
  if (!p) return null;
  const entry = { id, name, bin, path: p, version: version(p, verArgs) };
  tools.push(entry);
  return entry;
};

const toolFfmpeg = note("ffmpeg", "FFmpeg", "ffmpeg", ["-version"]);
const toolFfprobe = note("ffprobe", "ffprobe", "ffprobe", ["-version"]);
const toolPython = note("python", "Python", "python", ["--version"]);
const toolWhisper = note("whisper", "OpenAI Whisper CLI", "whisper", ["--help"]);
const toolNode = note("node", "Node.js", "node", ["--version"]);
const toolGit = note("git", "Git", "git", ["--version"]);
const toolFfmpegOnly = null;

/* ffmpeg capabilities: the filter and encoder names are what decide a finish-stage tool. */
let ffmpegCaps = { encoders: new Set(), filters: new Set(), formats: new Set() };
if (toolFfmpeg) {
  const enc = sh(toolFfmpeg.path, ["-hide_banner", "-encoders"], 15000) ?? "";
  const flt = sh(toolFfmpeg.path, ["-hide_banner", "-filters"], 15000) ?? "";
  const fmt = sh(toolFfmpeg.path, ["-hide_banner", "-formats"], 15000) ?? "";
  // ffmpeg prints the flag column and the name as two whitespace-separated tokens: "V....D libx264"
  // for encoders, ".S astats" for filters. Parsing on a fixed column width drops rows whose flag
  // column is right-aligned with a leading space — and a capability the platform cannot see is a
  // capability it must not claim.
  const rows = (text) => {
    const out = [];
    for (const line of text.split(/\r?\n/)) {
      const [flags, name] = line.trim().split(/\s+/);
      if (!flags || !name) continue;
      if (!/^[A-Z.]{1,6}$/.test(flags)) continue;
      if (!/^[A-Za-z0-9_.-]+$/.test(name)) continue;
      out.push(name);
    }
    return out;
  };
  ffmpegCaps = {
    encoders: new Set(rows(enc)),
    filters: new Set(rows(flt)),
    formats: new Set(rows(fmt)),
  };
}

/* python modules: a python tool is only real if the import works */
const pyModules = {};
function pyHas(mod) {
  if (mod in pyModules) return pyModules[mod];
  const out = toolPython ? sh(toolPython.path, ["-c", `import importlib.util,sys;sys.exit(0 if importlib.util.find_spec("${mod}") else 1)`], 15000) : null;
  const ok = out !== null;
  pyModules[mod] = ok;
  return ok;
}

/* the GPU */
let gpu = null;
const nv = sh("nvidia-smi", ["--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"], 12000);
if (nv) {
  const [name, mib, driver] = nv.split(/\r?\n/)[0].split(",").map((s) => s.trim());
  gpu = { name, vramGb: Math.round(Number(mib) / 1024), driver, vramMiB: Number(mib) };
}

/* the ComfyUI engine room — there can be more than one, and the wrong one is an empty shell */
const COMFY_CANDIDATES = [process.env.APEX_COMFY_URL, "http://127.0.0.1:8188", "http://127.0.0.1:8189"].filter(Boolean);
let comfy = { up: false, version: null, url: process.env.APEX_COMFY_URL ?? "http://127.0.0.1:8188", weights: [], complete: 0 };
const comfyRooms = [];
for (const url of COMFY_CANDIDATES) {
  try {
    const stats = await fetch(`${url}/system_stats`, { signal: AbortSignal.timeout(4000) });
    if (!stats.ok) continue;
    const j = await stats.json();
    // A room is judged by what it can actually serve. Two ComfyUI instances on this machine both
    // answer, and one of them holds the Wan weights but not the text encoder — a room that can
    // render nothing. Asking each room for its loaders is the difference between a platform and
    // a coin flip.
    const loaders = {};
    for (const [node, key] of [["UNETLoader", "unet"], ["CLIPLoader", "clip"], ["VAELoader", "vae"]]) {
      try {
        const info = await fetch(`${url}/object_info/${node}`, { signal: AbortSignal.timeout(4000) });
        const oi = info.ok ? await info.json() : {};
        const req = oi?.[node]?.input?.required ?? {};
        loaders[key] = Object.values(req).find((v) => Array.isArray(v) && Array.isArray(v[0]))?.[0] ?? [];
      } catch {
        loaders[key] = [];
      }
    }
    const complete = Object.values(loaders).filter((l) => l.length > 0).length;
    const weights = [...new Set([...(loaders.unet ?? []), ...(loaders.clip ?? []), ...(loaders.vae ?? [])])];
    const room = { url, version: j?.system?.comfyui_version ?? null, loaders, complete, weights };
    comfyRooms.push(room);
    if (!comfy.up || complete > comfy.complete) {
      comfy = { up: true, version: room.version, url, weights, complete };
    }
  } catch {}
}

/* the model trees */
const MODEL_ROOTS = [
  process.env.COMFY_MODELS ?? "D:/ComfyUI/models",
  path.join(HOME, "ComfyUI", "models"),
  path.join(HOME, ".cache", "huggingface", "hub"),
  path.join(HOME, ".cache", "whisper"),
  path.join(HOME, ".cache", "torch"),
];
const models = [];
const seenModel = new Set();
for (const root of MODEL_ROOTS) {
  for (const m of modelFiles(root)) {
    const key = m.path.toLowerCase();
    if (seenModel.has(key)) continue;
    seenModel.add(key);
    models.push({ ...m, root });
  }
}

/* the keys — names only, never values */
const envNames = new Set();
try {
  for (const line of readFileSync(path.resolve(".env"), "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=/.exec(line);
    if (m && !line.trim().startsWith("#")) envNames.add(m[1]);
  }
} catch {}
const keys = [...envNames].filter((k) => /KEY|TOKEN|SECRET/.test(k));

/* ------------------------------------------------------------------ mapping */

/**
 * Which probed artefact proves which engine. `all` is a list of patterns that must ALL be found on
 * disk — a video model without its text encoder and its VAE is not a video model, it is three
 * gigabytes of nothing. The patterns are matched against the full path, so a Hugging Face cache
 * entry is matched by its repository name and not by a generic file name.
 */
const ARTEFACT_RULES = [
  { id: "wan2.1-1.3b", all: [/wan2\.1_t2v_1\.3b/i, /umt5/i, /wan_2\.1_vae/i], note: "Wan 2.1 T2V 1.3B + umt5 text encoder + Wan VAE" },
  { id: "wan-2.1", all: [/wan2\.1_t2v_1\.3b/i, /umt5/i, /wan_2\.1_vae/i], note: "Wan 2.1 T2V 1.3B + umt5 text encoder + Wan VAE" },
  { id: "wan2.2", all: [/wan2\.2/i], note: "Wan 2.2 weights" },
  { id: "wan-2.2-ti2v-5b", all: [/wan2\.2/i], note: "Wan 2.2 weights" },
  { id: "causvid", all: [/causvid/i], note: "CausVid distill weights" },
  { id: "sdxl-base-1.0", all: [/sd_xl_base|sdxl/i], note: "SDXL base weights" },
  { id: "faster-whisper", all: [/systran--faster-whisper/i], note: "faster-whisper CTranslate2 model" },
  { id: "whisper-large-v3", all: [/whisper.*large.*v3|large-v3/i], note: "Whisper large-v3 weights" },
  { id: "whisperx", all: [/whisperx/i], note: "WhisperX models" },
  { id: "piper", all: [/\.cache[\\/]piper|piper.*\.onnx/i], note: "Piper voices" },
  { id: "kokoro-82m", all: [/kokoro/i], note: "Kokoro voices" },
  { id: "musetalk", all: [/musetalk/i], note: "MuseTalk weights" },
  { id: "liveportrait", all: [/liveportrait/i], note: "LivePortrait weights" },
  { id: "practical-rife", all: [/rife/i], note: "RIFE weights" },
  { id: "film-vfi", all: [/film.*vfi|film-vfi/i], note: "FILM interpolation weights" },
  { id: "real-esrgan", all: [/esrgan|realesrgan/i], note: "Real-ESRGAN weights" },
  { id: "upscale-a-video", all: [/upscale.*video/i], note: "Upscale-A-Video weights" },
  { id: "seedvr2", all: [/seedvr/i], note: "SeedVR2 weights" },
  { id: "controlnet-union-sdxl", all: [/controlnet.*union/i], note: "ControlNet Union weights" },
  { id: "flux2-dev", all: [/flux.*2.*dev|flux2.*dev/i], note: "FLUX.2 dev weights" },
  { id: "flux2-klein-4b", all: [/flux.*klein/i], note: "FLUX.2 klein weights" },
  { id: "pulid", all: [/pulid/i], note: "PuLID weights" },
  { id: "ip-adapter-faceid", all: [/ip-adapter/i], note: "IP-Adapter weights" },
  { id: "qwen-image-2512", all: [/qwen.*image/i], note: "Qwen-Image weights" },
  { id: "qwen-image-2.1", all: [/qwen.*image/i], note: "Qwen-Image weights" },
  { id: "musicgen", all: [/musicgen/i], note: "MusicGen weights" },
  { id: "audiogen", all: [/audiogen/i], note: "AudioGen weights" },
  { id: "stable-audio-open-1.0", all: [/stable.*audio/i], note: "Stable Audio Open weights" },
  { id: "videoseal", all: [/videoseal/i], note: "VideoSeal weights" },
];

const TOOL_RULES = [
  { id: "ffmpeg", tool: "ffmpeg" },
  { id: "ffmpeg-loudnorm", tool: "ffmpeg", need: { filters: ["loudnorm"] } },
  { id: "ffmpeg-subtitles-libass", tool: "ffmpeg", need: { filters: ["subtitles"] } },
  { id: "ffmpeg-measure-filters", tool: "ffmpeg", need: { filters: ["signalstats", "blackdetect", "astats"] } },
  { id: "ffmpeg-ebur128", tool: "ffmpeg", need: { filters: ["ebur128"] } },
  { id: "ffmpeg-delivery", tool: "ffmpeg", need: { encoders: ["aac", "libopus"], formats: ["hls", "mp4"] } },
  { id: "prores-ffmpeg", tool: "ffmpeg", need: { encoders: ["prores_ks"] } },
  { id: "nvenc", tool: "ffmpeg", need: { encoders: ["h264_nvenc"] } },
  { id: "libvmaf", tool: "ffmpeg", need: { filters: ["libvmaf"] } },
  { id: "x264", tool: "ffmpeg", need: { encoders: ["libx264"] } },
  { id: "x265", tool: "ffmpeg", need: { encoders: ["libx265"] } },
  { id: "svt-av1", tool: "ffmpeg", need: { encoders: ["libsvtav1"] } },
  { id: "libaom-av1", tool: "ffmpeg", need: { encoders: ["libaom-av1"] } },
  { id: "whisper", tool: "whisper" },
  { id: "comfyui", comfy: true },
];

const PY_RULES = [
  { id: "pyscenedetect", mod: "scenedetect" },
  { id: "auto-editor", mod: "auto_editor" },
];

const CLI_BINARIES = {
  "libplacebo": "libplacebo",
  "imagemagick-hald": "magick",
  "mediainfo": "mediainfo",
  "mediaconch": "mediaconch",
  "qctools": "qctools",
  "shaka-packager": "packager",
  "bento4": "mp4dump",
  "gpac-mp4box": "mp4box",
  "c2pa-rs": "c2patool",
  "dcp-o-matic": "dcpomatic2_cli",
  "bmx-ebu": "mxfdump",
  "mkvtoolnix": "mkvmerge",
  "mlt": "melt",
  "rsgain": "rsgain",
  "svt-av1": "svtav1encapp",
  "libaom-av1": "aomenc",
  "nvencc": "NVEncC",
  "amd-amf": "amfenc",
  "whisper-cpp": "whisper-cli",
  "mfa": "montreal-forced-aligner",
  "invisible-watermark": "invisible-watermark",
  "mux": null,
};

const toolById = Object.fromEntries(tools.map((t) => [t.id, t]));
const ruleById = Object.fromEntries([...ARTEFACT_RULES, ...TOOL_RULES, ...PY_RULES].map((r) => [r.id, r]));

function bytes(n) {
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(2)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  return `${n} B`;
}

/** The measured state of one engine. */
function stateOf(engine) {
  const rule = ruleById[engine.id];

  if (rule?.comfy) {
    const served = comfy.weights.length
      ? `serves ${comfy.weights.length} weight${comfy.weights.length === 1 ? "" : "s"}: ${comfy.weights.join(", ")}`
      : "holds no weights — it can render nothing";
    return comfy.up
      ? {
          state: comfy.complete >= 3 ? "ready" : "fetch",
          evidence: `ComfyUI ${comfy.version} · the room on port ${new URL(comfy.url).port} · ${served}${comfy.complete < 3 ? ` · ${comfy.rooms.length > 1 ? "another instance on this machine holds the rest" : "the text encoder and VAE are missing"}` : ""}`,
          runnable: comfy.complete >= 3,
          path: comfy.url,
        }
      : { state: "fetch", evidence: `ComfyUI is installed but no instance is answering on ${COMFY_CANDIDATES.join(", ")}`, runnable: false };
  }

  if (rule?.tool) {
    const t = toolById[rule.tool];
    if (!t) return { state: "fetch", evidence: `no ${rule.tool} binary on this machine`, runnable: false };
    // A tool that claims a specific capability has to show that capability, not just its parent
    // binary. FFmpeg being on PATH does not make libvmaf a real tool on this machine.
    if (rule.need) {
      const missing = [];
      for (const e of rule.need.encoders ?? []) if (!ffmpegCaps.encoders.has(e)) missing.push(`encoder ${e}`);
      for (const f of rule.need.filters ?? []) if (!ffmpegCaps.filters.has(f)) missing.push(`filter ${f}`);
      for (const m of rule.need.formats ?? []) if (!ffmpegCaps.formats.has(m)) missing.push(`muxer ${m}`);
      if (missing.length) {
        return { state: "fetch", evidence: `${t.name} is installed but this build has no ${missing.join(", ")}`, runnable: false };
      }
    }
    // Whisper's CLI is installed, but Whisper with no model on disk is a program that will
    // download 140 MB the first time it is asked to work.
    if (rule.tool === "whisper") {
      const model = models.find((m) => /[\\/]\.cache[\\/]whisper[\\/]/i.test(m.path));
      if (!model) {
        return { state: "fetch", evidence: `${t.name} is installed · no model on disk yet (the base model is a 140 MB fetch)`, runnable: false };
      }
      return { state: "ready", evidence: `${t.name} · ${model.file} · ${bytes(model.bytes)} on disk`, runnable: true, path: t.path };
    }
    const caps = needText(rule);
    return {
      state: "ready",
      evidence: `${t.name} ${shortVersion(t.version) ?? ""}`.trim() + (caps ? ` · ${caps}` : ""),
      runnable: true,
      tool: t.id,
      path: t.path,
    };
  }

  if (rule?.mod) {
    return pyHas(rule.mod)
      ? { state: "ready", evidence: `python package "${rule.mod}" imports on ${toolPython?.name ?? "python"} ${shortVersion(toolPython?.version) ?? ""}`.trim(), runnable: true, path: toolPython?.path }
      : { state: "fetch", evidence: `pip install ${rule.mod}`, runnable: false };
  }

  if (rule?.all) {
    const hits = rule.all.map((re) => models.find((m) => re.test(m.path)));
    const total = hits.reduce((n, m) => n + (m?.bytes ?? 0), 0);
    if (hits.every(Boolean)) {
      const names = rule.note ?? hits.map((m) => m.file).join(" + ");
      return { state: "ready", evidence: `${names} · ${bytes(total)} on disk`, runnable: true, bytes: total };
    }
    const missing = rule.all.filter((_, i) => !hits[i]).length;
    return { state: "fetch", evidence: `not on this machine · ${missing} of ${rule.all.length} weight files missing · ${engine.vendorUrl}`, runnable: false };
  }

  if (engine.kind === "cli") {
    const bin = CLI_BINARIES[engine.id];
    if (bin) {
      const p = which(bin);
      if (p) return { state: "ready", evidence: `${bin} on PATH`, runnable: true, path: p };
    }
    return { state: "fetch", evidence: `not on PATH · ${engine.vendorUrl}`, runnable: false };
  }

  if (engine.kind === "api") {
    const vendor = (engine.vendorUrl ?? "").toLowerCase();
    const hasKey = /replicate/.test(vendor) && keys.includes("REPLICATE_API_KEY");
    if (hasKey) return { state: "key", evidence: "your REPLICATE_API_KEY is present — the platform quotes, your key pays", runnable: false };
    const price = engine.priceUsdPerSecond === null ? "no price on record" : `$${engine.priceUsdPerSecond}/s`;
    return { state: "key", evidence: `hosted API · ${price} · needs that vendor's key in your .env`, runnable: false };
  }

  if (engine.kind === "app") {
    return { state: "manual", evidence: `desktop application you drive yourself · ${engine.vendorUrl}`, runnable: false };
  }

  // weights with no local artefact: open source, licence-checked, simply not fetched yet
  const banned = (engine.licence.excludedTerritories ?? []).includes(TERRITORY);
  if (banned) return { state: "blocked", evidence: `the licence excludes ${TERRITORY}`, runnable: false };
  return { state: "fetch", evidence: `not on this machine · ${engine.vendorUrl}`, runnable: false };
}

/* ------------------------------------------------------------------ write */

const states = {};
const counts = { ready: 0, fetch: 0, key: 0, manual: 0, blocked: 0 };
for (const e of ENGINES) {
  const s = stateOf(e);
  states[e.id] = {
    state: s.state,
    evidence: s.evidence,
    runnable: Boolean(s.runnable),
    ...(s.path ? { path: s.path } : {}),
    ...(s.bytes ? { bytes: s.bytes } : {}),
  };
  counts[s.state] = (counts[s.state] ?? 0) + 1;
}

/* The road, run against the body this probe actually found. */
const executors = [];
if (comfy.up) executors.push("local-comfy");
if (gpu) executors.push("local-cli");
if (keys.includes("REPLICATE_API_KEY")) executors.push("vendor-api");
const road = rankEngines({
  stage: "motion",
  seconds: 5,
  qualityEdge: 832,
  needsAudio: false,
  territory: TERRITORY,
  intent: "personal",
  budgetUsd: 0,
  vramGb: gpu?.vramGb ?? null,
  executors,
  drivableOnly: false,
});

const payload = {
  probedAt: new Date().toISOString(),
  territory: TERRITORY,
  host: { platform: process.platform, arch: process.arch },
  gpu,
  comfy: { up: comfy.up, version: comfy.version, url: comfy.url, weights: comfy.weights, rooms: comfyRooms },
  executors,
  tools: tools.map((t) => ({ id: t.id, name: t.name, path: t.path, version: t.version })),
  ffmpeg: {
    path: toolFfmpeg?.path ?? null,
    version: toolFfmpeg?.version ?? null,
    encoders: [...ffmpegCaps.encoders].filter((x) => /nvenc|prores|x264|x265|av1|aac|libopus/.test(x)).slice(0, 40),
    filters: [...ffmpegCaps.filters].filter((x) => /loudnorm|ebur128|libvmaf|subtitles|signalstats|blackdetect|astats/.test(x)).slice(0, 40),
  },
  models: models.map((m) => ({ file: m.file, path: m.path, bytes: m.bytes })),
  keys,
  counts,
  engines: states,
  road: {
    counted: road.counted,
    offers: road.offers.map((o) => ({ id: o.engine.id, name: o.engine.name, quoteUsd: o.quoteUsd, quoteBasis: o.quoteBasis })),
    refused: road.refused.map((r) => ({ id: r.engine.id, name: r.engine.name, gate: r.gate, why: r.why })),
  },
};

mkdirSync(SITE, { recursive: true });
writeFileSync(path.join(SITE, "availability.generated.js"), `/* GENERATED by scripts/availability.mjs — do not edit. */\nwindow.APEX_AVAIL = ${JSON.stringify(payload)};\n`);

const ready = Object.entries(states).filter(([, v]) => v.state === "ready");
console.log(`PROBE ${payload.probedAt}`);
console.log(`GPU    ${gpu ? `${gpu.name} · ${gpu.vramGb} GB · driver ${gpu.driver}` : "none reported"}`);
console.log(`COMFY  ${comfy.up ? `up ${comfy.version} on ${comfy.url}` : `down on ${comfy.url}`}`);
console.log(`TOOLS  ${tools.map((t) => t.id).join(", ") || "none"}`);
console.log(`MODELS ${models.length} files on disk`);
console.log(`KEYS   ${keys.join(", ") || "none"}`);
console.log(`STATES ready ${counts.ready} · fetch ${counts.fetch} · key ${counts.key} · manual ${counts.manual} · blocked ${counts.blocked}`);
for (const [id, v] of ready) console.log(`  READY ${id.padEnd(26)} ${v.evidence}`);
console.log(`WROTE  ${path.join(SITE, "availability.generated.js")}`);
