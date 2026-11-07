/**
 * Measures the studio: the real films this machine has actually made.
 *
 *   node --experimental-strip-types scripts/studio-data.mjs
 *
 * The dashboard on the rail is a printout of this file. Every duration, byte count, hash,
 * gate verdict and licence count below is read off disk or out of the platform's own source
 * in this run — none of it is typed by hand. The only things written by hand here are the
 * *paths* to real artefacts and their titles; if a file is missing, the card says the file
 * is missing instead of inventing a number for it.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { siteDir, hasRuns } from "./site-dir.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = siteDir(ROOT);
const ASSETS = path.join(SITE, "assets", "studio");
const APEX = path.join(ROOT, "src", "lib", "apex");
const url = (rel) => pathToFileURL(path.join(APEX, rel)).href;

/* ------------------------------------------------------------------ helpers */

function ffprobe(args, file) {
  try {
    return execFileSync("ffprobe", ["-v", "error", ...args, file], { encoding: "utf8", maxBuffer: 1 << 24 }).trim();
  } catch {
    return "";
  }
}
function ffmpeg(args) {
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
    return true;
  } catch {
    return false;
  }
}
function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}
function rel(p) {
  return path.relative(SITE, p).split(path.sep).join("/");
}

/** The picture's own size, read back off the file — never declared by hand. */
function sizeOf(file) {
  const [w, h] = ffprobe(["-show_entries", "stream=width,height", "-of", "csv=p=0"], file).split(/[,\s]+/);
  return { width: Number(w) || null, height: Number(h) || null };
}
function secondsOf(file) {
  return Number(ffprobe(["-show_entries", "format=duration", "-of", "csv=p=0"], file)) || 0;
}
function hasAudio(file) {
  return ffprobe(["-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "csv=p=0"], file) !== "";
}

/**
 * One frame, taken mid-shot rather than at the tail: a cut to black at the end of a clip
 * would photograph as a black square, and a black square is a lie about the film.
 */
function poster(file, out, seconds) {
  const at = Math.max(0, Math.min(seconds > 6 ? seconds * 0.62 : seconds * 0.5, Math.max(0, seconds - 0.15)));
  const ok = ffmpeg(["-ss", at.toFixed(3), "-i", file, "-frames:v", "1", "-vf", "scale=720:-2", "-q:v", "4", out]);
  if (!ok || !existsSync(out)) return null;
  const { width, height } = sizeOf(out);
  return { img: rel(out), at: Number(at.toFixed(2)), bytes: statSync(out).size, width, height };
}

/* ------------------------------------------------- the real artefacts shown */

/**
 * The films that exist. Each entry is a path on this machine; the measurements come from
 * ffprobe and the hash from the bytes themselves.
 */
const SHOWCASE = [
  {
    id: "desk-keeper",
    file: "runs/2026-11-04T22-11-56/desk-motion-shot01.mp4",
    title: "Desk Render — The Keeper's Stair",
    kind: "Shot",
    clip: true,
  },
  {
    id: "desk-lighthouse",
    file: "runs/2026-11-04T09-24-37/desk-motion-shot01.mp4",
    title: "Desk Render — Lighthouse",
    kind: "Shot",
    clip: true,
  },
  {
    id: "film01-master",
    file: "runs/2026-11-02T10-10/film01-finish-scene01.mp4",
    title: "Film 01 — Rooftop Cut",
    kind: "Master",
    qc: "runs/2026-11-02T10-10/qc.json",
  },
  {
    id: "film01-delivery",
    file: ".apex-out/publish-check/scene-001/master.mp4",
    title: "Film 01 — Delivery Package",
    kind: "Delivery",
    receipt: ".apex-out/publish-check/scene-001/receipt.json",
  },
  {
    id: "film01-motion-01",
    file: "runs/2026-11-03T09-40/film01-motion-shot01.mp4",
    title: "Film 01 — Motion Shot 01",
    kind: "Shot",
    run: "runs/2026-11-03T09-40/run.json",
  },
  {
    id: "grade-gentle",
    file: "runs/craft-gentle.mp4",
    title: "Grade Study — Gentle",
    kind: "Look test",
  },
  {
    id: "grade-full",
    file: "runs/craft-full.mp4",
    title: "Grade Study — Full",
    kind: "Look test",
  },
];

/* ------------------------------------------------------------------ read in */

/**
 * A clone of the open core has no films on this machine, so there is nothing to measure.
 * The published `studio.data.js` and its poster frames are the authoring machine's measurement,
 * carried in the repo as a snapshot — overwriting them with an empty set would delete the
 * record of films that really were made. So the script stops here rather than lie.
 */
if (!hasRuns(ROOT)) {
  console.log("skip  studio.data.js — this checkout has no runs/ directory, so nothing on it was measured.");
  console.log("      The published measurement in the repo is left untouched.");
  console.log("      Make a film here, or run this on the machine that made them.");
  process.exit(0);
}

mkdirSync(ASSETS, { recursive: true });
// A frame left behind by an older run is a lie about the current one.
for (const f of (await import("node:fs")).readdirSync(ASSETS)) {
  if (f.endsWith(".jpg")) rmSync(path.join(ASSETS, f), { force: true });
}

const projects = [];
for (const s of SHOWCASE) {
  const abs = path.join(ROOT, s.file);
  if (!existsSync(abs)) {
    projects.push({ ...s, present: false, poster: null });
    continue;
  }
  const bytes = statSync(abs).size;
  const seconds = secondsOf(abs);
  const size = sizeOf(abs);
  const still = poster(abs, path.join(ASSETS, `${s.id}.jpg`), seconds);

  // A clip the visitor can actually play, copied beside its poster. The dashboard shows a file
  // the machine rendered; this is the same file, not a picture of one.
  let video = null;
  if (s.clip) {
    const dest = path.join(ASSETS, `${s.id}.mp4`);
    copyFileSync(abs, dest);
    video = `assets/studio/${s.id}.mp4`;
  }

  let badge = { label: "No receipt", cls: "", note: "nothing has sealed this file yet" };
  if (s.receipt && existsSync(path.join(ROOT, s.receipt))) {
    const r = JSON.parse(readFileSync(path.join(ROOT, s.receipt), "utf8"));
    badge = {
      label: "Receipted",
      cls: "ok",
      note: `receipt ${r.deliveredAt} · source ${r.source?.sha256?.slice(0, 12)}`,
    };
  } else if (s.qc && existsSync(path.join(ROOT, s.qc))) {
    const q = JSON.parse(readFileSync(path.join(ROOT, s.qc), "utf8"));
    const g = q.summary ?? {};
    badge = {
      label: g.verdict === "not-deliverable" ? "QC failed" : "QC passed",
      cls: g.verdict === "not-deliverable" ? "bad" : "ok",
      note: `${g.passed}/${g.gates} gates passed · measured ${q.measured_at}`,
    };
  }

  projects.push({
    ...s,
    present: true,
    bytes,
    seconds,
    width: size.width,
    height: size.height,
    audio: hasAudio(abs),
    sha256: sha256(abs),
    poster: still,
    video,
    badge,
  });
}

/* --------------------------------------------------- the run that made them */

function readJson(relPath) {
  const p = path.join(ROOT, relPath);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}

/** The last run that produced a master — the one whose stage chain the workflow shows. */
const runDirs = (await import("node:fs"))
  .readdirSync(path.join(ROOT, "runs"))
  .filter((d) => existsSync(path.join(ROOT, "runs", d, "run.json")))
  .sort();
let run = null;
for (const d of [...runDirs].reverse()) {
  const sheet = readJson(path.join("runs", d, "run.json"));
  if (sheet?.master) { run = { dir: d, sheet }; break; }
}

const stageStates = [];
if (run) {
  const seen = new Map();
  for (const r of run.sheet.rows ?? []) {
    const prev = seen.get(r.stage);
    if (!prev || r.state === "succeeded") {
      seen.set(r.stage, { stage: r.stage, state: r.state, used: r.used, tried: r.tried ?? [], note: r.note ?? "" });
    }
  }
  stageStates.push(...seen.values());
}

const receipt = (() => {
  const p = path.join(ROOT, ".apex-out", "publish-check", "scene-001", "receipt.json");
  if (!existsSync(p)) return null;
  const r = JSON.parse(readFileSync(p, "utf8"));
  return {
    project: r.project,
    deliveredAt: r.deliveredAt,
    sourceSha: r.source?.sha256 ?? null,
    sourceSeconds: r.source?.seconds ?? null,
    masterSha: r.master?.sha256 ?? null,
    masterBytes: r.master?.bytes ?? null,
    masterSeconds: r.master?.seconds ?? null,
    audio: r.master?.audio ?? null,
    segments: r.hls?.segments ?? null,
    segmentBytes: r.hls?.segmentBytes ?? null,
    hlsSha: r.hls?.sha256 ?? null,
  };
})();

const qc = (() => {
  const q = readJson("runs/2026-11-02T10-10/qc.json");
  if (!q) return null;
  return {
    file: q.file,
    bytes: q.bytes,
    duration: q.duration,
    fps: q.fps,
    frames: q.frames,
    measuredAt: q.measured_at,
    gates: q.summary?.gates ?? null,
    passed: q.summary?.passed ?? null,
    failed: q.summary?.failed ?? null,
    verdict: q.summary?.verdict ?? null,
    lufs: q.raw?.lufs ?? null,
    failures: (q.gates ?? []).filter((g) => !g.pass).map((g) => ({ label: g.label, measured: g.measured, limit: g.limit })),
  };
})();

/* -------------------------------------------------------- licences and money */

const { LICENCE_CLEARANCES } = await import(url("licence-clearances.ts"));
const clearances = Object.entries(LICENCE_CLEARANCES.clearances).map(([id, c]) => ({
  id,
  name: c.name,
  spdx: c.spdx,
  sha256: c.sha256,
  bytes: c.bytes,
  retrievedAt: c.retrievedAt,
  personalUse: c.personalUse,
  clientWork: c.clientWork,
  redistribute: c.redistribute,
  humanSignedBy: c.humanSignedBy,
  note: c.note,
}));

const spentUsd = run?.sheet?.totalUsdSpent ?? 0;

/* ------------------------------------------------------------------ write it */

const data = {
  generatedAt: new Date().toISOString(),
  projects,
  run: run
    ? {
        stamp: run.sheet.run,
        project: run.sheet.project,
        spentUsd,
        stagesNamed: run.sheet.stagesNamed ?? [],
        routed: run.sheet.routed ?? [],
        succeeded: run.sheet.succeeded ?? [],
        refused: run.sheet.refused ?? [],
        states: stageStates,
        master: run.sheet.master
          ? { file: path.basename(run.sheet.master.file), bytes: run.sheet.master.bytes, probe: run.sheet.master.probe ?? [] }
          : null,
      }
    : null,
  receipt,
  qc,
  licences: {
    policy: LICENCE_CLEARANCES.policy,
    generatedAt: LICENCE_CLEARANCES.generatedAt,
    total: clearances.length,
    personalUse: clearances.filter((c) => c.personalUse).length,
    clientWork: clearances.filter((c) => c.clientWork).length,
    redistribute: clearances.filter((c) => c.redistribute).length,
    humanSigned: clearances.filter((c) => c.humanSignedBy).length,
    items: clearances,
  },
};

writeFileSync(path.join(SITE, "studio.data.js"), "/* GENERATED by scripts/studio-data.mjs — do not edit. */\nwindow.APEX_STUDIO = " + JSON.stringify(data) + ";\n");

const present = projects.filter((p) => p.present);
console.log(`ok    studio.data.js  ${present.length}/${projects.length} real artefacts measured`);
for (const p of present) {
  console.log(
    `      ${p.id.padEnd(18)} ${String(p.seconds).padStart(7)}s  ${p.width}x${p.height}  ${String(p.bytes).padStart(10)} B  ${p.poster?.img ?? "no frame"}  ${p.badge.label}`,
  );
}
console.log(`ok    run ${data.run?.stamp ?? "—"} · ${data.run?.succeeded.length ?? 0} stage jobs succeeded · $${spentUsd} spent`);
console.log(`ok    licences: ${data.licences.personalUse} personal-use attested, ${data.licences.clientWork} cleared for client work`);
console.log(`ok    receipt: ${receipt ? receipt.deliveredAt + " · " + receipt.segments + " HLS segments" : "none"}`);
console.log(`ok    qc: ${qc ? `${qc.passed}/${qc.gates} gates · ${qc.verdict}` : "none"}`);
