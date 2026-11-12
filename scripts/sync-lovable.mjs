/**
 * Sync the platform branch with Lovable's branch and publish both.
 *
 * The problem this solves: Lovable's bot commits to `main`, the platform lives on
 * `apex-platform`, and nothing moved between them by itself. Last time that gap had to
 * be closed by hand. This script closes it every time, in one command, and it is built
 * so that it cannot destroy anyone's work:
 *
 *   - it never force-pushes. Git refuses a non-fast-forward push, so a divergence stops
 *     the run instead of overwriting Lovable's commits,
 *   - it never rewrites history. It merges, it does not rebase or reset,
 *   - it pulls in EVERY remote branch that holds commits we do not have, not just main.
 *     Lovable's work once sat on a side branch, and a push that ignored that branch
 *     replaced the work in Lovable's eyes even though git had kept it,
 *   - it prints exactly what it did and what is left for a human.
 *
 *   node scripts/sync-lovable.mjs            merge + push both branches
 *   node scripts/sync-lovable.mjs --dry-run  report what would happen, change nothing
 */

import { execFileSync } from "node:child_process";

const DRY = process.argv.includes("--dry-run");
const BRANCH = "apex-platform";

function git(args, allowFail = false) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    if (allowFail) return "";
    const err = e.stderr ? String(e.stderr).trim() : String(e.message);
    throw new Error(`git ${args.join(" ")} failed: ${err}`);
  }
}

function step(label, fn) {
  process.stdout.write(`▸ ${label}\n`);
  const out = fn();
  if (out) process.stdout.write(`  ${out.split("\n").join("\n  ")}\n`);
}

function remoteBranches() {
  return git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"])
    .split("\n")
    .filter((r) => r && !r.endsWith("/HEAD"));
}

const head = git(["rev-parse", "--short", "HEAD"]);
step(`on ${git(["rev-parse", "--abbrev-ref", "HEAD"])} at ${head}`, () => "");

step("fetching origin", () => {
  git(["fetch", "origin", "--prune"]);
  return git(["log", "--oneline", "-1", "origin/main"]);
});

// Every remote branch, not just main. A builder's work can sit on any branch, and a push
// that leaves a branch behind replaces that work in the builder's eyes even when git kept it.
for (const remote of remoteBranches()) {
  const missing = git(["rev-list", "--count", `HEAD..${remote}`]);
  if (missing === "0") continue;
  step(`merging ${remote} (${missing} commit(s) we do not have)`, () => {
    if (DRY) return "dry run — would merge";
    try {
      git(["merge", remote, "--no-edit"]);
    } catch {
      // A conflict stops the run. It is never resolved by taking one side automatically:
      // choosing "ours" would silently delete work from one of the two builders.
      throw new Error(`merge conflict with ${remote} — resolve it by hand, then run this script again. Nothing was pushed.`);
    }
    return git(["log", "--oneline", "-1"]);
  });
}

const ahead = git(["rev-list", "--count", `origin/main..HEAD`]);

if (ahead !== "0") {
  step(`pushing ${BRANCH}`, () => {
    if (DRY) return "dry run — would push";
    git(["push", "origin", `HEAD:${BRANCH}`]);
    return `pushed ${git(["rev-parse", "--short", "HEAD"])} to origin/${BRANCH}`;
  });
} else {
  step(`${BRANCH} is already on the remote`, () => "");
}

step("fast-forwarding main so the site builds this code too", () => {
  if (DRY) return "dry run — would push";
  // git writes its progress to stderr and says nothing on stdout, so an empty result is a
  // successful push, not a failed one. The state after the attempt is what decides.
  let pushed = false;
  try {
    git(["push", "origin", "HEAD:main"]);
    pushed = true;
  } catch {
    /* the state check below decides whether this was a real refusal */
  }
  const behind = git(["rev-list", "--count", "HEAD..origin/main"], true);
  if (behind === "0") return `main now at ${git(["rev-parse", "--short", "HEAD"])}`;
  if (pushed) return `main now at ${git(["rev-parse", "--short", "HEAD"])}`;
  throw new Error(`main could not be fast-forwarded — Lovable has commits we do not have. Merge them by hand; no force-push was attempted.`);
});

step("final state", () => {
  const lines = [
    `branch:  ${git(["rev-parse", "--abbrev-ref", "HEAD"])}`,
    `local:   ${git(["rev-parse", "--short", "HEAD"])}`,
    `main:    ${git(["rev-list", "--count", "HEAD..origin/main"], true) === "0" ? "up to date" : "behind"}`,
    `apex:    ${git(["rev-list", "--count", "HEAD..origin/" + BRANCH], true) === "0" ? "up to date" : "behind"}`,
  ];
  for (const remote of remoteBranches()) {
    const missing = git(["rev-list", "--count", `HEAD..${remote}`], true);
    if (missing !== "0") lines.push(`${remote}: ${missing} commit(s) not in this branch`);
  }
  return lines.join("\n  ");
});

console.log("\nSYNC COMPLETE — the platform and Lovable now build from the same commit.");
