/**
 * Capture the published pages as pixels and write them outside %TEMP%.
 *
 *   node scripts/live-shot.mjs <baseUrl> <outDir>
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = (process.argv[2] ?? "http://127.0.0.1:5188").replace(/\/$/, "");
const OUT = process.argv[3] ?? path.resolve("shots");
const PORT = 9336;

mkdirSync(OUT, { recursive: true });

const profile = mkdtempSync(path.join(tmpdir(), "apex-shot-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  "--window-size=1600,1100",
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
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
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
await send("Emulation.setDeviceMetricsOverride", {
  width: 1600,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});

async function shoot(url, file, prep) {
  await send("Page.navigate", { url });
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    if ((await evaluate("document.readyState")) === "complete") break;
  }
  await sleep(2600);
  if (prep) await evaluate(prep);
  await sleep(1400);
  const res = await send("Page.captureScreenshot", { format: "png" });
  const b64 = res.result?.data;
  if (!b64) {
    console.log("no pixels for", url);
    return;
  }
  writeFileSync(path.join(OUT, file), Buffer.from(b64, "base64"));
  console.log("wrote", path.join(OUT, file));
}

await shoot(`${BASE}/index.html`, "live-studio-home.png");
await shoot(`${BASE}/index.html`, "live-connect-grid.png", `(() => { const g = document.getElementById('connect-grid'); if (g) g.scrollIntoView({ block: 'center' }); })()`);
await shoot(`${BASE}/tools.html`, "live-tools-registry.png", `(() => { const g = document.getElementById('rows'); if (g) g.scrollIntoView({ block: 'start' }); })()`);
await shoot(`${BASE}/engines.html`, "live-engines.png", `(() => { const g = document.querySelector('table'); if (g) g.scrollIntoView({ block: 'start' }); })()`);

ws.close();
chrome.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}
