/**
 * Evaluate one expression in a real browser page and print the answer.
 *
 *   node scripts/probe.mjs <url> <expression>
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_UNDER_TEST = process.argv[2];
const EXPR = process.argv[3];
const PORT = 9340;

const profile = mkdtempSync(path.join(tmpdir(), "apex-probe-"));
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
const logs = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.exceptionThrown") {
    logs.push("EXCEPTION " + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || "").slice(0, 400));
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    logs.push("CONSOLE " + (msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  }
};
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((r) => pending.set(id, r));
}
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return "EXC: " + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL_UNDER_TEST });
for (let i = 0; i < 40; i++) {
  await sleep(400);
  if ((await evaluate("document.readyState")) === "complete") break;
}
await sleep(7000);

console.log(await evaluate(EXPR));
if (logs.length) {
  console.log("--- page logs ---");
  for (const l of logs.slice(0, 20)) console.log(l);
}

ws.close();
chrome.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}
