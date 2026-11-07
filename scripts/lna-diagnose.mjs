/**
 * What exactly does Chrome say when a public https page calls the loopback rail?
 *
 *   node scripts/lna-diagnose.mjs https://filmverse-1mil8xwzv4y.qoder.website
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = (process.argv[2] ?? "https://filmverse-1mil8xwzv4y.qoder.website").replace(/\/$/, "");
const EXTRA = process.argv.slice(3);
const PORT = 9338;

const profile = mkdtempSync(path.join(tmpdir(), "apex-lna-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  ...EXTRA,
  "about:blank",
]);
chrome.stdout.unref?.();
chrome.stderr.unref?.();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(300);
  }
  throw new Error("chrome devtools never answered");
}

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));

let seq = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  const m = msg.method || "";
  if (m === "Network.requestWillBeSent" && /127\.0\.0\.1/.test(msg.params.request.url)) {
    events.push({ kind: "request", url: msg.params.request.url, method: msg.params.request.method });
  }
  if (m === "Network.responseReceived" && /127\.0\.0\.1/.test(msg.params.response.url)) {
    events.push({ kind: "response", url: msg.params.response.url, status: msg.params.response.status });
  }
  if (m === "Network.loadingFailed") {
    events.push({ kind: "failed", error: msg.params.errorText, type: msg.params.type, blockedReason: msg.params.blockedReason ?? null });
  }
  if (m === "Log.entryAdded") {
    events.push({ kind: "log", level: msg.params.entry.level, text: msg.params.entry.text?.slice(0, 200) });
  }
};
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((r) => pending.set(id, r));
}
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.navigate", { url: `${BASE}/index.html` });
await sleep(5000);

const result = await evaluate(`(async () => {
  try {
    const r = await fetch('http://127.0.0.1:5188/api/drivers');
    const j = await r.json();
    return 'OK ' + j.drivers.length + ' drivers';
  } catch (e) { return 'FAIL ' + e.name + ': ' + e.message; }
})()`);
console.log("FETCH:", result);
await sleep(1500);
console.log("NETWORK EVENTS:");
for (const e of events) console.log(" ", JSON.stringify(e));

ws.close();
chrome.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}
