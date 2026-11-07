/**
 * Piper — the offline voice the film pipeline can actually reach.
 *
 * The dictionary ranks far more voices than this, but a stage is only as real as the tool wired
 * to it. This driver speaks on a plain CPU at roughly real time, needs no account and no key,
 * and refuses up front when the voice model is not on the machine rather than producing silence
 * and calling it success.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { exec, firstLine, tail } from "./exec.ts";
import { R } from "../schema.ts";

const PIPER = process.env.APEX_PIPER_BIN ?? "piper";
const FFPROBE = process.env.APEX_FFPROBE_BIN ?? "ffprobe";
const OUT = process.env.APEX_OUT_DIR ?? ".apex-out";
const VOICE =
  process.env.APEX_PIPER_VOICE ??
  path.join(process.env.APEX_VOICES_DIR ?? "voices", "en_US-lessac-medium.onnx");

/** Seconds of audio in a rendered wav, read from the file itself rather than assumed. */
async function audioSeconds(file: string): Promise<number | null> {
  const r = await exec(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], 30);
  const s = Number(firstLine(r.stdout));
  return r.code === 0 && Number.isFinite(s) ? Math.round(s * 1000) / 1000 : null;
}

export const piperDriver: ToolDriver = {
  toolId: "piper",
  depth: "drivable",
  record: R({
    name: "Piper",
    category: "voice",
    officialUrl: "https://github.com/rhasspy/piper",
    sourceRepository: "https://github.com/rhasspy/piper",
    license: "MIT",
    licenseVerified: false,
    selfHosting: true,
    localExecution: true,
    apiAvailable: false,
    hardware: "CPU only, near real time; a GPU buys nothing here",
    integrationMethod: "cli",
    cost: "$0",
    capability: "offline text-to-speech, fixed pre-trained voices, dozens of languages",
    priority: "now",
    replacementOptions: ["Kokoro-82M", "CosyVoice 2", "OpenVoice V2", "Chatterbox"],
    dataPortability: "output is a plain 22 kHz mono wav; the script line is plain text",
    outputConditions: "per-voice models can carry their own terms — the voice pack is the licence to read, not the binary",
  }),
  runsOn: "creator-machine",

  async probe() {
    const r = await exec(PIPER, ["--help"], 20);
    if (r.code !== 0) return { ok: false, why: `piper not runnable: ${firstLine(r.stderr) || `exit ${r.code}`}` };
    if (!existsSync(VOICE)) return { ok: false, why: `piper is installed but no voice model at ${VOICE} — set APEX_PIPER_VOICE to a .onnx` };
    return { ok: true, why: `piper ready with ${path.basename(VOICE)}` };
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    const dir = path.join(OUT, input.projectId, input.sceneId || "dialogue");
    const line = path.join(dir, "line.txt");
    const wav = path.join(dir, "voice.wav");
    const voice = input.variant && input.variant.endsWith(".onnx") && existsSync(input.variant) ? input.variant : VOICE;
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(line, `${input.task.trim()}\n`, "utf8");
    } catch (e) {
      return { state: "failed", outputs: [], wallClockSeconds: 0, usdSpent: 0, reproducible: {}, log: `could not stage the line: ${String(e)}` };
    }
    if (!existsSync(voice)) {
      return {
        state: "failed",
        outputs: [],
        wallClockSeconds: 0,
        usdSpent: 0,
        reproducible: { binary: PIPER, voice },
        log: `no voice model at ${voice} — set APEX_PIPER_VOICE`,
      };
    }
    const args = ["-m", voice, ...(existsSync(`${voice}.json`) ? ["-c", `${voice}.json`] : []), "-i", line, "-f", wav];
    const r = await exec(PIPER, args, input.timeoutSeconds);
    const seconds = r.code === 0 ? await audioSeconds(wav) : null;
    const ok = r.code === 0 && seconds !== null && seconds > 0;
    return {
      state: ok ? "succeeded" : r.timedOut ? "timed-out" : "failed",
      outputs: ok ? [wav] : [],
      wallClockSeconds: Math.round(((Date.now() - started) / 1000) * 100) / 100,
      usdSpent: 0,
      reproducible: { binary: PIPER, args, voice, audioSeconds: seconds },
      log: ok
        ? `${seconds}s of speech from ${path.basename(voice)}`
        : tail(r.stderr || r.stdout, 800) || `piper exited ${r.code} without producing audio`,
    };
  },
};
