/**
 * Attests licences by fetching the text, not by trusting a memory of it.
 *   node --experimental-strip-types scripts/attest-licences.mjs
 *
 * What this proves and what it does not: it proves the licence file exists, says which SPDX
 * id its own words claim, and freezes its bytes under a hash. It does NOT prove a human read
 * it. So the clearance it writes carries personalUse only — client work and redistribution
 * still require humanSignedBy, which this script can never set.
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

const UA = "APEX-licence-attestation/1.0 (fetching a licence file)";

/** One tool, the file that carries its terms, and the words its own header must contain. */
const WITNESSES = [
  { toolId: "ffmpeg", name: "FFmpeg", urls: ["https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/COPYING.LGPLv2.1"], mustInclude: ["GNU LESSER GENERAL PUBLIC LICENSE", "Version 2.1"], spdx: "LGPL-2.1-or-later", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "the installed build's exact licence depends on its configure flags; gyan.dev builds are GPL because they enable x264 — recorded so a human can settle it, not to claim it is settled" },
  { toolId: "whisper", name: "Whisper", urls: ["https://raw.githubusercontent.com/openai/whisper/main/LICENSE"], mustInclude: ["MIT License"], spdx: "MIT", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "model weights are a separate grant from the code; the code licence is what is attested here" },
  { toolId: "blender", name: "Blender", urls: ["https://raw.githubusercontent.com/blender/blender/master/doc/license/GPL-license.txt", "https://projects.blender.org/blender/blender/raw/branch/main/doc/license/GPL-license.txt"], mustInclude: ["GNU GENERAL PUBLIC LICENSE", "Version 2, June 1991"], spdx: "GPL-2.0-only", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "root COPYING is a 302-byte pointer that names doc/license/GPL-license.txt — fetching COPYING itself proves nothing, which is why the witness is the file it points to. Blender's own words: 'Blender is not available under other licenses', so this is GPL-2.0-only, not -or-later. Output of Blender is not itself GPL; that is why personal use passes while redistribution waits." },
  { toolId: "comfyui", name: "ComfyUI", urls: ["https://raw.githubusercontent.com/comfyanonymous/ComfyUI/master/LICENSE"], mustInclude: ["GNU GENERAL PUBLIC LICENSE", "Version 3"], spdx: "GPL-3.0-only", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "ComfyUI is the harness, not the image: it is GPL-3.0 and we run it unmodified over its local HTTP API, so the GPL attaches to the program, not to a video rendered with it. Selling work made with it still needs a human to read the terms — which is exactly what this script cannot do." },
  { toolId: "wan2.1", name: "Wan 2.1", urls: ["https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B/raw/main/LICENSE.txt", "https://raw.githubusercontent.com/Wan-Video/Wan2.1/main/LICENSE"], mustInclude: ["Apache License", "Version 2.0"], spdx: "Apache-2.0", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "the weights, not the code: Wan2.1-T2V-1.3B ships under Apache-2.0 per the licence file in its own model repo. The 14B siblings are the same grant. Held to personal use here because this script cannot sign — a human read is what turns it into a claim we can sell on." },
  { toolId: "piper", name: "Piper", urls: ["https://raw.githubusercontent.com/rhasspy/piper/master/LICENSE.md", "https://raw.githubusercontent.com/rhasspy/piper/master/LICENSE"], mustInclude: ["MIT License"], spdx: "MIT", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "the binary is MIT; each voice pack carries its own terms, so this attests the engine and not the voice — a voice whose model card grants commercial use still needs its own read before it speaks in paid work." },
  { toolId: "ollama", name: "Ollama", urls: ["https://raw.githubusercontent.com/ollama/ollama/main/LICENSE"], mustInclude: ["MIT License"], spdx: "MIT", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "the runner is MIT; every model pulled through it carries its own grant, so this attests the program and never the weights — a Qwen or DeepSeek weight file needs its own read before it speaks in paid work" },
  { toolId: "router", name: "9router", urls: ["https://raw.githubusercontent.com/decolua/9router/main/LICENSE", "https://raw.githubusercontent.com/decolua/9router/master/LICENSE"], mustInclude: ["MIT License"], spdx: "MIT", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "the bus is MIT and adds no terms of its own; the provider whose key you paste is the licence that governs the words it returns" },
  { toolId: "agent_desktop", name: "agent-desktop (Vercel Labs)", urls: ["https://raw.githubusercontent.com/vercel-labs/agent-desktop/main/LICENSE", "https://raw.githubusercontent.com/vercel-labs/agent-desktop/master/LICENSE"], mustInclude: ["Apache License", "Version 2.0"], spdx: "Apache-2.0", permitsPersonalUse: true, permitsClientWork: false, permitsRedistribution: false, note: "hands that operate other people's apps: the Apache grant covers this tool, not the desktop application it clicks, so a paid edit session in Resolve still needs Resolve's own read" },
];

const out = {}
for (const w of WITNESSES) {
  let done = false;
  for (const url of w.urls) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(25_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const missing = w.mustInclude.filter((needle) => !text.includes(needle));
      if (missing.length) {
        console.log(`REJECTED ${w.name}: ${url} does not contain ${JSON.stringify(missing)}`);
        continue;
      }
      out[w.toolId] = {
        name: w.name,
        spdx: w.spdx,
        evidenceUrl: url,
        sha256: createHash("sha256").update(text).digest("hex"),
        bytes: text.length,
        retrievedAt: new Date().toISOString().slice(0, 10),
        personalUse: w.permitsPersonalUse,
        clientWork: w.permitsClientWork,
        redistribute: w.permitsRedistribution,
        humanSignedBy: null,
        note: w.note,
      };
      console.log(`ATTESTED ${w.name.padEnd(8)} ${w.spdx.padEnd(20)} sha256=${out[w.toolId].sha256.slice(0, 16)}… bytes=${text.length}`);
      done = true;
      break;
    } catch (e) {
      console.log(`  could not read ${url}: ${String(e.message ?? e)}`);
    }
  }
  if (!done) console.log(`NOT ATTESTED ${w.name} — no witness file could be read, so it stays blocked`);
}

const file = {
  policy: "personalUse may be machine-attested from the licence text itself. clientWork and redistribute require humanSignedBy; no fetch sets them.",
  generatedAt: new Date().toISOString(),
  clearances: out,
};
// A module, not JSON read at run time: the gate is imported by browser code too, and fs has no
// place there. Regenerate this file rather than hand-editing it — the hash inside is the evidence.
const target = path.resolve("src/lib/apex/licence-clearances.ts");
writeFileSync(
  target,
  [
    "/* GENERATED by scripts/attest-licences.mjs — do not hand-edit. Every entry is a licence file that was opened, matched, and hashed. */",
    "export interface Clearance {",
    "  name: string;",
    "  spdx: string;",
    "  evidenceUrl: string;",
    "  sha256: string;",
    "  bytes: number;",
    "  retrievedAt: string;",
    "  personalUse: boolean;",
    "  clientWork: boolean;",
    "  redistribute: boolean;",
    "  humanSignedBy: string | null;",
    "  note: string;",
    "}",
    "",
    "export const LICENCE_CLEARANCES: { policy: string; generatedAt: string; clearances: Record<string, Clearance> } =",
    `  ${JSON.stringify(file, null, 2)};`,
    "",
  ].join("\n"),
);
console.log(`wrote ${path.relative(process.cwd(), target)} — ${Object.keys(out).length} tool(s) attested`);
