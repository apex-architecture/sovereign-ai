/**
 * Prove the doors are live: clickable links on every Connect card, on the registry, on the engines.
 *
 *   node scripts/live-door-check.mjs https://filmverse-1mil8xwzv4y.qoder.website
 *
 * Headless Chrome over the DevTools Protocol. Each page is really loaded and the DOM is really
 * read. Nothing is inferred from a build log.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = (process.argv[2] ?? "http://127.0.0.1:5188").replace(/\/$/, "");
const PORT = 9334;

const profile = mkdtempSync(path.join(tmpdir(), "apex-doors-"));
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
  if (r.result?.exceptionDetails) return null;
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");

async function open(url) {
  await send("Page.navigate", { url });
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    const ready = await evaluate("document.readyState");
    if (ready === "complete") break;
  }
  await sleep(1800);
}

/* --------------------------------------------------------------- studio home */

await open(`${BASE}/index.html`);
const home = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('#connect-grid .cx-card')];
  const withAction = cards.filter((c) => c.querySelector('a.cx-btn, button.cx-btn'));
  const ext = cards.filter((c) => [...c.querySelectorAll('a.cx-btn')].some((a) => /^https?:/.test(a.getAttribute('href') || '')));
  return JSON.stringify({
    cards: cards.length,
    withAction: withAction.length,
    withExternal: ext.length,
    sample: cards.slice(0, 4).map((c) => {
      const name = c.querySelector('.cx-name')?.textContent?.trim() || '';
      const badge = c.querySelector('.cx-badge')?.textContent?.trim() || '';
      const acts = [...c.querySelectorAll('a.cx-btn, button.cx-btn')].map((a) => a.textContent.trim());
      return name + ' [' + badge + '] ' + acts.join(' | ');
    }),
  });
})()`);
console.log("STUDIO HOME:", home);

/* ----------------------------------------------------------------- registry */

await open(`${BASE}/tools.html`);
const tools = await evaluate(`(() => {
  const heads = [...document.querySelectorAll('thead th')].map((t) => t.textContent.trim());
  const rows = document.querySelectorAll('tbody tr');
  const links = document.querySelectorAll('tbody a[target="_blank"]');
  const openLinks = [...document.querySelectorAll('tbody a')].filter((a) => a.textContent.includes('Open'));
  return JSON.stringify({
    upstreamColumn: heads.includes('Upstream'),
    head: heads.join(' | '),
    rows: rows.length,
    externalLinks: links.length,
    openLinks: openLinks.length,
    firstRows: [...rows].slice(0, 3).map((r) => r.textContent.replace(/\\s+/g, ' ').trim().slice(0, 150)),
  });
})()`);
console.log("TOOLS PAGE:", tools);

/* ------------------------------------------------------------------ engines */

await open(`${BASE}/engines.html`);
const engines = await evaluate(`(() => {
  const heads = [...document.querySelectorAll('thead th')].map((t) => t.textContent.trim());
  const rows = document.querySelectorAll('tbody tr');
  const links = document.querySelectorAll('tbody a[target="_blank"]');
  return JSON.stringify({
    whereColumn: heads.includes('Where it lives'),
    rows: rows.length,
    externalLinks: links.length,
    sample: [...rows].slice(0, 2).map((r) => r.textContent.replace(/\\s+/g, ' ').trim().slice(0, 140)),
  });
})()`);
console.log("ENGINES PAGE:", engines);

/* ------------------------------------------- live bundle carries the new doors */

const bundle = await evaluate(`(async () => {
  const t = await (await fetch('/data.generated.min.js')).text();
  const hits = ['audio-agi/audiosep', 'dragonfly-reverb', 'GNOME/shotwell', 'opencomic', 'Snapchat/KeyDB', 'sismics/docs', 'frame-interpolation', 'anoncreds-rs'];
  const found = hits.filter((h) => t.includes(h));
  const uCount = (t.match(/"u":"https?:\\/\\//g) || []).length;
  return JSON.stringify({ bytes: t.length, found, uCount });
})()`);
console.log("LIVE BUNDLE:", bundle);

ws.close();
chrome.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}
