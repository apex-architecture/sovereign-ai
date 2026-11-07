/**
 * Load the whole live registry and count the doors.
 *
 *   node scripts/live-registry-check.mjs https://filmverse-1mil8xwzv4y.qoder.website
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = (process.argv[2] ?? "http://127.0.0.1:5188").replace(/\/$/, "");
const PORT = 9335;

const profile = mkdtempSync(path.join(tmpdir(), "apex-reg-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  "--window-size=1440,1200",
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
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.text };
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: `${BASE}/tools.html` });
for (let i = 0; i < 40; i++) {
  await sleep(400);
  if ((await evaluate("document.readyState")) === "complete") break;
}
await sleep(1800);

for (let i = 0; i < 40; i++) {
  const more = await evaluate(`(() => { const b = document.getElementById('more'); if (!b || b.disabled) return false; b.click(); return true; })()`);
  if (!more) break;
  await sleep(160);
}
await sleep(1200);

const report = await evaluate(`(() => {
  const reg = document.querySelectorAll('#rows tr');
  const doorCells = [...reg].map((r) => {
    const cell = r.querySelector('td:last-child');
    const a = cell ? cell.querySelector('a[target="_blank"]') : null;
    return { name: (r.querySelector('td')?.textContent || '').trim(), href: a ? a.getAttribute('href') : null };
  });
  const withDoor = doorCells.filter((d) => d.href);
  const without = doorCells.filter((d) => !d.href);
  return JSON.stringify({
    registryRows: reg.length,
    withDoor: withDoor.length,
    without: without.length,
    withoutNames: without.map((d) => d.name),
    sampleHrefs: withDoor.slice(0, 3).map((d) => d.href),
    note: document.getElementById('capped')?.textContent?.trim() || '',
    filterNote: document.getElementById('filterNote')?.textContent?.trim() || '',
  });
})()`);
console.log("REGISTRY:", report);

const bundle = await evaluate(`(async () => {
  const t = await (await fetch('/data.generated.min.js')).text();
  const hosts = ['shotwell-project.org', 'teedy.io', 'datatracker.ietf.org', 'openmusicarchive.org', 'arxiv.org/abs/1803.09010'];
  const found = hosts.filter((h) => t.includes(h));
  const uCount = (t.match(/"u":"https?:\\/\\//g) || []).length;
  const uCount2 = (t.match(/"u":"/g) || []).length;
  return JSON.stringify({ bytes: t.length, found, uEscaped: uCount, uAny: uCount2 });
})()`);
console.log("BUNDLE:", bundle);

ws.close();
chrome.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}
