/**
 * Command-line drivers for the two stages a film cannot fake: 3D renders and transcripts.
 *
 * Both are genuinely headless, so both are declared drivable — and both fail loudly when
 * the binary is not on the local runner's PATH rather than pretending to have run.
 */

import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { exec, firstLine, tail } from "./exec.ts";
import { R } from "../schema.ts";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const OUT = process.env.APEX_OUT_DIR ?? ".apex-out";

const BLENDER = process.env.APEX_BLENDER_BIN ?? "blender";
const WHISPER = process.env.APEX_WHISPER_BIN ?? "whisper";

/**
 * Whisper's own help text contains a full-width Japanese period, which Windows' cp1252
 * console cannot encode — the CLI crashed and this probe reported a working tool as broken.
 * Every whisper call therefore declares UTF-8 for the child's stdout.
 */
const whisperEnv = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) out[k] = v;
  out.PYTHONIOENCODING = "utf-8";
  return out;
};

export const blenderDriver: ToolDriver = {
  toolId: "blender",
  depth: "drivable",
  record: R({
    name: "Blender",
    category: "three-d",
    officialUrl: "https://www.blender.org",
    sourceRepository: "https://projects.blender.org/blender/blender",
    license: "GPL-2.0-or-later",
    licenseVerified: false,
    selfHosting: true,
    localExecution: true,
    apiAvailable: true,
    hardware: "CPU renders work; GPU (CUDA/OptiX/HIP) for Cycles at speed",
    integrationMethod: "cli",
    cost: "$0",
    capability: "layouts, camera moves, procedural sets, headless renders, compositor",
    priority: "now",
    replacementOptions: ["Flax Engine", "Godot 4 (real-time sets)", "mesh + FFmpeg only"],
    dataPortability: ".blend is open-format; exports to glTF/USD",
    outputConditions: "the engine's licence does not restrict what you make in it",
  }),
  runsOn: "creator-machine",

  async probe() {
    const r = await exec(BLENDER, ["--version"], 20);
    return r.code === 0 ? { ok: true, why: firstLine(r.stdout) } : { ok: false, why: `blender not runnable: ${firstLine(r.stderr)}` };
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    const out = `${input.projectId}-${input.sceneId}.png`;
    const script = input.variant ?? "render_scene.py";
    const args = ["-b", ...input.inputs, "-P", script, "-o", out, "-f", "1"];
    const r = await exec(BLENDER, args, input.timeoutSeconds);
    return {
      state: r.code === 0 ? "succeeded" : "failed",
      outputs: r.code === 0 ? [out] : [],
      wallClockSeconds: (Date.now() - started) / 1000,
      usdSpent: 0,
      reproducible: { binary: BLENDER, args },
      log: r.code === 0 ? firstLine(r.stdout) : tail(r.stderr, 800),
    };
  },
};

export const whisperDriver: ToolDriver = {
  toolId: "whisper",
  depth: "drivable",
  record: R({
    name: "Whisper",
    category: "subtitle",
    officialUrl: "https://openai.com/research/whisper",
    sourceRepository: "https://github.com/openai/whisper",
    license: "MIT (code); model weights licence recorded separately",
    licenseVerified: false,
    selfHosting: true,
    localExecution: true,
    apiAvailable: true,
    hardware: "GPU recommended for long reels; CPU viable for small models",
    integrationMethod: "cli",
    cost: "$0",
    capability: "transcription and burned-in subtitle generation, fully offline",
    priority: "now",
    replacementOptions: ["whisper.cpp", "Vosk", "faster-whisper", "AudaCity + manual SRT"],
    dataPortability: "output is plain SRT/VTT text",
  }),
  runsOn: "creator-machine",

  async probe() {
    const r = await exec(WHISPER, ["--help"], 15, whisperEnv());
    return r.code === 0 ? { ok: true, why: "whisper CLI present" } : { ok: false, why: `whisper not runnable: ${firstLine(r.stderr)}` };
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    const source = input.inputs[0] ?? "";
    if (!source) {
      return {
        state: "failed",
        outputs: [],
        wallClockSeconds: 0,
        usdSpent: 0,
        reproducible: { binary: WHISPER },
        log: "no audio to transcribe: hand whisper a file with the line already spoken",
      };
    }
    // This CLI writes into a directory and names the file after the input. It has no
    // --output_file flag, so the earlier version of this driver passed a flag it never
    // accepted and every transcription died on argparse while the probe still said UP.
    const outDir = path.resolve(OUT, "subtitles");
    mkdirSync(outDir, { recursive: true });
    const args = [source, "--output_dir", outDir, "--output_format", "srt", "--model", input.variant ?? "small"];
    const r = await exec(WHISPER, args, input.timeoutSeconds, whisperEnv());
    const produced = path.join(outDir, `${path.basename(source).replace(/\.[^.]+$/, "")}.srt`);
    const wrote = r.code === 0 && existsSync(produced);
    return {
      state: wrote ? "succeeded" : "failed",
      outputs: wrote ? [produced] : [],
      wallClockSeconds: (Date.now() - started) / 1000,
      usdSpent: 0,
      reproducible: { binary: WHISPER, args },
      log: wrote ? `transcribed ${source} to ${produced}` : tail(r.stderr, 800),
    };
  },
};
