/**
 * backlog.mjs — the improving half of the agent.
 *
 * The queue is derived, not written. Each row names the measurement that produced it and
 * who can close it: the agent, or Master alone. A task nobody can close is not on the list.
 *
 * Everything is counted from verse-site/data.generated.js — the same file the public rail
 * prints — so the agent and the website can never disagree, and the agent needs no
 * TypeScript runtime of its own.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { ROOT, sh } from "./lib.mjs";

export function readVerse() {
  const file = path.join(ROOT, "verse-site", "data.generated.js");
  if (!existsSync(file)) return null;
  const m = readFileSync(file, "utf8").match(/window\.APEX_VERSE\s*=\s*(\{[\s\S]*\});?\s*$/m);
  if (!m) return null;
  try {
    return JSON.parse(m[1].replace(/;\s*$/, ""));
  } catch {
    return null;
  }
}

/** Words a film-maker would never say out loud. Counted per public page. */
const JARGON = ["driver", "drivable", "file-exchange", "portal-only", "stage coverage", "contract", "orchestrat", "registry row", "depth"];

export function jargonLoad() {
  const dir = path.join(ROOT, "verse-site");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => {
      const text = readFileSync(path.join(dir, f), "utf8").toLowerCase();
      return { page: f, hits: JARGON.reduce((n, w) => n + (text.split(w).length - 1), 0) };
    });
}

export function linkCoverage() {
  const linksFile = path.join(ROOT, "verse-site", "tool-links.js");
  const total = readVerse()?.rows?.length ?? 0;
  if (!existsSync(linksFile)) return { withLink: 0, total, file: "missing" };
  const names = [...readFileSync(linksFile, "utf8").matchAll(/"([^"]+)"\s*:\s*"https/g)].map((m) => m[1]);
  return { withLink: new Set(names).size, total };
}

export function workspaceDrift() {
  const a = path.join(ROOT, "verse-site");
  const b = path.join(ROOT, "film-verse-site");
  if (!existsSync(b)) return { drift: false, note: "no workspace copy; repo is the only source" };
  const files = readdirSync(a).filter((f) => f.endsWith(".html") || f.endsWith(".js"));
  const differs = files.filter((f) => {
    if (!existsSync(path.join(b, f))) return true;
    try {
      return readFileSync(path.join(a, f), "utf8") !== readFileSync(path.join(b, f), "utf8");
    } catch {
      return true;
    }
  });
  return { drift: differs.length > 0, differs };
}

export function buildBacklog() {
  const verse = readVerse();
  if (!verse) return { at: new Date().toISOString(), error: "verse-site/data.generated.js is missing or unparseable", tasks: [{ id: "regenerate-data", owner: "agent", why: "no generated data to measure", doable: true }] };

  const emptyStages = (verse.coverage?.empty ?? verse.stages.filter((s) => s.tools.length === 0).map((s) => s.id));
  const links = linkCoverage();
  const jargon = jargonLoad().filter((j) => j.hits > 0);
  const drift = workspaceDrift();
  const unread = verse.rows.filter((r) => !r.v).length;

  const tasks = [];
  const push = (id, owner, why, doable) => tasks.push({ id, owner, why, done: false, doable });

  if (drift.drift) push("sync-copies", "agent", `repo and workspace disagree on ${drift.differs.length} files: ${drift.differs.slice(0, 6).join(", ")}`, true);
  if (emptyStages.length) push("route-stage", "agent", `stages with nothing wired: ${emptyStages.join(", ")}`, true);
  if (links.withLink < links.total) push("verify-links", "agent", `${links.total - links.withLink} of ${links.total} catalogued tools have no verified home`, true);
  if (jargon.length) push("creative-language", "agent", `technical register still on ${jargon.length} pages (${jargon.map((j) => `${j.page}:${j.hits}`).join(" ")})`, true);
  if (unread > 0) push("licence-read", "master", `${unread} of ${verse.rows.length} rows have never been read by a human — nothing can be produced until at least one is`, false);

  return { at: new Date().toISOString(), stages: { wired: verse.stages.length - emptyStages.length, total: verse.stages.length, empty: emptyStages }, links, unreadLicences: unread, tasks };
}

/** Regenerate the public numbers from the real registry — the only write the agent does unprompted. */
export async function regenerateData() {
  const out = await sh(process.execPath, ["--experimental-strip-types", "scripts/verse-data.mjs"], { timeout: 120_000 });
  return { ok: out.ok, out: out.out.slice(-400), err: out.err.slice(-200) };
}
