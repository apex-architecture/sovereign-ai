/**
 * Crops one element out of a page, so a block can be read in pixels instead of trusted.
 *
 *   node scripts/crop-el.mjs engines.html "#pm-out" runs/shots/crops/prompt-matrix.png
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
  process.env.APEX_CHROME_BIN ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.APEX_CDP_PORT ?? 9342);
const BASE = process.env.APEX_RAIL_URL ?? "http://127.0.0.1:8788";
const PAGE = process.argv[2] ?? "studio.html";
const SELECTOR = process.argv[3] ?? "body";
const OUT = process.argv[4] ?? `runs/shots/crops/${PAGE.replace(/\.html$/, "")}-crop.png`;
const WIDTH = Number(process.argv[5] ?? 1440);

const profile = mkdtempSync(path.join(os.tmpdir(), "apex-crop-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--enable-unsafe-swiftshader",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
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
  throw new Error("no debugging target");
}

const ws = new WebSocket(await endpoint());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 0;
const waiting = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
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
await send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: WIDTH < 800,
});
await send("Page.navigate", { url: `${BASE}/${PAGE}` });
await sleep(2800);

const { result } = await send("Runtime.evaluate", {
  expression: `(() => {
    const q = ${JSON.stringify(SELECTOR)};
    const el = q.startsWith("js:") ? eval(q.slice(3)) : document.querySelector(q);
    if (!el) return "null";
    const r = el.getBoundingClientRect();
    return JSON.stringify({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
  })()`,
  returnByValue: true,
});
if (!result.value || result.value === "null") {
  console.log(`no element matches ${SELECTOR}`);
  ws.close();
  chrome.kill();
  process.exit(1);
}
const box = JSON.parse(result.value);
const shot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: {
    x: Math.max(0, box.x),
    y: Math.max(0, box.y),
    width: Math.max(1, box.w),
    height: Math.max(1, box.h),
    scale: 1,
  },
});
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(shot.data, "base64"));
console.log(`ok    ${OUT}  ${Math.round(box.w)}x${Math.round(box.h)} at (${Math.round(box.x)}, ${Math.round(box.y)})`);
ws.close();
chrome.kill();
