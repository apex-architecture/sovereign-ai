/**
 * Generates the Camera Deck data the public rail reads.
 *   node --experimental-strip-types scripts/camera-deck-data.mjs
 *
 * The deck page's whole claim is that a shape is a raster, not an adjective — so nothing on it
 * may be typed by hand. Every number is taken from one of three places this run can actually
 * reach:
 *
 *   the module    — the rasters come out of src/lib/apex/camera-deck.ts, the same file the
 *                   encoder imports, so the page and the driver cannot disagree;
 *   the argv      — the ffmpeg flags are what argsFor() returns for the chosen shape, read from
 *                   the flags themselves rather than from a description of them;
 *   the files     — the two proof frames are measured on disk: width and height from the JPEG
 *                   header, mean luminance from ffmpeg's signalstats.
 *
 * A frame that no longer matches the shape it is shown for is a lie on a page, so this run
 * fails loudly rather than printing the stale number. Re-render them with
 * `node --experimental-strip-types scripts/camera-deck-selftest.mjs --render`.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { siteDir } from "./site-dir.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const APEX = path.join(ROOT, "src/lib/apex");
const SITE = siteDir(ROOT);
const url = (rel) => pathToFileURL(path.join(APEX, rel)).href;

const { ASPECTS, DEFAULT_ASPECT, LENSES, STOPS, encodeRaster } = await import(url("camera-deck.ts"));
const { compileMatrix } = await import(url("prompt-compiler.ts"));
const { argsFor } = await import(url("drivers/ffmpeg.ts"));

const SOURCE_FILES = ["camera-deck.ts", "prompt-compiler.ts", "drivers/ffmpeg.ts"];
const hash = createHash("sha256");
for (const f of SOURCE_FILES) hash.update(readFileSync(path.join(APEX, f)));

/** Anything this run could not measure lands here, and the run fails instead of writing it. */
const problems = [];

/**
 * Width and height out of the JPEG itself: the SOF0/SOF2 segment carries them at a fixed
 * offset from the marker, so the measurement needs no binary on the machine that builds.
 */
function jpegDims(file) {
  const b = readFileSync(file);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

/** Mean luma, measured. null means "this machine has no ffmpeg", not "it is 33". */
function meanLuma(file) {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-i", file, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  if (r.error || r.status !== 0) return null;
  const m = /YAVG=([0-9.]+)/.exec(r.stderr);
  return m ? Number(m[1]) : null;
}

/** The flags a chosen shape really produces, read straight out of the driver's argv. */
function flagsFor(task, aspect, inputs) {
  const args = argsFor({
    task,
    inputs,
    aspect,
    timeoutSeconds: 60,
    budgetUsd: 0,
    projectId: "deck",
    sceneId: "example",
    stage: task,
    variant: task === "grade" ? "2" : undefined,
  });
  return args ? args.join(" ") : null;
}

const BRIEF = "a lighthouse keeper climbs a spiral stair at dawn, handheld, cold blue light";

/**
 * The clause the compiler really weighted into the prompt, read back out of its output. The page
 * must not print a weight the module does not emit, so this searches for the term inside the
 * compiled string and takes whatever number came with it — if the term never reaches the prompt,
 * that is a problem this run reports instead of a sentence the rail would have made up.
 */
function emitted(deck, term) {
  const m = compileMatrix(BRIEF, deck);
  const shot = m.shots[0];
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = new RegExp(`\\(${esc}:[0-9.]+\\)`).exec(shot.positive);
  return {
    clause: found ? found[0] : null,
    latent: `${shot.width}x${shot.height}`,
    warnings: m.warnings,
    positive: shot.positive,
  };
}

const ASPECT_EMITTED = Object.fromEntries(ASPECTS.map((a) => [a.id, emitted({ aspect: a.id }, a.term)]));
const STOP_EMITTED = Object.fromEntries(STOPS.map((s) => [s.id, emitted({ stop: s.id }, s.term)]));
for (const [id, e] of Object.entries(ASPECT_EMITTED))
  if (!e.clause) problems.push(`shape "${id}" has a prompt term, but the compiler did not weight it into the shot`);
for (const [id, e] of Object.entries(STOP_EMITTED))
  if (!e.clause) problems.push(`stop "${id}" has a prompt term, but the compiler did not weight it into the shot`);
for (const a of ASPECTS) {
  const carried = ASPECT_EMITTED[a.id].latent;
  const declared = `${a.latent.width}x${a.latent.height}`;
  if (carried !== declared)
    problems.push(`shape "${a.id}": the compiled graph carries ${carried}, the deck declares ${declared}`);
}

/** One real compiled shot, deck and all, so the page can show the whole prompt rather than parts. */
const example = emitted({ aspect: "scope", stop: "2.8" }, ASPECTS.find((a) => a.id === "scope").term);


/**
 * The two frames the page shows. Both are the same plate through the same craft chain — only
 * the shape differs — so a visitor can see what the deck actually did rather than take it on
 * trust. Paths are relative to the site directory.
 */
const PROOF = [
  { aspect: "scope", file: "assets/deck/scope.jpg" },
  { aspect: "wide", file: "assets/deck/wide.jpg" },
];

/** The plate, both where the rail serves it and where the driver reads it. */
const PLATE_SITE = path.join(SITE, "assets/dailies/plate-shot02.jpg");
const PLATE_REPO = path.join(ROOT, "demo-plates/hall.jpg");
const PLATE_ARGS = "demo-plates/hall.jpg";
const sha = (p) => (existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16) : null);
const plateDims = existsSync(PLATE_SITE) ? jpegDims(PLATE_SITE) : null;
const plateSha = sha(PLATE_SITE);
const driverPlateSha = sha(PLATE_REPO);
if (!plateSha) problems.push("assets/dailies/plate-shot02.jpg is missing — the viewfinder would show nothing");
if (plateSha && driverPlateSha && plateSha !== driverPlateSha)
  problems.push("the rail's plate and the plate the driver was given are different images — say so or fix it");

const proofs = PROOF.map((p) => {
  const abs = path.join(SITE, p.file);
  if (!existsSync(abs)) {
    problems.push(`${p.file} is missing — the page would claim a delivered frame it cannot show`);
    return { aspect: p.aspect, file: p.file, present: false };
  }
  const dims = jpegDims(abs);
  const want = encodeRaster(p.aspect);
  if (!dims) problems.push(`${p.file}: no JPEG header could be read`);
  else if (dims.width !== want.width || dims.height !== want.height)
    problems.push(
      `${p.file} is ${dims.width}x${dims.height} but the deck says shape "${p.aspect}" delivers ${want.width}x${want.height}`,
    );
  return {
    aspect: p.aspect,
    file: p.file,
    present: true,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    ratio: dims ? Number((dims.width / dims.height).toFixed(4)) : null,
    bytes: statSync(abs).size,
    meanLuma: meanLuma(abs),
  };
});

const data = {
  generatedAt: new Date().toISOString(),
  sourceHash: hash.digest("hex").slice(0, 16),
  defaultAspect: DEFAULT_ASPECT,
  aspects: ASPECTS.map((a) => ({
    id: a.id,
    label: a.label,
    nominal: Number(a.nominal.toFixed(4)),
    soldAs: a.soldAs,
    encode: a.encode,
    latent: a.latent,
    encodeRatio: Number(a.encodeRatio.toFixed(4)),
    latentRatio: Number(a.latentRatio.toFixed(4)),
    note: a.note,
    term: a.term,
    // The clause this shape contributes to a prompt, as the compiler weighted it, with its number.
    clause: ASPECT_EMITTED[a.id].clause,
    // The size the compiled graph really carries for this shape.
    graphLatent: ASPECT_EMITTED[a.id].latent,
    // The generator cannot be asked for the delivery shape exactly; the page says so.
    latentIsExact: a.latent.width / a.latent.height === a.encode.width / a.encode.height,
  })),
  stops: STOPS.map((s) => ({ ...s, clause: STOP_EMITTED[s.id].clause })),
  lenses: LENSES,
  // One real ffmpeg command line per stage, per shape, so the page prints flags not adjectives.
  flags: Object.fromEntries(
    ASPECTS.map((a) => [
      a.id,
      {
        grade: flagsFor("grade", a.id, [PLATE_ARGS]),
        finish: flagsFor("finish", a.id, [PLATE_ARGS]),
      },
    ]),
  ),
  // What the compiler actually emitted for one brief with the scope deck and f/2.8 set.
  compiled: {
    brief: BRIEF,
    deck: { aspect: "scope", stop: "2.8" },
    latent: example.latent,
    positive: example.positive,
    warnings: example.warnings,
  },
  // The single image both proof frames were made from, and proof that the rail's copy of it is
  // the same bytes the driver was given. Two hashes, compared here rather than asserted on page.
  plate: {
    file: "assets/dailies/plate-shot02.jpg",
    width: plateDims?.width ?? null,
    height: plateDims?.height ?? null,
    sha256: plateSha,
    driverCopySha256: driverPlateSha,
    sameBytes: !!plateSha && plateSha === driverPlateSha,
  },
  proofs,
};

const out = `/* GENERATED by scripts/camera-deck-data.mjs — do not edit. */\nwindow.APEX_DECK = ${JSON.stringify(data)};\n`;
const dest = path.join(SITE, "deck.data.js");

if (problems.length) {
  console.error("DECK DATA FAILED");
  for (const p of problems) console.error("  " + p);
  console.error(`  nothing written — the page would have printed a number this run could not measure`);
  process.exit(1);
}
writeFileSync(dest, out);

const measured = data.proofs.map((p) => `${p.aspect} ${p.width}x${p.height} (${p.ratio}:1) YAVG ${p.meanLuma ?? "not measured — no ffmpeg"}`);
console.log(
  `deck data: ${data.aspects.length} shapes, ${data.stops.length} stops, ${data.lenses.length} lenses\n` +
    `  proof frames measured on disk:\n    ${measured.join("\n    ")}\n` +
    `  written: ${dest} (${(Buffer.byteLength(out) / 1024).toFixed(1)} KB)`,
);
