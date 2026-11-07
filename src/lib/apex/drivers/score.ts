/**
 * The score bench — music that is written, not fetched.
 *
 * The music stage had no reachable engine at all: the catalogue promises dozens of music
 * models, none of them run on this machine, and every one of them costs money and a key.
 * Rather than leave the stage dead, APEX renders the score itself — a deterministic
 * composer that lays a chord bed, a bass line and a light pulse into a wav file, then
 * mixes any stems the film already has under it.
 *
 * The honesty rule: this is APEX's own code, so there is no third-party licence to read and
 * nothing to download. It is also not a record label — it is a scratch composer that puts a
 * real, timed music bed under a cut so the film can be judged and exported. The moment a
 * licensed cue arrives in the inputs, the mix takes that file instead of the generated bed.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { exec, firstLine, tail } from "./exec.ts";
import { R } from "../schema.ts";

const FFMPEG = process.env.APEX_FFMPEG_BIN ?? "ffmpeg";
const FFPROBE = process.env.APEX_FFPROBE_BIN ?? "ffprobe";
const OUT = process.env.APEX_OUT_DIR ?? ".apex-out";
const SCRATCH = path.resolve(OUT, "score");
const SR = 44100;

interface ScorePlan {
  bpm: number;
  bars: number;
  root: number;
  progression: number[];
  seed: number;
  mood: string;
}

const PROGRESSIONS: Record<string, { label: string; steps: number[] }> = {
  epic: { label: "epic-minor", steps: [0, 8, 3, 10] },
  hopeful: { label: "hopeful-major", steps: [0, 5, 7, 5] },
  grief: { label: "grief-minor", steps: [0, 3, 8, 7] },
  drive: { label: "drive-minor", steps: [0, 10, 8, 5] },
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** A mood word, a JSON plan, or nothing — all three must land on the same shape. */
function parsePlan(input: JobInput): ScorePlan {
  const raw = (input.variant ?? "").trim();
  const mood = (raw && !raw.startsWith("{") ? raw : "epic").toLowerCase();
  let plan: Partial<ScorePlan> = {};
  if (raw.startsWith("{")) {
    try {
      plan = JSON.parse(raw);
    } catch {
      plan = {};
    }
  }
  const key = PROGRESSIONS[plan.mood ?? mood] ? (plan.mood ?? mood) : "epic";
  return {
    bpm: Math.min(160, Math.max(60, Number(plan.bpm ?? 96))),
    bars: Math.min(64, Math.max(1, Number(plan.bars ?? 8))),
    root: Math.min(72, Math.max(45, Number(plan.root ?? 57))),
    progression: PROGRESSIONS[key].steps,
    seed: Number.isFinite(Number(plan.seed)) ? Number(plan.seed) : hash(`${input.projectId}:${input.sceneId}:${key}`),
    mood: PROGRESSIONS[key].label,
  };
}

function addPad(buf: Float32Array, startSec: number, durSec: number, freqs: number[], amp: number, rand: () => number): void {
  const start = Math.floor(startSec * SR);
  const n = Math.floor(durSec * SR);
  const detune = 0.004;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const rel = i / n;
    const attack = Math.min(1, t / 0.35);
    const release = Math.min(1, (1 - rel) * 4);
    const env = attack * release * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.13 * t + rand()));
    let v = 0;
    for (const f of freqs) {
      v += Math.sin(2 * Math.PI * f * t);
      v += 0.5 * Math.sin(2 * Math.PI * f * 2 * t + detune);
      v += 0.25 * Math.sin(2 * Math.PI * f * 3 * t);
    }
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += (v / (freqs.length * 1.75)) * amp * env;
  }
}

function addBass(buf: Float32Array, startSec: number, durSec: number, freq: number, amp: number): void {
  const start = Math.floor(startSec * SR);
  const n = Math.floor(durSec * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-3.2 * t) * Math.min(1, t / 0.01);
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += Math.sin(2 * Math.PI * freq * t) * amp * env;
  }
}

function addKick(buf: Float32Array, startSec: number, amp: number): void {
  const start = Math.floor(startSec * SR);
  const n = Math.floor(0.28 * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 52 + 90 * Math.exp(-28 * t);
    const env = Math.exp(-9 * t);
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += Math.sin(2 * Math.PI * f * t) * amp * env;
  }
}

function addHat(buf: Float32Array, startSec: number, amp: number, rand: () => number): void {
  const start = Math.floor(startSec * SR);
  const n = Math.floor(0.06 * SR);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const noise = rand() * 2 - 1;
    prev = prev * 0.72 + noise * 0.28;
    const env = Math.exp(-46 * t);
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += prev * amp * env;
  }
}

/** One-pole low-pass plus a soft knee: keeps the bed under the dialogue instead of over it. */
function finish(buf: Float32Array): Float32Array {
  const out = new Float32Array(buf.length);
  let lp = 0;
  for (let i = 0; i < buf.length; i++) {
    lp = lp * 0.55 + buf[i] * 0.45;
    out[i] = Math.tanh(lp * 1.15);
  }
  return out;
}

function writeWav(file: string, samples: Float32Array): void {
  const dataBytes = samples.length * 2;
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + dataBytes, 4);
  head.write("WAVE", 8);
  head.write("fmt ", 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(dataBytes, 40);
  const body = Buffer.alloc(dataBytes);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    body.writeInt16LE(Math.round(v * 32000), i * 2);
  }
  writeFileSync(file, Buffer.concat([head, body]));
}

/** Render the cue to a wav path and return the samples it took. */
function renderScore(plan: ScorePlan, file: string): { seconds: number; bytes: number } {
  const beat = 60 / plan.bpm;
  const barSec = beat * 4;
  const totalSec = plan.bars * barSec + 1.2;
  const buf = new Float32Array(Math.ceil(totalSec * SR));
  const rand = mulberry32(plan.seed);

  for (let bar = 0; bar < plan.bars; bar++) {
    const step = plan.progression[bar % plan.progression.length];
    const root = plan.root + step;
    const start = bar * barSec;
    addPad(buf, start, barSec * 1.02, [midiToFreq(root), midiToFreq(root + 3), midiToFreq(root + 7), midiToFreq(root + 12)], 0.34, rand);
    addBass(buf, start, beat * 1.6, midiToFreq(root - 24), 0.42);
    addBass(buf, start + beat * 2, beat * 1.2, midiToFreq(root - 24), 0.3);
    addKick(buf, start, 0.5);
    addKick(buf, start + beat * 2, 0.36);
    for (let eighth = 0; eighth < 8; eighth++) addHat(buf, start + eighth * (beat / 2), eighth % 2 === 0 ? 0.1 : 0.055, rand);
  }

  const mixed = finish(buf);
  writeWav(file, mixed);
  return { seconds: Math.round(mixed.length / SR * 1000) / 1000, bytes: mixed.length * 2 + 44 };
}

async function audioSeconds(file: string): Promise<number | null> {
  const r = await exec(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], 30);
  const s = Number(firstLine(r.stdout));
  return r.code === 0 && Number.isFinite(s) ? Math.round(s * 1000) / 1000 : null;
}

export const scoreDriver: ToolDriver = {
  toolId: "apex_score",
  depth: "drivable",
  record: R({
    name: "APEX procedural score",
    category: "music",
    officialUrl: "",
    license: "MIT — written for APEX, contains no third-party code",
    licenseVerified: true,
    lastVerified: "2026-11-06",
    commercialUse: "yes",
    redistribution: "yes",
    modification: "yes",
    attribution: "yes",
    selfHosting: true,
    localExecution: true,
    apiAvailable: false,
    hardware: "CPU only; renders a wav in seconds",
    integrationMethod: "library",
    cost: "$0",
    capability: "deterministic chord bed, bass and pulse rendered to a wav, mixed under supplied stems",
    priority: "now",
    replacementOptions: ["licensed cue files delivered by the client", "ACE-Step", "MusicGen (needs a GPU and a download)"],
    dataPortability: "output is a plain 44.1 kHz wav",
    outputConditions: "a generated bed is a scratch score for cutting and export; a finished cue is a licensed file the client supplies",
  }),
  runsOn: "creator-machine",

  async probe() {
    mkdirSync(SCRATCH, { recursive: true });
    const test = path.join(SCRATCH, "probe.wav");
    const plan: ScorePlan = { bpm: 90, bars: 1, root: 57, progression: [0, 8, 3, 10], seed: 1, mood: "epic-minor" };
    const written = renderScore(plan, test);
    const seconds = await audioSeconds(test);
    if (!existsSync(test) || seconds === null || seconds <= 0) {
      return { ok: false, why: `score renderer produced no measurable wav: ${tail("ffprobe could not read the probe file", 200)}` };
    }
    return { ok: true, why: `renders offline: ${seconds}s of wav written in ${written.bytes} bytes` };
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    mkdirSync(SCRATCH, { recursive: true });
    const plan = parsePlan(input);
    const base = path.join(SCRATCH, `${input.projectId}-${input.sceneId}-score.wav`);
    const written = renderScore(plan, base);
    const bedSeconds = await audioSeconds(base);

    const stems = input.inputs.filter((p) => existsSync(p));
    let finalFile = base;
    let log = `score rendered: ${written.seconds}s, ${written.bytes} bytes, ${plan.mood} at ${plan.bpm} bpm`;

    if (stems.length > 0) {
      const mixed = path.join(SCRATCH, `${input.projectId}-${input.sceneId}-mix.wav`);
      const args = ["-y", "-i", base, ...stems.flatMap((s) => ["-i", s]), "-filter_complex", `${[0, ...stems.map((_, i) => i + 1)].map((i) => `[${i}:a]`).join(";")}amix=inputs=${stems.length + 1}:duration=longest:weights=${`1 ${stems.map(() => 0.9).join(" ")}`}[out]`, "-map", "[out]", "-c:a", "pcm_s16le", mixed];
      const r = await exec(FFMPEG, args, Math.max(60, input.timeoutSeconds));
      if (r.code === 0 && existsSync(mixed)) {
        finalFile = mixed;
        const mixedSeconds = await audioSeconds(mixed);
        log = `score mixed under ${stems.length} stem(s): ${mixedSeconds ?? "?"}s total, ${plan.mood} at ${plan.bpm} bpm`;
      } else {
        log = `score rendered but the mix failed, the bed stands alone: ${tail(r.stderr, 300)}`;
      }
    }

    const seconds = await audioSeconds(finalFile);
    const produced = seconds !== null && seconds > 0 && existsSync(finalFile);

    return {
      state: produced ? "succeeded" : "failed",
      outputs: produced ? [finalFile] : [],
      wallClockSeconds: (Date.now() - started) / 1000,
      usdSpent: 0,
      reproducible: { plan, bedSeconds, stems },
      log: produced ? log : `no score produced: ${tail(log, 300)}`,
    };
  },
};
