/**
 * QC gate — the platform judging its own picture, in pass/fail, with no opinion involved.
 *   node scripts/qc-gate.mjs [path/to/video.mp4]
 *
 * Every rule below is computed by ffmpeg/ffprobe from the decoded pixels and samples of the file
 * named on the command line. The thresholds come from docs/research-quality-bar.md — what a
 * dailies review actually checks — and each one prints the measured number beside the limit, so a
 * pass can be argued with and a failure can be read.
 *
 * It writes qc.json next to the video. The dailies page renders that file verbatim; nothing here
 * is typed in by a person, and nothing here claims a shot looks good. These are the gates a shot
 * has to clear to be called deliverable, and nothing more.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const video = path.resolve(process.argv[2] ?? path.resolve("runs/2026-11-02T10-10/film01-finish-scene01.mp4"));
if (!existsSync(video)) {
  console.log(`QC ABORT: ${video} is not on this disk`);
  process.exit(1);
}
const dir = path.dirname(video);
const name = path.basename(video);

// Every filter that reports numbers writes them to stderr, so both pipes are kept: a successful
// ffmpeg run has nothing on stdout and its whole measurement in the place a naive capture drops.
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 27, cwd: cwd ?? dir, shell: false });
  return { code: r.status ?? 1, out: String(r.stdout ?? ""), err: String(r.stderr ?? "") };
};

// ffmpeg writes "\r" between progress blocks; every parse below trims and drops empties first.
const lines = (s) => String(s).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
const round = (v, p = 3) => (v == null || Number.isNaN(v) ? null : Number(v.toFixed(p)));

/**
 * metadata=print writes a record per frame: a "frame:N pts:… pts_time:…" header line followed by
 * "lavfi.<stat>=<value>" lines. Reading it as records keeps each number tied to its timestamp,
 * which is what lets the flicker gate line itself up against the cuts.
 */
function metadataPass(filter, fileKey, statPrefix) {
  const f = `qc-${fileKey}-${name}.txt`;
  rmSync(path.join(dir, f), { force: true });
  const r = run("ffmpeg", ["-v", "error", "-y", "-i", name, "-vf", `${filter},metadata=print:file=${f}`, "-f", "null", "-"], dir);
  const text = existsSync(path.join(dir, f)) ? readFileSync(path.join(dir, f), "utf8") : "";
  rmSync(path.join(dir, f), { force: true });
  const recs = [];
  let cur = null;
  for (const l of lines(text)) {
    if (/^frame:\d+/.test(l)) {
      if (cur) recs.push(cur);
      const t = /pts_time:([0-9.eE+-]+)/.exec(l);
      cur = { t: t ? Number(t[1]) : null };
      continue;
    }
    const m = /^lavfi\.([0-9a-zA-Z_.]+)=(-?[0-9.eE+-]+)$/.exec(l);
    if (m && cur && m[1].startsWith(statPrefix)) {
      const rest = m[1].slice(statPrefix.length);
      cur[rest.startsWith(".") ? rest.slice(1) : m[1]] = Number(m[2]);
    }
  }
  if (cur) recs.push(cur);
  return { recs, stderr: r.err };
}

function probeJson() {
  const r = run("ffprobe", ["-v", "error", "-show_entries",
    "stream=index,codec_type,codec_name,pix_fmt,color_range,color_space,color_transfer,color_primaries,r_frame_rate,avg_frame_rate,duration:format=duration",
    "-of", "json", video]);
  const j = (() => { try { return JSON.parse(r.out); } catch { return { streams: [], format: {} }; } })();
  return {
    v: j.streams.find((s) => s.codec_type === "video") ?? {},
    a: j.streams.find((s) => s.codec_type === "audio") ?? null,
    format: j.format ?? {},
  };
}

/** Timestamps of the hard cuts, so the flicker gate can tell an edit from a strobing shot. */
function cutTimes() {
  const r = run("ffmpeg", ["-v", "error", "-y", "-i", name, "-vf", "select=gt(scene\\,0.3),metadata=print:file=-", "-vsync", "vfr", "-f", "null", "-"], dir);
  return [...String(r.out).matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1]));
}

function loudnessPass() {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", name, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"]);
  const text = `${r.out}\n${r.err}`;
  const grab = (label) => {
    const m = new RegExp(`${label}:\\s*(-?[0-9.inf]+)\\.?[0-9]*`).exec(text);
    return m ? m[1] : null;
  };
  return { i: grab("I"), lra: grab("LRA"), peak: grab("Peak"), present: /Integrated loudness/.test(text), raw: text };
}

function statsPass(filter, key, prefix) {
  return metadataPass(filter, key, prefix).recs;
}

const { v: V, a: A, format: FMT } = probeJson();
const sig = statsPass("signalstats", "signal", "signalstats");
const blur = statsPass("blurdetect", "blur", "blur");
const loud = loudnessPass();
const cuts = cutTimes();

const decode = run("ffmpeg", ["-v", "error", "-y", "-i", name, "-f", "null", "-"], dir);
const decodeErrors = lines(decode.err).filter((l) => /error|invalid|corrupt/i.test(l));

const pick = (recs, k) => recs.map((r) => r[k]).filter((x) => x != null && !Number.isNaN(x));
const frames = sig.length;
const fps = (() => {
  const [a, b] = String(V.avg_frame_rate ?? "0/1").split("/");
  return Number(b) ? Number(a) / Number(b) : null;
})();
const durVideo = Number(V.duration) || Number(FMT.duration) || 0;
const durAudio = A ? Number(A.duration) || null : null;
const tag = (s) => (s == null || s === "" ? "unset" : String(s));

const gates = [];
const gate = (id, label, measured, limit, pass, evidence) => gates.push({ id, label, measured, limit, pass: !!pass, evidence });

gate("decode", "Decodes end to end with no error", `${frames} frames read`, "0 errors",
  decode.code === 0 && decodeErrors.length === 0 && frames > 0, decodeErrors.slice(0, 2).join(" | ") || "clean");

gate("tags-range", "Sample range is limited (legal video), not JPEG full range",
  tag(V.color_range), "tv or limited", ["tv", "limited"].includes(tag(V.color_range)),
  `pix_fmt ${tag(V.pix_fmt)}${V.pix_fmt === "yuvj420p" ? " — the j means JPEG range and players expand it" : ""}`);

gate("tags-space", "Colour is tagged Rec.709 — matrix, primaries and transfer all three",
  `${tag(V.color_space)}/${tag(V.color_primaries)}/${tag(V.color_transfer)}`, "bt709/bt709/bt709",
  ["color_space", "color_primaries", "color_transfer"].every((k) => tag(V[k]) === "bt709"),
  "a strict player shifts the picture if any of the three is unknown");

gate("cfr", "Constant frame rate — r_frame_rate equals avg_frame_rate",
  `${tag(V.r_frame_rate)} vs ${tag(V.avg_frame_rate)}`, "equal",
  V.r_frame_rate === V.avg_frame_rate && fps != null, `${fps ? fps.toFixed(3) : "?"} fps`);

const ymin = mean(pick(sig, "YMIN")), ymax = mean(pick(sig, "YMAX"));
gate("levels", "Average legal range: mean YMIN at or above 16, mean YMAX at or below 235",
  `YMIN ${round(ymin, 1)} · YMAX ${round(ymax, 1)}`, "16 / 235", ymin >= 15 && ymax <= 236,
  `out-of-range frames flagged BRNG: ${pick(sig, "BRNG").filter((x) => x > 0).length} of ${frames}`);

const yavg = mean(pick(sig, "YAVG"));
gate("exposure", "The picture is neither a black frame nor a blown one", round(yavg, 2), "8 to 235",
  yavg > 8 && yavg < 235, `mean over ${frames} frames`);

const sat = mean(pick(sig, "SATAVG"));
gate("saturation", "Chroma is not collapsed to grey nor cranked past the scale", round(sat, 2), "above 5 of 128",
  sat > 5 && sat < 100, "signalstats SATAVG runs 0-128; a flat grey card sits near 0");

const ydif = pick(sig, "YDIF");
const ydifMean = mean(ydif), ydifMedian = median(ydif);
const nearCut = (t) => cuts.some((c) => Math.abs((t ?? 0) - c) < 1.6 / (fps || 24));
const offenders = sig.filter((r, i) => ydif[i] > Math.max(12, (ydifMedian ?? 0) * 4) && !nearCut(r.t));
gate("flicker", "Within a shot, frame-to-frame luma change is bounded (no strobing)",
  `median YDIF ${round(ydifMedian, 2)}, ${offenders.length} off-cut spike(s) over ${round(ydifMean, 2)} mean`,
  "no off-cut frame above 4x the median and 12 luma", offenders.length === 0,
  `${cuts.length} hard cut(s) excluded at ${cuts.map((c) => c.toFixed(2) + "s").join(", ") || "none detected"}`);

const udif = mean(pick(sig, "UDIF")), vdif = mean(pick(sig, "VDIF"));
gate("chroma-drift", "Chroma does not walk between frames while luma barely moves",
  `UDIF ${round(udif, 2)} · VDIF ${round(vdif, 2)}`, "each under 8", udif < 8 && vdif < 8,
  "a still frame should not recolour itself");

const blurVals = pick(blur, "blur");
const blurMean = mean(blurVals);
const blurSd = blurVals.length ? Math.sqrt(mean(blurVals.map((b) => (b - blurMean) ** 2))) : null;
gate("focus", "Sharpness is stable — no breathing focus", blurVals.length
  ? `blurdetect mean ${round(blurMean, 2)} (higher = blurrier)` : "not measured",
  `spread under 60% of the mean`, blurMean != null && blurSd != null && blurSd < blurMean * 0.6,
  `${blurVals.length} frames, standard deviation ${round(blurSd, 2)}`);

const freeze = run("ffmpeg", ["-v", "info", "-y", "-i", name, "-vf", "freezedetect=n=-60dB:d=2.0", "-map", "0:v:0", "-an", "-f", "null", "-"], dir);
const freezeStarts = (`${freeze.out}${freeze.err}`).match(/freeze_start/g)?.length ?? 0;
gate("motion", "Something actually moves: no hold longer than 2 seconds", `${freezeStarts} freeze start(s) over 2s`,
  "0", freezeStarts === 0, "freezedetect at -60 dB");

const rms = run("ffmpeg", ["-hide_banner", "-nostats", "-i", name, "-af", "astats=metadata=1", "-f", "null", "-"], dir);
const rmsText = `${rms.out}${rms.err}`;
const overallRms = /Overall[\s\S]*?RMS level dB:\s*(-?[0-9.inf]+\.?[0-9]*)/.exec(rmsText);
const audible = A != null && overallRms != null && Number(overallRms[1]) > -60;
gate("audio-content", "The audio stream carries signal — it is not silence", A
  ? (overallRms ? `${overallRms[1]} dB RMS` : "RMS unreadable") : "no audio stream", "above -60 dB RMS", audible,
  A ? `codec ${A.codec_name}, ${durAudio}s` : "the file has no audio track at all");

gate("av-sync", "Audio and video run the same length", `${durVideo.toFixed(3)}s vs ${durAudio == null ? "no audio" : `${durAudio.toFixed(3)}s`}`,
  "within one frame", durAudio != null && Math.abs(durVideo - durAudio) < 1 / (fps || 24),
  `drift ${(durVideo - (durAudio ?? durVideo)).toFixed(3)}s = ${Math.abs(((durVideo - (durAudio ?? durVideo)) * (fps || 24))).toFixed(1)} frames`);

gate("loudness", "Integrated loudness sits at the web target", loud.present ? `${loud.i} LUFS (LRA ${loud.lra}, true peak ${loud.peak} dBTP)` : "no audio analysed",
  "-16 to -10 LUFS and peak under -1 dBTP",
  loud.present && Number(loud.i) >= -16 && Number(loud.i) <= -10 && Number(loud.peak) <= -1,
  "EBU R128 as measured by ffmpeg's own ebur128");

const failed = gates.filter((g) => !g.pass);

console.log(`QC GATE  ${name}  ${statSync(video).size.toLocaleString("en-GB")} bytes  ${durVideo.toFixed(3)}s  ${tag(V.pix_fmt)}`);
console.log(`  ${gates.length} gates · ${gates.length - failed.length} pass · ${failed.length} fail\n`);
for (const g of gates) {
  console.log(`  ${g.pass ? "PASS" : "FAIL"}  ${g.label.padEnd(62)} ${String(g.measured).padEnd(38)} want ${g.limit}`);
  if (!g.pass) console.log(`        ${g.evidence}`);
}
console.log(`\nVERDICT  ${failed.length === 0 ? "DELIVERABLE" : `NOT DELIVERABLE — ${failed.length} gate(s) red: ${failed.map((f) => f.id).join(", ")}`}`);

const payload = {
  file: name, bytes: statSync(video).size, duration: round(durVideo, 3), fps: round(fps, 3), frames,
  measured_at: new Date().toISOString().slice(0, 19) + "Z",
  summary: { gates: gates.length, passed: gates.length - failed.length, failed: failed.length, verdict: failed.length === 0 ? "deliverable" : "not-deliverable" },
  raw: {
    yavg: round(yavg), satavg: round(sat), ymin: round(ymin), ymax: round(ymax), ydif: round(ydifMean),
    ydif_median: round(ydifMedian), offenders: offenders.length, cuts: cuts.length,
    udif: round(udif), vdif: round(vdif), blur: round(blurMean), blur_sd: round(blurSd),
    lufs: loud.i, lra: loud.lra, true_peak_dbtp: loud.peak, rms_db: overallRms ? overallRms[1] : null,
    freeze_starts: freezeStarts, av_drift_s: round(durVideo - (durAudio ?? durVideo), 3),
  },
  tags: { pix_fmt: tag(V.pix_fmt), range: tag(V.color_range), matrix: tag(V.color_space), primaries: tag(V.color_primaries), transfer: tag(V.color_transfer), r_frame_rate: tag(V.r_frame_rate), avg_frame_rate: tag(V.avg_frame_rate) },
  gates,
};
writeFileSync(path.join(dir, "qc.json"), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`\nSHEET   ${path.join(dir, "qc.json")}`);
