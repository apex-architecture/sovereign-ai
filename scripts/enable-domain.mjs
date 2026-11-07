/**
 * Cuts the site over to sovereign-ai.in.
 *
 * The domain is registered at GoDaddy but sits on a `clientHold`, which is why it does not
 * resolve in DNS. Until that hold is released, the CNAME file must NOT be in the published
 * branch: GitHub Pages would redirect every visitor to a domain that cannot be reached,
 * and the site would be dark.
 *
 * So the cutover is two things that must happen in this order:
 *
 *   1. The hold is released at GoDaddy and the records below exist in the zone:
 *        @    A     185.199.108.153
 *        @    A     185.199.110.153
 *        @    A     185.199.111.153
 *        @    A     185.199.109.153
 *        www  CNAME apex-architecture.github.io
 *   2. This script runs. It writes docs/CNAME, commits, pushes, and asks GitHub to
 *      serve the custom domain from then on.
 *
 *   node scripts/enable-domain.mjs            cut over
 *   node scripts/enable-domain.mjs --check    only report whether DNS resolves
 *
 * Nothing here deletes anything: the site stays reachable on the GitHub address either way.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOMAIN = "sovereign-ai.in";
const GITHUB_PAGES_IPS = ["185.199.108.153", "185.199.110.153", "185.199.111.153", "185.199.109.153"];

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function resolves(host) {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${host}&type=A`, { headers: { Accept: "application/dns-json" } });
    const j = await r.json();
    return (j.Answer || []).map((a) => a.data).filter((d) => /^\d+\.\d+\.\d+\.\d+$/.test(d));
  } catch {
    return [];
  }
}

const mode = process.argv.includes("--check") ? "check" : "apply";

console.log(`records needed in the ${DOMAIN} zone (at GoDaddy, after the hold is released):`);
for (const ip of GITHUB_PAGES_IPS) console.log(`  A     @        ${ip}`);
console.log(`  CNAME www      apex-architecture.github.io`);

const apex = await resolves(DOMAIN);
const www = await resolves(`www.${DOMAIN}`);
console.log(`\nDNS now: ${DOMAIN} -> ${apex.length ? apex.join(", ") : "does not resolve"}`);
console.log(`        www.${DOMAIN} -> ${www.length ? www.join(", ") : "does not resolve"}`);

if (mode === "check") {
  const ok = apex.length > 0;
  console.log(ok ? "\nREADY: the domain resolves. Run without --check to cut over." : "\nNOT READY: the domain does not resolve yet. Release the GoDaddy hold first.");
  process.exit(ok ? 0 : 1);
}

if (!apex.length) {
  console.log("\nRefusing to cut over: the domain does not resolve, so publishing the CNAME would take the site down.");
  console.log("Release the GoDaddy hold and add the records above, then run this again.");
  process.exit(1);
}

writeFileSync(join(ROOT, "docs", "CNAME"), `${DOMAIN}\n`);
git(["add", "docs/CNAME"]);
git(["-c", "user.name=Kawaljeet Singh", "-c", "user.email=business@apex-infrastructure.com",
  "commit", "-m", `Serve the site from ${DOMAIN}`]);
git(["push", "origin", "main"]);
console.log(`\nCutover committed and pushed. GitHub Pages will serve ${DOMAIN} from the next build.`);
