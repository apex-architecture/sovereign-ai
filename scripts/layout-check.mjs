/**
 * Measures the rail in a real Chrome, at real widths.
 *
 * A screenshot proves something was painted; it does not say which element was too wide. This
 * check drives headless Chrome over the DevTools protocol, sets an exact viewport, and prints the
 * numbers the layout engine actually used: viewport, scroll width, and the box of anything that
 * crosses the right edge. It fails when a page can be scrolled sideways, which on a phone is the
 * difference between a rail and a broken page.
 *
 *   node scripts/serve-rail.mjs 8788   # first, or this script says the rail is not serving
 *   node scripts/layout-check.mjs [page.html ...]   # default: every page in verse-site/
 */

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
  process.env.APEX_CHROME_BIN ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.APEX_CDP_PORT ?? 9333);
const BASE = process.env.APEX_RAIL_URL ?? "http://127.0.0.1:8788";
const SITE = path.resolve(import.meta.dirname, "..", "verse-site");
/**
 * Every page in the rail, not a hand-kept list: a page added to the directory is measured by the
 * next run without anyone remembering to add it here. Pass paths as arguments to narrow it.
 */
const PAGES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(SITE).filter((f) => f.endsWith(".html")).sort();
const WIDTHS = [
  { w: 390, h: 844, label: "phone" },
  { w: 768, h: 1024, label: "tablet" },
  { w: 1440, h: 900, label: "desktop" },
];

/**
 * Chrome paints its own "refused to connect" page when nothing is serving, and an error page
 * never scrolls sideways — so a dead server used to print a wall of PASS lines about a page
 * nobody measured. Answering the rail before opening a browser is the difference between a
 * verdict and a silence.
 */
try {
  const preflight = await fetch(`${BASE}/${PAGES[0]}`);
  if (!preflight.ok) {
    console.log(`RAIL NOT SERVING — ${BASE}/${PAGES[0]} answered HTTP ${preflight.status}`);
    process.exit(2);
  }
} catch {
  console.log(
    `RAIL NOT SERVING — nothing answered ${BASE}. Start it first: node scripts/serve-rail.mjs <port in ${BASE}>`,
  );
  process.exit(2);
}

const profile = mkdtempSync(path.join(os.tmpdir(), "apex-layout-"));const chrome = spawn(
  CHROME,
  ["--headless=new", "--enable-unsafe-swiftshader", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"],
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
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  } else if (msg.method) events.push(msg.method);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (nextId += 1);
    waiting.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Page.enable");

const MEASURE = `(() => {
  const vw = window.__apexCheckW;
  // An element inside its own scroll container is allowed to be wider than the phone: the browser
  // gives the reader a scrollbar and the page itself does not move. Anything else is a defect.
  const contained = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && p.clientWidth + 1 < el.getBoundingClientRect().width) return true;
    }
    return false;
  };
  const wide = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 && !contained(el)) {
      wide.push({ sel: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).join(".") : ""), right: Math.round(r.right), width: Math.round(r.width) });
    }
  }
  wide.sort((a, b) => b.right - a.right);
  const scrollW = document.documentElement.scrollWidth;
  // The element that actually widens the document is the one whose right edge reaches scrollWidth.
  const atEdge = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (Math.abs(Math.round(r.right) - scrollW) <= 1 && scrollW > vw) {
      atEdge.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).join(".") : ""));
    }
  }
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { sel, x: Math.round(r.left), w: Math.round(r.width), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), fs: Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10 };
  };
  const tables = [...document.querySelectorAll("table")].map((t) => {
    const r = t.getBoundingClientRect();
    const p = t.parentElement;
    return { id: t.id || t.className, w: Math.round(r.width), right: Math.round(r.right), parent: p.id || p.className, ox: getComputedStyle(p).overflowX, pw: p.clientWidth };
  });
  return { vw, vh: window.innerHeight, scrollWidth: scrollW, title: document.title, nodes: document.querySelectorAll("body *").length, overflowing: wide.slice(0, 6), atEdge: [...new Set(atEdge)].slice(0, 6), tables, boxes: [".act", "h1.mast", "p.lede", "#scroll-hint"].map(box).filter(Boolean) };
})()`;

let failures = 0;
for (const page of PAGES) {
  for (const { w, h, label } of WIDTHS) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
    await send("Page.navigate", { url: `${BASE}/${page}` });
    events.length = 0;
    for (let i = 0; i < 80 && !events.includes("Page.loadEventFired"); i += 1) await sleep(100);
    await sleep(700);
    await send("Runtime.evaluate", { expression: `window.__apexCheckW = ${w}` });
    const { result } = await send("Runtime.evaluate", { expression: MEASURE, returnByValue: true });
    const m = result.value;
    // A phone that lays out at 954px has not "fitted" the page: the browser widened the layout
    // viewport to contain something, so every word on the page is drawn at a third of its size.
    // A page with no title and no body children is not one of ours — it is the browser's own
    // error screen, which sits perfectly still and would otherwise be read as a clean layout.
    const arrived = Boolean(m.title) && m.nodes > 20;
    const over = !arrived || m.scrollWidth > m.vw + 1 || m.vw > w + 1;
    if (over) failures += 1;
    console.log(
      `${over ? "FAIL" : "PASS"}  ${page.padEnd(16)} ${label.padEnd(8)} ${String(w).padStart(4)}px  scrollWidth=${m.scrollWidth} innerWidth=${m.vw}${arrived ? "" : `   <- nothing was served (title="${m.title}", ${m.nodes} nodes)`}`,
    );
    if (m.atEdge?.length) console.log(`        widens the document: ${m.atEdge.join(" , ")}`);
    for (const t of m.tables ?? []) console.log(`        table ${String(t.id).padEnd(10)} w=${t.w} right=${t.right} parent=#${t.parent} overflowX=${t.ox} parentW=${t.pw}`);
    for (const o of m.overflowing) console.log(`        over by ${o.right - m.vw}px (w=${o.width})  ${o.sel.slice(0, 90)}`);
    for (const b of m.boxes ?? []) {
      const past = b.right > m.vw + 1 ? "  <- past the viewport" : "";
      const below = b.bottom > m.vh + 1 ? "  <- below the fold" : "";
      console.log(`        ${b.sel.padEnd(12)} x=${b.x} w=${b.w} right=${b.right} top=${b.top} bottom=${b.bottom} font=${b.fs}px${past}${below}`);
    }
    if (process.env.APEX_SHOT_DIR) {
      mkdirSync(process.env.APEX_SHOT_DIR, { recursive: true });
      await sleep(1200);
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const out = path.join(process.env.APEX_SHOT_DIR, `${page.replace(/\.html$/, "")}-${w}.png`);
      writeFileSync(out, Buffer.from(shot.data, "base64"));
      console.log(`        shot ${out}`);
    }
  }
}

ws.close();
chrome.kill();
console.log(failures ? `\nFAIL  ${failures} viewport(s) failed: scrolls sideways, lays out at the wrong width, or never served a rail page` : `\nPASS  ${PAGES.length} page(s) of the rail, none scrolls sideways at phone, tablet or desktop width`);
process.exit(failures ? 1 : 0);
