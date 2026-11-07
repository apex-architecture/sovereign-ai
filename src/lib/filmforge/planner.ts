import type { FilmStage, Tool } from "./catalog.ts";
import type { Offer, Budget } from "./registry.ts";
import { pickForStage, STAGES_IN_ORDER } from "./registry.ts";
import type { UseCase, Verdict } from "./licenseguard.ts";

export interface Scene {
  id: string;
  act: number;
  title: string;
  slugline: string;
  description: string;
  mood: string;
  camera: string;
  film_forge_prompt: string;
  duration: string;
  characters: string[];
  location: string;
  priority: "critical" | "high" | "medium" | string;
}

export interface Character {
  name: string;
  age: string;
  description: string;
  phases: Record<string, string>;
  film_forge_prompt: string;
}

export interface PlanOptions {
  use: UseCase;
  budget: Budget;
}

export interface Step {
  stage: FilmStage;
  toolId: string;
  tool: string;
  does: string;
  cost: Tool["cost"];
  hardware: string;
  permission: Verdict;
  why: string;
  runOn: "your machine" | "rented GPU" | "self-hosted service";
  fallback: string;
}

export interface ScenePlan {
  sceneId: string;
  title: string;
  act: number;
  priority: string;
  duration: string;
  characters: string[];
  steps: Step[];
  waitingOn: string[];
}

function runOn(tool: Tool): Step["runOn"] {
  if (tool.local) return "your machine";
  if (tool.selfHost) return "self-hosted service";
  return "rented GPU";
}

function toStep(stage: FilmStage, offer: Offer, fallbacks: Offer[]): Step {
  return {
    stage,
    toolId: offer.tool.id,
    tool: offer.tool.name,
    does: offer.tool.does,
    cost: offer.tool.cost,
    hardware: offer.tool.hardware,
    permission: offer.verdict,
    why: offer.why,
    runOn: runOn(offer.tool),
    fallback: fallbacks[0]?.tool.name ?? "none in catalogue",
  };
}

export function hasReferenceSheet(characters: Character[], ref: string): boolean {
  const want = ref.toLowerCase().trim();
  return characters.some((c) =>
    c.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .includes(want),
  );
}

export function planStage(
  stage: FilmStage,
  opts: PlanOptions,
): { steps: Step[]; waitingOn: string[] } {
  const { primary, fallbacks, needsPermission } = pickForStage(stage, opts.use, opts.budget);
  if (primary) return { steps: [toStep(stage, primary, fallbacks)], waitingOn: [] };
  if (needsPermission) {
    const offer = needsPermission;
    return {
      steps: [toStep(stage, offer, fallbacks)],
      waitingOn: [`${stage}: ${offer.tool.name} — ${offer.why}`],
    };
  }
  return {
    steps: [],
    waitingOn: [`${stage}: no tool in the catalogue clears "${opts.use}" at budget "${opts.budget}"`],
  };
}

export function stagesForScene(scene: Scene): FilmStage[] {
  const speaks = scene.characters.length > 0;
  const needed: FilmStage[] = ["storyboard", "motion", "music", "sound", "edit", "finish"];
  if (speaks) needed.push("character_lock", "dialogue", "subtitles");
  if (/audio only|over black|sound of/i.test(scene.description)) needed.push("sound");
  return STAGES_IN_ORDER.filter((s) => needed.includes(s));
}

export function planScene(
  scene: Scene,
  characters: Character[],
  opts: PlanOptions,
): ScenePlan {
  const steps: Step[] = [];
  const waitingOn: string[] = [];

  for (const stage of stagesForScene(scene)) {
    const chosen = planStage(stage, opts);
    steps.push(...chosen.steps);
    waitingOn.push(...chosen.waitingOn);
  }

  if (scene.characters.length > 0) {
    const missing = scene.characters.filter((c) => !hasReferenceSheet(characters, c));
    for (const name of missing) waitingOn.push(`character_lock: "${name}" has no reference sheet`);
  }

  return {
    sceneId: scene.id,
    title: scene.title,
    act: scene.act,
    priority: scene.priority,
    duration: scene.duration,
    characters: scene.characters,
    steps,
    waitingOn,
  };
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface FilmPlan {
  title: string;
  sceneCount: number;
  shotCount: number;
  order: string[];
  perScene: ScenePlan[];
  release: Step[];
  stageTotals: Record<string, number>;
  payPerJobStages: string[];
  blocked: string[];
}

export function planFilm(
  scenes: Scene[],
  characters: Character[],
  opts: PlanOptions,
  title = "UNTITLED",
): FilmPlan {
  const sorted = [...scenes].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
      a.act - b.act ||
      a.id.localeCompare(b.id),
  );

  const perScene = sorted.map((s) => planScene(s, characters, opts));
  const releasePlan = planStage("publish", opts);

  const stageTotals: Record<string, number> = {};
  const payPerJobStages = new Set<string>();
  const blocked: string[] = [];

  const tally = (step: Step, where: string) => {
    stageTotals[step.stage] = (stageTotals[step.stage] ?? 0) + 1;
    if (step.cost !== "$0") payPerJobStages.add(`${step.stage} via ${step.tool}`);
    if (step.permission !== "allowed") blocked.push(`${where} ${step.stage}: ${step.why}`);
  };

  for (const p of perScene) {
    for (const step of p.steps) tally(step, p.sceneId);
    for (const w of p.waitingOn) blocked.push(`${p.sceneId} ${w}`);
  }
  for (const step of releasePlan.steps) tally(step, "FILM-LEVEL");
  for (const w of releasePlan.waitingOn) blocked.push(`FILM-LEVEL ${w}`);

  return {
    title,
    sceneCount: perScene.length,
    shotCount: perScene.reduce((n, p) => n + p.steps.length, 0),
    order: perScene.map((p) => p.sceneId),
    perScene,
    release: releasePlan.steps,
    stageTotals,
    payPerJobStages: [...payPerJobStages],
    blocked,
  };
}
