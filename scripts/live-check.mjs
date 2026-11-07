/**
 * Proves the published rail is the rail we built.
 *
 * A successful publish call says the upload finished. It does not say the pages render, that the
 * assets resolve, or that the dashboard is populated. This drives a real Chrome against the live
 * host, reads the DOM that actually arrives, and writes the screenshot it took.
 *
 *   node scripts/live-check.mjs [baseUrl]
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
  process.env.APEX_CHROME_BIN ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.APEX_CDP_PORT ?? 9345);
const BASE = process.argv[2] ?? "https://filmverse-1mil8xwzv4y.qoder.website";
const OUT = process.env.APEX_SHOT_DIR ?? "runs/shots";

const profile = mkdtempSync(path.join(os.tmpdir(), "apex-live-"));
const chrome = spawn(
  CHROME,
  ["--headless=new", "--enable-unsafe-swiftshader", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* chrome is still starting */
    }
    await sleep(250);
  }
  throw new Error(`chrome did not expose a debugging target on ${PORT}`);
}

const ws = new WebSocket(await endpoint());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let nextId = 0;
const waiting = new Map();
const events = [];
const failed = [];
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  } else if (msg.method) {
    events.push(msg.method);
    if (msg.method === "Network.loadingFailed") failed.push(msg.params.errorText);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (nextId += 1);
    waiting.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const evalJS = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
};

// Reading text without a regex: a newline inside a page expression is easier to split than to match.
const flat = (sel) =>
  `(document.querySelector(${JSON.stringify(sel)})||{innerText:""}).innerText.split(String.fromCharCode(10)).filter(function(x){return x.trim()}).join(" | ")`;

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
mkdirSync(OUT, { recursive: true });

const pages = process.env.APEX_LIVE_PAGES
  ? process.env.APEX_LIVE_PAGES.split(",")
  : ["index.html"];

for (const page of pages) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${BASE}/${page}` });
  events.length = 0;
  for (let i = 0; i < 100 && !events.includes("Page.loadEventFired"); i += 1) await sleep(100);
  await sleep(3200);

  console.log(`\n=== ${page}`);
  console.log("  title      :", await evalJS("document.title"));
  console.log("  url        :", await evalJS("location.href"));
  console.log("  hero       :", (await evalJS(flat(".st-hero"))).slice(0, 200));
  console.log("  integrity  :", (await evalJS(flat("#st-integrity"))).slice(0, 240));
  console.log("  cards      :", await evalJS(`document.querySelectorAll(".st-card").length`));
  console.log("  tiles      :", await evalJS(`document.querySelectorAll(".st-tile").length`));
  console.log("  chart bars :", await evalJS(`document.querySelectorAll("#st-chart .bar").length`));
  console.log("  rail foot  :", (await evalJS(flat(".side-foot"))).slice(0, 200));
  console.log("  images     :", await evalJS(`[...document.images].filter(i=>i.complete&&i.naturalWidth>0).length + "/" + document.images.length`));
  const sw = await evalJS("document.documentElement.scrollWidth");
  const iw = await evalJS("window.innerWidth");
  const sh = await evalJS("document.documentElement.scrollHeight");
  console.log(`  layout     : scrollWidth=${sw} innerWidth=${iw} scrollHeight=${sh}`);
  console.log("  net fails  :", failed.length ? failed.slice(0, 5).join(", ") : "none");

  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: sw, height: Math.min(sh, 3400), scale: 1 },
  });
  const out = path.join(OUT, `LIVE-${page.replace(/\.html$/, "")}-1440.png`);
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log("  shot       :", out);
}

ws.close();
chrome.kill();
