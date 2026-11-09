/**
 * The creator bridge — run this on YOUR machine, never on the platform's.
 *
 *   node apex-bridge.mjs
 *
 * The platform is a switchboard on the internet: it owns no GPU, runs no model and stores no
 * footage. Some of the tools a creator already has cannot be called from a web page at all —
 * ffmpeg, Blender and whisper are processes, not endpoints — and some cloud APIs send no CORS
 * headers, so a static page cannot spend the creator's own key against them. This little server
 * is the creator's side of that gap. It listens on loopback only, answers only the origins listed
 * below, and forwards or spawns exactly the tools named in TOOLS. Nothing else.
 *
 * What it will NOT do: bind a public interface, run a shell, accept a tool that is not in TOOLS,
 * proxy to a host that is not in PROXY_HOSTS, or keep any key it is handed. A key arrives in a
 * request body over loopback, is attached to one outbound call, and is discarded.
 *
 * Configure with environment variables:
 *   APEX_BRIDGE_PORT      default 8787
 *   APEX_BRIDGE_ORIGINS   comma-separated allowlist; defaults to the public rail plus local dev
 *   APEX_BRIDGE_WORKDIR   where spawned tools run; default ./bridge-work beside this file
 *
 * Requires Node 18+. No dependencies, no install step: this file IS the bridge.
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.APEX_BRIDGE_PORT ?? 8787);
const HOST = "127.0.0.1"; // loopback only; a bridge on a public interface is an open door
const ORIGINS = new Set(
  (process.env.APEX_BRIDGE_ORIGINS ??
    "https://filmverse-1mil8xwzv4y.qoder.website,http://127.0.0.1:8788,http://localhost:8788")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
const WORKDIR = path.resolve(process.env.APEX_BRIDGE_WORKDIR ?? path.join(HERE, "bridge-work"));
mkdirSync(WORKDIR, { recursive: true });

/** The only processes this bridge will spawn. Fixed binary, fixed leading args, shell never used. */
const TOOLS = {
  ffmpeg: { bin: "ffmpeg", lead: ["-hide_banner", "-loglevel", "error"], depth: "drivable" },
  ffprobe: { bin: "ffprobe", lead: ["-hide_banner", "-loglevel", "error"], depth: "drivable" },
  blender: { bin: "blender", lead: ["--background"], depth: "drivable" },
  whisper: { bin: "whisper", lead: [], depth: "drivable" },
  piper: { bin: "piper", lead: [], depth: "drivable" },
};

/** The only cloud hosts the BYOK proxy will talk to. Stops the bridge becoming an open proxy/SSRF. */
const PROXY_HOSTS = new Set([
  "api.replicate.com",
  "api.runpod.io",
  "api.deepseek.com",
  "api.together.xyz",
  "api.fireworks.ai",
]);

const VERSION = "1.0.0";

function allowedOrigin(req) {
  const o = String(req.headers.origin ?? "");
  return ORIGINS.has(o) ? o : null;
}

function json(req, res, code, body) {
  const origin = allowedOrigin(req);
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-private-network": "true",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "origin";
  }
  res.writeHead(code, headers);
  res.end(JSON.stringify(body));
}

/**
 * A cross-origin "simple request" (text/plain, or bodyless) is sent by the browser with no preflight,
 * so gating only OPTIONS would let any website the creator visits fire these doors. Check Origin on
 * the POST itself, and demand application/json for anything that reads a body — a content type a
 * simple request cannot carry, so an accepted body must have preflighted through the allowlist.
 * No Origin header means a shell on the creator's own machine, which is not a CSRF vector.
 */
function guardPost(req, res, { json: wantJson = false } = {}) {
  const origin = req.headers.origin;
  const badOrigin = origin !== undefined && !ORIGINS.has(String(origin));
  const badType =
    wantJson && !String(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json");
  if (badOrigin || badType) {
    json(req, res, 403, {
      error: badOrigin ? "this origin may not use the bridge" : "state-changing posts must be application/json",
    });
    return false;
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 2e6) {
        req.destroy();
        reject(new Error("body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("body is not json"));
      }
    });
    req.on("error", reject);
  });
}

/** Probe a binary with fixed args and no shell. Present/absent only; never executes creator data. */
function probeBinary(bin) {
  return new Promise((resolve) => {
    const child = spawn(bin, ["-version"], { shell: false, windowsHide: true, cwd: WORKDIR });
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(killer);
      resolve(ok);
    };
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(false);
    }, 4000);
    child.on("error", () => finish(false));
    child.on("close", (code) => finish(code === 0));
    child.stdout?.resume();
    child.stderr?.resume();
  });
}

async function toolTable() {
  const out = [];
  for (const [toolId, t] of Object.entries(TOOLS)) {
    out.push({ toolId, name: t.bin, ok: await probeBinary(t.bin), depth: t.depth, via: "bridge" });
  }
  return out;
}

/** Spawn a whitelisted tool with literal argv. No shell, so no metacharacter can become a command. */
function runTool(toolId, args) {
  const t = TOOLS[toolId];
  return new Promise((resolve) => {
    const child = spawn(t.bin, [...t.lead, ...args], { shell: false, windowsHide: true, cwd: WORKDIR });
    let out = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      out += "\n[timed out]";
    }, 120000);
    child.stdout?.on("data", (b) => (out += b.toString()));
    child.stderr?.on("data", (b) => (out += b.toString()));
    child.on("error", (e) => {
      clearTimeout(killer);
      resolve({ code: -1, out: `cannot start ${t.bin}: ${e.message}` });
    });
    child.on("close", (code) => {
      clearTimeout(killer);
      resolve({ code: code ?? -1, out });
    });
  });
}

function validArgs(args) {
  return (
    Array.isArray(args) &&
    args.length <= 64 &&
    args.every((a) => typeof a === "string" && a.length <= 4096 && !a.includes("\0"))
  );
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const p = url.pathname;

  if (req.method === "OPTIONS") {
    const origin = allowedOrigin(req);
    if (!origin) return json(req, res, 403, { error: "this origin may not use the bridge" });
    res.writeHead(204, {
      "access-control-allow-origin": origin,
      vary: "origin",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-allow-private-network": "true",
      "access-control-max-age": "600",
    });
    return res.end();
  }

  if (p === "/health" && req.method === "GET") {
    return json(req, res, 200, { ok: true, version: VERSION, bind: `${HOST}:${PORT}`, origins: [...ORIGINS], workdir: WORKDIR });
  }

  if (p === "/api/drivers" && req.method === "GET") {
    return json(req, res, 200, { at: new Date().toISOString(), drivers: await toolTable() });
  }

  if (p === "/api/run" && req.method === "POST") {
    if (!guardPost(req, res, { json: true })) return;
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return json(req, res, 400, { error: e.message });
    }
    const toolId = String(body.toolId ?? "");
    if (!TOOLS[toolId]) return json(req, res, 404, { error: `the bridge does not carry a tool named ${toolId}` });
    if (!validArgs(body.args ?? [])) return json(req, res, 400, { error: "args must be <=64 literal strings" });
    return json(req, res, 200, await runTool(toolId, body.args ?? []));
  }

  if (p === "/api/proxy" && req.method === "POST") {
    if (!guardPost(req, res, { json: true })) return;
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return json(req, res, 400, { error: e.message });
    }
    let target;
    try {
      target = new URL(String(body.url ?? ""));
    } catch {
      return json(req, res, 400, { error: "url is not a url" });
    }
    if (target.protocol !== "https:" || !PROXY_HOSTS.has(target.hostname)) {
      return json(req, res, 403, { error: "the bridge proxies only https calls to the listed provider hosts" });
    }
    const key = String(body.key ?? "");
    const headers = { "content-type": "application/json" };
    if (key) headers.authorization = `Bearer ${key}`;
    try {
      const upstream = await fetch(target, {
        method: String(body.method ?? "POST").toUpperCase() === "GET" ? "GET" : "POST",
        headers,
        body: body.payload === undefined ? undefined : JSON.stringify(body.payload),
      });
      const text = await upstream.text();
      // The key is never echoed, never stored; only the provider's answer travels back.
      return json(req, res, upstream.status, { status: upstream.status, body: text });
    } catch (e) {
      return json(req, res, 502, { error: `upstream unreachable: ${e.message}` });
    }
  }

  return json(req, res, 404, { error: `no door at ${p}` });
});

server.listen(PORT, HOST, () => {
  console.log(`apex-bridge ${VERSION} on http://${HOST}:${PORT}`);
  console.log(`  origins: ${[...ORIGINS].join(", ")}`);
  console.log(`  workdir: ${WORKDIR}`);
  console.log(`  tools:   ${Object.keys(TOOLS).join(", ")}`);
  console.log("  This process runs on the creator's machine. Stop it with Ctrl-C; nothing persists.");
});