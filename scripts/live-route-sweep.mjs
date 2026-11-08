/**
 * Proves every route of the hosted platform actually renders.
 *
 * A deploy that returns 200 for the front door proves one thing: the front door exists. It does
 * not prove the theater plays, the registry lists rows, or the verifier accepts a receipt. Those
 * routes are separate documents behind a client-side router, so a fetch of the HTML says nothing
 * about what a visitor sees.
 *
 * So this drives a real Chrome against the real host, walks every route, and reports for each:
 *   - the title the browser ended up with,
 *   - the first heading, which proves the route's own component mounted,
 *   - the number of failed network requests on that route,
 *   - any text on the page that reads like an error,
 *   - where the browser actually landed, because a route that bounces an anonymous visitor home
 *     is correct behaviour and not a broken page.
 *
 * It also checks the one promise the platform makes to a visitor: the nav on the live site uses
 * the same names as the vocabulary in the repository. If the two drift, the words on the website
 * stop matching the code that ships it, and that is the failure this catches.
 *
 *   node scripts/live-route-sweep.mjs https://sovereignfilmverse.tech
 *   APEX_SWEEP_ROUTES=/,/verify node scripts/live-route-sweep.mjs https://sovereignfilmverse.tech
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { siteDir } from "./site-dir.mjs";

const CHROME =
  process.env.APEX_CHROME_BIN ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.APEX_CDP_PORT ?? 9351);
const BASE = (process.argv[2] ?? "https://sovereignfilmverse.tech").replace(/\/+$/, "");
const OUT = process.env.APEX_SHOT_DIR ?? "runs/shots";
const ROUTES = process.env.APEX_SWEEP_ROUTES
  ? process.env.APEX_SWEEP_ROUTES.split(",")
  : [
      "/",
      "/create",
      "/theater",
      "/vault",
      "/director",
      "/oracle",
      "/connect",
      "/verify",
      "/cost",
      "/admin",
      "/registry",
      "/seal",
      "/broadcast",
      "/nominate",
      "/beta",
      "/guide",
      "/legal",
    ];

/** The vocabulary the website must agree with. Read from the generated contract. */
const VOCAB_FILE = path.join(siteDir(), "vocabulary.js");
const EXPECTED_NAV = (() => {
  if (!existsSync(VOCAB_FILE)) return [];
  const raw = readFileSync(VOCAB_FILE, "utf8");
  const json = raw.slice(raw.indexOf("=") + 1).trim().replace(/;\s*$/, "");
  const vocab = JSON.parse(json);
  const ids = [...vocab.appNav.primary];
  return ids
    .map((id) => vocab.concepts.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => c.label.toLowerCase());
})();

const profile = mkdtempSync(path.join(os.tmpdir(), "apex-sweep-"));
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
  throw new Error(`chrome did not expose a debugging target on ${PORT}`);
}

const ws = new WebSocket(await endpoint());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let nextId = 0;
const waiting = new Map();
const events = [];
const failed = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) {
    waiting.get(m.id)(m);
    waiting.delete(m.id);
  } else if (m.method) {
    events.push(m.method);
    if (m.method === "Network.loadingFailed") failed.push(m.params.errorText);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (nextId += 1);
    waiting.set(id, (m) =>
      m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result),
    );
    ws.send(JSON.stringify({ id, method, params }));
  });
const evalJS = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
mkdirSync(OUT, { recursive: true });

const waitForLoad = async () => {
  events.length = 0;
  for (let i = 0; i < 120 && !events.includes("Page.loadEventFired"); i += 1) await sleep(100);
  await sleep(2400);
};

console.log(`host: ${BASE}`);
console.log(`routes: ${ROUTES.length}\n`);

/* The welcome gate covers the whole site on a first visit. Open it once, on the host's own
   origin, so every route is then measured the way a returning visitor sees it. Without that
   step every route would measure the welcome page and the sweep would be a lie. */
await send("Page.navigate", { url: `${BASE}/` });
await waitForLoad();
let gateOpen = false;
for (let i = 0; i < 12 && !gateOpen; i += 1) {
  gateOpen = await evalJS(
    `(()=>{try{sessionStorage.setItem("sovereign.entered","1");return sessionStorage.getItem("sovereign.entered")==="1"}catch(e){return false}})()`,
  );
  if (!gateOpen) await sleep(400);
}
console.log(gateOpen ? "gate: opened" : "gate: COULD NOT OPEN — routes will measure the welcome page");
console.log("");

let bad = 0;
let bounced = 0;
let navChecked = false;
let navOk = true;

for (const route of ROUTES) {
  events.length = 0;
  failed.length = 0;
  await send("Page.navigate", { url: `${BASE}${route}` });
  for (let i = 0; i < 120 && !events.includes("Page.loadEventFired"); i += 1) await sleep(100);
  await sleep(2400);

  const title = await evalJS("document.title");
  const landed = await evalJS("location.pathname");
  const h1 = await evalJS(
    `(document.querySelector("h1")||{innerText:""}).innerText.split(String.fromCharCode(10)).filter(function(x){return x.trim()}).join(" ").slice(0,72)`,
  );
  const body = await evalJS("document.body.innerText");
  const hit = body.match(/.{0,50}(not found|cannot read|undefined is not|something went wrong|internal server error|failed to load).{0,50}/i);
  const navCount = await evalJS(`document.querySelectorAll("nav a").length`);

  const redirected = landed !== route && landed !== route + "/";
  const ok = failed.length === 0 && !hit && (h1.length > 0 || redirected);
  if (!ok) bad += 1;
  if (redirected && ok) bounced += 1;
  const tag = redirected ? (ok ? "bounce" : "FAIL ") : ok ? "ok   " : "FAIL ";
  console.log(`${tag} ${route.padEnd(12)} ${String(title).slice(0, 42).padEnd(44)} h1="${h1.slice(0, 40)}"`);
  if (redirected) console.log(`        landed on ${landed}`);
  if (failed.length) console.log(`        failed requests: ${failed.slice(0, 4).join(", ")}`);
  if (hit) console.log(`        page text: ${hit[0].replace(/\s+/g, " ").trim()}`);
  if (navCount) console.log(`        nav links: ${navCount}`);

  if (!navChecked && EXPECTED_NAV.length) {
    navChecked = true;
    const labels = await evalJS(
      `[...document.querySelectorAll("aside nav a, nav a")].map(a=>a.innerText.split(String.fromCharCode(10))[0].trim().toLowerCase()).filter(Boolean)`,
    );
    const missing = EXPECTED_NAV.filter((l) => !labels.includes(l));
    navOk = missing.length === 0;
    console.log(`\nnav vs vocabulary: ${navOk ? "MATCH" : "DRIFT"} — ${EXPECTED_NAV.length - missing.length}/${EXPECTED_NAV.length} names`);
    if (!navOk) console.log(`        missing on the live site: ${missing.join(", ")}`);
  }

  const shot = await send("Page.captureScreenshot", { format: "png" });
  const safe = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
  writeFileSync(path.join(OUT, `SWEEP-${safe}.png`), Buffer.from(shot.data, "base64"));
}

if (!navChecked) console.log("\nnav vs vocabulary: NOT CHECKED — no vocabulary contract found next to the rail");

console.log(
  bad === 0 && navOk
    ? `\nSWEEP CLEAN — ${ROUTES.length}/${ROUTES.length} routes rendered, no failed requests.` +
        (bounced ? ` ${bounced} correctly bounced an anonymous visitor.` : "")
    : `\nSWEEP FAILED — ${bad} of ${ROUTES.length} routes did not render cleanly.` +
        (navOk ? "" : " The live nav does not match the vocabulary in the repository."),
);
ws.close();
chrome.kill();
process.exit(bad === 0 && navOk ? 0 : 1);
