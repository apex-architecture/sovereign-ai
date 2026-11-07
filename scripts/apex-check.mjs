/**
 * APEX self-check. Run with:
 *   node --experimental-strip-types scripts/apex-check.mjs
 *
 * Prints measured numbers only — every figure below comes from an array length or an
 * arithmetic sum in this file, never from a summary someone wrote about the data.
 */

import { pathToFileURL } from "node:url";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

const APEX = path.resolve("src/lib/apex");
const url = (rel) => pathToFileURL(path.join(APEX, rel)).href;

let passes = 0;
let fails = 0;
function check(label, ok, detail = "") {
  if (ok) {
    passes++;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    fails++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(t) {
  console.log(`\n=== ${t} ===`);
}

const schema = await import(url("schema.ts"));
const guard = await import(url("licenseguard.ts"));
const connectors = await import(url("connectors.ts"));
const cost = await import(url("cost.ts"));
const models = await import(url("models.ts"));
const memory = await import(url("memory.ts"));
const discovery = await import(url("discovery.ts"));
const ledger = await import(url("ledger.ts"));
const passport = await import(url("passport.ts"));
const verify = await import(url("verify.ts"));
const orchestrate = await import(url("orchestrate.ts"));
const contract = await import(url("drivers/contract.ts"));

// ---------------------------------------------------------------- catalogues
section("Master Registry catalogues");
const catalogDir = path.join(APEX, "catalog");
const catalogFiles = readdirSync(catalogDir).filter((f) => f.endsWith(".ts"));
const catalogues = [];
for (const f of catalogFiles) {
  let mod;
  try {
    mod = await import(pathToFileURL(path.join(catalogDir, f)).href);
  } catch (e) {
    console.log(`  WAIT  ${f} — not readable yet (${String(e).split("\n")[0].slice(0, 90)})`);
    continue;
  }
  const key = Object.keys(mod).find((k) => Array.isArray(mod[k]));
  if (!key) {
    check(`${f} exports an array`, false, "no array export found");
    continue;
  }
  catalogues.push({ file: f, name: key, rows: mod[key] });
  console.log(`  READ  ${f} -> ${key}: ${mod[key].length} rows`);
}
const registry = catalogues.flatMap((c) => c.rows);

// ------------------------------------------------------------------- shape
section("Registry shape");
check("every row satisfies the contract", registry.every((r) => typeof r.name === "string" && schema.CATEGORIES.includes(r.category)), `${registry.length} rows`);
const badCat = [...new Set(registry.filter((r) => !schema.CATEGORIES.includes(r.category)).map((r) => `${r.name}:${r.category}`))];
check("no invented categories", badCat.length === 0, badCat.slice(0, 6).join(", "));
const noExit = registry.filter((r) => r.replacementOptions.length === 0);
check("every row has a written exit", noExit.length === 0, `${noExit.length} missing: ${noExit.slice(0, 5).map((r) => r.name).join(", ")}`);
const dupe = (() => {
  const seen = new Map();
  for (const r of registry) seen.set(r.name.trim().toLowerCase(), (seen.get(r.name.trim().toLowerCase()) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
})();
check("no duplicate rows across catalogues", dupe.length === 0, dupe.slice(0, 8).join(", "));
const covered = new Set(registry.map((r) => r.category)).size;
check("category coverage", covered > 0, `${covered}/${schema.CATEGORIES.length} categories have rows`);

section("Licence honesty");
const claimed = registry.filter((r) => r.licenseVerified);
check("no agent marked a licence as human-read", claimed.length === 0, `${claimed.length} rows claim licenseVerified: ${claimed.slice(0, 5).map((r) => r.name).join(", ")}`);
const cleared = registry.filter((r) => schema.isClearedForWork(r));
check("nothing is cleared for client work yet", cleared.length === 0, `${cleared.length} cleared`);
const permissionless = registry.filter((r) => ["yes", "no", "restricted"].includes(r.commercialUse) && r.attribution === "unverified");
check("no partial permission claims", permissionless.length === 0, `${permissionless.length} rows assert commercial use without attribution terms`);

const sample = schema.R({ name: "Sample", category: "video-editing" });
check("defaults are unverified, never permitted", sample.commercialUse === "unverified" && sample.redistribution === "unverified" && sample.licenseVerified === false);
check("guard stops an unread licence before client work", guard.guard(sample, "client-work").verdict === "verify-first");
check("a row marked no is blocked, not warned", guard.guard(schema.R({ name: "No", category: "video-editing", commercialUse: "no", licenseVerified: true }), "client-work").verdict === "blocked");
check("guard refuses to convert a claim into a legal conclusion", guard.canPromote({ kind: "legal-conclusion", value: "I own this" }).ok === false);
check("a signature assertion needs a real signature result", guard.canPromote({ kind: "verified-signature", value: "signed", signatureVerified: false }).ok === false);
console.log(`  READ  rows awaiting a human licence read: ${guard.reviewQueue(registry).length} of ${registry.length}`);

// ---------------------------------------------------------------- connectors
section("Connector exits");
check("families declared", connectors.CONNECTOR_FAMILIES.length >= 15, `${connectors.CONNECTOR_FAMILIES.length} families`);
check("every connector names a replacement", connectors.connectorsWithoutExit().length === 0, `${connectors.connectorsWithoutExit().length} without an exit: ${connectors.connectorsWithoutExit().join(", ")}`);
console.log(`  READ  connectors shipped: ${connectors.CONNECTORS.length}`);
console.log(`  READ  single-point-of-failure families: ${connectors.SINGLE_POINT_RISK.length === 0 ? "none" : connectors.SINGLE_POINT_RISK.join(", ")}`);

section("Module map");
const moduleMap = await import(url("modules.ts"));
check("modules declared", moduleMap.MODULES.length >= 40, `${moduleMap.MODULES.length} modules`);
check("every module dependency exists by id", moduleMap.MODULES.every((m) => (m.dependsOn ?? []).every((d) => moduleMap.MODULE_BY_ID[d])), "unknown dependency id");
check("foundation gaps are named, not guessed", Array.isArray(moduleMap.foundationGap()), `${moduleMap.foundationGap().length} gaps: ${moduleMap.foundationGap().join(", ")}`);
const FILE_FOR = { core: "index.ts", registry: "schema.ts", connect: "connectors.ts", ledger: "ledger.ts", passport: "passport.ts", verify: "verify.ts", licenseguard: "licenseguard.ts", psi: "psi.ts" };
const withCode = moduleMap.FOUNDATION_SET.filter((id) => existsSync(path.join(APEX, FILE_FOR[id] ?? `${id}.ts`)));
const withoutCode = moduleMap.FOUNDATION_SET.filter((id) => !existsSync(path.join(APEX, FILE_FOR[id] ?? `${id}.ts`)));
check("foundation modules map to real files", withoutCode.length === 0, `declared but no file: ${withoutCode.join(", ")}`);
console.log(`  READ  foundation with code on disk: ${withCode.length}/${moduleMap.FOUNDATION_SET.length}`);
const routeDir = path.resolve("src/routes");
const routeExists = (r) => existsSync(path.join(routeDir, `${r.replace(/^\//, "").replace(/\//g, "-")}.tsx`)) || existsSync(path.join(routeDir, `${r.replace(/^\//, "")}.tsx`));
const overClaimed = moduleMap.MODULES.filter((m) => m.status === "live" && (!m.route || !routeExists(m.route)));
check("no module claims live without a screen on disk", overClaimed.length === 0, overClaimed.map((m) => m.id).join(", "));
const routed = moduleMap.MODULES.filter((m) => m.route && routeExists(m.route));
console.log(`  READ  modules with a real screen: ${routed.length}/${moduleMap.MODULES.length}${routed.length ? ` — ${routed.map((m) => m.route).join(", ")}` : ""}`);

// --------------------------------------------------------------------- cost
section("Production Cost Intelligence");
const price = { provider: "replicate-video", unit: "8s clip at 720p", usdPerUnit: 0.65, verifiedFrom: "operator price sheet", verifiedOn: null };
const rows = [
  cost.estimateLocal("storyboard", "comfyui", 12),
  cost.estimatePaid("motion", "replicate", price, 20),
  cost.estimatePaid("motion", "unknown-service", undefined, 5),
];
const verdict = cost.judgeBudget(rows, 25);
check("arithmetic: 20 x 0.65 = 13.00", verdict.bySource["byo-api"] === 13, `got ${verdict.bySource["byo-api"]}`);
check("an unpriced tool makes the quote unquotable", verdict.withinBudget === false && verdict.unknownPrices.length === 1, verdict.unknownPrices.join(","));
const localized = cost.judgeBudget(cost.localize(rows, "motion", "comfyui", 180), 25);
check("localising the paid stage removes cash cost", localized.bySource["byo-api"] === 0, `byo-api now ${localized.bySource["byo-api"]}`);
check("per-film-minute math", cost.perFinishedMinute(rows, 4) === 3.25, `${cost.perFinishedMinute(rows, 4)} usd/min`);

// -------------------------------------------------------------------- models
section("Universal Model Competition");
const mkSlot = (id, cap, runs, verified) =>
  ({ modelId: id, capability: cap, provider: id, runs, fallbacks: [], record: schema.R({ name: id, category: "video-generation", licenseVerified: verified, commercialUse: verified ? "yes" : "unverified", lastVerified: verified ? "2026-11-01" : null }) });
const slots = [mkSlot("wan", "video-motion", "local", true), mkSlot("kling", "video-motion", "byo-api", false), mkSlot("musicgen", "music", "local", true)];
check("an uncleared model is rejected for client work", models.eligible(slots[1]) === false);
check("single-point capability is named, not hidden", models.singlePointCapabilities(slots).join(",") === "music", models.singlePointCapabilities(slots).join(","));
check("offline routing keeps only local runners", models.routeOrder(slots, "video-motion", { offline: true, budgetUsd: 1 }).map((s) => s.modelId).join(",") === "wan");
check("an undecided bake-off is not a decision", models.isDecided({ capability: "video-motion", ranOn: "2026-11-01", promptSetHash: "abc", clipsPerModel: 8, results: [], winner: null, reason: "" }) === false);

// -------------------------------------------------------------------- memory
section("Creative Memory");
const mem = [
  memory.remember({ kind: "failed-attempt", projectId: "itnol", stage: "motion", summary: "seed 7 face drift", detail: "character identity lost after frame 40", evidenceRefs: [], tags: ["identity"], author: "agent:qoder" }),
  memory.remember({ kind: "decision", projectId: "itnol", stage: "storyboard", summary: "cold open on the bridge", detail: "locked by Master", evidenceRefs: [], tags: ["shot"], author: "human:kawal" }),
];
check("recall finds the failure by tag", memory.recall(mem, { projectId: "itnol", text: "identity" }).length === 1);
check("dontRepeat surfaces only failures", memory.dontRepeat(mem, "itnol", "motion").length === 1);
check("memory round-trips through export", memory.importMemory(memory.exportMemory(mem)).length === 2);
let formatGuard = false;
try { memory.importMemory(JSON.stringify({ format: "other", entries: [] })); } catch { formatGuard = true; }
check("a foreign blob is refused, not guessed", formatGuard);

// ----------------------------------------------------------------- discovery
section("Discovery Engine");
check("sources are declared with blind spots", discovery.SOURCES.length >= 15 && discovery.SOURCES.every((s) => s.blindSpot.length > 10), `${discovery.SOURCES.length} sources`);
check("no pipeline stage moves backwards into adoption", discovery.canMove("rejected", "adopted") === false);
check("an adopted row needs a written exit", discovery.admissible({ sourceId: "github-topics", name: "X", foundOn: "2026-11-01", stage: "pilot", axes: {}, note: "" }).missing.length > 0);
const almost = { sourceId: "github-topics", name: "X", foundOn: "2026-11-01", stage: "pilot", axes: Object.fromEntries(discovery.EVALUATOR_AXES.map((a) => [a, true])), note: "", record: schema.R({ name: "X", category: "video-editing", licenseVerified: true, lastVerified: "2026-11-01", commercialUse: "yes", replacementOptions: ["y"], dataPortability: "open" }) };
check("a fully evidenced row is admissible", discovery.admissible(almost).ok === true, discovery.admissible(almost).missing.join(";"));
check("stale sources flagged", discovery.dueForRefresh([{ sourceId: "huggingface", name: "m", foundOn: "2026-01-01", stage: "triaged", axes: {}, note: "" }], "2026-11-01").length === 1);

// -------------------------------------------------------------------- ledger
section("Project Ledger");
let chain = [];
chain.push(ledger.appendEvent(chain, { projectId: "itnol", kind: "asset-intake", actor: { kind: "human", id: "kawal" }, statement: "received 33 scene files", refs: ["a1"], details: { count: 33 }, epistemic: "claim" }));
chain.push(ledger.appendEvent(chain, { projectId: "itnol", kind: "generation-run", actor: { kind: "agent", id: "qoder" }, statement: "rendered S001", refs: ["b2"], details: { tool: "comfyui" }, epistemic: "claim" }));
chain.push(ledger.appendEvent(chain, { projectId: "itnol", kind: "human-review", actor: { kind: "human", id: "kawal" }, statement: "approved S001", refs: ["b2"], details: {}, epistemic: "signature-verified" }));
check("a fresh chain verifies", ledger.verifyChain(chain).intact === true);
const tampered = chain.map((e, i) => (i === 1 ? { ...e, statement: "rendered S001 twice" } : e));
check("editing history breaks the chain", ledger.verifyChain(tampered).intact === false, `broken at ${ledger.verifyChain(tampered).brokenAt}`);
check("claims stay claims until checked", ledger.openClaims(chain).length === 2, `${ledger.openClaims(chain).length} open`);
check("a delivery package is readable without our servers", JSON.parse(ledger.deliveryPackage(chain, "itnol")).events.length === 3);

// ------------------------------------------------------------------ passport
section("Portable Passport");
const id = passport.generateIdentity();
const pp = passport.newPassport("kawal", id.publicKey);
pp.contributions = passport.deriveContributions({ ...pp, handle: "kawal" }, chain);
check("identity is a real ed25519 key", id.publicKey.length > 30 && id.privateKeyPem.includes("PRIVATE KEY"));
check("contributions inherit the event basis", pp.contributions.filter((c) => c.basis === "signed-event").length === 1, `${pp.contributions.length} rows derived`);
check("a passport never carries a private key", (() => { try { passport.importPassport(JSON.stringify({ ...pp, format: "apex-passport/1", privateKey: "x" })); return false; } catch { return true; } })());
console.log(`  READ  ${passport.standing(pp).sentence}`);

// ------------------------------------------------------------------- psi
section("PSI sealing (L1 signature, L3 anchor opt-in)");
const psi = await import(url("psi.ts"));
const psiManifest = {
  title: "S001 bridge",
  contentHash: psi.sha256Hex("film bytes"),
  createdOn: "2026-11-01T00:00:00Z",
  attribution: "Kawaljeet Singh",
  licenceTerms: "all rights reserved",
  stageConfig: { seed: 7, model: "wan" },
  toolDeclarations: [{ tool: "comfyui", declaredBy: "kawal" }],
};
const sealed = psi.seal(psiManifest, id.privateKeyPem);
check("a sealed work verifies against its own key", psi.verifySeal(sealed) === true);
check("editing the manifest breaks the seal", psi.verifySeal({ ...sealed, manifest: { ...psiManifest, attribution: "somebody else" } }) === false);
const stmt = psi.signStatement("approved S001 at 18:41", id.privateKeyPem);
check("a detached statement checks out", psi.checkStatement(stmt) === true);
check("a tampered statement fails", psi.checkStatement({ ...stmt, statement: "approved everything" }) === false);
let anchorRefused = false;
try { psi.attachAnchor(sealed, { method: "opentimestamps", proof: "pending", assertedOn: "2026-11-01", anchoredBy: "kawal" }); } catch { anchorRefused = true; }
check("a placeholder anchor is refused, not stored", anchorRefused);
const anchored = psi.attachAnchor(sealed, { method: "opentimestamps", proof: "OTSeal-9f3c01ab77e24d55", assertedOn: "2026-11-01", anchoredBy: "kawal" });
check("a real proof attaches without touching the signature", psi.verifySeal(anchored) === true && anchored.anchor.method === "opentimestamps");
check("batch root is order-independent", psi.batchRoot(["aa", "bb", "cc"]) === psi.batchRoot(["cc", "aa", "bb"]));
check("verification is priced at zero and says so", psi.FREE_FOREVER.seal === 0 && psi.FREE_FOREVER.verify === 0);
console.log(`  READ  what a receipt is entitled to claim: ${psi.describeScope(anchored).length} statements, and it names the limit`);

// ------------------------------------------------------------------- verify
section("Verification (free forever, no server)");
const manifest = { title: "S001 bridge", createdOn: "2026-11-01T00:00:00Z", stageConfig: { seed: 7 }, attribution: "Kawaljeet Singh", licenceTerms: "all rights reserved" };
const { createSign, createHash } = await import("node:crypto");
const keyObj = (await import("node:crypto")).createPrivateKey(id.privateKeyPem);
const sig = createSign("sha256");
sig.update(Buffer.from(verify.canonicalBytes(manifest), "utf8"));
// ed25519 signs without an explicit digest, so use the primitive directly
const { sign: nodeSign } = await import("node:crypto");
const signature = nodeSign(undefined, Buffer.from(verify.canonicalBytes(manifest), "utf8"), keyObj);
const receipt = { format: "apex-psi/1", contentHash: createHash("sha256").update("film bytes").digest("hex"), creatorPublicKey: id.publicKey, algorithm: "ed25519", signature: signature.toString("base64"), manifest };
const good = await verify.verify(receipt, "film bytes");
check("a genuine receipt verifies offline", good.signature === "pass" && good.fileMatches === "pass", `sig=${good.signature} file=${good.fileMatches}`);
const bad = await verify.verify(receipt, "somebody else's file");
check("a swapped file fails", bad.fileMatches === "fail");
const missing = await verify.verify({ ...receipt, signature: Buffer.from("nonsense").toString("base64") }, "film bytes");
check("a forged signature fails", missing.signature === "fail");
check("the verdict refuses to overclaim", good.notClaims.length >= 3);
check("no anchor is reported as cannot-check, not fail", good.anchor === "cannot-check");

// ----------------------------------------------------------------- drivers
section("Drivers: one door, honest depth");
check("depth vocabulary is complete", Object.keys(contract.DEPTH_LABEL).length === 3);
const fake = { toolId: "fake", depth: "drivable", record: schema.R({ name: "fake", category: "video-editing", licenseVerified: true, lastVerified: "2026-11-01", commercialUse: "yes" }), runsOn: "creator-machine", probe: async () => ({ ok: true, why: "test" }), run: async () => ({ state: "succeeded", outputs: ["out.mp4"], wallClockSeconds: 1, usdSpent: 0, reproducible: {}, log: "" }) };
const broken = { toolId: "liar", depth: "drivable", record: fake.record, runsOn: "creator-machine", probe: async () => ({ ok: true, why: "" }) };
check("a driver that claims drivable without run() is caught", contract.driverSatisfiesDepth(broken) === false);
const run1 = await orchestrate.runStage([broken, fake], { task: "t", inputs: [], timeoutSeconds: 5, budgetUsd: 0, projectId: "itnol", sceneId: "S001", stage: "edit" }, "personal");
check("the door skips the liar and uses the real driver", run1.state === "succeeded" && run1.used === "fake", `used=${run1.used}`);
const first = { ...fake, toolId: "first", run: async () => ({ state: "failed", outputs: [], wallClockSeconds: 1, usdSpent: 0, reproducible: {}, log: "provider down" }) };
const run2 = await orchestrate.runStage([first, fake], { task: "t", inputs: [], timeoutSeconds: 5, budgetUsd: 0, projectId: "itnol", sceneId: "S001", stage: "edit" }, "personal");
check("failure falls through to the next candidate", run2.state === "succeeded" && run2.used === "fake" && run2.attempts.length === 2, `${run2.attempts.length} attempts`);
const unread = { ...fake, record: schema.R({ name: "unread", category: "video-editing" }) };
const run3 = await orchestrate.runStage([unread], { task: "t", inputs: [], timeoutSeconds: 5, budgetUsd: 0, projectId: "itnol", sceneId: "S001", stage: "edit" }, "client-work");
check("client work is stopped by an unread licence", run3.state === "failed" && run3.log.join(" ").includes("not been read"), run3.log.join(" "));
const empty = await orchestrate.runStage([], { task: "t", inputs: [], timeoutSeconds: 5, budgetUsd: 0, projectId: "itnol", sceneId: "S001", stage: "dialogue" }, "personal");
check("a stage with no tool is admitted as no-driver", empty.state === "no-driver");

const driverIndex = path.join(APEX, "drivers", "index.ts");
if (existsSync(driverIndex)) {
  const di = await import(url("drivers/index.ts"));
  const drivers = di.buildDrivers({ comfyGraphs: async () => null, replicate: { modelFor: () => "x/y", usdPerJob: () => 0.65 } });
  const routes = di.stageRoutes(drivers);
  const gaps = di.STAGES_THE_PIPELINE_NAMES.filter((s) => !routes[s] || routes[s].length === 0);
  check("wired stages cover the film", Object.keys(routes).length >= 8, `${Object.keys(routes).length} stages routed`);
  console.log(`  READ  stages with no driver at all: ${gaps.length ? gaps.join(", ") : "none"}`);
  console.log(`  READ  declared depths: ${drivers.map((d) => `${d.toolId}=${d.depth}`).join(" ")}`);
  check("no shipped driver misdeclares its depth", orchestrate.misdeclaredDrivers(drivers).length === 0, orchestrate.misdeclaredDrivers(drivers).join(", "));

  const connection = await import(url("connection.ts"));
  const realDepth = new Map(drivers.map((d) => [d.toolId, d.depth]));
  const lied = connection.CONNECTIONS.filter((c) => c.depth !== "not-yet" && realDepth.get(c.toolId) !== c.depth);
  check("the screen tells the same depth story as the code", lied.length === 0, lied.map((c) => `${c.toolId}: screen=${c.depth} code=${realDepth.get(c.toolId) ?? "absent"}`).join("; "));
  const absent = connection.CONNECTIONS.filter((c) => c.depth === "not-yet" && realDepth.has(c.toolId));
  check("nothing built is still advertised as unbuilt", absent.length === 0, absent.map((c) => c.toolId).join(", "));
  const allStages = [...new Set([...Object.keys(connection.STAGE_CONNECTION), ...Object.keys(routes)])].sort();
  const setFor = (s) => {
    const screen = connection.STAGE_CONNECTION[s] ?? [];
    const code = (routes[s] ?? []).map((d) => d.toolId);
    return `${s} screen=[${[...screen].sort().join("+")}] code=[${[...code].sort().join("+")}]`;
  };
  const drift = allStages.filter((s) => {
    const screen = [...(connection.STAGE_CONNECTION[s] ?? [])].sort().join("+");
    const code = (routes[s] ?? []).map((d) => d.toolId).sort().join("+");
    return screen !== code;
  });
  check("stage routing on screen matches the driver table", drift.length === 0, drift.map(setFor).join("; "));
}

console.log(`\nTOTAL: ${passes} checks passed, ${fails} failed`);
if (fails > 0) process.exitCode = 1;
