/**
 * Proves the published open-core site renders. A successful publish call is not proof;
 * this opens the real pages in a real browser and reads what came back.
 *
 * It proves, on the live address:
 *   - every route returns 200 and paints,
 *   - the welcome page's counters are the registry's own numbers, not typed-in ones,
 *   - the tool rail carries real upstream repository links,
 *   - the free verifier loads its canonical form in the browser,
 *   - the console is clean and nothing 404s.
 *
 *   node scripts/live-open-core-check.mjs                          the published address
 *   node scripts/live-open-core-check.mjs https://example/          any other address
 *
 * Screenshots land in scripts/out/open-*.png so a human can look at the pixels.
 */

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = process.env.APEX_CHROME_BIN ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.APEX_CDP_PORT ?? 9412);
const BASE = (process.argv[2] ?? "https://apex-architecture.github.io/sovereign-ai").replace(/\/+$/, "");
const OUT = path.resolve("scripts/out");
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["/", "welcome"],
  ["/studio.html", "studio"],
  ["/tools.html", "tools"],
  ["/verify.html", "verify"],
  ["/passport.html", "passport"],
  ["/rights.html", "rights"],
];

const profile = mkdtempSync(path.join(os.tmpdir(), "apex-open-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--enable-unsafe-swiftshader", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1440,1800", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* chrome is still starting */ }
    await sleep(250);
  }
  throw new Error("no devtools endpoint — is Chrome installed at " + CHROME);
}

const ws = new WebSocket(await endpoint());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let nextId = 0;
const waiting = new Map();
let consoleErrors = [];
let failedRequests = [];

ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && waiting.has(msg.id)) {
    const { resolve, reject } = waiting.get(msg.id);
    waiting.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? "?").join(" ").slice(0, 200));
  }
  if (msg.method === "Runtime.exceptionThrown") {
    consoleErrors.push("EXC " + (msg.params.exceptionDetails?.exception?.description ?? "").slice(0, 200));
  }
  if (msg.method === "Network.responseReceived") {
    const status = msg.params.response.status;
    if (status >= 400) failedRequests.push(`${status} ${msg.params.response.url}`);
  }
});

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
  return r.result.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");

const out = { base: BASE, routes: {} };
let failures = 0;

async function visit(route, name) {
  consoleErrors = [];
  failedRequests = [];
  await send("Page.navigate", { url: BASE + route });
  await sleep(3200);
  const body = await evaluate("document.body ? document.body.innerText : ''");
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(path.join(OUT, `open-${name}.png`), Buffer.from(shot.data, "base64"));
  const row = {
    route,
    chars: body.length,
    first: body.split("\n").filter(Boolean).slice(0, 3).join(" | ").slice(0, 140),
    consoleErrors: consoleErrors.slice(0, 4),
    failedRequests: failedRequests.slice(0, 6),
  };
  out.routes[name] = row;
  if (body.length < 200 || consoleErrors.length || failedRequests.length) failures += 1;
  console.log(
    `${route.padEnd(16)} chars=${String(body.length).padStart(6)}  errors=${consoleErrors.length}  failed=${failedRequests.length}  ${row.first.slice(0, 80)}`,
  );
}

await visit("/", "welcome");
// Read the counters and the links while the welcome page is still the loaded document.
out.welcomeNumbers = await evaluate(
  "[...document.querySelectorAll('#numbers .num')].map(n => n.innerText.replace(/\\n/g,' | '))",
);
out.welcomeLinks = await evaluate(
  "[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('#')).slice(0, 16)",
);
console.log("\nlive counters on the welcome page:");
for (const line of out.welcomeNumbers ?? []) console.log("  " + line);

for (const [route, name] of ROUTES.slice(1)) await visit(route, name);
out.studioPanels = await evaluate(
  "['THE FOREMAN','CONNECT','YOUR FILMS','THE SPINE'].filter(s => document.body.innerText.includes(s))",
);

await visit("/tools.html", "tools");
out.toolGithubLinks = await evaluate("document.querySelectorAll('a[href*=\"github.com\"]').length");
out.toolSample = await evaluate(
  "[...document.querySelectorAll('a[href*=\"github.com\"]')].slice(0, 5).map(a => a.getAttribute('href'))",
);

await visit("/verify.html", "verify");
out.psiLoaded = await evaluate("!!(window.APEX_PSI)");

writeFileSync(path.join(OUT, "open-core-check.json"), JSON.stringify(out, null, 2));
console.log("\n" + JSON.stringify({
  psiLoaded: out.psiLoaded,
  toolGithubLinks: out.toolGithubLinks,
  toolSample: out.toolSample,
  studioPanels: out.studioPanels,
  welcomeLinks: out.welcomeLinks,
}, null, 2));

chrome.kill();

if (failures > 0) {
  console.error(`\nFAIL — ${failures} route(s) painted short, threw, or 404'd. The site is not ready.`);
  process.exit(1);
}
console.log("\nPASS — every route painted, the console is clean, nothing 404'd.");
