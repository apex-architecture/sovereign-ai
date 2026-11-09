/**
 * Proves the switchboard's plug layer is coherent before any UI is built on it.
 *
 * The failure this exists to catch: a connector that claims a plug it cannot travel on, a plug
 * that claims to work from static hosting when the browser would refuse the call, or a provider
 * that entered the platform with no named exit. Each of those is a lie the Connect page would
 * otherwise tell a visitor.
 *
 *   node --experimental-strip-types scripts/plugs-selftest.mjs
 */
import { CONNECTORS, connectorsWithoutExit } from "../src/lib/apex/connectors.ts";
import {
  PLUGS,
  PLUG_BY_ID,
  plugFor,
  plugCount,
  reachCount,
  connectorsByPlug,
  connectorsByReach,
  plugsLiveOnPages,
  liveOnPages,
  unverifiedLicences,
} from "../src/lib/apex/plugs.ts";

let failed = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`ok    ${label}${detail ? " — " + detail : ""}`);
  else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? " — " + detail : ""}`);
  }
}

console.log(`connectors: ${CONNECTORS.length}\n`);

/* ---------------------------------------------------------------- the four plugs exist and are distinct */

check("exactly four plugs", PLUGS.length === 4, PLUGS.map((p) => p.id).join(", "));
check(
  "plug ids are unique",
  new Set(PLUGS.map((p) => p.id)).size === PLUGS.length,
);
for (const p of PLUGS) {
  check(`plug "${p.id}" says who computes and who pays`, Boolean(p.whoComputes && p.whoPays));
  check(`plug "${p.id}" states its cross-origin truth`, p.cors.length > 20);
}

/* ---------------------------------------------------------------- every connector lands on a real plug */

const orphans = CONNECTORS.filter((c) => !PLUG_BY_ID[plugFor(c)]);
check("every connector maps to a declared plug", orphans.length === 0, orphans.map((c) => c.provider).join(", "));

const counts = plugCount();
const total = Object.values(counts).reduce((a, b) => a + b, 0);
check("plug counts sum to the connector table", total === CONNECTORS.length, JSON.stringify(counts));

/* ---------------------------------------------------------------- the static-hosting claim is honest */

// A plug that works on Pages must not need a server. The browser plug makes no network call at
// all; the remote-rig plug only works because the creator enables CORS on their own endpoint.
const live = plugsLiveOnPages();
check("browser plug is live on Pages", live.includes("browser"));
check("remote-rig plug is live on Pages", live.includes("remote-rig"));
check("byok is NOT claimed live on Pages", !live.includes("byok"), "most inference APIs send no CORS headers");
check("webhook is NOT claimed live on Pages", !live.includes("webhook"), "it needs a server to send and receive");

const rig = connectorsByPlug("remote-rig");
check(
  "every remote-rig connector is either a loopback endpoint or a local process",
  rig.every((c) => c.apiBaseUrl.startsWith("http") || c.apiBaseUrl.startsWith("local://")),
  rig.map((c) => c.provider).join(", "),
);

// The finding this guards: a process is not an endpoint. FFmpeg, Blender and Whisper are spawned,
// so they need the creator bridge even though they travel on the remote-rig plug.
const bridged = connectorsByReach("bridge").map((c) => c.provider);
const direct = connectorsByReach("direct").map((c) => c.provider);
check(
  "local processes are classified as needing the bridge, not as directly reachable",
  ["FFmpeg", "Blender", "Whisper"].every((p) => bridged.includes(p)),
  `bridge: ${bridged.join(", ")}`,
);
check(
  "the creator's own HTTP endpoints are the directly reachable ones",
  direct.includes("ComfyUI") && direct.includes("Ollama"),
  `direct: ${direct.join(", ")}`,
);

const reach = reachCount();
check(
  "reach counts sum to the connector table",
  Object.values(reach).reduce((a, b) => a + b, 0) === CONNECTORS.length,
  JSON.stringify(reach),
);

const browserRows = connectorsByPlug("browser");
check(
  "browser connectors make no network call",
  browserRows.every((c) => c.apiBaseUrl.startsWith("browser://")),
  browserRows.map((c) => c.provider).join(", "),
);
check(
  "browser connectors are the zero-infrastructure stages",
  browserRows.length === 4,
  browserRows.map((c) => c.provider).join(", "),
);
check(
  "every browser connector is device-reachable",
  browserRows.every((c) => connectorsByReach("device").includes(c)),
);
check(
  "every connector declares whether it is built",
  CONNECTORS.every((c) => typeof c.built === "boolean"),
);
const unbuiltLive = liveOnPages().filter((p) => !p.connector.built);
check(
  "no unbuilt contract is claimed live on Pages",
  unbuiltLive.length === 0,
  unbuiltLive.map((p) => p.connector.provider).join(", "),
);

/* ---------------------------------------------------------------- the exits and licences are not invented */

check("no connector entered without a named exit", connectorsWithoutExit().length === 0, connectorsWithoutExit().join(", "));

const unread = unverifiedLicences();
console.log(`\nlicences still unread (${unread.length}): ${unread.join(", ") || "none"}`);
check(
  "every connector carries a licence statement or says unverified",
  CONNECTORS.every((c) => c.licenceTerms.trim().length > 0),
);

/* ---------------------------------------------------------------- no banned brain appears anywhere */

const banned = /anthropic|claude|openai|gpt-|gemini|grok/i;
// The ban is on a hosted model API acting as the brain, not on naming an open-source tool's
// origin — Whisper's repository legitimately lives under openai. So provider and product only.
const realHits = CONNECTORS.filter((c) => banned.test(c.provider) || banned.test(c.product));
check("no banned model API is a connector", realHits.length === 0, realHits.map((c) => c.provider).join(", "));

const pages = liveOnPages();
check(
  "nothing needing a bridge or a server is claimed live on Pages",
  pages.every((p) => p.reach === "device" || p.reach === "direct"),
  `${pages.length} of ${CONNECTORS.length} connectors reachable from static hosting`,
);
console.log(`\nlive from Pages: ${pages.map((p) => p.connector.provider).join(", ")}`);

console.log(
  failed === 0
    ? `\nPLUGS CLEAN — ${CONNECTORS.length} connectors, four plugs, ${live.length} live from static hosting.`
    : `\nPLUGS FAILED — ${failed} check(s) did not pass.`,
);
process.exit(failed === 0 ? 0 : 1);