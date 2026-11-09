/**
 * The engine room — the platform with the machines attached.
 *
 *   node --experimental-strip-types scripts/local-rail.mjs
 *
 * The published rail is the front door; this is the room behind it. It serves the same pages and
 * adds the two things a static site cannot have: a live status of what this machine can actually
 * run, and a Run button that drives the real driver — ComfyUI on the GPU, ffmpeg on the disc.
 *
 *   GET  /api/status   what the probe found, and whether ComfyUI is answering right now
 *   POST /api/run      one real stage job: a prompt in, a video file out
 *   GET  /media/...    the artefacts a run produced
 *
 * Nothing here is mocked. A run that fails fails with the tool's own words, and a run that
 * succeeds produces a file you can play in the page that asked for it.
 */

import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, existsSync, statSync, mkdirSync, readdirSync, createReadStream, copyFileSync } from "node:fs";
import path from "node:path";
import { siteDir } from "./site-dir.mjs";
import { pathToFileURL } from "node:url";

/**
 * The engine room is found before the drivers are loaded. The driver reads its ComfyUI address
 * once, at import time, and there is more than one ComfyUI on this machine — one of them is an
 * empty room with a web page on port 8188 and no weights behind it. Pointing the platform at the
 * wrong room is how a run fails with "clip_name not in list".
 */
function resolveComfyUrl() {
  const file = path.join(siteDir(), "availability.generated.js");
  if (existsSync(file)) {
    const raw = readFileSync(file, "utf8");
    const json = raw.slice(raw.indexOf("=") + 1).replace(/;\s*$/, "").trim();
    try {
      const avail = JSON.parse(json);
      if (avail?.comfy?.up && avail.comfy.url) return avail.comfy.url;
    } catch {}
  }
  return process.env.APEX_COMFY_URL ?? "http://127.0.0.1:8188";
}
process.env.APEX_COMFY_URL = resolveComfyUrl();

const { buildDrivers, stageRoutes } = await import(pathToFileURL(path.resolve("src/lib/apex/drivers/index.ts")).href);
const { runStage } = await import(pathToFileURL(path.resolve("src/lib/apex/orchestrate.ts")).href);
const { gateOnLicence } = await import(pathToFileURL(path.resolve("src/lib/apex/drivers/contract.ts")).href);

const SITE = siteDir();
const RUNS = path.resolve("runs");
const PORT = Number(process.env.APEX_RAIL_PORT ?? 5188);
const HOST = process.env.APEX_RAIL_HOST ?? "127.0.0.1";

const GRAPH_TEMPLATE = JSON.parse(readFileSync(path.resolve("workflows/wan-t2v-1.3b.json"), "utf8"));
const SHOTS = JSON.parse(readFileSync(path.resolve("workflows/shots.json"), "utf8"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".srt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

/* ------------------------------------------------------------------ status */

let statusCache = { at: 0, body: null };

async function status() {
  if (Date.now() - statusCache.at < 15000 && statusCache.body) return statusCache.body;
  const file = path.join(SITE, "availability.generated.js");
  let avail = null;
  if (existsSync(file)) {
    const raw = readFileSync(file, "utf8");
    const json = raw.slice(raw.indexOf("=") + 1).replace(/;\s*$/, "").trim();
    try { avail = JSON.parse(json); } catch {}
  }
  let comfy = { up: false, version: null, url: process.env.APEX_COMFY_URL };
  try {
    const res = await fetch(`${comfy.url}/system_stats`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const j = await res.json();
      comfy = { up: true, version: j?.system?.comfyui_version ?? null, url: comfy.url };
    }
  } catch {}
  const body = { avail, comfy, runs: recentRuns(), rail: { port: PORT, host: HOST } };
  statusCache = { at: Date.now(), body };
  return body;
}

function recentRuns() {
  if (!existsSync(RUNS)) return [];
  const out = [];
  for (const d of readdirSync(RUNS, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dir = path.join(RUNS, d.name);
    const files = readdirSync(dir).filter((f) => /\.(mp4|webm)$/i.test(f));
    if (!files.length) continue;
    out.push({ stamp: d.name, files: files.map((f) => ({ name: f, bytes: statSync(path.join(dir, f)).size })) });
  }
  return out.sort((a, b) => b.stamp.localeCompare(a.stamp)).slice(0, 12);
}

/* ------------------------------------------------------------------ run */

/** Builds the ComfyUI graph for one prompt. Frames must be 4n+1: Wan's temporal VAE needs the odd frame. */
function graphFor(prompt, { seconds, width, height, fps, steps, seed }) {
  const frames = Math.max(5, Math.round((seconds * fps - 1) / 4) * 4 + 1);
  const tokens = {
    PROMPT: prompt,
    NEGATIVE: SHOTS.negative_default,
    WIDTH: width,
    HEIGHT: height,
    FRAMES: frames,
    STEPS: steps,
    SEED: seed,
    FPS: fps,
    TAG: "desk",
  };
  const graph = JSON.parse(JSON.stringify(GRAPH_TEMPLATE));
  for (const node of Object.values(graph)) {
    delete node._note;
    for (const [key, value] of Object.entries(node.inputs)) {
      if (typeof value !== "string") continue;
      const whole = /^\{\{(\w+)\}\}$/.exec(value);
      if (whole) node.inputs[key] = tokens[whole[1]];
      else node.inputs[key] = value.replace(/\{\{(\w+)\}\}/g, (m, n) => tokens[n] ?? m);
    }
  }
  return { graph, frames };
}

let running = null;

async function run(req, res) {
  const body = await readBody(req);
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) return json(res, 400, { error: "a prompt is the job; give the shot a sentence" });

  const opts = {
    seconds: Math.min(10, Math.max(1, Number(body.seconds ?? 2))),
    width: 832,
    height: 480,
    fps: 16,
    steps: Math.min(30, Math.max(4, Number(body.steps ?? 20))),
    seed: Number(body.seed ?? Math.floor(Math.random() * 1e8)),
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = path.join(RUNS, stamp);
  mkdirSync(runDir, { recursive: true });

  const built = graphFor(prompt, opts);
  const drivers = buildDrivers({
    comfyGraphs: async () => built.graph,
    replicate: {
      // No model is priced here on purpose: an unpriced model is refused rather than guessed at,
      // so a run on this machine cannot become a bill by accident.
      modelFor: () => "minimax/video-01",
      usdPerJob: () => Number.NaN,
    },
  });
  const routes = stageRoutes(drivers);

  process.env.APEX_RUN_DIR = runDir;
  const previousCwd = process.cwd();
  process.chdir(runDir);

  running = { prompt, started: Date.now(), stamp };
  try {
    const stage = await runStage(
      routes.motion ?? [],
      {
        stage: "motion",
        sceneId: "shot01",
        task: "t2v",
        inputs: [],
        timeoutSeconds: 3600,
        budgetUsd: 0,
        projectId: "desk",
      },
      "personal",
      {},
    );
    const files = existsSync(runDir) ? readdirSync(runDir).filter((f) => /\.(mp4|webm)$/i.test(f)) : [];
    const artefacts = files.map((f) => ({
      name: f,
      url: `/media/${stamp}/${f}`,
      bytes: statSync(path.join(runDir, f)).size,
    }));
    return json(res, 200, {
      state: stage.state,
      used: stage.used,
      prompt,
      frames: built.frames,
      wallClockSeconds: stage.wallClockSeconds,
      usdSpent: stage.usdSpent,
      log: stage.log,
      artefacts,
      stamp,
      attempts: stage.attempts,
    });
  } catch (e) {
    return json(res, 500, { error: String(e?.message ?? e), stack: String(e?.stack ?? "").split("\n").slice(0, 4) });
  } finally {
    process.chdir(previousCwd);
    running = null;
  }
}

/* ------------------------------------------------------------------ connect */

/**
 * The Connect layer — one button per tool, and the button tells the truth.
 *
 * Every driver is probed, so the page knows which tools this machine can actually reach right
 * now. Pressing Run does not fake a demo: it drives the real driver through the same licence
 * gate the pipeline uses, and returns whatever the tool said — a file, a refusal, or the reason
 * it is not on this disk.
 */

const OUT_DIR = path.resolve(".apex-out");

let driverCache = { at: 0, body: null };

function engineRoomDrivers() {
  return buildDrivers({
    comfyGraphs: async () => null,
    replicate: { modelFor: () => "", usdPerJob: () => Number.NaN },
  });
}

async function driverTable() {
  if (Date.now() - driverCache.at < 20000 && driverCache.body) return driverCache.body;
  const drivers = engineRoomDrivers();
  const routes = stageRoutes(drivers);
  const stageOf = {};
  for (const [stage, list] of Object.entries(routes)) for (const d of list) (stageOf[d.toolId] ??= []).push(stage);

  const body = [];
  for (const d of drivers) {
    let probe = { ok: false, why: "not probed" };
    try {
      probe = await d.probe();
    } catch (e) {
      probe = { ok: false, why: String(e?.message ?? e).slice(0, 180) };
    }
    body.push({
      toolId: d.toolId,
      name: d.record.name,
      depth: d.depth,
      stages: stageOf[d.toolId] ?? [],
      ok: probe.ok,
      why: probe.why,
      cost: d.record.cost,
      licence: d.record.license,
      licenceVerified: d.record.licenseVerified,
      gated: gateOnLicence(d, "personal") !== null,
      url: d.record.officialUrl || d.record.sourceRepository || "",
      runnable: d.depth === "drivable" && typeof d.run === "function",
    });
  }
  driverCache = { at: Date.now(), body };
  return body;
}

/** The newest file with one of these endings anywhere the platform has written. */
function newestArtefact(exts) {
  const roots = [OUT_DIR, RUNS];
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 3 || !existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p, depth + 1);
      else if (exts.some((x) => entry.name.toLowerCase().endsWith(x))) {
        found.push({ path: p, at: statSync(p).mtimeMs, bytes: statSync(p).size });
      }
    }
  };
  for (const r of roots) walk(r, 0);
  found.sort((a, b) => b.at - a.at);
  return found[0]?.path ?? null;
}

/**
 * A one-click job per tool. Where the tool needs an input, the machine's own newest artefact
 * is used — that is how a single press produces a real file instead of an error message.
 */
function defaultJob(toolId, requested) {
  const said = String(requested ?? "").trim();
  switch (toolId) {
    case "windows_sapi":
      return { task: said || "The lighthouse keeper has stopped lighting the sea.", inputs: [], variant: "" };
    case "apex_score":
      return { task: said || "score", inputs: [], variant: JSON.stringify({ bpm: 88, bars: 4, mood: "epic" }) };
    case "whisper": {
      const wav = newestArtefact([".wav"]);
      return { task: said || "transcribe", inputs: wav ? [wav] : [], variant: "" };
    }
    case "ffmpeg": {
      const wav = newestArtefact([".wav"]);
      const img = newestArtefact([".png", ".jpg", ".jpeg", ".webp"]);
      return { task: said || (wav ? "loudnorm" : "grade"), inputs: wav ? [wav] : img ? [img] : [], variant: "" };
    }
    case "agent_desktop":
      return { task: said || "snapshot", inputs: [], variant: JSON.stringify([{ command: "list-windows" }]) };
    case "comfyui":
      return { task: said || "t2v", inputs: [], variant: "" };
    default:
      return { task: said || "write", inputs: [], variant: "" };
  }
}

async function connect(req, res) {
  const body = await readBody(req);
  const toolId = String(body.toolId ?? "").trim();
  if (!toolId) return json(res, 400, { error: "name the tool" });

  const drivers = engineRoomDrivers();
  const driver = drivers.find((d) => d.toolId === toolId);
  if (!driver) return json(res, 404, { error: `no driver named ${toolId}` });

  const routes = stageRoutes(drivers);
  const stages = Object.entries(routes).filter(([, list]) => list.some((d) => d.toolId === toolId)).map(([s]) => s);
  const job = defaultJob(toolId, body.task);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = path.join(RUNS, stamp);
  mkdirSync(runDir, { recursive: true });

  const previousCwd = process.cwd();
  process.chdir(runDir);
  try {
    const result = await runStage(
      [driver],
      {
        stage: stages[0] ?? "connect",
        sceneId: toolId,
        task: job.task,
        inputs: job.inputs,
        variant: job.variant || undefined,
        timeoutSeconds: 600,
        budgetUsd: 0,
        projectId: "connect",
      },
      "personal",
      {},
    );

    const artefacts = [];
    for (const out of result.outputs ?? []) {
      if (!existsSync(out)) continue;
      const name = path.basename(out);
      copyFileSync(out, path.join(runDir, name));
      artefacts.push({ name, url: `/media/${stamp}/${name}`, bytes: statSync(path.join(runDir, name)).size });
    }
    const raw = result.log;
    const inline = (Array.isArray(raw) ? raw : String(raw ?? "").split("\n")).filter((l) => String(l).trim()).slice(0, 6);

    /**
     * A refusal is not a failure. The gate, the portal and a missing binary each answer a
     * different question, so the page must be able to say which one it was.
     */
    const outcome = String(
      (result.attempts ?? []).map((a) => (typeof a.outcome === "string" ? a.outcome : a.outcome?.state ?? "")).join("|"),
    );
    let state = result.state;
    if (outcome.includes("blocked-by-licence")) state = "blocked-by-licence";
    else if (outcome.includes("portal-only")) state = "portal";
    else if (outcome.includes("handoff-issued")) state = "needs-human";
    else if (outcome.includes("probed-unreachable")) state = "not-installed";

    return json(res, 200, {
      toolId,
      name: driver.record.name,
      state,
      used: result.used,
      stages,
      job: { task: job.task, inputs: job.inputs },
      wallClockSeconds: result.wallClockSeconds,
      usdSpent: result.usdSpent,
      log: inline,
      artefacts,
      stamp,
    });
  } catch (e) {
    return json(res, 500, { error: String(e?.message ?? e) });
  } finally {
    process.chdir(previousCwd);
  }
}

/* ------------------------------------------------------------------ plumbing */

/**
 * Who may drive the engine room.
 *
 * The rail runs on the creator's own machine and can spend his GPU. Chrome asks the creator before
 * any public site may reach the loopback address, but that permission is granted per site — so the
 * rail itself answers only the origins the creator has named. Without this list, any page on the
 * internet that the creator visits could start a job on his machine.
 */
const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:5188",
  "http://localhost:5188",
  "https://filmverse-1mil8xwzv4y.qoder.website",
]);

function allowedOrigin(res) {
  const o = String(res.req?.headers?.origin ?? "");
  return ALLOWED_ORIGINS.has(o) ? o : null;
}

/**
 * CORS on the preflight alone is not a gate: a cross-origin "simple request" (text/plain, or no
 * body at all) is sent by the browser without any preflight, so the side effect lands even though
 * the attacker cannot read the reply. Every state-changing POST therefore checks Origin itself,
 * and any POST that reads a body additionally demands application/json — a content type a simple
 * request cannot carry, so an accepted body must have preflighted through the allowlist first.
 * A caller with no Origin header is a shell, not a browser, and cannot be a CSRF vector.
 */
function guardPost(req, res, { json = false } = {}) {
  const origin = req.headers.origin;
  const badOrigin = origin !== undefined && !ALLOWED_ORIGINS.has(String(origin));
  const badType = json && !String(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json");
  if (badOrigin || badType) {
    res.writeHead(403, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ error: badOrigin ? "this origin may not drive the engine room" : "state-changing posts must be application/json" }));
    return false;
  }
  return true;
}

function json(res, code, body) {
  const text = JSON.stringify(body);
  const origin = allowedOrigin(res);
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-private-network": "true",
    "cache-control": "no-store",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "origin";
  }
  res.writeHead(code, headers);
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 2e6) req.destroy();
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

function serveFile(res, file, { req = null, download = false } = {}) {
  if (!existsSync(file)) return json(res, 404, { error: "not found" });
  const stat = statSync(file);
  const ext = path.extname(file).toLowerCase();
  const headers = {
    "content-type": MIME[ext] ?? "application/octet-stream",
    "content-length": stat.size,
    "accept-ranges": "bytes",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  };
  if (download) headers["content-disposition"] = `attachment; filename="${path.basename(file)}"`;
  const range = req?.headers?.range;
  if (range && /^bytes=/.test(range)) {
    const [startRaw, endRaw] = range.replace("bytes=", "").split("-");
    const start = Number(startRaw) || 0;
    const end = endRaw ? Number(endRaw) : stat.size - 1;
    headers["content-range"] = `bytes ${start}-${end}/${stat.size}`;
    headers["content-length"] = end - start + 1;
    res.writeHead(206, headers);
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, headers);
  return createReadStream(file).pipe(res);
}

/**
 * The Foreman's door. The journal it writes is what the surface reads, so the creator sees the
 * platform's own measured state rather than a written status; and one tick at a time — two passes
 * auditing the same machine would double-probe and interleave their journals.
 */
const FOREMAN_JOURNAL = path.resolve(".apex-foreman/latest.json");
let agentTickInFlight = null;

function agentState() {
  if (!existsSync(FOREMAN_JOURNAL)) {
    return { present: false, why: "the Foreman has not ticked on this machine yet — run: node scripts/foreman.mjs tick" };
  }
  try {
    return { present: true, ...JSON.parse(readFileSync(FOREMAN_JOURNAL, "utf8")) };
  } catch (e) {
    return { present: false, why: `journal unreadable: ${String(e).slice(0, 140)}` };
  }
}

function shellRun(cmd, timeoutSeconds) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, windowsHide: true });
    let out = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      out += "\n[timed out]";
    }, timeoutSeconds * 1000);
    child.stdout?.on("data", (b) => (out += b.toString()));
    child.stderr?.on("data", (b) => (out += b.toString()));
    child.on("close", (code) => {
      clearTimeout(killer);
      resolve({ code: code ?? -1, out });
    });
  });
}

async function agentTick(res) {
  if (agentTickInFlight) return json(res, 202, { running: true, note: "a tick is already measuring this machine" });
  agentTickInFlight = (async () => {
    const { tick } = await import(pathToFileURL(path.resolve("src/lib/apex/foreman.ts")).href);
    const localDrivers = buildDrivers({ comfyGraphs: async () => null, replicate: { modelFor: () => "minimax/video-01", usdPerJob: () => Number.NaN } });
    return tick({ repoRoot: path.resolve("."), drivers: localDrivers, routes: stageRoutes(localDrivers), run: shellRun });
  })();
  try {
    return json(res, 200, await agentTickInFlight);
  } catch (e) {
    return json(res, 500, { error: `tick failed: ${String(e).slice(0, 200)}` });
  } finally {
    agentTickInFlight = null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const p = decodeURIComponent(url.pathname);

  if (req.method === "OPTIONS") {
    // The published site is https and this rail is on the loopback address. Chrome calls that a
    // private network request and preflights it; without this header the preflight fails and the
    // published page reads the engine room as offline.
    const origin = allowedOrigin(res);
    if (!origin) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      return res.end("this origin is not allowed to drive the engine room");
    }
    res.writeHead(204, {
      "access-control-allow-origin": origin,
      "vary": "origin",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-allow-private-network": "true",
      "access-control-max-age": "600",
    });
    return res.end();
  }

  if (p === "/api/status") return json(res, 200, await status());
  if (p === "/api/run" && req.method === "POST") return guardPost(req, res, { json: true }) ? run(req, res) : undefined;
  if (p === "/api/running") return json(res, 200, { running });
  if (p === "/api/agent" && req.method === "GET") return json(res, 200, agentState());
  if (p === "/api/drivers" && req.method === "GET") return json(res, 200, { at: new Date().toISOString(), drivers: await driverTable() });
  if (p === "/api/connect" && req.method === "POST") return guardPost(req, res, { json: true }) ? connect(req, res) : undefined;
  if (p === "/api/agent/tick" && req.method === "POST") return guardPost(req, res) ? agentTick(res) : undefined;

  if (p.startsWith("/media/")) {
    const rel = p.slice("/media/".length);
    const file = path.join(RUNS, rel);
    if (!file.startsWith(RUNS)) return json(res, 403, { error: "no" });
    return serveFile(res, file, { req });
  }

  // static: the same pages the public rail serves
  let rel = p === "/" ? "/index.html" : p;
  let file = path.join(SITE, rel);
  if (!file.startsWith(SITE)) return json(res, 403, { error: "no" });
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "studio.html");
  if (!existsSync(file)) {
    const html = path.join(SITE, "studio.html");
    if (existsSync(html)) return serveFile(res, html, { req });
    return json(res, 404, { error: "not found" });
  }
  return serveFile(res, file, { req });
});

server.listen(PORT, HOST, () => {
  console.log(`ENGINE ROOM  http://${HOST}:${PORT}`);
  console.log(`  site   ${SITE}`);
  console.log(`  runs   ${RUNS}`);
});
