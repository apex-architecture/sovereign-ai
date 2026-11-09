/**
 * Captures the whole page, not just the first screen.
 *
 * A viewport screenshot of a dashboard proves only that the first screen painted. The question
 * this answers is different: does the whole surface exist, in the right order, with the right
 * content. So it scrolls the page to its full height and captures the entire scrollable area.
 *
 *   node scripts/shot.mjs index.html 1440 390
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
  process.env.APEX_CHROME_BIN ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.APEX_CDP_PORT ?? 9339);
const BASE = process.env.APEX_RAIL_URL ?? "http://127.0.0.1:8792";
const OUT = process.env.APEX_SHOT_DIR ?? "runs/shots";
const args = process.argv.slice(2);
const PAGE = args[0] ?? "studio.html";
const WIDTHS = (args.slice(1).length ? args.slice(1) : ["1440"]).map(Number);

const profile = mkdtempSync(path.join(os.tmpdir(), "apex-shot-"));
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
const faults = [];
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  } else if (msg.method) {
    events.push(msg.method);
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      faults.push(`uncaught: ${d.exception?.description ?? d.text}`);
    }
    if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(msg.params.type)) {
      faults.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ")}`);
    }
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (nextId += 1);
    waiting.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");
mkdirSync(OUT, { recursive: true });

for (const w of WIDTHS) {
  const h = w < 800 ? 844 : 1000;
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
  await send("Page.navigate", { url: `${BASE}/${PAGE}` });
  events.length = 0;
  for (let i = 0; i < 80 && !events.includes("Page.loadEventFired"); i += 1) await sleep(100);
  await sleep(1600);
  // Force every lazy thing to lay out before the capture.
  await send("Runtime.evaluate", {
    expression: `document.querySelectorAll('img').forEach(i=>{i.loading='eager';i.decoding='sync'});window.scrollTo(0,0);`,
  });
  await sleep(1200);
  const { result } = await send("Runtime.evaluate", {
    expression: `JSON.stringify({sh:document.documentElement.scrollHeight,sw:document.documentElement.scrollWidth})`,
    returnByValue: true,
  });
  const { sh, sw } = JSON.parse(result.value);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: sw, height: sh, scale: 1 },
  });
  const out = path.join(OUT, `${PAGE.replace(/\.html$/, "")}-${w}-full.png`);
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log(`ok    ${out}  ${sw}x${sh}`);

  // A missing .join("") on an array of row templates prints as a run of commas above the table.
  // It is invisible in a build log and obvious in pixels, so it is checked in the DOM, not the source.
  const { result: scan } = await send("Runtime.evaluate", {
    expression: `(() => {
      const bad = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = walk.nextNode())) {
        const t = n.nodeValue.trim();
        if (/,{3,}/.test(t)) bad.push(t.slice(0, 60));
      }
      return JSON.stringify(bad);
    })()`,
    returnByValue: true,
  });
  for (const t of JSON.parse(scan.value)) faults.push(`${w}px: stray comma run — a .map() is missing .join(""): "${t}"`);
  if (sw > w) faults.push(`${w}px: page is ${sw}px wide, ${sw - w}px of horizontal overflow`);
}

ws.close();
chrome.kill();

const unique = [...new Set(faults)];
if (unique.length) {
  console.log(`\n${unique.length} RENDER FAULT(S) on ${PAGE}:`);
  for (const f of unique) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`\nPIXELS CLEAN — ${PAGE} at ${WIDTHS.join(", ")}px, no console errors, no stray artifacts, no overflow.`);
