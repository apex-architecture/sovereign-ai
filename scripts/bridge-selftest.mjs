/**
 * Prove the creator bridge is a door with a lock, not an open proxy.
 *
 *   node scripts/bridge-selftest.mjs
 *
 * Boots the bridge on a throwaway loopback port with a throwaway workdir, fires the attacks and the
 * one legitimate shape, then kills it. No external network call is made: the proxy tests only assert
 * the refusals, and the run test uses ffmpeg -version, which touches no creator data.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = 8789;
const BASE = `http://127.0.0.1:${PORT}`;
const GOOD = "https://filmverse-1mil8xwzv4y.qoder.website";
const EVIL = "https://evil.example";
const work = mkdtempSync(path.join(tmpdir(), "apex-bridge-test-"));

const child = spawn(process.execPath, ["bridge/apex-bridge.mjs"], {
  env: { ...process.env, APEX_BRIDGE_PORT: String(PORT), APEX_BRIDGE_WORKDIR: work },
  stdio: "ignore",
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let up = false;
for (let i = 0; i < 60 && !up; i += 1) {
  try {
    await fetch(`${BASE}/health`);
    up = true;
  } catch {
    await sleep(200);
  }
}
if (!up) {
  child.kill();
  rmSync(work, { recursive: true, force: true });
  console.log("FAIL — the bridge never came up");
  process.exit(1);
}

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
};
const post = (p, { origin, type, body }) =>
  fetch(BASE + p, {
    method: "POST",
    headers: { ...(origin ? { origin } : {}), ...(type ? { "content-type": type } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const health = await (await fetch(`${BASE}/health`)).json();
check("the bridge binds loopback only", health.bind === `127.0.0.1:${PORT}`, health.bind);

const drivers = await (await fetch(`${BASE}/api/drivers`)).json();
check("the driver table reports presence, not promises", Array.isArray(drivers.drivers) && drivers.drivers.every((d) => typeof d.ok === "boolean"), `${drivers.drivers.length} tools`);
const ffmpegPresent = drivers.drivers.find((d) => d.toolId === "ffmpeg")?.ok;

let r = await post("/api/run", { origin: EVIL, type: "text/plain", body: { toolId: "ffmpeg", args: ["-version"] } });
check("a hostile origin cannot spawn via a simple request", r.status === 403, `status ${r.status}`);

r = await post("/api/run", { origin: GOOD, type: "text/plain", body: { toolId: "ffmpeg", args: ["-version"] } });
check("an allowed origin must still send application/json", r.status === 403, `status ${r.status}`);

r = await post("/api/run", { origin: GOOD, type: "application/json", body: { toolId: "rm", args: ["-rf", "/"] } });
check("a tool outside the whitelist is refused", r.status === 404, `status ${r.status}`);

r = await post("/api/run", { origin: GOOD, type: "application/json", body: { toolId: "ffmpeg", args: "not-an-array" } });
check("non-array args are refused", r.status === 400, `status ${r.status}`);

r = await post("/api/run", { origin: GOOD, type: "application/json", body: { toolId: "ffmpeg", args: ["-version\0evil"] } });
check("a NUL byte in an arg is refused", r.status === 400, `status ${r.status}`);

r = await post("/api/run", { origin: GOOD, type: "application/json", body: { toolId: "ffmpeg", args: ["-version; echo pwned"] } });
const inj = await r.json();
check("a shell metacharacter stays a literal argv element (no shell)", r.status === 200 && inj.code !== 0, `code ${inj.code}`);

r = await post("/api/run", { origin: GOOD, type: "application/json", body: { toolId: "ffmpeg", args: ["-version"] } });
const run = await r.json();
check("the legitimate shape runs the whitelisted tool", r.status === 200 && typeof run.code === "number" && (!ffmpegPresent || run.code === 0), `code ${run.code}, ffmpeg present ${ffmpegPresent}`);

r = await post("/api/proxy", { origin: GOOD, type: "application/json", body: { url: "http://169.254.169.254/latest/meta-data/", key: "x" } });
check("the proxy refuses a non-https internal address (no SSRF)", r.status === 403, `status ${r.status}`);

r = await post("/api/proxy", { origin: GOOD, type: "application/json", body: { url: "https://evil.example/steal", key: "x" } });
check("the proxy refuses a host outside the provider allowlist", r.status === 403, `status ${r.status}`);

child.kill();
rmSync(work, { recursive: true, force: true });
if (failed) {
  console.log(`\n${failed} BRIDGE GATE(S) OPEN`);
  process.exit(1);
}
console.log("\nBRIDGE CLEAN — loopback only, origin-gated, whitelisted tools, literal argv, allowlisted proxy hosts.");