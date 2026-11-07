/**
 * Turns a run into web assets. The dailies page used to carry numbers a person typed in, which is
 * how a page drifts from the file it claims to show. This reads `runs/<stamp>/run.json`, pulls one
 * frame out of every artefact at a frame the eye lands on, measures each artefact with signalstats,
 * and writes `verse-site/dailies.data.js` plus the JPEGs — so the page is a printout of a run.
 *
 *   node scripts/dailies-site.mjs [runs/2026-11-02T10-01]
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "verse-site");
const ASSETS = path.join(SITE, "assets", "dailies");

function newestRun() {
  const dirs = readdirSync(path.join(ROOT, "runs"))
    .filter((d) => existsSync(path.join(ROOT, "runs", d, "run.json")))
    .sort();
  return dirs.length ? path.join(ROOT, "runs", dirs[dirs.length - 1]) : null;
}

const runDir = path.resolve(ROOT, process.argv[2] ?? newestRun() ?? "");
if (!existsSync(path.join(runDir, "run.json"))) {
  console.log(`ABORT: no run.json in ${runDir}`);
  process.exit(1);
}
const sheet = JSON.parse(readFileSync(path.join(runDir, "run.json"), "utf8"));
mkdirSync(ASSETS, { recursive: true });
// A frame left over from an older run is a lie about this one, so everything this script owns —
// plus the names older versions used — is deleted before anything is written.
const STALE_PREFIXES = ["stage-", "graded-", "plate-shot", "shot-shot", "finish-", "poster", "frame-at-", "subtitle-band", "preview", "dialogue.vtt", "compare-", "plate-0"];
for (const stale of readdirSync(ASSETS)) {
  if (STALE_PREFIXES.some((p) => stale.startsWith(p))) rmSync(path.join(ASSETS, stale), { force: true });
}

function ffprobe(args) {
  try { return execFileSync("ffprobe", ["-v", "error", ...args], { encoding: "utf8" }).trim(); } catch { return ""; }
}
/** ffprobe on Windows ends every line with CR; a CR in a printed value renders as a line break. */
const lines = (s) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
/** `cwd` matters: a stats filename passed to the metadata filter must not contain a colon. */
function ffmpeg(args, cwd) {
  try { execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26, ...(cwd ? { cwd } : {}) }); return true; }
  catch (e) { console.log(`  ffmpeg refused: ${String(e.stderr || e).split("\n").find(Boolean)}`); return false; }
}

/** Mean luma and mean saturation over every decoded frame — the same yardstick the driver uses. */
function measure(file) {
  const name = `web-stats-${path.basename(file)}.txt`;
  rmSync(path.join(runDir, name), { force: true });
  if (!ffmpeg(["-i", file, "-vf", `signalstats,metadata=print:file=${name}`, "-an", "-f", "null", "-"], runDir)) return null;
  const stats = path.join(runDir, name);
  if (!existsSync(stats)) return null;
  const text = readFileSync(stats, "utf8");
  rmSync(stats, { force: true });
  const y = [...text.matchAll(/YAVG=([0-9.]+)/g)].map((m) => +m[1]);
  const s = [...text.matchAll(/SATAVG=([0-9.]+)/g)].map((m) => +m[1]);
  if (!y.length) return null;
  const mean = (a) => a.reduce((x, v) => x + v, 0) / a.length;
  return { frames: y.length, yavg: Number(mean(y).toFixed(3)), satavg: Number(mean(s).toFixed(3)) };
}

function durOf(file) {
  return Number(ffprobe(["-show_entries", "format=duration", "-of", "csv=p=0", file]) || 0);
}

/** The picture's true size, read back off the file — so a page never declares a box the image is not. */
function sizeOf(file) {
  const [w, h] = ffprobe(["-show_entries", "stream=width,height", "-of", "csv=p=0", file]).split(/[,\s]+/);
  return { w: Number(w) || null, h: Number(h) || null };
}

/** Mid-shot, never the last frame: a cut to black at the tail would photograph as a black square. */
function pickT(file) {
  const dur = durOf(file) || 10;
  return Number((dur > 6 ? 8.2 : dur * 0.55).toFixed(2));
}

function frame(file, t, out, w = 1280) {
  const at = Math.max(0, Math.min(t, Math.max(0, durOf(file) - 0.15)));
  const ok = ffmpeg(["-ss", at.toFixed(3), "-i", file, "-frames:v", "1", "-vf", `scale=${w}:-2`, "-q:v", "3", out]);
  return ok && existsSync(out) ? { at: Number(at.toFixed(2)), bytes: statSync(out).size, ...sizeOf(out) } : null;
}

/** Left/right on one image, so the viewer compares the same second instead of remembering it.
 * Both sides are scaled to the same height first: hstack refuses mismatched inputs, and a plate
 * drawn at another aspect ratio is exactly the case this hits. */
function stack(left, right, out) {
  const ok = ffmpeg(["-i", left, "-i", right, "-filter_complex",
    "[0:v]scale=-2:360[a];[1:v]scale=-2:360[b];[a][b]hstack=inputs=2,scale=1280:-2,format=yuv420p",
    "-frames:v", "1", "-q:v", "3", out]);
  return ok && existsSync(out) ? statSync(out).size : null;
}

const rel = (p) => path.relative(SITE, p).split(path.sep).join("/");

const rows = (sheet.rows ?? []).map((r, i) => {
  const artifact = (r.outputs ?? []).find((f) => existsSync(path.join(runDir, f)));
  if (!artifact) {
    return { stage: r.stage, scene: r.scene, state: r.state, used: r.used, tried: r.tried, seconds: r.seconds, note: r.note, artifact: null, img: null };
  }
  const file = path.join(runDir, artifact);
  const isVideo = /\.(mp4|mov|m4v)$/i.test(artifact);
  const info = {
    name: artifact,
    bytes: statSync(file).size,
    probe: lines(ffprobe(["-show_entries", "format=duration:stream=codec_name,width,height", "-of", "default=noprint_wrappers=1", file])),
  };
  const out = { stage: r.stage, scene: r.scene, state: r.state, used: r.used, tried: r.tried, seconds: r.seconds, note: r.note, artifact: info };
  if (isVideo) {
    out.stats = measure(file);
    const still = path.join(ASSETS, `stage-${String(i).padStart(2, "0")}-${r.stage}-${r.scene}.jpg`);
    out.frame = frame(file, pickT(file), still);
    out.img = out.frame ? rel(still) : null;
  }
  return out;
});

// The one comparison that matters to a viewer: the same second before and after the finishing pass.
const pre = rows.find((r) => r.stage === "subtitles" && r.artifact);
const post = rows.find((r) => r.stage === "finish" && r.artifact);
let compare = null;
if (pre && post) {
  const a = path.join(ASSETS, "finish-before.jpg");
  const b = path.join(ASSETS, "finish-after.jpg");
  const pair = path.join(ASSETS, "finish-compare.jpg");
  const t = pickT(path.join(runDir, post.artifact.name));
  const fa = frame(path.join(runDir, pre.artifact.name), t, a);
  const fb = frame(path.join(runDir, post.artifact.name), t, b);
  if (fa && fb && stack(a, b, pair)) {
    compare = {
      at: t,
      img: rel(pair),
      ...sizeOf(pair),
      before: pre.stats,
      after: post.stats,
      dLuma: pre.stats && post.stats ? Number((((post.stats.yavg - pre.stats.yavg) / pre.stats.yavg) * 100).toFixed(2)) : null,
      dSat: pre.stats && post.stats ? Number((((post.stats.satavg - pre.stats.satavg) / pre.stats.satavg) * 100).toFixed(2)) : null,
    };
  }
  rmSync(a, { force: true });
  rmSync(b, { force: true });
}

// What the drawn plate looked like beside what the motion stage made of it — the visible half of
// the claim that a stage did something.
const shots = [];
for (const [n, plateName] of [["shot01", "plate-01.jpg"], ["shot02", "plate-02.jpg"]]) {
  const row = rows.find((r) => r.stage === "motion" && r.scene === n && r.artifact);
  const plate = path.join(runDir, plateName);
  if (!row || !existsSync(plate)) continue;
  const graded = path.join(ASSETS, `graded-${n}.jpg`);
  const pair = path.join(ASSETS, `shot-${n}-compare.jpg`);
  const file = path.join(runDir, row.artifact.name);
  const g = frame(file, pickT(file), graded);
  if (!g) continue;
  copyFileSync(plate, path.join(ASSETS, `plate-${n}.jpg`));
  if (stack(path.join(ASSETS, `plate-${n}.jpg`), graded, pair)) {
    shots.push({ scene: n, plate: `plate-${n}.jpg`, at: g.at, img: rel(pair), ...sizeOf(pair), stats: row.stats, artifact: row.artifact });
  }
}

// The burned line, cropped out of the delivered file, so a reader can check the words are in the
// picture and not in a caption layer a player can switch off.
let band = null;
if (pre) {
  const file = path.join(runDir, pre.artifact.name);
  const out = path.join(ASSETS, "subtitle-band.jpg");
  const t = pickT(file);
  const ok = ffmpeg(["-ss", t.toFixed(3), "-i", file, "-frames:v", "1", "-vf", "crop=iw:240:0:ih-260,scale=1280:-2", "-q:v", "3", out]);
  if (ok && existsSync(out)) band = { at: t, img: rel(out), bytes: statSync(out).size, ...sizeOf(out) };
}

// The web cut: small enough to open on a phone, from the same bytes as the archival master.
const masterName = sheet.master ? path.basename(sheet.master.file) : null;
let preview = null;
if (masterName && existsSync(path.join(runDir, masterName))) {
  const master = path.join(runDir, masterName);
  const clip = path.join(ASSETS, "preview.mp4");
  rmSync(clip, { force: true });
  const poster = path.join(ASSETS, "poster.jpg");
  rmSync(poster, { force: true });
  const posterFrame = frame(master, 2.0, poster);
  if (posterFrame) copyFileSync(poster, path.join(ASSETS, "frame-at-2s.jpg"));
  if (post?.img) copyFileSync(path.join(SITE, post.img), path.join(ASSETS, "frame-at-4s.jpg"));
  const ok = ffmpeg(["-i", master, "-vf", "scale=1280:-2", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", clip]);
  if (ok && existsSync(clip)) preview = { img: rel(clip), bytes: statSync(clip).size, fromBytes: statSync(master).size, poster: rel(poster), posterW: posterFrame?.w ?? null, posterH: posterFrame?.h ?? null, dur: durOf(clip) };
}

// A burned subtitle cannot be read by a screen reader, translated, or switched off. The same lines
// ship beside the file as WebVTT so the delivered clip is not the only place the words exist.
let captions = null;
if (existsSync(path.join(runDir, "dialogue.srt"))) {
  const srt = readFileSync(path.join(runDir, "dialogue.srt"), "utf8");
  const vtt = `WEBVTT\n\n${srt.replace(/\r/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
  writeFileSync(path.join(ASSETS, "dialogue.vtt"), vtt);
  captions = { img: rel(path.join(ASSETS, "dialogue.vtt")), lines: (vtt.match(/\n\n/g) || []).length - 1 };
}

const payload = {
  run: sheet.run,
  generated: new Date().toISOString().slice(0, 19) + "Z",
  project: sheet.project,
  plates: sheet.plates,
  stagesNamed: (sheet.stagesNamed ?? []).length,
  routed: (sheet.routed ?? []).length,
  spentUsd: sheet.totalUsdSpent,
  wallSeconds: Number(rows.reduce((a, r) => a + (r.seconds ?? 0), 0).toFixed(1)),
  produced: rows.filter((r) => r.state === "succeeded").length,
  refused: rows.filter((r) => r.state !== "succeeded").length,
  master: sheet.master ? { name: masterName, bytes: sheet.master.bytes, probe: sheet.master.probe } : null,
  // The platform's own verdict on the master, measured in the same run that made it.
  qc: sheet.qc ?? null,
  // The ranking that chose the engine before anything rendered, and the gap between what the road
  // ranked first and what the body under the run could actually drive.
  road: sheet.road ?? null,
  mission: sheet.mission ?? null,
  preview,
  captions,
  rows,
  compare,
  shots,
  band,
  memory: sheet.memory ?? [],
};

writeFileSync(path.join(SITE, "dailies.data.js"), `window.APEX_DAILIES = ${JSON.stringify(payload, null, 1)};\n`);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`\nDAILIES FROM RUN ${sheet.run}`);
console.log(`  rows ${rows.length} · produced ${payload.produced} · refused ${payload.refused} · wall ${payload.wallSeconds}s · spent $${payload.spentUsd}`);
for (const r of rows) {
  console.log(`  ${String(r.stage).padEnd(14)} ${String(r.state).padEnd(11)} ${(r.artifact?.name ?? "—").padEnd(32)} ` +
    `${r.artifact ? kb(r.artifact.bytes).padStart(11) : "".padStart(11)} ` +
    `${r.stats ? `YAVG ${String(r.stats.yavg).padStart(8)}  SAT ${String(r.stats.satavg).padStart(6)}  ${String(r.stats.frames).padStart(3)}f` : "no measurement".padEnd(38)} ` +
    `${r.img ? `${r.frame.at}s frame` : "—"}`);
}
if (compare) console.log(`  finishing pass at ${compare.at}s: luma ${compare.dLuma >= 0 ? "+" : ""}${compare.dLuma}%  saturation ${compare.dSat >= 0 ? "+" : ""}${compare.dSat}%`);
console.log(`  shots compared ${shots.length} · subtitle band ${band ? "yes" : "no"} · captions ${captions ? captions.lines + " cues" : "none"}`);
if (preview) console.log(`  web cut ${kb(preview.bytes)} from a ${kb(preview.fromBytes)} master`);
console.log(`  wrote ${rel(path.join(SITE, "dailies.data.js"))}  ${kb(statSync(path.join(SITE, "dailies.data.js")).size)}`);
