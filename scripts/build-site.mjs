/**
 * Site build — one command, measurable output.
 *
 * The rail ships plain files, so the only build work is making every parsed byte small
 * and proving the result is syntactically loadable. Run this after `verse-data.mjs`
 * regenerates data.generated.js, or the pages will keep serving the previous minified file.
 *
 *   node scripts/build-site.mjs
 */
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { siteDir, runsDir } from "./site-dir.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = siteDir(join(ROOT, ".."));
const TARGET = "es2020";

// esbuild is a build dependency, not a runtime one: a clone that has not installed it yet must
// still be able to parse-check the pages and fingerprint the build.
let buildSync = null;
try {
  ({ buildSync } = await import("esbuild"));
} catch {
  console.log("note  esbuild is not installed — minification is skipped, the parse-check still runs");
  console.log("      run `npm install` to rebuild the .min.js files");
}

function kb(n) {
  return (n / 1024).toFixed(1) + " KB";
}

/**
 * What the pages actually load. `verse3d.min.js` is the whole hero in one file: Three and the
 * five postprocessing passes are resolved from the vendored copies and folded in, so the browser
 * never needs an import map and never asks for the 1.3 MB un-minified build.
 */
const TO_MINIFY = [
  ["data.generated.js", "data.generated.min.js", "iife", null],
  ["data.shell.js", "data.shell.min.js", "iife", null],
  ["engines.bundle.js", "engines.min.js", "iife", null],
  ["dailies.data.js", "dailies.data.min.js", "iife", null],
  ["studio.data.js", "studio.data.min.js", "iife", null],
  ["availability.generated.js", "availability.generated.min.js", "iife", null],
  ["tool-links.js", "tool-links.min.js", "iife", null],
  ["psi-verify.js", "psi-verify.min.js", "iife", null],
  ["shell.js", "shell.min.js", "iife", null],
  ["studio.js", "studio.min.js", "iife", null],
  [
    "verse3d.js",
    "verse3d.min.js",
    "esm",
    {
      three: join(SITE, "vendor/three/three.module.js"),
      "three/addons/postprocessing/EffectComposer.js": join(
        SITE,
        "vendor/three/jsm/postprocessing/EffectComposer.js",
      ),
      "three/addons/postprocessing/RenderPass.js": join(
        SITE,
        "vendor/three/jsm/postprocessing/RenderPass.js",
      ),
      "three/addons/postprocessing/UnrealBloomPass.js": join(
        SITE,
        "vendor/three/jsm/postprocessing/UnrealBloomPass.js",
      ),
      "three/addons/postprocessing/ShaderPass.js": join(
        SITE,
        "vendor/three/jsm/postprocessing/ShaderPass.js",
      ),
      "three/addons/postprocessing/OutputPass.js": join(
        SITE,
        "vendor/three/jsm/postprocessing/OutputPass.js",
      ),
    },
  ],
];

function minify(relIn, relOut, format, alias) {
  const src = join(SITE, relIn);
  const dst = join(SITE, relOut);
  if (!existsSync(src)) return { relIn, relOut, skipped: "missing source" };
  const before = statSync(src).size;
  mkdirSync(dirname(dst), { recursive: true });
  if (!buildSync) return { relIn, relOut, skipped: "esbuild not installed" };
  try {
    buildSync({
      entryPoints: [src],
      bundle: true,
      format,
      target: TARGET,
      minify: true,
      legalComments: "none",
      outfile: dst,
      write: true,
      logLevel: "silent",
      ...(alias ? { alias } : {}),
    });
  } catch (e) {
    return {
      relIn,
      relOut,
      error: String(e.message || e)
        .split("\n")
        .slice(0, 4)
        .join(" | "),
    };
  }
  const after = statSync(dst).size;
  return { relIn, relOut, before, after, pct: Math.round((1 - after / before) * 100) };
}

/**
 * Parse-check every inline script block on every page. A typo inside an HTML file is
 * invisible to the build until a visitor meets it, so the build meets it first.
 */
function checkInline() {
  const bad = [];
  const tmpDir = runsDir(join(ROOT, ".."));
  for (const f of readdirSync(SITE).filter((n) => n.endsWith(".html"))) {
    const html = readFileSync(join(SITE, f), "utf8");
    const re = /<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/g;
    let m,
      i = 0;
    while ((m = re.exec(html))) {
      i++;
      const attrs = m[1];
      if (/type\s*=\s*["']importmap["']/.test(attrs)) {
        try {
          JSON.parse(m[2]);
        } catch (e) {
          bad.push(`${f} block ${i}: importmap JSON — ${e.message}`);
        }
        continue;
      }
      const tmp = join(tmpDir, `.inline-${f}-${i}.mjs`);
      writeFileSync(tmp, m[2]);
      const c = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
      if (c.status !== 0)
        bad.push(`${f} block ${i}: ${c.stderr.trim().split("\n").slice(0, 3).join(" | ")}`);
    }
  }
  return bad;
}

const results = TO_MINIFY.map((t) => minify(...t));
const failed = results.filter((r) => r.error);
for (const r of results) {
  if (r.error) console.log(`FAIL  ${r.relIn}  ${r.error}`);
  else if (r.skipped) console.log(`skip  ${r.relIn}  (${r.skipped})`);
  else {
    // A bundle that pulls in Three grows on purpose — only a shrink is worth a percentage.
    const delta =
      r.after < r.before
        ? `  -${r.pct}%`
        : `  (bundle: +${kb(r.after - r.before)} of dependencies)`;
    console.log(
      `ok    ${r.relOut.padEnd(34)} ${kb(r.before).padStart(10)} -> ${kb(r.after).padStart(9)}${delta}`,
    );
  }
}

const errors = checkInline();
errors.forEach((e) => console.log("SYNTAX " + e));

/** Live status: a visitor can see which build they are looking at and when it was made. */
const MANIFEST = {
  built_at: new Date().toISOString(),
  build: process.env.VERSE_BUILD ?? "local",
  files: {},
};
for (const rel of [
  "index.html",
  "cinema.html",
  "dailies.html",
  "engines.html",
  "mission.html",
  "styles.css",
  "verse.css",
  "studio.css",
  "verify.html",
  "data.generated.min.js",
  "data.shell.min.js",
  "engines.min.js",
  "dailies.data.min.js",
  "studio.data.min.js",
  "tool-links.min.js",
  "psi-verify.min.js",
  "shell.min.js",
  "studio.min.js",
  "verse3d.min.js",
  "availability.generated.min.js",
  "foreman.generated.js",
  "connect.generated.js",
]) {
  const p = join(SITE, rel);
  if (existsSync(p))
    MANIFEST.files[rel] = {
      bytes: statSync(p).size,
      sha256: createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16),
    };
}
writeFileSync(join(SITE, "status.json"), JSON.stringify(MANIFEST, null, 1) + "\n");
console.log(
  `ok    status.json                    ${Object.keys(MANIFEST.files).length} files fingerprinted, built_at ${MANIFEST.built_at}`,
);
const n = errors.length + failed.length;
console.log(n ? `\nBUILD FAILED: ${n} error(s)\n` : "\nBUILD CLEAN\n");
process.exit(n ? 1 : 0);
