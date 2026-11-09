/**
 * The engine room listens on loopback, but loopback is not a security boundary: any website the
 * creator visits can point a form or a fetch at 127.0.0.1. CORS only stops the attacker READING the
 * reply; a "simple request" (text/plain, or bodyless) is still SENT and still executes. These gates
 * prove the state-changing doors refuse both shapes of that attack and still admit the real client.
 *
 *   node scripts/engine-room-csrf-selftest.mjs
 *
 * Boots the engine room on a throwaway port, fires the attacks, kills it. Nothing is installed and
 * no render is started: the one admitted request carries an empty prompt so the handler answers 400
 * before it touches a driver.
 */
import { spawn } from "node:child_process";

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const GOOD = "https://filmverse-1mil8xwzv4y.qoder.website";
const EVIL = "https://evil.example";

const child = spawn(process.execPath, ["--experimental-strip-types", "scripts/local-rail.mjs"], {
  env: { ...process.env, APEX_RAIL_PORT: String(PORT) },
  stdio: "ignore",
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let up = false;
for (let i = 0; i < 60 && !up; i += 1) {
  try {
    await fetch(`${BASE}/api/running`);
    up = true;
  } catch {
    await sleep(250);
  }
}
if (!up) {
  child.kill();
  console.log("FAIL — the engine room never came up on the test port");
  process.exit(1);
}

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
};

const post = (path, { origin, type, body }) =>
  fetch(BASE + path, {
    method: "POST",
    headers: { ...(origin ? { origin } : {}), ...(type ? { "content-type": type } : {}) },
    body,
  });

// 1. The classic bypass: a cross-origin simple request with a JSON-looking text/plain body.
let r = await post("/api/run", { origin: EVIL, type: "text/plain", body: JSON.stringify({ prompt: "x" }) });
check("a hostile origin cannot run a driver via a text/plain simple request", r.status === 403, `status ${r.status}`);

// 2. Even with the right content type, a hostile origin is refused on the POST itself, not just the preflight.
r = await post("/api/run", { origin: EVIL, type: "application/json", body: JSON.stringify({ prompt: "x" }) });
check("a hostile origin is refused on the POST, not only on the preflight", r.status === 403, `status ${r.status}`);

// 3. An allowed origin still cannot smuggle a body past the preflight as text/plain.
r = await post("/api/run", { origin: GOOD, type: "text/plain", body: JSON.stringify({ prompt: "x" }) });
check("an allowed origin must still send application/json to change state", r.status === 403, `status ${r.status}`);

// 4. The bodyless tick is a simple request too; its Origin is checked even though it reads no body.
r = await post("/api/agent/tick", { origin: EVIL });
check("a hostile origin cannot trigger a machine audit via a bodyless POST", r.status === 403, `status ${r.status}`);

// 5. connect is state-changing as well.
r = await post("/api/connect", { origin: EVIL, type: "text/plain", body: JSON.stringify({ toolId: "apex_score" }) });
check("a hostile origin cannot prepare a handoff via a simple request", r.status === 403, `status ${r.status}`);

// 6. The real client shape is admitted: allowed origin + application/json. Empty prompt => the
//    handler itself answers 400, proving the gate opened without starting a render.
r = await post("/api/run", { origin: GOOD, type: "application/json", body: JSON.stringify({}) });
check("the published page's own request shape passes the gate", r.status === 400, `status ${r.status} (400 = handler reached, no render)`);

// 7. A shell with no Origin header is not a browser and must keep working.
r = await post("/api/run", { type: "application/json", body: JSON.stringify({}) });
check("a local shell with no Origin header still passes", r.status === 400, `status ${r.status}`);

child.kill();
if (failed) {
  console.log(`\n${failed} CSRF GATE(S) OPEN`);
  process.exit(1);
}
console.log("\nCSRF CLOSED — every state-changing door refuses simple requests and hostile origins; the real client and the shell still pass.");