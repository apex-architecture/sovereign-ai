/**
 * Emits the tool registry as machine-readable JSON.
 *
 * The registry is the answer to "connect every open-source tool there is". One row per tool,
 * each with the project's own repository, its licence, what it costs, and whether the platform
 * actually has a driver for it today. A row that has no driver says so — the studio prints
 * "no driver" rather than pretending a tool is connected.
 *
 *   node --experimental-strip-types scripts/tools-registry.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CATALOG = [
  ["creative-visual", "../src/lib/apex/catalog/creative-visual.ts", "CREATIVE_VISUAL"],
  ["creative-sound-design", "../src/lib/apex/catalog/creative-sound-design.ts", "CREATIVE_SOUND_DESIGN"],
  ["creative-time", "../src/lib/apex/catalog/creative-time.ts", "CREATIVE_TIME"],
  ["economy-reach", "../src/lib/apex/catalog/economy-reach.ts", "ECONOMY_REACH"],
  ["intelligence", "../src/lib/apex/catalog/intelligence.ts", "INTELLIGENCE"],
  ["platform-infra", "../src/lib/apex/catalog/platform-infra.ts", "PLATFORM_INFRA"],
];

// Engines the studio can actually reach today. Anything else is "no-driver" until a PR adds one.
const WIRED = new Set([
  "FFmpeg", "Blender", "Whisper", "Ollama", "ComfyUI", "Replicate", "Kdenlive", "Piper", "SAPI",
  "Wan 2.1", "LTX-Video", "Qwen", "DeepSeek", "Stable Diffusion", "Flux", "Sora", "Veo", "Kling",
  "Seedance", "Vidu", "Runway", "Luma", "HunyuanVideo", "AnimateDiff", "ControlNet", "LoRA",
]);

const rows = [];
for (const [group, spec, exportName] of CATALOG) {
  const mod = await import(spec);
  const list = mod[exportName];
  if (!Array.isArray(list)) throw new Error(`${spec} does not export ${exportName}`);
  for (const rec of list) {
    const repo = rec.sourceRepository || rec.officialUrl || "";
    const isGitHub = /github\.com|gitlab\.com|codeberg\.org|gitee\.com/i.test(repo);
    rows.push({
      group,
      name: rec.name,
      category: rec.category,
      url: rec.officialUrl || null,
      repository: rec.sourceRepository || null,
      openSource: isGitHub,
      license: rec.license,
      licenceVerified: rec.licenseVerified === true,
      lastVerified: rec.lastVerified ?? null,
      commercialUse: rec.commercialUse,
      cost: rec.cost,
      local: rec.localExecution === true,
      selfHosting: rec.selfHosting === true,
      apiAvailable: rec.apiAvailable === true,
      hardware: rec.hardware,
      integration: rec.integrationMethod,
      capability: rec.capability,
      priority: rec.priority,
      driver: WIRED.has(rec.name) ? "wired" : "no-driver",
    });
  }
}

const byDriver = { wired: 0, "no-driver": 0 };
const byLicence = {};
const openSource = [];
for (const r of rows) {
  byDriver[r.driver] += 1;
  byLicence[r.license] = (byLicence[r.license] ?? 0) + 1;
  if (r.openSource) openSource.push(r);
}

const out = {
  generated: new Date().toISOString(),
  counts: {
    total: rows.length,
    openSource: openSource.length,
    wired: byDriver.wired,
    noDriver: byDriver["no-driver"],
    licenceRead: rows.filter((r) => r.licenceVerified).length,
  },
  byLicence,
  tools: rows.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)),
};

mkdirSync(join(ROOT, "tools"), { recursive: true });
writeFileSync(join(ROOT, "tools", "registry.json"), JSON.stringify(out, null, 1) + "\n");

const readme = `# Tool registry

${out.counts.total} tools, every one with its own upstream link.

- open-source with a real repository: **${out.counts.openSource}**
- with a driver wired in the studio: **${out.counts.wired}**
- still \`no-driver\` (named honestly, not hidden): **${out.counts.noDriver}**
- licence read against the actual text by a human: **${out.counts.licenceRead}**

Regenerate with \`npm run tools:registry\`. Source of truth is \`src/lib/apex/catalog/\`; this file
is generated so the website and the code can never disagree about how many tools exist.

A row is not cleared for commercial use until a human has read its licence text. That is a rule in
\`src/lib/apex/schema.ts\`, not a habit.
`;
writeFileSync(join(ROOT, "tools", "README.md"), readme);

console.log(`tools: ${out.counts.total} rows | open-source ${out.counts.openSource} | wired ${out.counts.wired} | no-driver ${out.counts.noDriver} | licence read ${out.counts.licenceRead}`);
console.log("licences:", JSON.stringify(byLicence));
console.log("written: tools/registry.json, tools/README.md");
