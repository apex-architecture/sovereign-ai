/**
 * Names the elements that stick out past the viewport.
 *
 * The render gate says "24px of horizontal overflow" but not which box did it. This prints the
 * offenders, their widths and their computed box-sizing so the fix is aimed at the real culprit
 * instead of at the page.
 *
 *   node scripts/overflow-probe.mjs engines.html 390
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
  process.env.APEX_CHROME_BIN ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.APEX_CDP_PORT ?? 9341);
const BASE = process.env.APEX_RAIL_URL ?? "http://127.0.0.1:8788";
const PAGE = process.argv[2] ?? "studio.html";
const WIDTH = Number(process.argv[3] ?? 390);

const profile = mkdtempSync(path.join(os.tmpdir(), "apex-overflow-"));
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
  height: 900,
  deviceScaleFactor: 1,
  mobile: WIDTH < 800,
});
await send("Page.navigate", { url: `${BASE}/${PAGE}` });
await sleep(2600);

const { result } = await send("Runtime.evaluate", {
  expression: `(() => {
    const vw = document.documentElement.clientWidth;
    const clipped = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
      }
      return false;
    };
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 0.5 && !clipped(el)) {
        const cs = getComputedStyle(el);
        out.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          cls: (el.className && String(el.className).slice(0, 40)) || "",
          right: Math.round(r.right),
          width: Math.round(r.width),
          scrollW: el.scrollWidth,
          box: cs.boxSizing,
          text: (el.textContent || "").trim().slice(0, 50),
        });
      }
    }
    return JSON.stringify({ vw, docW: document.documentElement.scrollWidth, out: out.slice(0, 25) });
  })()`,
  returnByValue: true,
});
console.log(JSON.stringify(JSON.parse(result.value), null, 1));
ws.close();
chrome.kill();
