/**
 * The engine index — the part of the road that decides which tool a job gets.
 *
 * Three laws, in order:
 *   1. A tool is never offered because it is famous. Every field that decides an offer is either
 *      measured with a source URL attached, or it says "unmeasured" and ranks behind the ones that
 *      do not.
 *   2. Ranking is subtraction first, ordering second. The gates below are hard and each one prints
 *      the reason it excluded a tool, because a shortlist without its refusals is advertising.
 *   3. Nobody spends Master's money by accident. An API with no price on record is refused, and the
 *      money for a rented body belongs to whoever's key runs it — the platform quotes, it does not
 *      bill.
 *
 * The list is deliberately not the product. scripts/engines-refresh.mjs is what keeps it from
 * becoming a museum; this file is one morning's honest snapshot of it.
 */

import type { Engine, Executor, Stage } from "./engines/contract.ts";
import { SURVEY_AUDIO } from "./engines/audio.ts";
import { SURVEY_CAPTION_QC_DELIVER } from "./engines/caption-qc-deliver.ts";
import { SURVEY_EDIT_FINISH } from "./engines/edit-finish.ts";
import { SURVEY_MOTION } from "./engines/motion.ts";
import { SURVEY_PUBLISH } from "./engines/publish.ts";
import { SURVEY_STORYBOARD } from "./engines/storyboard.ts";
import { SURVEY_WRITING } from "./engines/writing.ts";
export type { Body, Ceiling, Engine, Executor, Licence, Stage } from "./engines/contract.ts";

const MEASURED = "2026-11-03";

/**
 * Seed snapshot. Sources are in docs/research-ai-video-models.md, where every figure below carries
 * its own citation. Anything not verified in that pass is null and says so.
 */
const SEED_ENGINES: Engine[] = [
  // ---------- motion: open weights ----------
  {
    id: "wan2.2",
    name: "Wan 2.2 (TI2V-5B / I2V-A14B)",
    stage: "motion",
    kind: "weights",
    vendorUrl: "https://github.com/Wan-Video/Wan2.2",
    sourceRepository: "https://github.com/Wan-Video/Wan2.2",
    licence: {
      spdx: "Apache-2.0",
      evidenceUrl: "https://raw.githubusercontent.com/Wan-Video/Wan2.2/main/LICENSE.txt",
      excludedTerritories: [],
      revenueClause: "none",
      attested: null,
    },
    released: "2026-09-21",
    releasedSource: "https://github.com/Wan-Video/Wan2.2",
    ceiling: { maxEdge: 1280, maxSeconds: 5, fps: 24, nativeAudio: false, lipSync: false },
    body: { vramGb: 24, weightsPublic: true, executors: ["local-comfy", "rented-gpu"] },
    priceUsdPerSecond: null,
    priceSource: "self-hosted: the bill is the GPU hour, not the model",
    board: null,
    driver: "needs-licence-read",
    fits: "The cleanest licence in the category: no territory ban, no revenue clause, no UI attribution. This is the one an open-source platform may ship without a lawyer.",
    measuredAt: MEASURED,
  },
  {
    id: "wan2.1-1.3b",
    name: "Wan 2.1 T2V 1.3B",
    stage: "motion",
    kind: "weights",
    vendorUrl: "https://github.com/Wan-Video/Wan2.1",
    sourceRepository: "https://github.com/Wan-Video/Wan2.1",
    licence: {
      spdx: "Apache-2.0",
      evidenceUrl: "https://raw.githubusercontent.com/Wan-Video/Wan2.1/main/LICENSE.txt",
      excludedTerritories: [],
      revenueClause: "none",
      attested: "machine",
    },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: 1280, maxSeconds: 5, fps: 16, nativeAudio: false, lipSync: false },
    body: { vramGb: 6, weightsPublic: true, executors: ["local-comfy", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "ran on this machine for $0; 480 s wall clock per 17-frame clip",
    board: null,
    driver: "drivable",
    fits: "What actually runs tonight: 832x480, silent, on a 6 GB laptop GPU with the text encoder pinned to system RAM. A proof of the rail, not a film engine.",
    measuredAt: MEASURED,
  },
  {
    id: "hunyuanvideo-1.5",
    name: "Tencent HunyuanVideo 1.5",
    stage: "motion",
    kind: "weights",
    vendorUrl: "https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5",
    sourceRepository: "https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5",
    licence: {
      spdx: "Tencent-Hunyuan-Community",
      evidenceUrl: "https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanVideo-1.5/main/LICENSE",
      excludedTerritories: ["European Union", "United Kingdom", "South Korea"],
      revenueClause: "community agreement, not open source",
      attested: null,
    },
    released: "2025-11-21",
    releasedSource: "https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5",
    ceiling: { maxEdge: 1920, maxSeconds: 10, fps: 24, nativeAudio: false, lipSync: false },
    body: { vramGb: 14, weightsPublic: true, executors: ["rented-gpu"] },
    priceUsdPerSecond: null,
    priceSource: "self-hosted; needs a 16 GB card even with offloading",
    board: null,
    driver: "no-driver",
    fits: "Light open baseline, 1080p through built-in super-resolution — and a licence that excludes the EU, UK and Korea outright.",
    measuredAt: MEASURED,
  },
  {
    id: "ltx-2.5",
    name: "Lightricks LTX-2.5",
    stage: "motion",
    kind: "weights",
    vendorUrl: "https://huggingface.co/Lightricks/LTX-2.5",
    sourceRepository: "https://github.com/Lightricks/LTX-2",
    licence: {
      spdx: "LTX-2.x-Community",
      evidenceUrl: null,
      excludedTerritories: [],
      revenueClause: "free under $10M annual revenue; paid Commercial Use Agreement above it",
      attested: null,
    },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: 3840, maxSeconds: 20, fps: 24, nativeAudio: true, lipSync: null },
    body: { vramGb: 16, weightsPublic: true, executors: ["local-comfy", "rented-gpu"] },
    priceUsdPerSecond: null,
    priceSource: "self-hosted; 10 s in 6.8 s wall clock on 2x GB200",
    board: null,
    driver: "no-driver",
    fits: "The speed story: synchronised audio, 4K through upscalers, quantised distilled checkpoints that fit 16 GB. The revenue clause is the one to read before shipping it to customers.",
    measuredAt: MEASURED,
  },
  {
    id: "minimax-h3",
    name: "MiniMax H3",
    stage: "motion",
    kind: "weights",
    vendorUrl: "https://huggingface.co/MiniMaxAI/MiniMax-H3",
    sourceRepository: "https://huggingface.co/MiniMaxAI/MiniMax-H3",
    licence: {
      spdx: "MiniMax-H3-Community",
      evidenceUrl: "https://huggingface.co/MiniMaxAI/MiniMax-H3/raw/main/LICENSE",
      excludedTerritories: ["European Union", "United Kingdom", "Republic of Korea", "United States of America"],
      revenueClause: "separate written authorisation above $20M yearly revenue; product UI must display 'MiniMax H3'",
      attested: null,
    },
    released: "2026-08-03",
    releasedSource: "https://huggingface.co/MiniMaxAI/MiniMax-H3",
    ceiling: { maxEdge: 2560, maxSeconds: 15, fps: 24, nativeAudio: true, lipSync: true },
    body: { vramGb: 80, weightsPublic: true, executors: ["rented-gpu"] },
    priceUsdPerSecond: 0.13,
    priceSource: "vendor 2K tier, per second of output (2026-11-03 pass)",
    board: { name: "Artificial Analysis T2V (with audio)", elo: 1162, rank: 3, asOf: "2026-10" },
    driver: "no-driver",
    fits: "Highest-ranked genuinely open-weight video model in the world — and its own licence forbids the United States, the EU, the UK and Korea. The weights being public does not make it usable here.",
    measuredAt: MEASURED,
  },
  {
    id: "magi-2",
    name: "Sand AI MAGI-2 (preview)",
    stage: "motion",
    kind: "weights",
    vendorUrl: "https://huggingface.co/sand-ai/MAGI-2-preview",
    sourceRepository: "https://huggingface.co/sand-ai/MAGI-2-preview",
    licence: { spdx: "Apache-2.0", evidenceUrl: null, excludedTerritories: [], revenueClause: "none surfaced", attested: null },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: 1920, maxSeconds: 10, fps: null, nativeAudio: true, lipSync: null },
    body: { vramGb: 80, weightsPublic: true, executors: ["rented-gpu"] },
    priceUsdPerSecond: null,
    priceSource: "needs 8 Hopper GPUs; the 114B MoE trunk is datacenter-only",
    board: { name: "Artificial Analysis T2V (with audio)", elo: 1044, rank: 15, asOf: "2026-10" },
    driver: "no-driver",
    fits: "Apache-2.0 and top-15 with sound, at a price of eight datacenter GPUs per render.",
    measuredAt: MEASURED,
  },

  // ---------- motion: closed APIs ----------
  {
    id: "wan3.0-api",
    name: "Alibaba Wan 3.0 (Model Studio)",
    stage: "motion",
    kind: "api",
    vendorUrl: "https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/",
    sourceRepository: null,
    licence: { spdx: "proprietary-terms", evidenceUrl: null, excludedTerritories: [], revenueClause: "vendor terms", attested: null },
    released: "2026-08-24",
    releasedSource: "https://www.alibabacloud.com/blog/603505",
    ceiling: { maxEdge: 1920, maxSeconds: 30, fps: null, nativeAudio: true, lipSync: true },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0.2,
    priceSource: "vendor rate card, Model Studio Singapore: $0.05 (480P) / $0.10 (720P) / $0.20 (1080P). APEX quotes from this ladder before it calls anything. Model id wan3.0-video, async endpoint, X-DashScope-Async: enable",
    board: { name: "Artificial Analysis T2V (with audio)", elo: 1174, rank: 1, asOf: "2026-10" },
    driver: "drivable",
    fits: "The best model in the world on the open blind vote, 30 s in one pass, priced per second — and no weights published. This is exactly the job the platform rents compute for: the customer's key, the customer's bill. APEX drives it through the Model Studio async endpoint today; it needs DASHSCOPE_API_KEY and the workspace's own host in DASHSCOPE_BASE_URL.",
    measuredAt: MEASURED,
  },
  {
    id: "kling-4.0",
    name: "Kuaishou Kling 4.0",
    stage: "motion",
    kind: "api",
    vendorUrl: "https://kling.ai/document-api/guides/get-started/overview",
    sourceRepository: null,
    licence: { spdx: "proprietary-terms", evidenceUrl: null, excludedTerritories: [], revenueClause: "vendor terms", attested: null },
    released: "2026-10-15",
    releasedSource: "https://the-decoder.com/kling-ai-drops-version-4-0-with-stereo-audio-multilingual-lip-sync-and-a-lighter-flash-variant/",
    ceiling: { maxEdge: 3840, maxSeconds: 30, fps: null, nativeAudio: true, lipSync: true },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0.14,
    priceSource: "Kling's published ladder, in U at $0.14/U: 4.0 is 1.0 U/s at 720p and 1.5 U/s at 1080p. 4K is not on the published ladder, so the driver refuses it rather than guessing. Model id kling-4.0",
    board: null,
    driver: "drivable",
    fits: "Native 4K, stereo audio, lip-sync in more than ten languages, 30 s single pass because stitching is what makes characters drift. APEX drives it through Kling's own API with the creator's own KLING_API_KEY.",
    measuredAt: MEASURED,
  },
  {
    id: "seedance-2.5",
    name: "ByteDance Seedance 2.5",
    stage: "motion",
    kind: "api",
    vendorUrl: "https://dreamina.capcut.com/seedance/seedance-2-5",
    sourceRepository: null,
    licence: { spdx: "proprietary-terms", evidenceUrl: null, excludedTerritories: [], revenueClause: "vendor terms", attested: null },
    released: "2026-07-31",
    releasedSource: "https://seed.bytedance.com/seedance2_0",
    ceiling: { maxEdge: 1920, maxSeconds: 30, fps: null, nativeAudio: true, lipSync: true },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0.53,
    priceSource: "Ark's published token rate: tokens = seconds x width x height x fps / 1024, at ¥70/M for 480p and 720p and ¥77/M for 1080p — 1080p works out at ¥3.74/s ≈ $0.53/s at 7.1 CNY/USD. Model id doubao-seedance-2-5-260628",
    board: { name: "Artificial Analysis T2V (with audio)", elo: 1156, rank: 5, asOf: "2026-10" },
    driver: "drivable",
    fits: "Up to 50 reference assets at once, which is how a film keeps one face across forty shots. APEX drives it through Volcengine Ark with the creator's own ARK_API_KEY, and the bill is priced from Ark's own token formula before the call is made.",
    measuredAt: MEASURED,
  },
  {
    id: "veo-3.1",
    name: "Google Veo 3.1",
    stage: "motion",
    kind: "api",
    vendorUrl: "https://aistudio.google.com/docs/veo",
    sourceRepository: null,
    licence: { spdx: "proprietary-terms", evidenceUrl: null, excludedTerritories: [], revenueClause: "vendor terms", attested: null },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: 3840, maxSeconds: 8, fps: 24, nativeAudio: true, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0.4,
    priceSource: "720p/1080p generate tier; 4K $0.60/s; Fast $0.10-0.30/s; Lite $0.05-0.08/s",
    board: null,
    driver: "no-driver",
    fits: "4K and audio always on — at an 8-second single pass, with extensions dropping back to 720p. Not offered: the house does not route to Google, so Veo and Gemini Omni are catalogued and priced but never called. That rule is one list, in src/lib/apex/drivers/cloud-video.ts.",
    measuredAt: MEASURED,
  },
  {
    id: "runway-gen-4.5",
    name: "Runway Gen-4.5",
    stage: "motion",
    kind: "api",
    vendorUrl: "https://runwayml.com",
    sourceRepository: null,
    licence: { spdx: "proprietary-terms", evidenceUrl: null, excludedTerritories: [], revenueClause: "vendor terms", attested: null },
    released: "2025-12-01",
    releasedSource: "https://sharkfoto.com/ai/models/runway-gen-4.5/",
    ceiling: { maxEdge: 1280, maxSeconds: 10, fps: null, nativeAudio: false, lipSync: false },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0.12,
    priceSource: "12 credits/s at the published credit rate of $0.01, straight from Runway's own pricing guide. Model id gen4.5",
    board: null,
    driver: "drivable",
    fits: "Camera control is still its craft, and it is the one frontier name here with no sound in the file. APEX drives it through Runway's own API with the creator's own RUNWAYML_API_SECRET.",
    measuredAt: MEASURED,
  },
  {
    id: "fal-video-gateway",
    name: "fal.ai video gateway",
    stage: "motion",
    kind: "api",
    vendorUrl: "https://fal.ai/docs/api-reference/inference-api/queue/submit",
    sourceRepository: null,
    licence: { spdx: "proprietary-terms", evidenceUrl: null, excludedTerritories: [], revenueClause: "vendor terms", attested: null },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: 1920, maxSeconds: 30, fps: null, nativeAudio: true, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: ["vendor-api"] },
    priceUsdPerSecond: 0.05,
    priceSource: "fal's own endpoint billing blocks: Wan 3.0 $0.05/s, Kling v4 $0.157/s, Luma Ray 3.2 $0.03/s, Seedance 2.0 $0.014 per 1000 tokens — one key reaches all four",
    board: null,
    driver: "drivable",
    fits: "The cheapest route to four frontier models at once: one credential, one queue, one bill. APEX drives it through fal's queue API with the creator's own FAL_KEY, and it is the fallback when a direct vendor is out of credit or out of queue.",
    measuredAt: MEASURED,
  },
  {
    id: "sora-2",
    name: "OpenAI Sora 2",
    stage: "motion",
    kind: "api",
    vendorUrl: "https://openai.com/index/sora-2/",
    sourceRepository: null,
    licence: { spdx: "withdrawn", evidenceUrl: "https://developers.openai.com/api/docs/deprecations", excludedTerritories: [], revenueClause: "n/a", attested: null },
    released: null,
    releasedSource: "app closed 2026-04-26; API models removed 2026-09-24 with no successor named",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: null, weightsPublic: false, executors: [] },
    priceUsdPerSecond: null,
    priceSource: "not purchasable",
    board: null,
    driver: "no-driver",
    fits: "Dead. It stays in the index on purpose: a dictionary that quietly deletes what vanished is a brochure, and any page of this platform that still advertises it is lying.",
    measuredAt: MEASURED,
  },

  // ---------- the other stages, at the depth the evidence supports ----------
  {
    id: "comfyui",
    name: "ComfyUI",
    stage: "storyboard",
    kind: "cli",
    vendorUrl: "https://www.comfy.org",
    sourceRepository: "https://github.com/comfyanonymous/ComfyUI",
    licence: { spdx: "GPL-3.0-only", evidenceUrl: "https://raw.githubusercontent.com/comfyanonymous/ComfyUI/master/LICENSE", excludedTerritories: [], revenueClause: "copyleft on the tool, not the frames", attested: "machine" },
    released: "2026-11-03",
    releasedSource: "0.27.0 reported by its own /system_stats on this machine",
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 6, weightsPublic: true, executors: ["local-comfy", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "the box it runs on; $0 on a laptop, a GPU hour on a rented one",
    board: null,
    driver: "drivable",
    fits: "The body the platform drives: the same graph runs on a laptop, a rented pod, or somebody else's machine, because it is an HTTP server before it is anything else.",
    measuredAt: MEASURED,
  },
  {
    id: "whisper",
    name: "OpenAI Whisper",
    stage: "subtitles",
    kind: "weights",
    vendorUrl: "https://github.com/openai/whisper",
    sourceRepository: "https://github.com/openai/whisper",
    licence: { spdx: "MIT", evidenceUrl: "https://raw.githubusercontent.com/openai/whisper/main/LICENSE", excludedTerritories: [], revenueClause: "none", attested: "machine" },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 2, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "local",
    board: null,
    driver: "drivable",
    fits: "Subtitles and the timing track that dialogue and QC are measured against.",
    measuredAt: MEASURED,
  },
  {
    id: "ffmpeg",
    name: "FFmpeg",
    stage: "finish",
    kind: "cli",
    vendorUrl: "https://ffmpeg.org",
    sourceRepository: "https://github.com/FFmpeg/FFmpeg",
    licence: { spdx: "LGPL-2.1-or-later", evidenceUrl: "https://git.ffmpeg.org/gitweb/ffmpeg.git/blob_plain/HEAD:/COPYING.LGPLv2.1", excludedTerritories: [], revenueClause: "none", attested: "machine" },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 0, weightsPublic: true, executors: ["local-cli", "rented-gpu"] },
    priceUsdPerSecond: 0,
    priceSource: "local; the grain, halation, gate weave and colour tags all measure through it",
    board: null,
    driver: "drivable",
    fits: "Every frame that leaves this platform is shaped and measured here, including the 13-gate verdict a film is delivered against.",
    measuredAt: MEASURED,
  },
  {
    id: "blender",
    name: "Blender",
    stage: "character_lock",
    kind: "cli",
    vendorUrl: "https://www.blender.org",
    sourceRepository: "https://projects.blender.org/blender/blender",
    licence: { spdx: "GPL-2.0-only", evidenceUrl: "https://raw.githubusercontent.com/blender/blender/master/doc/license/GPL-license.txt", excludedTerritories: [], revenueClause: "none", attested: "machine" },
    released: null,
    releasedSource: null,
    ceiling: { maxEdge: null, maxSeconds: null, fps: null, nativeAudio: false, lipSync: null },
    body: { vramGb: 4, weightsPublic: true, executors: ["local-cli"] },
    priceUsdPerSecond: 0,
    priceSource: "local",
    board: null,
    driver: "drivable",
    fits: "3D sets, and the only honest answer to a hybrid animated/live request on consumer hardware.",
    measuredAt: MEASURED,
  },
];

/**
 * The dictionary. Each cluster file under engines/ was absorbed from a dated research pass in docs/,
 * and the seed above carries the platform's own measured tools. Two rows for the same engine id never
 * both count: the first one in — usually the row this platform measured by driving it — wins, and the
 * survey row is dropped rather than silently averaged with it.
 */
export const ENGINES: Engine[] = dedupeById([
  ...SEED_ENGINES,
  ...SURVEY_WRITING,
  ...SURVEY_STORYBOARD,
  ...SURVEY_MOTION,
  ...SURVEY_AUDIO,
  ...SURVEY_EDIT_FINISH,
  ...SURVEY_CAPTION_QC_DELIVER,
  ...SURVEY_PUBLISH,
]);

function dedupeById(list: Engine[]): Engine[] {
  const seen = new Set<string>();
  return list.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

/** What the caller is asking for, and what the caller actually has. */
export interface JobContext {
  stage: Stage;
  /** Seconds of finished picture in this job. */
  seconds: number;
  /** Long edge requested. Null = "whatever is good enough". */
  qualityEdge: number | null;
  needsAudio: boolean;
  /** Where the creator is, for licence purposes. */
  territory: string;
  /** personal | client | redistribute — the same three lanes the licence gate uses. */
  intent: "personal" | "client" | "redistribute";
  /** Hard ceiling on this job, in dollars. */
  budgetUsd: number;
  /** VRAM the caller can reach, in GB. Null when they have no machine and must rent. */
  vramGb: number | null;
  /** Engine families the caller holds credentials or software for. */
  executors: Executor[];
  /** Only engines the platform can drive today. False ranks everything the dictionary knows. */
  drivableOnly: boolean;
}

export interface Gate {
  name: string;
  passed: boolean;
  why: string;
}

export interface Offer {
  engine: Engine;
  gates: Gate[];
  /** What this job costs, quoted before anyone spends it. */
  quoteUsd: number | null;
  quoteBasis: string;
  /**
   * What the engine will not do natively for this ask. A caveat is an offer with its honesty attached
   * — the road never refuses a tool for needing the finish stage to close a resolution gap, but it
   * never pretties the gap either.
   */
  caveats: string[];
}

export interface Ranking {
  context: JobContext;
  offers: Offer[];
  refused: { engine: Engine; gate: string; why: string }[];
  /** Every number that decided an offer, so the page can print its evidence. */
  counted: { engines: number; measuredQuality: number; measuredPrice: number };
}

const TERRITORY_MATCH = (excluded: string[], here: string) =>
  excluded.some((t) => t.toLowerCase() === here.toLowerCase() || here.toLowerCase().includes(t.toLowerCase()));

/** Cost of this job on this engine, or null when the price was never measured. */
export function quoteFor(engine: Engine, ctx: JobContext): { usd: number | null; basis: string } {
  if (engine.priceUsdPerSecond === 0) return { usd: 0, basis: `self-hosted on ${engine.body.executors.join(" or ")}: the cost is the box, not the tool` };
  // A tool that only ever runs on a body the creator already holds has no per-second price to
  // measure: the honest number is zero, and the survey rows say "free open source" instead.
  const localOnly = engine.body.executors.length > 0 && engine.body.executors.every((x) => x === "local-cli" || x === "local-comfy");
  if (engine.priceUsdPerSecond === null && localOnly && engine.kind !== "api") {
    return { usd: 0, basis: `${engine.priceSource ?? "free and self-hosted"} on your own machine — no per-second bill exists` };
  }
  if (engine.priceUsdPerSecond === null) return { usd: null, basis: engine.priceSource ?? "no price on record" };
  return { usd: Math.round(engine.priceUsdPerSecond * ctx.seconds * 100) / 100, basis: `${engine.priceUsdPerSecond}/s x ${ctx.seconds}s (per-second billing, ${engine.priceSource ?? "vendor rate"})` };
}

/**
 * The gates, in the order they are allowed to fire. Hard exclusions first: a tool that cannot
 * legally or physically do the job is refused, not ranked lower. What survives is then ordered by
 * measured quality, then release recency, then price.
 */
export function rankEngines(ctx: JobContext, engines: Engine[] = ENGINES): Ranking {
  const offers: Offer[] = [];
  const refused: Ranking["refused"] = [];

  for (const engine of engines.filter((e) => e.stage === ctx.stage)) {
    const gates: Gate[] = [];

    gates.push({
      name: "exists",
      passed: engine.licence.spdx !== "withdrawn",
      why: engine.licence.spdx === "withdrawn" ? "discontinued: no app, no API, no successor named" : "available",
    });

    const banned = TERRITORY_MATCH(engine.licence.excludedTerritories, ctx.territory);
    const unattested = engine.licence.attested === null;
    // "needs-licence-read" is the platform's own admission that nobody has cleared this tool for
    // money. Several rows carry a friendly code licence (MIT) over non-commercial weights
    // (CC-BY-NC) — the state says what the SPDX field alone cannot.
    const uncleared = engine.driver === "needs-licence-read";
    gates.push({
      name: "licence",
      passed: !banned && !(ctx.intent !== "personal" && (unattested || uncleared)),
      why: banned
        ? `its own licence excludes ${engine.licence.excludedTerritories.join(", ")} — you are in ${ctx.territory}`
        : ctx.intent !== "personal" && uncleared
          ? `not cleared for "${ctx.intent}" work — the platform records this licence as needing a human read${engine.licence.evidenceUrl ? ` (${engine.licence.evidenceUrl})` : ""}`
          : ctx.intent !== "personal" && unattested
            ? `licence text not fetched-and-hashed${engine.licence.evidenceUrl ? ` (${engine.licence.evidenceUrl})` : ""}; personal use is cleared, "${ctx.intent}" is not`
            : `${engine.licence.spdx}${engine.licence.attested ? `, attested by ${engine.licence.attested}` : ", personal lane only"}`,
    });

    const reach = engine.body.executors.filter((x) => ctx.executors.includes(x));
    gates.push({
      name: "body",
      passed:
        engine.body.executors.length === 0
          ? false
          : reach.length > 0 && (ctx.vramGb === null || engine.body.vramGb === null || engine.body.vramGb <= ctx.vramGb || reach.includes("vendor-api")),
      why:
        engine.body.executors.length === 0
          ? "nothing runs it any more"
          : reach.length === 0
            ? `needs ${engine.body.executors.join(" or ")}; this caller has ${ctx.executors.join(", ") || "no compute declared"}`
            : ctx.vramGb !== null && engine.body.vramGb !== null && engine.body.vramGb > ctx.vramGb && reach.includes("vendor-api")
              ? `too heavy for ${ctx.vramGb} GB, so it runs on the vendor's hardware through your key`
              : ctx.vramGb !== null && engine.body.vramGb !== null && engine.body.vramGb > ctx.vramGb
                ? `${engine.body.vramGb} GB GPU floor against the ${ctx.vramGb} GB on hand — rent a body or lower the ask`
                : `reachable on ${reach.join(", ")}`,
    });

    // Resolution is the one gap a later stage can close: a 832 px generation upscaled to a 1080 p
    // master is a real film, and refusing the only engine a creator can afford because their ask is
    // bigger than its sensor is how a platform becomes a brochure. So it is offered, with the gap
    // written on it, and ranked behind anything that meets the ask natively.
    const belowAsk = ctx.qualityEdge !== null && engine.ceiling.maxEdge !== null && engine.ceiling.maxEdge < ctx.qualityEdge;
    const noSound = ctx.needsAudio && !engine.ceiling.nativeAudio;
    const caveats: string[] = [];
    if (belowAsk && engine.kind !== "cli") {
      caveats.push(`renders at ${engine.ceiling.maxEdge} px on the long edge; your ${ctx.qualityEdge} px ask arrives through the finish stage's upscale`);
    }
    gates.push({
      name: "capability",
      passed: engine.kind === "cli" ? true : !noSound,
      why: noSound
        ? "the ask needs sound in the same pass and this engine delivers picture only"
        : engine.kind === "cli"
          ? "not a generator — a render ask is not a ceiling for it"
          : `${engine.ceiling.maxEdge ?? "?"} px${engine.ceiling.maxSeconds ? `, ${engine.ceiling.maxSeconds}s single pass` : ""}${engine.ceiling.nativeAudio ? ", audio in the same pass" : ""}${caveats.length ? " — under the ask, see caveat" : ""}`,
    });

    const quote = quoteFor(engine, ctx);
    const unpriced = engine.kind === "api" && quote.usd === null;
    gates.push({
      name: "price",
      passed: !unpriced && (quote.usd === null || quote.usd <= ctx.budgetUsd),
      why: unpriced
        ? "an API with no price on record is refused, never guessed"
        : quote.usd !== null && quote.usd > ctx.budgetUsd
          ? `${quote.basis} = $${quote.usd}, over the $${ctx.budgetUsd} budget for this job`
          : quote.basis,
    });

    gates.push({
      name: "driver",
      passed: !ctx.drivableOnly || engine.driver === "drivable",
      why: engine.driver === "drivable" ? "the platform can drive it today" : `driver state is "${engine.driver}"`,
    });

    const failed = gates.filter((g) => !g.passed);
    if (failed.length === 0) offers.push({ engine, gates, quoteUsd: quote.usd, quoteBasis: quote.basis, caveats });
    else refused.push({ engine, gate: failed[0].name, why: failed[0].why });
  }

  offers.sort((a, b) => {
    const meetsAsk = Number(a.caveats.length > 0) - Number(b.caveats.length > 0);
    if (meetsAsk !== 0) return meetsAsk;
    const elo = (b.engine.board?.elo ?? -1) - (a.engine.board?.elo ?? -1);
    if (elo !== 0) return elo;
    const date = String(b.engine.released ?? "").localeCompare(String(a.engine.released ?? ""));
    if (date !== 0) return date;
    return (a.quoteUsd ?? Number.POSITIVE_INFINITY) - (b.quoteUsd ?? Number.POSITIVE_INFINITY);
  });

  return {
    context: ctx,
    offers,
    refused,
    counted: {
      engines: engines.filter((e) => e.stage === ctx.stage).length,
      measuredQuality: engines.filter((e) => e.stage === ctx.stage && e.board?.elo != null).length,
      measuredPrice: engines.filter((e) => e.stage === ctx.stage && e.priceUsdPerSecond != null).length,
    },
  };
}

/** The shortlist a creator is offered, in the words they need: rank, price, and the reason. */
export function rankLines(ranking: Ranking): string[] {
  return ranking.offers.map((o, i) => {
    const q = o.quoteUsd === null ? "price unmeasured" : o.quoteUsd === 0 ? "$0 (your hardware)" : `$${o.quoteUsd.toFixed(2)}`;
    const caveat = o.caveats.length ? ` — caveat: ${o.caveats.join("; ")}` : "";
    return `${i + 1}. ${o.engine.name} — ${o.engine.licence.spdx} — ${q} — ${o.engine.fits.split(".")[0]}.${caveat}`;
  });
}

export interface Escape {
  engine: Engine;
  quoteUsd: number | null;
  quoteBasis: string;
  /** What the caller would have to hold for this to become an offer. */
  precondition: string;
}

/**
 * When the ranking returns nothing, the answer is not "your laptop is too small" — it is the name of
 * the body that would do the job, what it costs, and the one thing the caller must bring. This is the
 * road: the platform never owns the compute, it finds the compute and quotes it honestly.
 */
export function escapeRoutes(ctx: JobContext, engines: Engine[] = ENGINES): Escape[] {
  const everything: JobContext = { ...ctx, executors: ["local-comfy", "local-cli", "rented-gpu", "vendor-api"], vramGb: null, budgetUsd: Number.POSITIVE_INFINITY };
  const wide = rankEngines(everything, engines);
  const held = new Set(ctx.executors);
  const out: Escape[] = [];
  for (const offer of wide.offers) {
    const usable = offer.engine.body.executors.filter((x) => held.has(x));
    if (usable.length > 0 && (ctx.vramGb === null || offer.engine.body.vramGb === null || offer.engine.body.vramGb <= ctx.vramGb)) continue;
    const via = offer.engine.body.executors.find((x) => !held.has(x));
    if (!via) continue;
    out.push({
      engine: offer.engine,
      quoteUsd: offer.quoteUsd,
      quoteBasis: offer.quoteBasis,
      precondition:
        via === "vendor-api"
          ? `bring your own ${offer.engine.name} key — the platform ships the graph, the vendor bills your card`
          : via === "rented-gpu"
            ? `a ${offer.engine.body.vramGb} GB GPU hour, rented under your own cloud account`
            : `ComfyUI reachable on a machine with ${offer.engine.body.vramGb} GB of VRAM`,
    });
  }
  return out;
}
