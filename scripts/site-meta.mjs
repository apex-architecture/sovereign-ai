/**
 * One head, nine pages. Idempotent: it rewrites only the block it owns, between the markers.
 *   node scripts/site-meta.mjs
 *
 * Why this exists as a script and not as nine hand-edits: the rail's metadata drifted page by page
 * until dailies.html had no <title> at all — a tab that announces nothing and a link preview with
 * no picture. Canonical URLs, the icon and the share card are the same facts on every page, so they
 * belong in one place that is allowed to be wrong once.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "verse-site");
const ORIGIN = "https://filmverse-1mil8xwzv4y.qoder.website";
const START = "<!-- apex-meta:start -->";
const END = "<!-- apex-meta:end -->";

/** The share card is a real frame from our own master — not a mock, not a render of a promise. */
const SHARE = { file: "assets/dailies/frame-at-2s.jpg", w: 1280, h: 720 };

const PAGES = {
  "index.html": { title: "Sovereign AI Film Verse — a house of open-source tools, and films nobody has to believe", type: "website" },
  "verse.html": { title: "The Verse Map — 44 Modules, Every Status From the Record | Sovereign AI Film Verse", type: "website" },
  "workflow.html": { title: "Production Rail — Ten Film Stages, Honestly Wired | Sovereign AI Film Verse", type: "website" },
  "dailies.html": { title: "Dailies — One Real Run of the Pipeline, With Its Measured Frames | Sovereign AI Film Verse", type: "article" },
  "engines.html": { title: "The Engine Road — every open and paid tool, ranked for your shot | Sovereign AI Film Verse", type: "website" },
  "mission.html": { title: "Start a Mission — one idea walked from story to master | Sovereign AI Film Verse", type: "website" },
  "tools.html": { title: "Open Source Power — the tool map | Sovereign AI Film Verse", type: "website" },
  "rights.html": { title: "Rights & Licensing — the honest ledger | Sovereign AI Film Verse", type: "website" },
  "verify.html": { title: "Verify a Receipt — free, no account | Sovereign AI Film Verse", type: "website" },
  "passport.html": { title: "Creator Passport — A Portable Record of a Work | Sovereign AI Film Verse", type: "website" },
  "console.html": { title: "Operator Console — Status Board of a Platform Under Construction | Sovereign AI Film Verse", type: "website" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let touched = 0;
// A page that is on disk but not declared here gets no canonical, no share card and no title — and
// nothing used to say so. That is how dailies.html ended up with no <title> at all, so an undeclared
// page is now an error, not a silent skip.
const declared = new Set(Object.keys(PAGES));
const onDisk = readdirSync(SITE).filter((f) => f.endsWith(".html"));
const undeclared = onDisk.filter((f) => !declared.has(f));
if (undeclared.length) {
  console.log(`UNDECLARED PAGE(S): ${undeclared.join(", ")} — add them to PAGES in this script or the rail ships them without metadata.`);
  process.exit(1);
}

for (const [page, meta] of Object.entries(PAGES)) {
  const file = path.join(SITE, page);
  if (!existsSync(file)) { console.log(`SKIP ${page} — not on this disk`); continue; }
  let html = readFileSync(file, "utf8");

  const url = `${ORIGIN}/${page === "index.html" ? "" : page}`;
  const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? meta.title;
  const shortTitle = meta.title.split(/ — | \| /)[0];

  // Drop the block we own, then rebuild it. Anything else in the head is the page's own business.
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s !== -1 && e !== -1) html = html.slice(0, s) + html.slice(e + END.length);
  // Two og:type or og:title tags is not a typo, it is a parser coin-flip. Anything the block owns
  // is removed from the rest of the head first, so the rebuilt block is the only copy.
  html = html.replace(/^\s*<meta (?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>\n?/gm, "");

  // A page with no <title> is a browser tab that says nothing and a screen reader that reads a URL.
  if (/<title>[\s\S]*?<\/title>/.test(html)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`);
  } else {
    html = html.replace(/<meta name="viewport"[^>]*>/, (m) => `${m}\n<title>${esc(meta.title)}</title>`);
  }

  const block = [
    START,
    `<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="${meta.type}">`,
    `<meta property="og:site_name" content="Sovereign AI Film Verse">`,
    `<meta property="og:title" content="${esc(shortTitle)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${ORIGIN}/${SHARE.file}">`,
    `<meta property="og:image:width" content="${SHARE.w}">`,
    `<meta property="og:image:height" content="${SHARE.h}">`,
    `<meta property="og:image:alt" content="One frame from the pipeline's own master, extracted at two seconds.">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(shortTitle)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${ORIGIN}/${SHARE.file}">`,
    END,
  ].join("\n");

  html = html.replace("</head>", `${block}\n</head>`);
  writeFileSync(file, html);
  touched++;
  console.log(`OK ${page.padEnd(15)} title + icon + canonical + share card`);
}

const sharePath = path.join(SITE, SHARE.file);
console.log(`\n${touched} page(s) normalised. Share card ${SHARE.file} ${existsSync(sharePath) ? "exists" : "IS MISSING — the card would 404"}`);
