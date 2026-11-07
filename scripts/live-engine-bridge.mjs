/**
 * Prove the published https page can drive the local engine room.
 *
 *   node scripts/live-engine-bridge.mjs https://filmverse-1mil8xwzv4y.qoder.website
 *
 * The public site is https; the engine room is on the loopback address. Chrome gates that with a
 * private-network preflight, so this is the only proof that matters.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = (process.argv[2] ?? "http://127.0.0.1:5188").replace(/\/$/, "");
const TOOL = process.argv[3] ?? "apex_score";
const EXTRA = process.argv.slice(4);
const PORT = 9337;

const profile = mkdtempSync(path.join(tmpdir(), "apex-bridge-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  "--window-size=1600,1100",
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
  if (r.result?.exceptionDetails) return "EXC: " + (r.result.exceptionDetails.text ?? "");
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.navigate", { url: `${BASE}/index.html` });
for (let i = 0; i < 40; i++) {
  await sleep(400);
  if ((await evaluate("document.readyState")) === "complete") break;
}
await sleep(6000);

console.log("PAGE ORIGIN:", await evaluate("location.origin"));
console.log(
  "ENGINE ROOM BADGE:",
  await evaluate(`(() => { const el = [...document.querySelectorAll('button,span,div,a')].find((n) => /ENGINE ROOM (ONLINE|OFFLINE)/i.test(n.textContent||'')); return el ? el.textContent.trim() : 'not found'; })()`),
);
console.log("CONNECT BRIEF:", await evaluate(`document.getElementById('connect-brief')?.textContent?.trim() || ''`));

/* the creator presses "Wake the engine room" — the browser's local-network prompt fires here */
const woke = await evaluate(`(() => { const b = document.querySelector('#connect-brief button'); if (!b) return null; b.click(); return b.textContent.trim(); })()`);
console.log("WAKE BUTTON:", woke);
if (woke) {
  for (let i = 0; i < 120; i++) {
    await sleep(700);
    const n = await evaluate(`document.querySelectorAll('#connect-grid button[data-run]').length`);
    if (n) break;
  }
  await sleep(1500);
}

console.log("CONNECT BRIEF AFTER WAKE:", await evaluate(`document.getElementById('connect-brief')?.textContent?.trim() || ''`));
console.log(
  "LIVE RUN BUTTONS:",
  await evaluate(`(() => { const b = [...document.querySelectorAll('#connect-grid button[data-run]')]; return b.length + ' -> ' + b.slice(0,4).map((x) => x.getAttribute('data-run') + ':' + x.textContent.trim()).join(' | '); })()`),
);

const direct = await evaluate(`(async () => {
  try {
    const r = await fetch('http://127.0.0.1:5188/api/drivers');
    const j = await r.json();
    return 'direct fetch ok: ' + j.drivers.length + ' drivers, ' + j.drivers.filter((d) => d.ok).length + ' answering';
  } catch (e) { return 'direct fetch failed: ' + e.message; }
})()`);
console.log("DIRECT FROM PAGE:", direct);

/* the real thing: press the button on the published page and read the answer */

const btn = await evaluate(`(() => { const b = document.querySelector('#connect-grid button[data-run="${TOOL}"]'); return b ? b.textContent.trim() : null; })()`);
console.log(`button for ${TOOL}: ${btn}`);

if (btn) {
  await evaluate(`document.querySelector('#connect-grid button[data-run="${TOOL}"]').click()`);
  let out = null;
  for (let i = 0; i < 60; i++) {
    await sleep(700);
    out = await evaluate(
      `(() => { const o = document.getElementById('connect-out'); if (!o || o.hidden) return null; const t = o.querySelector('.co-state'); const l = o.querySelector('.co-log'); const a = o.querySelectorAll('.co-art'); return JSON.stringify({ state: t ? t.textContent.trim() : '', log: l ? l.textContent.slice(0,220) : '', artefacts: a.length }); })()`,
    );
    if (out) break;
  }
  console.log("PUBLISHED PAGE RUN RESULT:", out);
} else {
  console.log("RESULT: published page has no live run button for", TOOL);
}

ws.close();
chrome.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}
