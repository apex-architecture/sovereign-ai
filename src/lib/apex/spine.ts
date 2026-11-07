/**
 * The spine — the ordered road a creator walks from a sentence to a master.
 *
 * The engine index answers "which tool". The spine answers "what happens next": it knows what each
 * stage consumes, what it produces, who has to say yes before the mission is allowed to move on, and
 * what the job looks like when it is handed to a body that is not this machine. That last part is the
 * point. Nothing in here assumes a GPU, a ComfyUI port or an installed binary — a step compiles to a
 * portable handoff, and the handoff is what gets addressed to a laptop, a rented card, or a vendor.
 */

import {
  ENGINES,
  escapeRoutes,
  quoteFor,
  rankEngines,
  type Engine,
  type Escape,
  type Executor,
  type JobContext,
  type Ranking,
  type Stage,
} from "./engines.ts";

export type ArtifactKind = "text" | "image" | "video" | "audio" | "captions" | "master";
export type FilmType = "cartoon" | "animated" | "human" | "hybrid";

export interface StageSpec {
  stage: Stage;
  /** The creator's word for this step, not the internal id. */
  label: string;
  /** The one question the platform asks here. */
  ask: string;
  consumes: ArtifactKind[];
  produces: ArtifactKind;
  /**
   * "machine" — the QC gate decides. "creator" — the mission stops until they accept or rewrite,
   * because a film is not finished by an artefact nobody read. "licence" — a human has to clear it.
   */
  approval: "machine" | "creator" | "licence";
  /** How big this stage's job is, derived from the mission rather than guessed. */
  shape: { seconds?: number; perShot?: boolean; qualityEdge?: number | null; needsAudio?: boolean };
  /** Film types for which this stage is not needed at all. */
  skippableFor?: FilmType[];
  /** Engine ids this type of film should see first, before any ranking. */
  prefers?: Partial<Record<FilmType, string[]>>;
}

/**
 * The order is the product. Each stage hands one artefact kind to the next, and a stage whose input
 * does not exist is blocked — not silently run on something else.
 */
export const SPINE: StageSpec[] = [
  {
    stage: "idea",
    label: "The idea",
    ask: "What happens, in one or two sentences?",
    consumes: [],
    produces: "text",
    approval: "creator",
    shape: {},
  },
  {
    stage: "story",
    label: "The story",
    ask: "Turn the idea into a treatment: who wants what, what stands in the way, how it ends.",
    consumes: ["text"],
    produces: "text",
    approval: "creator",
    shape: { seconds: 30 },
  },
  {
    stage: "script",
    label: "The script",
    ask: "Write the scene: headings, action, dialogue. Then read it and accept it or ask for a rewrite.",
    consumes: ["text"],
    produces: "text",
    approval: "creator",
    shape: { seconds: 60 },
  },
  {
    stage: "shotlist",
    label: "The shot list",
    ask: "Break the script into shots a machine can render: frame size, move, seconds, prompt.",
    consumes: ["text"],
    produces: "text",
    approval: "creator",
    shape: { seconds: 20 },
  },
  {
    stage: "storyboard",
    label: "The storyboard",
    ask: "One still per shot, so the film can be judged before any seconds of compute are spent.",
    consumes: ["text"],
    produces: "image",
    approval: "creator",
    shape: { perShot: true, qualityEdge: 1024 },
    prefers: {
      cartoon: ["illustrious", "anime-style finetunes", "flux.1-schnell"],
      animated: ["flux.2", "qwen-image", "sdxl"],
      human: ["flux.2", "qwen-image", "seedream"],
      hybrid: ["flux.2", "qwen-image", "seedream"],
    },
  },
  {
    stage: "character_lock",
    label: "The character lock",
    ask: "The same face, costume and build in every shot — or the film is a slideshow of strangers.",
    consumes: ["image", "text"],
    produces: "image",
    approval: "creator",
    shape: { perShot: true, qualityEdge: 1024 },
    skippableFor: ["cartoon"],
    prefers: {
      human: ["puLID", "instantid", "ip-adapter-faceid"],
      hybrid: ["puLID", "instantid"],
      animated: ["storydiffusion", "mirote"],
      cartoon: ["storydiffusion"],
    },
  },
  {
    stage: "motion",
    label: "The motion",
    ask: "Push each storyboard frame through a video engine for its scripted duration.",
    consumes: ["image", "text"],
    produces: "video",
    approval: "machine",
    shape: { perShot: true, needsAudio: false },
  },
  {
    stage: "dialogue",
    label: "The voices",
    ask: "Every line spoken, one voice per character, held identical across the film.",
    consumes: ["text"],
    produces: "audio",
    approval: "licence",
    shape: { needsAudio: true },
    skippableFor: ["cartoon", "animated"],
  },
  {
    stage: "music",
    label: "The score",
    ask: "Instrumental bed for the whole runtime, in the mood the treatment named.",
    consumes: ["text"],
    produces: "audio",
    approval: "licence",
    shape: { needsAudio: true },
  },
  {
    stage: "sound",
    label: "The mix",
    ask: "Dialogue over score over room tone, mastered to a loudness number instead of a feeling.",
    consumes: ["audio", "video"],
    produces: "audio",
    approval: "machine",
    shape: { needsAudio: true },
  },
  {
    stage: "edit",
    label: "The cut",
    ask: "Concatenate the shots in script order, at the runtime the shot list promised.",
    consumes: ["video"],
    produces: "video",
    approval: "machine",
    shape: {},
  },
  {
    stage: "subtitles",
    label: "The captions",
    ask: "Words burned or bundled, timed to the audio that actually exists in the mix.",
    consumes: ["audio", "video"],
    produces: "captions",
    approval: "machine",
    shape: {},
  },
  {
    stage: "finish",
    label: "The grade and master",
    ask: "Upscale, grade, encode the archival master, and measure it against the delivery gates.",
    consumes: ["video", "audio", "captions"],
    produces: "master",
    approval: "machine",
    shape: { qualityEdge: 1920 },
  },
  {
    stage: "publish",
    label: "The delivery",
    ask: "Put the master where a person can watch it, with the paperwork that says who made it.",
    consumes: ["master"],
    produces: "master",
    approval: "licence",
    shape: {},
  },
];

/** A mission is the unit of work: one idea, walked to a master. */
export interface Mission {
  idea: string;
  /** Null until the creator picks one — the spine will not guess the shape of the film. */
  filmType: FilmType | null;
  /** Finished runtime the creator asked for. */
  runtimeSeconds: number;
  /** Shots the shot list produced; drives per-shot stages. */
  shotCount: number;
  qualityEdge: number;
  territory: string;
  intent: JobContext["intent"];
  /** What the creator is willing to spend on this mission, in dollars. */
  budgetUsd: number;
  /** The body they have. Null VRAM with no local executor means "everything must be rented". */
  vramGb: number | null;
  executors: Executor[];
  /** Stages the creator has personally accepted. A text stage without a tick blocks what is downstream. */
  accepted: Stage[];
  /** Which stages have produced an artefact this mission can consume. */
  delivered: ArtifactKind[];
}

export interface PlanStep {
  spec: StageSpec;
  /**
   * "done" — the creator has accepted it. "next" — the one thing to do now. "ready" — runnable, but
   * later than "next". "waiting" — blocked, and `blocker` says by what. "skipped" — this film does
   * not need it.
   */
  state: "next" | "ready" | "waiting" | "skipped" | "done";
  /** What the creator has to do, in one sentence, when the step is not theirs to run. */
  blocker: string | null;
  context: JobContext | null;
  ranking: Ranking | null;
  escapes: Escape[];
}

/** "The storyboard" reads as "storyboard" inside a sentence. */
const noun = (label: string) => label.replace(/^(The|A) /, "").toLowerCase();

export function stageSpec(stage: Stage): StageSpec {
  const found = SPINE.find((s) => s.stage === stage);
  if (!found) throw new Error(`no spine entry for stage "${stage}"`);
  return found;
}

/** The engine query for one stage of one mission. This is the only place an ask becomes a context. */
export function contextFor(mission: Mission, spec: StageSpec): JobContext {
  const perShot = spec.shape.perShot === true;
  const seconds = perShot
    ? Math.max(1, Math.round(mission.runtimeSeconds / Math.max(1, mission.shotCount)))
    : mission.runtimeSeconds;
  return {
    stage: spec.stage,
    seconds,
    qualityEdge: spec.shape.qualityEdge ?? mission.qualityEdge,
    needsAudio: spec.shape.needsAudio ?? false,
    territory: mission.territory,
    intent: mission.intent,
    // A writer or a captioner is charged per token or per minute, not per second of picture: the
    // budget is the mission's, whole, for any single stage.
    budgetUsd: mission.budgetUsd,
    vramGb: mission.vramGb,
    executors: mission.executors,
    drivableOnly: false,
  };
}

/**
 * The synchronicity check. A stage runs when everything it consumes has been delivered and the
 * creator has accepted the artefact it is built on. This is what stops the road from rendering a
 * film nobody has read — and it names ONE thing to fix, not the whole history of the mission.
 */
export function planMission(mission: Mission, engines: Engine[] = ENGINES): PlanStep[] {
  const delivered = new Set(mission.delivered);
  const accepted = new Set(mission.accepted);
  const hasEngine = (stage: Stage) => engines.some((e) => e.stage === stage);
  let nextTaken = false;

  return SPINE.map((spec) => {
    const done = spec.approval === "creator" && accepted.has(spec.stage);
    // The earliest unaccepted creator stage whose output this stage consumes — that is the root of
    // the block, so the creator is told one thing to fix instead of the whole history of the mission.
    const unapproved = SPINE.slice(0, SPINE.indexOf(spec)).find(
      (up) => up.approval === "creator" && !accepted.has(up.stage) && spec.consumes.includes(up.produces),
    );
    const missing = spec.consumes.filter((kind) => !delivered.has(kind));
    const skipped = spec.skippableFor?.includes(mission.filmType ?? "human") === true;

    let state: PlanStep["state"] = "ready";
    let blocker: string | null = null;
    if (skipped) {
      state = "skipped";
      blocker = `a ${mission.filmType} film does not need this stage`;
    } else if (done) {
      state = "done";
    } else if (unapproved) {
      state = "waiting";
      blocker = `waiting on your ${noun(unapproved.label)} — accept it or ask for a rewrite before anything downstream spends compute`;
    } else if (missing.length > 0) {
      state = "waiting";
      blocker = `nothing to work with yet: this stage needs ${missing.join(" and ")}`;
    } else if (!nextTaken && spec.approval !== "licence") {
      state = "next";
      nextTaken = true;
    }

    // A runnable stage is planned as if it will deliver, so one gap does not light up the whole
    // spine as missing input. A waiting or skipped stage delivers nothing.
    if (state === "next" || state === "ready" || state === "done") delivered.add(spec.produces);

    // A stage the dictionary holds no engine for is not ranked: it is a named gap, not a fake offer.
    const askable = state !== "waiting" && state !== "skipped" && hasEngine(spec.stage);
    const context = askable ? contextFor(mission, spec) : null;
    const ranking = context ? rankEngines(context, engines) : null;
    const escapes = context ? escapeRoutes(context, engines) : [];

    const prefers = mission.filmType ? spec.prefers?.[mission.filmType] : undefined;
    if (ranking && prefers) rankFirst(ranking, prefers);

    return { spec, state, blocker, context, ranking, escapes };
  });
}

/**
 * A film type is not a filter, it is an ordering: the tool the type is known for goes to the top of
 * the shortlist and the refusals stay where the gates put them. An engine that cannot meet the ask
 * natively never jumps ahead of one that can, whatever the style guide prefers.
 */
function rankFirst(ranking: Ranking, preferredIds: string[]): void {
  const weight = (id: string) => {
    const at = preferredIds.findIndex((p) => id.startsWith(p.toLowerCase()));
    return at === -1 ? preferredIds.length : at;
  };
  ranking.offers.sort((a, b) => {
    const meets = Number(a.caveats.length > 0) - Number(b.caveats.length > 0);
    if (meets !== 0) return meets;
    return weight(a.engine.id) - weight(b.engine.id);
  });
}

/** The one thing the creator does now. Never a list. */
export function nextAction(plan: PlanStep[]): { label: string; how: string } {
  const next = plan.find((p) => p.state === "next");
  if (next) {
    if (next.ranking && next.ranking.offers.length === 0) {
      const escape = next.escapes[0];
      const cost = escape ? (escape.quoteUsd === null ? "" : escape.quoteUsd === 0 ? " for $0" : ` for about $${escape.quoteUsd.toFixed(2)}`) : "";
      return {
        label: `${next.spec.label}: no engine on the body you declared`,
        how: escape
          ? `${escape.engine.name} would do it${cost} — ${escape.precondition}`
          : `the dictionary has no engine for a ${noun(next.spec.label)} job of ${next.context?.seconds}s at $${next.context?.budgetUsd}`,
      };
    }
    if (!next.ranking) return { label: next.spec.label, how: `${next.spec.ask} (no engine needed — this step is yours)` };
    return { label: next.spec.label, how: next.spec.ask };
  }
  const waiting = plan.find((p) => p.state === "waiting");
  if (waiting) return { label: waiting.spec.label, how: waiting.blocker ?? "an earlier stage has not been accepted" };
  const held = plan.find((p) => p.state === "ready" && p.spec.approval === "licence");
  if (held) return { label: held.spec.label, how: `${held.spec.ask} — this stage needs a human licence read before it can be cleared` };
  return { label: "Nothing is blocked", how: "every stage the spine knows about has been walked" };
}

/**
 * The handoff — what a step becomes when it leaves this machine. It names the engine, the ask, and
 * the artefacts, and nothing else: a rented GPU worker or a vendor call needs the job, not the
 * laptop's environment.
 */
export interface Handoff {
  mission: { idea: string; filmType: FilmType | null; runtimeSeconds: number };
  stage: Stage;
  engineId: string;
  engineName: string;
  body: Executor;
  /** What the creator pays for, quoted before the render. */
  quoteUsd: number | null;
  quoteBasis: string;
  ask: { seconds: number; qualityEdge: number | null; needsAudio: boolean };
}

export function handoffFor(step: PlanStep, mission: Mission): Handoff | null {
  if (!step.context || !step.ranking || step.ranking.offers.length === 0) return null;
  const offer = step.ranking.offers[0];
  const quote = quoteFor(offer.engine, step.context);
  const local = offer.engine.body.executors.find((x) => mission.executors.includes(x));
  return {
    mission: { idea: mission.idea, filmType: mission.filmType, runtimeSeconds: mission.runtimeSeconds },
    stage: step.spec.stage,
    engineId: offer.engine.id,
    engineName: offer.engine.name,
    body: local ?? offer.engine.body.executors[0],
    quoteUsd: quote.usd,
    quoteBasis: quote.basis,
    ask: { seconds: step.context.seconds, qualityEdge: step.context.qualityEdge, needsAudio: step.context.needsAudio },
  };
}

/** Stage coverage of the dictionary, as the creator would want to see it: where the road is wide and where it is a footpath. */
export function dictionaryShape(engines: Engine[] = ENGINES) {
  // "Open" means the creator can read and run the project themselves — public weights, or a public
  // repository under a licence that is not the vendor's own terms. A CLI tool has no weights at all.
  const isOpen = (e: Engine) =>
    e.body.weightsPublic || (e.sourceRepository !== null && !/proprietary|noassertion|custom|commercial/i.test(e.licence.spdx));
  return SPINE.map((spec) => {
    const rows = engines.filter((e) => e.stage === spec.stage);
    // A row is "priced" when the road can put a number on one second of it — including $0 for a tool
    // that only ever runs on the creator's own machine.
    const oneSecond = { stage: spec.stage, seconds: 1, qualityEdge: null, needsAudio: false, territory: "Australia", intent: "personal", budgetUsd: 0, vramGb: null, executors: [], drivableOnly: false } as JobContext;
    return {
      stage: spec.stage,
      label: spec.label,
      engines: rows.length,
      openSource: rows.filter(isOpen).length,
      priced: rows.filter((e) => quoteFor(e, oneSecond).usd !== null).length,
      drivable: rows.filter((e) => e.driver === "drivable").length,
    };
  });
}

/** A mission with nothing assumed except the idea, so a page can start from one sentence. */
export function missionFromIdea(idea: string, over: Partial<Mission> = {}): Mission {
  return {
    idea,
    filmType: null,
    runtimeSeconds: 60,
    shotCount: 8,
    qualityEdge: 1920,
    territory: "Australia",
    intent: "personal",
    budgetUsd: 5,
    vramGb: null,
    executors: [],
    accepted: [],
    delivered: [],
    ...over,
  };
}
