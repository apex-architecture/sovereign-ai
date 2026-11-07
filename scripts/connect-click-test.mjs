/**
 * Click the Connect button in a real browser and read what the page says.
 *
 *   node scripts/connect-click-test.mjs
 *
 * Headless Chrome over the DevTools Protocol: the page is really loaded, the button is really
 * clicked, and the answer is read out of the DOM. Nothing is mocked and nothing is asserted from
 * a log line.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_UNDER_TEST = process.argv[2] ?? "http://127.0.0.1:5188/";
const TOOL = process.argv[3] ?? "apex_score";
const PORT = 9333;

const profile = mkdtempSync(path.join(tmpdir(), "apex-click-"));
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
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL_UNDER_TEST });
// The live probe walks every tool on the disk; it lands after the frozen grid is already drawn.
await sleep(9000);

const cards = await evaluate(`document.querySelectorAll('#connect-grid .cx-card').length`);
console.log(`cards rendered: ${cards}`);
if (!cards) {
  console.log(`debug: url=${await evaluate("location.href")} ready=${await evaluate("document.readyState")}`);
  console.log(`debug: grid html=${String(await evaluate("document.getElementById('connect-grid')?.outerHTML || ''")).slice(0, 300)}`);
  console.log(`debug: brief=${await evaluate("document.getElementById('connect-brief')?.textContent")}`);
}

const buttonLabel = await evaluate(
  `(() => { const b = document.querySelector('#connect-grid [data-run="${TOOL}"]'); return b ? b.textContent.trim() : null; })()`,
);
console.log(`button for ${TOOL}: ${buttonLabel}`);

if (!buttonLabel) {
  console.log("RESULT: no button for that tool");
} else {
  await evaluate(`document.querySelector('#connect-grid [data-run="${TOOL}"]').click()`);
  let out = "";
  for (let i = 0; i < 60; i++) {
    await sleep(700);
    out = await evaluate(
      `(() => { const o = document.getElementById('connect-out'); if (!o || o.hidden) return null; const t = o.querySelector('.co-state'); const l = o.querySelector('.co-log'); const a = o.querySelectorAll('.co-art'); return JSON.stringify({ state: t ? t.textContent : '', log: l ? l.textContent.slice(0,300) : '', artefacts: a.length }); })()`,
    );
    if (out && /succeeded|failed|blocked|not-installed|portal|no answer/.test(out)) break;
  }
  console.log(`page says: ${out}`);
}

ws.close();
chrome.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}
