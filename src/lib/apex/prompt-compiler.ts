/**
 * The prompt compiler — one sentence of director language into a shot matrix and a node graph.
 *
 * What it is: arithmetic. No model is called, no key is needed, no server is involved, and
 * nothing leaves the browser. The creator writes one line; the compiler reads the shot
 * vocabulary it recognises, locks a seed for every shot so the matrix reproduces exactly, and
 * emits a ComfyUI API graph that the creator's own rig can run.
 *
 * What it is not: it does not understand language. It matches a vocabulary of shot terms — light,
 * lens, framing, motion, mood, style — and carries every other word through untouched. A brief
 * it cannot read still compiles; it simply gets fewer weights and the compiler says so.
 *
 * The graph it emits is ComfyUI's own API format, which is what the platform's ComfyUI driver
 * already submits: POST /prompt with { prompt: graph, client_id }. One graph shape ships in this
 * build — the SD/SDXL node set every ComfyUI install carries. A Wan or Flux graph is one profile
 * function away, because a graph that names a node the rig does not have is a graph that fails
 * on the rig, and a failure the creator cannot read is worse than an honest absence.
 */

export interface WeightedTerm {
  text: string;
  weight: number;
}

export interface ComfyNode {
  class_type: string;
  inputs: Record<string, unknown>;
}

/** A ComfyUI API graph: node id -> node. */
export type ComfyGraph = Record<string, ComfyNode>;

export interface CompileOptions {
  /** How many shots the matrix covers. */
  shots?: number;
  /** A salt the creator pins, so the whole matrix reproduces from one number. */
  seed?: number;
  /** The checkpoint file the rig holds. */
  checkpoint?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  /** The graph family. One ships; more are one profile function each. */
  profile?: string;
}

export interface Recognised {
  framing: string[];
  lens: string[];
  light: string[];
  motion: string[];
  mood: string[];
  style: string[];
}

export interface CompiledShot {
  id: string;
  index: number;
  framing: string;
  lens: string;
  /** The weighted positive prompt, in ComfyUI's `(term:1.20)` syntax. */
  positive: string;
  negative: string;
  terms: WeightedTerm[];
  /** Locked for this shot. The same brief and salt always produce it. */
  seed: number;
  graph: ComfyGraph;
}

export interface CompiledMatrix {
  brief: string;
  /** The matrix lock: one number that reproduces every seed below it. */
  seed: number;
  shots: CompiledShot[];
  /** Everything the compiler recognised, so the creator can see what it did. */
  recognised: Recognised;
  /** What it could not read, said plainly. */
  warnings: string[];
  profile: string;
}

/* ------------------------------------------------------------------ the vocabulary */

/** Framing a film actually uses. The compiler offers the coverage a shot list needs. */
const FRAMINGS: { id: string; framing: string; lens: string; note: string }[] = [
  { id: "establishing", framing: "wide establishing shot", lens: "24mm", note: "the room, the scale, the weather" },
  { id: "master", framing: "medium master shot", lens: "35mm", note: "the body in the space" },
  { id: "character", framing: "medium close-up", lens: "50mm", note: "the face and the intent" },
  { id: "intimate", framing: "close-up", lens: "85mm", note: "the detail the story turns on" },
  { id: "insert", framing: "extreme close-up", lens: "100mm macro", note: "the hand, the object, the wound" },
];

const LIGHT_TERMS = [
  "golden hour", "blue hour", "dawn", "sunrise", "dusk", "sunset", "night", "daylight", "overcast",
  "neon", "candlelight", "moonlight", "backlit", "harsh light", "soft light", "volumetric light",
  "god rays", "firelight", "streetlight", "practical light",
];

const MOTION_TERMS = [
  "handheld", "dolly", "crane", "tracking shot", "static shot", "slow push in", "pull back",
  "pan", "tilt", "orbit", "steadicam", "whip pan", "zoom", "aerial", "drone shot",
];

const MOOD_TERMS = [
  "cinematic", "melancholy", "tense", "serene", "brutal", "warm", "cold", "nostalgic", "dreamlike",
  "ominous", "playful", "clinical", "urgent", "epic", "intimate", "eerie", "joyful",
];

const STYLE_TERMS = [
  "film grain", "anamorphic", "35mm", "16mm", "black and white", "monochrome", "sepia",
  "muted colors", "teal and orange", "film noir", "vintage", "documentary", "impressionistic",
  "minimalist", "baroque", "analog", "kodak portra", "cinema camera",
];

/** The words that make a light a light. A phrase ending in "light" with one of these is a light. */
const LIGHT_QUALIFIERS = new Set([
  "cold", "warm", "cool", "blue", "green", "red", "white", "black", "grey", "gray", "golden",
  "amber", "neon", "candle", "candlelight", "fire", "firelight", "street", "streetlight", "sun",
  "sunlight", "moon", "moonlight", "soft", "harsh", "dappled", "flickering", "natural", "pale",
]);

/** Words that dangle once the recognised terms are taken out. */
const DANGLING = /\s+(at|in|on|with|of|and|or|under|over|during|by|from|near|is|are|to)$/i;

/** The base negatives every generated frame carries. */
const BASE_NEGATIVE = [
  "lowres", "worst quality", "jpeg artifacts", "watermark", "signature", "text", "extra limbs",
  "deformed hands", "blurry", "oversaturated", "duplicate",
];

const QUALITY_TERMS: WeightedTerm[] = [
  { text: "masterpiece", weight: 1.2 },
  { text: "best quality", weight: 1.15 },
  { text: "highly detailed", weight: 1.1 },
  { text: "cinematic lighting", weight: 1.1 },
  { text: "sharp focus", weight: 1.05 },
];

/* ------------------------------------------------------------------ arithmetic */

/**
 * FNV-1a, 32-bit. Not a cryptographic hash and never used as one: it decides which seed a shot
 * gets, so that the same brief lands on the same frame tomorrow.
 */
export function fnv1a(text: string, salt = 0): number {
  let h = 0x811c9dc5 ^ (salt >>> 0);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The seed lock for one shot: same brief, same salt, same frame. */
export function lockSeed(brief: string, shotId: string, salt = 0): number {
  return fnv1a(`${salt}::${brief}::${shotId}`);
}

/** `(term:1.20)` for a weighted term, plain text when the weight is one. */
export function formatWeighted(terms: WeightedTerm[]): string {
  return terms
    .filter((t) => t.text.trim().length > 0)
    .map((t) => {
      const w = Math.round(t.weight * 100) / 100;
      return w === 1 ? t.text.trim() : `(${t.text.trim()}:${w.toFixed(2)})`;
    })
    .join(", ");
}

/* ------------------------------------------------------------------ reading the brief */

function findAll(haystack: string, terms: string[]): string[] {
  return terms.filter((t) => haystack.includes(t));
}

function findLenses(brief: string): string[] {
  const out = new Set<string>();
  const re = /(\d{2,3})\s?mm/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(brief))) out.add(`${m[1]}mm`);
  return [...out];
}

/**
 * What the creator wrote, minus the words the compiler understood. What is left is the part
 * the compiler carries through untouched, because it does not pretend to understand it.
 */
function residual(brief: string, recognised: string[]): string {
  let out = brief;
  for (const r of recognised) {
    out = out.replace(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  return tidy(out);
}

/** Pull the holes back together: empty commas, stray punctuation, dangling prepositions. */
function tidy(text: string): string {
  let out = text.replace(/[ \t]+/g, " ").trim();
  out = out.replace(/\s*,\s*/g, ", ");
  out = out.replace(/(,\s*)+/g, "");
  out = out.replace(/^[\s,.;:]+/, "").replace(/[\s,.;:]+$/, "");
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(DANGLING, "").replace(/[\s,.;:]+$/, "");
  }
  return out.trim();
}

/** A phrase that ends in "light" and carries a qualifier is a light, whatever the words are. */
function findLightPhrases(brief: string): string[] {
  const out: string[] = [];
  const re = /([a-z]+(?:\s+[a-z]+){0,2}\s+light)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(brief))) {
    const phrase = m[1].trim();
    const words = phrase.split(/\s+/);
    if (words.length > 1 && words.slice(0, -1).some((w) => LIGHT_QUALIFIERS.has(w))) out.push(phrase);
  }
  return out;
}

export function readBrief(brief: string): Recognised {
  const lower = brief.toLowerCase();
  const lens = findLenses(lower);
  const light = [...new Set([...findAll(lower, LIGHT_TERMS), ...findLightPhrases(lower)])];
  // A word inside a light phrase is part of that light, not a mood of its own.
  const inLight = new Set(light.join(" ").split(/\s+/));
  const mood = findAll(lower, MOOD_TERMS).filter((m) => !inLight.has(m));
  // A lens the brief names is a lens, not a film stock.
  const style = findAll(lower, STYLE_TERMS).filter((s) => !lens.includes(s));
  return {
    framing: FRAMINGS.filter((f) => lower.includes(f.framing)).map((f) => f.id),
    lens,
    light,
    motion: findAll(lower, MOTION_TERMS),
    mood,
    style,
  };
}

/* ------------------------------------------------------------------ the graph profiles */

export interface CompileContext {
  checkpoint: string;
  positive: string;
  negative: string;
  seed: number;
  steps: number;
  cfg: number;
  width: number;
  height: number;
  filenamePrefix: string;
}

export interface PromptProfile {
  id: string;
  label: string;
  /** The node classes this profile needs the rig to have. */
  requires: string[];
  build: (ctx: CompileContext) => ComfyGraph;
}

/**
 * The SD/SDXL family. Every ComfyUI install carries these class names, so a graph built here
 * runs on a rig the creator already has, without them installing anything.
 */
export const SD_PROFILE: PromptProfile = {
  id: "sd",
  label: "SD / SDXL family (the nodes every ComfyUI ships)",
  requires: [
    "CheckpointLoaderSimple", "CLIPTextEncode", "EmptyLatentImage", "KSampler", "VAEDecode", "SaveImage",
  ],
  build(ctx) {
    return {
      "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: ctx.checkpoint } },
      "2": { class_type: "CLIPTextEncode", inputs: { text: ctx.positive, clip: ["1", 1] } },
      "3": { class_type: "CLIPTextEncode", inputs: { text: ctx.negative, clip: ["1", 1] } },
      "4": { class_type: "EmptyLatentImage", inputs: { width: ctx.width, height: ctx.height, batch_size: 1 } },
      "5": {
        class_type: "KSampler",
        inputs: {
          seed: ctx.seed,
          steps: ctx.steps,
          cfg: ctx.cfg,
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 1,
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["4", 0],
        },
      },
      "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
      "7": { class_type: "SaveImage", inputs: { filename_prefix: ctx.filenamePrefix, images: ["6", 0] } },
    };
  },
};

export const PROMPT_PROFILES: PromptProfile[] = [SD_PROFILE];

export function profileById(id: string): PromptProfile | null {
  return PROMPT_PROFILES.find((p) => p.id === id) ?? null;
}

/* ------------------------------------------------------------------ the graph check */

/**
 * Every input that points at another node must point at a node that exists. A graph that
 * references a missing node is refused before it leaves the compiler, because the rig would
 * answer with a validation error the creator would have to decode.
 */
export function graphProblems(graph: ComfyGraph): string[] {
  const problems: string[] = [];
  for (const [id, node] of Object.entries(graph)) {
    if (!node || typeof node.class_type !== "string" || node.class_type.length === 0) {
      problems.push(`node ${id} has no class_type`);
      continue;
    }
    if (!node.inputs || typeof node.inputs !== "object") problems.push(`node ${id} has no inputs`);
    for (const [key, value] of Object.entries(node.inputs ?? {})) {
      if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string") {
        if (!(value[0] in graph)) problems.push(`node ${id}.${key} points at missing node ${value[0]}`);
        if (!Number.isInteger(value[1]) || (value[1] as number) < 0) {
          problems.push(`node ${id}.${key} has a bad output index`);
        }
      }
    }
  }
  return problems;
}

/** The body a creator POSTs to their own rig: POST /prompt with { prompt: graph, client_id }. */
export function toPromptPayload(graph: ComfyGraph, clientId: string): string {
  return JSON.stringify({ prompt: graph, client_id: clientId });
}

/* ------------------------------------------------------------------ the compile */

/**
 * Compile one brief into a shot matrix. Deterministic: the same brief, salt and options always
 * produce the same matrix, byte for byte.
 */
export function compileMatrix(brief: string, opts: CompileOptions = {}): CompiledMatrix {
  const clean = brief.trim();
  const recognised = readBrief(clean);
  const warnings: string[] = [];
  const salt = opts.seed ?? 0;
  const matrixSeed = fnv1a(clean, salt);
  const profile = profileById(opts.profile ?? "sd") ?? SD_PROFILE;

  const want = Math.max(1, Math.min(10, opts.shots ?? FRAMINGS.length));
  const covered = recognised.framing.length
    ? FRAMINGS.filter((f) => recognised.framing.includes(f.id)).filter(
        (f) => !recognised.framing.some((other) => other !== f.id && FRAMINGS.find((x) => x.id === other)!.framing.includes(f.framing)),
      )
    : [];
  const shotPlan = [...covered, ...FRAMINGS.filter((f) => !recognised.framing.includes(f.id))].slice(0, want);
  if (want > FRAMINGS.length) warnings.push(`only ${FRAMINGS.length} framings are defined; ${want} were asked for`);

  const core = residual(clean, [
    ...recognised.light, ...recognised.motion, ...recognised.mood, ...recognised.style,
    ...recognised.lens, ...covered.map((f) => f.framing),
  ]);
  const recognisedTotal =
    recognised.framing.length + recognised.lens.length + recognised.light.length +
    recognised.motion.length + recognised.mood.length + recognised.style.length;
  if (recognisedTotal === 0) {
    warnings.push("no shot terms were recognised — the brief is carried through verbatim");
  }
  if (!core) warnings.push("nothing is left to carry — the brief was empty of words");

  const light = recognised.light.join(", ");
  const motion = recognised.motion.join(", ");
  const mood = recognised.mood.join(", ");
  const style = recognised.style.join(", ");
  const briefLens = recognised.lens[0] ?? null;

  const shots: CompiledShot[] = shotPlan.map((plan, index) => {
    const lens = briefLens ?? plan.lens;
    const terms: WeightedTerm[] = [];
    if (core) terms.push({ text: core, weight: 1.0 });
    terms.push({ text: plan.framing, weight: 1.15 });
    terms.push({ text: `${lens} lens`, weight: 1.05 });
    if (light) terms.push({ text: light, weight: 1.2 });
    if (motion) terms.push({ text: motion, weight: 1.1 });
    if (mood) terms.push({ text: mood, weight: 1.05 });
    if (style) terms.push({ text: style, weight: 1.1 });
    terms.push(...QUALITY_TERMS);

    const positive = formatWeighted(terms);
    const negative = BASE_NEGATIVE.join(", ");
    const seed = lockSeed(clean, plan.id, salt);
    const graph = profile.build({
      checkpoint: opts.checkpoint ?? "sd_xl_base_1.0.safetensors",
      positive,
      negative,
      seed,
      steps: opts.steps ?? 30,
      cfg: opts.cfg ?? 7.5,
      width: opts.width ?? 832,
      height: opts.height ?? 480,
      filenamePrefix: `APEX/${plan.id}`,
    });
    const problems = graphProblems(graph);
    if (problems.length) {
      warnings.push(`${plan.id}: ${problems.join("; ")}`);
    }
    return {
      id: plan.id,
      index,
      framing: plan.framing,
      lens,
      positive,
      negative,
      terms,
      seed,
      graph,
    };
  });

  return { brief: clean, seed: matrixSeed, shots, recognised, warnings, profile: profile.id };
}

/** One plain line per shot, for a screen or a note. */
export function describeMatrix(matrix: CompiledMatrix): string[] {
  return matrix.shots.map(
    (s) => `${String(s.index + 1).padStart(2, "0")} ${s.framing} · ${s.lens} · seed ${s.seed} — ${s.positive}`,
  );
}
