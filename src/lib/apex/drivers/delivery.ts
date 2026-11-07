/**
 * FFmpeg delivery — the last stage, run on the creator's own machine.
 *
 * Publishing used to be a portal link and nothing else: the road ended at a browser tab. This
 * driver takes the finished master and produces the two artefacts a distributor actually asks
 * for — a faststart H.264/AAC mezzanine and an HLS ladder — plus a sha256 receipt for every byte,
 * so a finished film can leave this machine without an account and be proven identical later.
 *
 * It does not upload anywhere. Uploading needs an account, and an account is the creator's.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { JobInput, JobResult, ToolDriver } from "./contract.ts";
import { exec, firstLine, tail } from "./exec.ts";
import { R } from "../schema.ts";

const FFMPEG = process.env.APEX_FFMPEG_BIN ?? "ffmpeg";
const FFPROBE = process.env.APEX_FFPROBE_BIN ?? "ffprobe";
const OUT = process.env.APEX_OUT_DIR ?? ".apex-out";

interface Probe {
  seconds: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
}

async function probeMedia(file: string): Promise<Probe> {
  const r = await exec(
    FFPROBE,
    ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "default=nw=1", file],
    30,
  );
  if (r.code !== 0) return { seconds: null, hasVideo: false, hasAudio: false };
  const seconds = Number(/duration=([\d.]+)/.exec(r.stdout)?.[1]);
  return {
    seconds: Number.isFinite(seconds) ? Math.round(seconds * 1000) / 1000 : null,
    hasVideo: /codec_type=video/.test(r.stdout),
    hasAudio: /codec_type=audio/.test(r.stdout),
  };
}

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export const deliveryDriver: ToolDriver = {
  toolId: "ffmpeg-delivery",
  depth: "drivable",
  record: R({
    name: "FFmpeg delivery packager",
    category: "video-finishing",
    officialUrl: "https://ffmpeg.org",
    sourceRepository: "https://git.ffmpeg.org/ffmpeg.git",
    license: "LGPL-2.1+ / GPL-2.0+ depending on build options",
    licenseVerified: false,
    selfHosting: true,
    localExecution: true,
    apiAvailable: false,
    hardware: "any CPU; NVENC/QSV/AMF when present",
    integrationMethod: "cli",
    cost: "$0",
    capability: "faststart mezzanine, HLS segmentation, stream copy, sha256 receipts",
    priority: "now",
    replacementOptions: ["Shaka Packager", "GPAC/MP4Box", "MKVToolNix"],
    dataPortability: "both outputs are plain MP4/TS files; the receipt is JSON",
  }),
  runsOn: "creator-machine",

  async probe() {
    const r = await exec(FFMPEG, ["-version"], 10);
    if (r.code !== 0) return { ok: false, why: `ffmpeg not runnable: ${firstLine(r.stderr) || `exit ${r.code}`}` };
    const p = await exec(FFPROBE, ["-version"], 10);
    if (p.code !== 0) return { ok: false, why: "ffmpeg is present but ffprobe is not, so duration cannot be measured" };
    return { ok: true, why: `${firstLine(r.stdout)} · ${firstLine(p.stdout)}` };
  },

  async run(input: JobInput): Promise<JobResult> {
    const started = Date.now();
    const src = input.inputs[0];
    const dir = path.join(OUT, input.projectId, input.sceneId || "delivery");
    const hlsDir = path.join(dir, "hls");
    const master = path.join(dir, "master.mp4");
    const playlist = path.join(hlsDir, "index.m3u8");
    const receipt = path.join(dir, "receipt.json");
    const fail = (log: string, reproducible: Record<string, unknown> = {}): JobResult => ({
      state: "failed",
      outputs: [],
      wallClockSeconds: Math.round(((Date.now() - started) / 1000) * 100) / 100,
      usdSpent: 0,
      reproducible,
      log,
    });

    if (!src || !existsSync(src)) return fail(`no finished master to deliver — input ${src ?? "(none)"} does not exist`);
    const source = await probeMedia(src);
    if (!source.hasVideo) return fail(`${src} carries no video stream, so there is nothing a distributor could publish`);
    if (!source.seconds || source.seconds <= 0) return fail(`ffprobe could not measure a duration in ${src}; refusing to package a file of unknown length`);

    try {
      mkdirSync(hlsDir, { recursive: true });
    } catch (e) {
      return fail(`could not create ${hlsDir}: ${String(e)}`);
    }

    // The mezzanine is re-encoded rather than copied: a distributor's first question is whether the
    // file plays from the first byte, and faststart needs the moov atom moved before the media.
    const masterArgs = [
      "-y", "-i", src,
      "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      master,
    ];
    const m = await exec(FFMPEG, masterArgs, input.timeoutSeconds);
    if (m.code !== 0) return fail(tail(m.stderr, 1200), { master: [FFMPEG, ...masterArgs] });
    const packaged = await probeMedia(master);
    if (!packaged.hasVideo || !packaged.seconds) return fail(`master written but unreadable: ${tail(m.stderr, 600)}`);

    // HLS is a stream copy of the mezzanine: same bits, cut into 4-second segments. Re-encoding here
    // would double the wall clock and hand back a different film than the one that was proved.
    const hlsArgs = [
      "-y", "-i", master,
      "-c", "copy",
      "-f", "hls", "-hls_time", "4", "-hls_playlist_type", "vod",
      "-hls_segment_filename", path.join(hlsDir, "seg%03d.ts"),
      playlist,
    ];
    const h = await exec(FFMPEG, hlsArgs, input.timeoutSeconds);
    if (h.code !== 0) return fail(tail(h.stderr, 1200), { master: [FFMPEG, ...masterArgs], hls: [FFMPEG, ...hlsArgs] });

    const segments = readdirSize(hlsDir).filter((f) => f.name.endsWith(".ts"));
    const receiptBody = {
      project: input.projectId,
      scene: input.sceneId,
      source: { path: src, sha256: sha256(src), seconds: source.seconds, audio: source.hasAudio },
      deliveredAt: new Date().toISOString(),
      master: { path: master, bytes: statSync(master).size, sha256: sha256(master), seconds: packaged.seconds, audio: packaged.hasAudio },
      hls: { path: playlist, sha256: sha256(playlist), segments: segments.length, segmentBytes: segments.reduce((n, s) => n + s.bytes, 0) },
      commands: { master: [FFMPEG, ...masterArgs], hls: [FFMPEG, ...hlsArgs] },
      note: "Not uploaded. Distribution is the creator's account, on the creator's key.",
    };
    writeFileSync(receipt, `${JSON.stringify(receiptBody, null, 2)}\n`, "utf8");

    return {
      state: "succeeded",
      outputs: [master, playlist, receipt],
      wallClockSeconds: Math.round(((Date.now() - started) / 1000) * 100) / 100,
      usdSpent: 0,
      reproducible: {
        master: [FFMPEG, ...masterArgs],
        hls: [FFMPEG, ...hlsArgs],
        masterSha256: receiptBody.master.sha256,
        segments: segments.length,
        audioInMaster: packaged.hasAudio,
      },
      log:
        `${packaged.seconds}s master (${(receiptBody.master.bytes / 1048576).toFixed(1)} MB, ${packaged.hasAudio ? "with sound" : "silent"})` +
        ` + ${segments.length} HLS segments · sha256 ${receiptBody.master.sha256.slice(0, 16)}…`,
    };
  },
};

function readdirSize(dir: string): { name: string; bytes: number }[] {
  return readdirSync(dir).map((name) => ({ name, bytes: statSync(path.join(dir, name)).size }));
}
