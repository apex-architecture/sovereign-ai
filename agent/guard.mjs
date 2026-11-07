/**
 * guard.mjs — the protective half of the agent.
 *
 * Five binary checks. Each returns pass or fail plus what was actually measured; the
 * agent never says "looks healthy" without a number behind it.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ROOT, fetchText, probe, record, sh } from "./lib.mjs";
import { readVerse } from "./backlog.mjs";

export const RAIL = process.env.APEX_RAIL_URL || "https://filmverse-1mil8xwzv4y.qoder.website";

const PAGES = ["index", "workflow", "verse", "tools", "rights", "verify", "passport", "console"];

/** Markers that mean a credential shipped into a public artefact. Value is never read or printed. */
export const LEAK_RULES = [
  ["replicate token shape", "r8_[A-Za-z0-9]{20,}"],
  ["eyJ JWT", "eyJhbGciOi"],
  ["private key block", "-{5}BEGIN [A-Z ]*PRIVATE KEY-{5}"],
  ["aws access key", "AKIA[0-9A-Z]{16}"],
  ["ghp token", "ghp_[A-Za-z0-9]{20,}"],
];

/**
 * This host serves files, not extensionless routes: `/tools` is a 404 while `/tools.html`
 * is 200. The probe uses the form the site actually links to, or the guard cries wolf.
 */
export async function liveness() {
  const urls = PAGES.map((p) => `${RAIL}/${p === "index" ? "studio.html" : `${p}.html`}`);
  const assets = ["styles.css", "shell.js", "data.generated.js"].map((a) => `${RAIL}/${a}`);
  const results = await Promise.all([...urls, ...assets].map((u) => probe(u)));
  const dead = results.filter((r) => !r.ok);
  return {
    name: "liveness",
    pass: dead.length === 0,
    checked: results.length,
    dead: dead.map((d) => `${d.url} -> ${d.status || d.why}`),
    slowest: Math.max(...results.map((r) => r.ms)),
  };
}

/** The live bundle must carry the build token from the newest generated data — the only proof it shipped. */
export async function shipDrift() {
  const local = path.join(ROOT, "verse-site", "data.generated.js");
  if (!existsSync(local)) return { name: "ship-drift", pass: false, why: "no generated data in the repo" };
  const token = readFileSync(local, "utf8").match(/VERSE_BUILD\s*=\s*"([^"]+)"/)?.[1] ?? null;
  if (!token) return { name: "ship-drift", pass: false, why: "generated data has no VERSE_BUILD token" };
  const live = await fetchText(`${RAIL}/data.generated.js`);
  if (!live.ok) return { name: "ship-drift", pass: false, why: `live data answered ${live.status}` };
  const shipped = live.body.includes(token);
  return { name: "ship-drift", pass: shipped, token, live: shipped ? "same build" : "live rail is an older build than the repo" };
}

const TEXT_EXT = /\.(js|mjs|cjs|html|css|json|txt|svg|md)$/i;

/** Scan one directory. Reports the rule and the file, never the match. */
export async function runLeakOn(dir) {
  const hits = [];
  for (const f of readdirSync(dir, { recursive: true })) {
    const rel = String(f);
    if (!TEXT_EXT.test(rel)) continue;
    const file = path.join(dir, rel);
    let text = "";
    try {
      if (statSync(file).size > 4_000_000) continue;
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const [label, pattern] of LEAK_RULES) {
      if (new RegExp(pattern).test(text)) hits.push(`${rel} matches ${label}`);
    }
  }
  return { pass: hits.length === 0, hits };
}

export async function leakScan() {
  const { pass, hits } = await runLeakOn(path.join(ROOT, "verse-site"));
  return { name: "leak-scan", pass, scanned: "verse-site/", hits };
}

export async function repoHygiene() {
  const status = await sh("git", ["status", "--porcelain"]);
  const ahead = await sh("git", ["rev-list", "--count", "@{u}..HEAD"]);
  const dirty = status.ok ? status.out.trim().split("\n").filter(Boolean) : ["git status failed"];
  const unpushed = ahead.ok ? Number(ahead.out.trim()) : 0;
  return {
    name: "repo-hygiene",
    pass: dirty.length === 0 && unpushed === 0,
    uncommitted: dirty.length,
    unpushed,
    files: dirty.slice(0, 12),
  };
}

/**
 * The licence gate must stay shut while no human has read a licence.
 * An open gate with 0 cleared rows is not a win — it is a paid call waiting to happen.
 */
export async function licencePosture() {
  const verse = readVerse();
  const rows = verse?.rows ?? [];
  const cleared = rows.filter((r) => r.v).length;
  const out = await sh(process.execPath, ["--experimental-strip-types", "scripts/apex-check.mjs"], { timeout: 120_000 });
  const checkerPassed = Number(out.out.match(/TOTAL:\s*(\d+) checks passed/)?.[1] ?? -1);
  return {
    name: "licence-posture",
    pass: out.ok && checkerPassed >= 0 && rows.length > 0,
    rows: rows.length,
    checkerPassed,
    clearedByAHuman: cleared,
    note: cleared === 0 ? "every job is refused until a human reads a licence — correct, but the platform cannot produce" : undefined,
  };
}

export async function runGuard() {
  const checks = [];
  for (const fn of [liveness, shipDrift, leakScan, repoHygiene, licencePosture]) checks.push(await fn());
  const failing = checks.filter((c) => !c.pass);
  record("guard", { total: checks.length, failing: failing.map((f) => f.name), detail: checks });
  return { at: new Date().toISOString(), checks, ok: failing.length === 0, failing: failing.map((f) => f.name) };
}
