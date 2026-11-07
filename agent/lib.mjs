/**
 * Shared plumbing for the 24/7 APEX agent.
 *
 * Every finding is a measured line in agent/ledger/, never a claim in a log file a
 * human has to re-read. Nothing here prints a secret: a leak is reported as
 * "file + rule name", and the value itself stays on disk unread.
 */

import { execFile } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export const ROOT = path.resolve(import.meta.dirname, "..");
export const LEDGER = path.join(ROOT, "agent", "ledger");
export const STATE = path.join(ROOT, "agent", "state.json");

mkdirSync(LEDGER, { recursive: true });

/** Shell out with a hard ceiling — a hung check must not hold the loop. */
export async function sh(cmd, args, opts = {}) {
  const { timeout = 120_000 } = opts;
  try {
    const { stdout, stderr } = await run(cmd, args, { cwd: ROOT, timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
    return { ok: true, code: 0, out: stdout.toString(), err: stderr.toString() };
  } catch (e) {
    return { ok: false, code: e.code ?? 1, out: String(e.stdout ?? ""), err: String(e.stderr ?? e.message) };
  }
}

/** Fetch with a ceiling. Returns status only — bodies come back separately when asked. */
export async function probe(url, ms = 15_000) {
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(ms) });
    return { ok: res.ok, status: res.status, ms: Date.now() - started, url };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - started, url, why: String(e.message ?? e) };
  }
}

export async function fetchText(url, ms = 20_000) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(ms) });
    return { ok: res.ok, status: res.status, body: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, body: "", why: String(e.message ?? e) };
  }
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** One line per finding, forever. The ledger is the agent's only memory. */
export function record(kind, findings) {
  const line = { at: new Date().toISOString(), kind, findings };
  appendFileSync(path.join(LEDGER, `${kind}.jsonl`), `${JSON.stringify(line)}\n`);
  return line;
}

export function elapsed(startedMs) {
  return Math.round((Date.now() - startedMs) / 100) / 10;
}
