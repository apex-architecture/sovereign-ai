/**
 * Drives the published dashboard: search, assistant, and the links that leave the page.
 *
 * The claim this platform makes is that it is interconnected. That claim only counts if the
 * connections work on the rail the public can reach, not on a laptop.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
  process.env.APEX_CHROME_BIN ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.APEX_CDP_PORT ?? 9347);
const BASE = process.argv[2] ?? "https://filmverse-1mil8xwzv4y.qoder.website";

const profile = mkdtempSync(path.join(os.tmpdir(), "apex-liveint-"));
const chrome = spawn(
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
    } catch { /* starting */ }
    await sleep(250);
  }
  throw new Error("no cdp");
}
const ws = new WebSocket(await endpoint());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 0;
const waiting = new Map();
const events = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  else if (m.method) events.push(m.method);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (nextId += 1);
    waiting.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const evalJS = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `${BASE}/index.html` });
events.length = 0;
for (let i = 0; i < 100 && !events.includes("Page.loadEventFired"); i += 1) await sleep(100);
await sleep(3200);

console.log("1. assistant chip — 'Which tool makes a storyboard?'");
await evalJS(`[...document.querySelectorAll("#a-chips button, #a-chips .chip")].find(b=>b.textContent.includes("storyboard")).click()`);
await sleep(1000);
const answer = await evalJS(`document.querySelector("#a-answer").innerText`);
console.log("   answer chars:", answer.length);
console.log("   first offer :", answer.split(String.fromCharCode(10)).slice(2, 5).join(" / "));
console.log("   prints the withheld count:", /withheld by house rule/.test(answer));
console.log("   prints the refusal set   :", /met/.test(answer) && /survive every gate/.test(answer));

console.log("\n2. global search — type 'wan'");
await evalJS(`(()=>{const i=document.querySelector("#st-search input, .st-search input, input[type=search]");i.focus();i.value="wan";i.dispatchEvent(new Event("input",{bubbles:true}));})()`);
await sleep(800);
const results = await evalJS(`document.querySelector(".st-results") ? document.querySelector(".st-results").innerText : "NO RESULTS NODE"`);
console.log("   result lines:", results.split(String.fromCharCode(10)).filter((x)=>x.trim()).length);

console.log("\n3. click the first engine result and see where it lands");
await evalJS(`(()=>{const r=document.querySelector(".st-results a, .st-results button");if(r)r.click();})()`);
await sleep(1600);
console.log("   landed on:", await evalJS(`location.href`));

console.log("\n4. back home, click a workflow tile -> the mission spine");
await send("Page.navigate", { url: `${BASE}/index.html` });
await sleep(3000);
await evalJS(`(()=>{const t=document.querySelector('.st-step[data-stage]');if(t)t.click();})()`);
await sleep(1800);
console.log("   landed on:", await evalJS(`location.href`));
console.log("   spine rows:", await evalJS(`document.querySelectorAll("#m-spine tbody tr").length`));

console.log("\n5. the hero's 'Watch the real run' goes to real measured footage");
await send("Page.navigate", { url: `${BASE}/index.html` });
await sleep(3000);
const hrefs = await evalJS(`JSON.stringify([...document.querySelectorAll(".st-hero a")].map(a=>a.getAttribute("href")))`);
console.log("   hero links:", hrefs);

ws.close();
chrome.kill();
