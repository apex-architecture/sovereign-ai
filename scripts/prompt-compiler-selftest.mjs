/**
 * Proves the prompt compiler is arithmetic, not a claim.
 *
 * The failure this catches: a compiler that reports a graph the rig would refuse, a matrix that
 * changes between two runs of the same brief, or a prompt that drops the director's own words.
 * A seed that moves is a film that cannot be reproduced, so the seed lock is checked first.
 *
 *   node --experimental-strip-types scripts/prompt-compiler-selftest.mjs
 */
import {
  compileMatrix,
  describeMatrix,
  graphProblems,
  lockSeed,
  formatWeighted,
  fnv1a,
  toPromptPayload,
  SD_PROFILE,
  PROMPT_PROFILES,
} from "../src/lib/apex/prompt-compiler.ts";

let failed = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`ok    ${label}${detail ? " — " + detail : ""}`);
  else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? " — " + detail : ""}`);
  }
}

const BRIEF = "a lighthouse keeper climbs a spiral stair at dawn, handheld, 35mm, cold blue light";

/* ---------------------------------------------------------------- the matrix it actually compiles */

const matrix = compileMatrix(BRIEF);

console.log(`brief: ${BRIEF}`);
console.log(`matrix lock: ${matrix.seed}   profile: ${matrix.profile}`);
console.log(`recognised — light: ${matrix.recognised.light.join(", ") || "none"}`);
console.log(`           motion: ${matrix.recognised.motion.join(", ") || "none"}`);
console.log(`           mood: ${matrix.recognised.mood.join(", ") || "none"}`);
console.log(`           style: ${matrix.recognised.style.join(", ") || "none"}`);
console.log(`           lens: ${matrix.recognised.lens.join(", ") || "none"}`);
console.log("");
for (const line of describeMatrix(matrix)) console.log(`  ${line}`);
console.log("");

/* ---------------------------------------------------------------- the seed lock */

check("the matrix lock is stable", fnv1a(BRIEF) === matrix.seed, String(matrix.seed));
check("the same brief locks the same seed", lockSeed(BRIEF, "master") === lockSeed(BRIEF, "master"));
check("a different shot gets a different seed", lockSeed(BRIEF, "master") !== lockSeed(BRIEF, "insert"));
check("a pinned salt changes the lock, on purpose", lockSeed(BRIEF, "master", 7) !== lockSeed(BRIEF, "master"));
check(
  "two runs of the same brief produce the same matrix",
  JSON.stringify(compileMatrix(BRIEF)) === JSON.stringify(matrix),
);

/* ---------------------------------------------------------------- the graph the rig would receive */

let bad = [];
for (const shot of matrix.shots) bad = bad.concat(graphProblems(shot.graph).map((p) => `${shot.id}: ${p}`));
check("every graph passes the reference check", bad.length === 0, bad.join("; "));

const classes = new Set();
for (const shot of matrix.shots) {
  for (const node of Object.values(shot.graph)) classes.add(node.class_type);
}
check(
  "the graph names only classes the profile declares",
  [...classes].every((c) => SD_PROFILE.requires.includes(c)),
  [...classes].join(", "),
);
check(
  "no class is invented — the shipped profile's own list is the whole vocabulary",
  [...classes].sort().join(",") === [...SD_PROFILE.requires].sort().join(","),
);
check("one profile ships", PROMPT_PROFILES.length === 1, PROMPT_PROFILES.map((p) => p.id).join(", "));

const payload = JSON.parse(toPromptPayload(matrix.shots[0].graph, "apex-selftest"));
check("the payload is the driver's own contract", payload.prompt && payload.client_id === "apex-selftest");
check("the payload carries the graph", Object.keys(payload.prompt).length === 7, `${Object.keys(payload.prompt).length} nodes`);

/* ---------------------------------------------------------------- the prompt itself */

const first = matrix.shots[0];
check("the director's own words survive", first.positive.includes("lighthouse keeper"), first.positive.slice(0, 90));
check(
  "the recognised light is weighted in",
  /\([^)]*cold blue light[^)]*:1\.20\)/.test(first.positive),
  first.positive.match(/\([^)]*cold blue light[^)]*\)/)?.[0] ?? first.positive.slice(0, 120),
);
check(
  "the brief's words survive without holes in them",
  !/,\s*,/.test(first.positive) && !/\bat\s*,\s*\(/.test(first.positive),
  first.positive.slice(0, 80),
);
check("the recognised motion is weighted in", first.positive.includes("(handheld:1.10)"));
check("the brief's lens is respected over the plan's", first.lens === "35mm", first.lens);
check("the base negatives are present", first.negative.includes("lowres") && first.negative.includes("deformed hands"));
check("weights are formatted the way the rig expects", formatWeighted([{ text: "a b", weight: 1.2 }]) === "(a b:1.20)");
check("a weight of one is not dressed up", formatWeighted([{ text: "plain", weight: 1 }]) === "plain");

/* ---------------------------------------------------------------- the framings cover the shot list */

check("the matrix covers the shot list", matrix.shots.length === 5, matrix.shots.map((s) => s.id).join(", "));
check(
  "each shot has its own framing",
  new Set(matrix.shots.map((s) => s.framing)).size === matrix.shots.length,
);
check("the shot count can be chosen", compileMatrix(BRIEF, { shots: 2 }).shots.length === 2);
check(
  "a pinned salt changes every shot's seed",
  matrix.shots.every((s) => s.seed !== lockSeed(BRIEF, s.id, 99)),
);

/* ---------------------------------------------------------------- a brief it cannot read */

const blank = compileMatrix("zzzz");
check("an unreadable brief still compiles", blank.shots.length === 5);
check("an unreadable brief says so", blank.warnings.length > 0, blank.warnings.join("; "));
check("an unreadable brief carries its words through", blank.shots[0].positive.includes("zzzz"));
check("no warnings on a brief it read", matrix.warnings.length === 0, matrix.warnings.join("; "));

console.log(
  failed === 0
    ? `\nPROMPT COMPILER CLEAN — ${matrix.shots.length} shots, matrix lock ${matrix.seed}, no model called, no key, no server.`
    : `\nPROMPT COMPILER FAILED — ${failed} check(s) did not pass.`,
);
process.exit(failed === 0 ? 0 : 1);
