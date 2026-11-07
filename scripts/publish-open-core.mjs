/**
 * Publish the open core — one command, from the app that Lovable deploys to the repo the world clones.
 *
 * The topology:
 *   - this repo (kawal393/lllppp) is private. It holds the secrets, the ops state and the app that
 *     Lovable deploys to https://lllppp.lovable.app.
 *   - apex-architecture/sovereign-ai is public, Apache-2.0, and is what anybody clones or downloads.
 *
 * The rule that keeps the two honest: the open core is a MIRROR of the app's open code, one way.
 * Nothing flows back. So what Lovable deploys is exactly what the world clones, and the world
 * cannot change what the platform runs.
 *
 * It reads `origin/main` and not the working tree, on purpose. Lovable's bot commits to `main` and
 * that is the tree the deployed site is built from; the local branch may be behind it, and
 * mirroring a stale branch would quietly un-publish work the world already has.
 *
 * Three things this script refuses to do:
 *   - it never copies a secret, and it names the offending path if one is queued;
 *   - it never deletes anything in the open core — a file removed from the app stays published
 *     until a human prunes it, and the script prints the stale list instead of silently reaping;
 *   - it never force-pushes. A rejected push stops the run and says what a human must decide.
 *
 *   node scripts/publish-open-core.mjs             copy, regenerate, commit, push
 *   node scripts/publish-open-core.mjs --dry-run   report what would change, change nothing
 *   APEX_SOURCE_REF=apex-platform node scripts/publish-open-core.mjs   mirror a branch instead
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry-run");
const ROOT = path.resolve(import.meta.dirname, "..");
const OPEN_CORE = path.resolve(process.env.APEX_OPEN_CORE_DIR ?? path.join(ROOT, "..", "sovereign-ai-src"));
const SOURCE_REF = process.env.APEX_SOURCE_REF ?? "origin/main";

/** Directories that are copied across wholesale. */
const TREE = ["src", "scripts", "supabase", "workflows", "agent", "public", "demo-plates", "docs"];
/** Single root files that are copied across. */
const FILES = [
  "package.json", "package-lock.json", "bun.lock", "bunfig.toml", "vite.config.ts", "tsconfig.json",
  "eslint.config.js", "components.json", "AGENTS.md", "OPERATOR_MANUAL.md", "roadmap.md",
];
/**
 * The open core owns these. The sync never overwrites them and never deletes them, so the public
 * repo can carry a front door, a licence and a governance file the app does not have.
 */
const OPEN_CORE_OWNED = new Set([
  "LICENSE", "NOTICE", "README.md", "GOVERNANCE.md", "CONTRIBUTING.md", "SECURITY.md",
  ".github", "tools", "docs/index.html", "docs/registry.json", "docs/CNAME",
  "scripts/live-open-core-check.mjs", "scripts/enable-domain.mjs",
]);

/**
 * A path that looks like it carries a credential. Named, never read.
 * `.env.example` is exempt: it is the value-free template that exists to be published.
 */
const SECRET_PATH =
  /(^|\/)\.env($|\.)|\.(pem|key|p12|pfx|keystore)$|(^|\/)id_rsa|(^|\/)credentials\.json$|service-account.*\.json$|(^|\/)secrets?\./i;
const SECRET_EXEMPT = /(^|\/)\.env\.example$/;

/** The dashboard moved from index.html to studio.html, so every link to it has to move too. */
const LINK_REWRITE = /(["'(])index\.html/g;
const CRLF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);

function git(args, cwd, allowFail = false, binary = false) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: binary ? "buffer" : "utf8",
      // A vendored licence header is bigger than Node's 1 MB default, and a blob that is cut
      // off mid-stream is a corrupt file, not a small one.
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    if (allowFail) return binary ? Buffer.alloc(0) : "";
    const err = e.stderr ? String(e.stderr).trim() : String(e.message);
    throw new Error(`git ${args.join(" ")} failed: ${err}`);
  }
}

function say(line) { process.stdout.write(line + "\n"); }

if (!existsSync(OPEN_CORE)) {
  say(`The open core is not at ${OPEN_CORE}.`);
  say("Set APEX_OPEN_CORE_DIR to the checkout of apex-architecture/sovereign-ai.");
  process.exit(1);
}

/* ---------------------------------------------------------------- what the app has */

git(["fetch", "origin", "--prune"], ROOT);
const tree = git(["ls-tree", "-r", SOURCE_REF], ROOT).split("\n").filter(Boolean);
/** path -> blob sha, so a blob is read by hash and MSYS cannot mangle a path with a colon in it. */
const blobs = new Map();
for (const line of tree) {
  const m = line.match(/^\d+\s+blob\s+([0-9a-f]{40,64})\s+(.+)$/);
  if (m) blobs.set(m[2], m[1]);
}
say(`app: ${blobs.size} files at ${SOURCE_REF}`);
say(`open core: ${OPEN_CORE}`);

/* ---------------------------------------------------------------- the mirror map */

/** source path (relative to the app) -> destination path (relative to the open core) */
function destinationFor(rel) {
  if (rel === "verse-site/index.html") return "docs/studio.html";
  if (rel.startsWith("verse-site/")) return "docs/" + rel.slice("verse-site/".length);
  if (TREE.some((t) => rel === t || rel.startsWith(t + "/"))) return rel;
  if (FILES.includes(rel)) return rel;
  return null;
}

const plan = [];
const skipped = [];
let secretHit = null;

for (const [rel] of blobs) {
  const dest = destinationFor(rel);
  if (!dest) { skipped.push(rel); continue; }
  if (OPEN_CORE_OWNED.has(dest) || OPEN_CORE_OWNED.has(rel)) { skipped.push(rel); continue; }
  // Only a file that would actually be published can be a leak. A secret that lives outside the
  // mirror map — the app's own .env — is not a risk to the open core; it simply never travels.
  if (SECRET_PATH.test(rel) && !SECRET_EXEMPT.test(rel)) { secretHit = rel; break; }
  plan.push({ rel, dest, sha: blobs.get(rel) });
}

if (secretHit) {
  say(`REFUSED — ${secretHit} looks like a credential and was queued for the public repo. Nothing was copied.`);
  process.exit(1);
}
say(`mirror: ${plan.length} file(s) copy across, ${skipped.length} stay in the app`);

/* ---------------------------------------------------------------- copy */

const isText = (rel) => /\.(ts|tsx|js|mjs|cjs|json|html|css|md|txt|yml|yaml|sh|ps1|cfg)$/i.test(rel);
let copied = 0;
let rewritten = 0;

for (const item of plan) {
  const destAbs = path.join(OPEN_CORE, item.dest);
  mkdirSync(path.dirname(destAbs), { recursive: true });
  const blob = git(["cat-file", "-p", item.sha], ROOT, false, true);
  const next = isText(item.rel) ? Buffer.from(blob.toString("utf8").replace(LINK_REWRITE, "$1studio.html"), "utf8") : blob;
  if (next.toString("utf8") !== blob.toString("utf8")) rewritten += 1;
  const before = existsSync(destAbs) ? readFileSync(destAbs) : null;
  // Git normalises line endings on the way in, so CRLF in the working tree and LF in the blob
  // are the same file. Compare the way git does, or every file looks changed.
  const flat = (x) => x.toString("utf8").split(CRLF).join(LF);
  if (before && flat(before) === flat(next)) continue;
  copied += 1;
  if (!DRY) writeFileSync(destAbs, next);
}

/* ---------------------------------------------------------------- what the open core still has that the app dropped */

function walk(dir, base = "") {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === "out") continue;
    const abs = path.join(dir, name);
    const rel = base ? base + "/" + name : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

const mirroredScopes = ["src", "scripts", "supabase", "workflows", "agent", "public", "demo-plates", "docs"];
const stale = [];
for (const rel of walk(OPEN_CORE)) {
  const top = rel.split("/")[0];
  if (!mirroredScopes.includes(top)) continue;
  if (OPEN_CORE_OWNED.has(rel)) continue;
  // The dashboard has two names; either one is current.
  if (rel === "docs/index.html" || rel === "docs/studio.html") continue;
  // docs/* is served from verse-site/* in the app, so a public path can come from either side.
  const candidates = rel.startsWith("docs/")
    ? ["docs/" + rel.slice("docs/".length), "verse-site/" + rel.slice("docs/".length)]
    : [rel];
  if (!candidates.some((c) => blobs.has(c))) stale.push(rel);
}

if (stale.length) {
  say(`\nstale in the open core (${stale.length}) — kept on purpose, prune them by hand:`);
  for (const s of stale.slice(0, 40)) say(`  ${s}`);
}

/* ---------------------------------------------------------------- regenerate the honest parts */

const REGEN = [
  [["--experimental-strip-types", "scripts/tools-registry.mjs"], "rebuild the tool registry"],
  [["scripts/build-site.mjs"], "rebuild the site"],
];
for (const [args, label] of REGEN) {
  if (DRY) { say(`dry run — would ${label}`); continue; }
  try {
    const out = execFileSync("node", args, { cwd: OPEN_CORE, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    say(`${label}: ${out.trim().split("\n").slice(-1)[0]}`);
  } catch (e) {
    say(`${label} FAILED: ${(e.stderr ? String(e.stderr) : String(e.message)).trim().split("\n").slice(0, 3).join(" | ")}`);
    process.exit(1);
  }
}

/* ---------------------------------------------------------------- commit and push */

if (DRY) {
  say(`\nDRY RUN — ${copied} file(s) would change. Nothing was written.`);
  process.exit(0);
}

const status = git(["status", "--porcelain"], OPEN_CORE);
if (!status) {
  say("\nThe open core already matches the app. Nothing to publish.");
  process.exit(0);
}
say(`\n${status.split("\n").length} change(s) in the open core:`);
for (const line of status.split("\n").slice(0, 30)) say("  " + line);

git(["add", "-A"], OPEN_CORE);
git(["commit", "-m", "Mirror the app into the open core\n\nOne-way publish from the private app repo at " + SOURCE_REF + ". No secret was copied, nothing was deleted."], OPEN_CORE);
const head = git(["rev-parse", "--short", "HEAD"], OPEN_CORE);

try {
  git(["push", "origin", "main"], OPEN_CORE);
} catch (e) {
  say(`\nThe push was refused. The commit ${head} is local and nothing was overwritten.`);
  say("Fetch and merge by hand, then push again. No force-push is ever attempted.");
  process.exit(1);
}

say(`\nPUBLISHED — the open core is at ${head}.`);
say(`  ${copied} file(s) mirrored, ${rewritten} link(s) rewritten, ${stale.length} stale path(s) reported.`);
