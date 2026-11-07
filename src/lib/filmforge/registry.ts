import { CATALOG, type FilmStage, type Tool } from "./catalog.ts";
import { check, type UseCase, type Verdict } from "./licenseguard.ts";

export type Budget = "free-only" | "open-source-first" | "balanced" | "max-quality";

export interface Offer {
  tool: Tool;
  verdict: Verdict;
  why: string;
}

export interface StageMenu {
  stage: FilmStage;
  runNow: Offer[];
  verifyFirst: Offer[];
  excluded: Offer[];
}

const OPENSOURCE = (t: Tool) => !t.license.startsWith("proprietary");

export const PREFERRED_BY_STAGE: Record<FilmStage, string[]> = {
  storyboard: ["comfyui", "controlnet", "blender", "godot"],
  character_lock: ["ip_adapter", "comfyui", "gfpgan"],
  motion: ["wan", "animatediff", "controlnet", "blender", "godot", "ltx_video", "hunyuan_video"],
  dialogue: ["fish_speech", "replicate"],
  music: ["musicgen", "ardour"],
  sound: ["ardour", "demucs", "ffmpeg"],
  subtitles: ["whisper", "ffmpeg"],
  edit: ["ffmpeg", "kdenlive", "olive", "davinci_resolve", "n8n"],
  finish: ["realesrgan", "ffmpeg", "demucs", "gfpgan", "olive", "davinci_resolve", "blender"],
  publish: ["peertube", "owncast", "n8n"],
};

function preferred(tool: Tool, stage: FilmStage): number {
  const i = PREFERRED_BY_STAGE[stage].indexOf(tool.id);
  return i === -1 ? 99 : i;
}

function passesBudget(t: Tool, budget: Budget): boolean {
  switch (budget) {
    case "free-only":
      return t.cost === "$0";
    case "open-source-first":
      return OPENSOURCE(t) && t.cost === "$0";
    case "balanced":
      return OPENSOURCE(t) || t.cost !== "subscription";
    case "max-quality":
      return true;
  }
}

function prefers(t: Tool, budget: Budget): number {
  let rank = 0;
  if (t.local) rank -= 2;
  if (t.commercial === "yes") rank -= 1;
  if (t.cost === "$0") rank -= 1;
  return rank;
}

export function offerFor(tool: Tool, use: UseCase): Offer {
  const g = check(tool, use);
  return { tool, verdict: g.verdict, why: g.why };
}

export function stageMenu(stage: FilmStage, use: UseCase, budget: Budget): StageMenu {
  const runNow: Offer[] = [];
  const verifyFirst: Offer[] = [];
  const excluded: Offer[] = [];

  for (const tool of CATALOG) {
    if (!tool.stage.includes(stage)) continue;
    const offer = offerFor(tool, use);
    if (!passesBudget(tool, budget)) {
      excluded.push({ ...offer, why: `outside budget "${budget}" (${tool.cost}, ${tool.license})` });
      continue;
    }
    if (offer.verdict === "allowed") runNow.push(offer);
    else if (offer.verdict === "verify-first") verifyFirst.push(offer);
    else excluded.push(offer);
  }

  const byRank = (a: Offer, b: Offer) =>
    preferred(a.tool, stage) - preferred(b.tool, stage) ||
    prefers(a.tool, budget) - prefers(b.tool, budget) ||
    a.tool.name.localeCompare(b.tool.name);

  return { stage, runNow: runNow.sort(byRank), verifyFirst: verifyFirst.sort(byRank), excluded };
}

export function pickForStage(
  stage: FilmStage,
  use: UseCase,
  budget: Budget,
): { primary: Offer | null; fallbacks: Offer[]; needsPermission: Offer | null } {
  const menu = stageMenu(stage, use, budget);
  const primary = menu.runNow[0] ?? null;
  const fallbacks = menu.runNow.slice(1);
  const needsPermission = primary ? null : (menu.verifyFirst[0] ?? null);
  return { primary, fallbacks, needsPermission };
}

export const STAGES_IN_ORDER: FilmStage[] = [
  "storyboard",
  "character_lock",
  "motion",
  "dialogue",
  "music",
  "sound",
  "subtitles",
  "edit",
  "finish",
  "publish",
];
