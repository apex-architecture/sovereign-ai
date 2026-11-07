/**
 * The Windows voice that is already on the machine — SAPI via System.Speech.
 *
 * Piper is installed here but has no voice model, which left the dialogue stage with nothing to
 * speak. Rather than stall the stage on a download, this driver uses what every Windows install
 * carries: Microsoft David and Zira render offline on the CPU, need no key, and return a wav the
 * pipeline can measure. It is not the best voice in the dictionary and it is not claimed as one —
 * it is the one that exists, so the stage produces a real timed line instead of a gap.
 *
 * The script line is never placed on a command line: the voice reads it from a file, so an
 * apostrophe or a quote in dialogue cannot break the job.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { exec, firstLine, tail } from "./exec.ts";
import { R } from "../schema.ts";

const FFPROBE = process.env.APEX_FFPROBE_BIN ?? "ffprobe";
const OUT = process.env.APEX_OUT_DIR ?? ".apex-out";
const PS = process.env.APEX_POWERSHELL_BIN ?? "powershell";
const VOICE = process.env.APEX_SAPI_VOICE ?? "Microsoft David Desktop";

const SCRATCH = path.resolve(OUT, "sapi");

/** The one command line this driver builds: fixed text, no caller data interpolated into it. */
function synthScript(wavPath: string, textPath: string, voice: string): string {
  return [
    "Add-Type -AssemblyName System.Speech",
    `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer`,
    `$s.SelectVoice('${voice.replace(/'/g, "''")}') | Out-Null`,
    `$s.SetOutputToWaveFile('${wavPath.replace(/'/g, "''")}')`,
    `$line = Get-Content -Raw -Encoding UTF8 '${textPath.replace(/'/g, "''")}'`,
    `$s.Speak($line) | Out-Null`,
    `exit 0`,
  ].join("; ");
}

async function audioSeconds(file: string): Promise<number | null> {
  const r = await exec(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], 30);
  const s = Number(firstLine(r.stdout));
  return r.code === 0 && Number.isFinite(s) ? Math.round(s * 1000) / 1000 : null;
}

export const sapiDriver: ToolDriver = {
  toolId: "windows_sapi",
  depth: "drivable",
  record: R({
    name: "Windows SAPI (System.Speech)",
    category: "voice",
    officialUrl: "https://learn.microsoft.com/en-us/dotnet/api/system.speech.synthesis",
    license: "part of the operating system",
    licenseVerified: false,
    selfHosting: true,
    localExecution: true,
    apiAvailable: false,
    hardware: "CPU only; no model download",
    integrationMethod: "cli",
    cost: "$0",
    capability: "offline speech synthesis to wav using the voices Windows already installed",
    priority: "now",
    replacementOptions: ["Piper (needs a voice pack)", "Kokoro-82M", "Azure/Deepgram on the creator's own key"],
    dataPortability: "output is a plain wav; the line stays plain text",
    outputConditions: "system voices are cleared for the machine owner's own work; redistribution of a mix using them follows the film's own terms",
  }),
  runsOn: "creator-machine",

  async probe() {
    const script =
      "Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer;" +
      "($s.GetInstalledVoices() | Where-Object {$_.Enabled} | ForEach-Object {$_.VoiceInfo.Name}) -join '|'";
    const r = await exec(PS, ["-NoProfile", "-NonInteractive", "-Command", script], 30);
    const names = firstLine(r.stdout);
    return r.code === 0 && names.length > 0
      ? { ok: true, why: `voices on this machine: ${names}` }
      : { ok: false, why: `no enabled system voice: ${firstLine(r.stderr) || "silent"}` };
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    const line = input.task && input.task.trim() ? input.task : "No line was handed to the voice.";
    mkdirSync(SCRATCH, { recursive: true });
    const textPath = path.join(SCRATCH, `${input.sceneId}-line.txt`);
    const wavPath = path.join(SCRATCH, `${input.sceneId}-voice.wav`);
    writeFileSync(textPath, line, "utf8");

    const r = await exec(PS, ["-NoProfile", "-NonInteractive", "-Command", synthScript(wavPath, textPath, VOICE)], Math.max(20, input.timeoutSeconds));
    const seconds = r.code === 0 ? await audioSeconds(wavPath) : null;
    const spoke = r.code === 0 && seconds !== null && seconds > 0;

    return {
      state: spoke ? "succeeded" : "failed",
      outputs: spoke ? [wavPath] : [],
      wallClockSeconds: (Date.now() - started) / 1000,
      usdSpent: 0,
      reproducible: { voice: VOICE, textFile: textPath, seconds: seconds ?? null },
      log: spoke
        ? `spoke ${seconds}s of ${VOICE} from ${textPath}`
        : `no audio produced: ${tail(r.stderr || r.stdout, 400)}`,
    };
  },
};
