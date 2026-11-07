/**
 * Where the site lives, and where a run's output lives — resolved, not assumed.
 *
 * The same scripts run in two layouts:
 *   - the app repo, where the rail is `verse-site/` and finished films land in `runs/`;
 *   - the public open-core repo, where the rail is `docs/` and there is no `runs/` yet,
 *     because a clone has not made a film on this machine.
 *
 * A script that assumes the app layout breaks the moment somebody clones the open core, which
 * is the one thing the open core exists for. So the directory is looked up, and a missing run
 * directory is a fact to report, not a crash.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");

/** APEX_SITE_DIR wins; otherwise the first of these that exists. */
export function siteDir(root = ROOT) {
  if (process.env.APEX_SITE_DIR) return path.resolve(root, process.env.APEX_SITE_DIR);
  for (const candidate of ["verse-site", "docs"]) {
    const p = path.join(root, candidate);
    if (existsSync(p)) return p;
  }
  throw new Error(
    "no site directory found — expected 'verse-site/' (the app repo) or 'docs/' (the open-core repo). " +
      "Set APEX_SITE_DIR to point at it.",
  );
}

/** Finished films land here. A clone has none yet, so the directory is created on demand. */
export function runsDir(root = ROOT) {
  const p = path.join(root, "runs");
  mkdirSync(p, { recursive: true });
  return p;
}

/**
 * True when this checkout has a runs directory with a real film in it.
 * The build's own scratch files (`.inline-*.mjs`) do not count — they are not a measurement.
 */
export function hasRuns(root = ROOT) {
  const p = path.join(root, "runs");
  if (!existsSync(p)) return false;
  try {
    return readdirSync(p).some((n) => !n.startsWith("."));
  } catch {
    return false;
  }
}
