/**
 * The camera deck — three numbers a cinematographer actually sets, and the two different
 * rasters each one implies.
 *
 * Why this file exists. Until now the pipeline said "cinematic" and encoded 1920x1080 for
 * every shot, because the raster was hard-coded three times in the FFmpeg driver and no
 * stage carried a shape at all. A film cannot be 2.39:1 because a page says so; it is 2.39:1
 * because the file that leaves the encoder is 1920 pixels wide and 804 tall. This module is
 * the single place that decides what a shape means in pixels, so the generator, the encoder
 * and the screen cannot each invent their own answer.
 *
 * Two rasters, deliberately unequal, because they are two different questions:
 *
 *   `latent` — what a diffusion engine can be *asked* to render. A side must divide by 16:
 *              the VAE downsamples by 8 and the patchifier by 2 again. This is why a
 *              generator cannot produce 2.39:1 exactly — 832x352 is 2.364:1, and saying
 *              "2.39" while asking for that is the kind of rounding this file refuses to
 *              hide. The number shown is the number asked for.
 *   `encode` — what the craft chain finally writes. Only even sides are required here
 *              (yuv420p subsamples chroma 2x2), so 1920x804 gives 2.388:1, the closest
 *              honest scope at HD width.
 *
 * The default is 16:9 at 1920x1080 with an 832x480 latent — byte for byte the numbers the
 * driver hard-coded before this file existed. A project with no deck set must render exactly
 * as it did yesterday, so the deck can only ever *change* a film when someone chooses.
 */

export interface Raster {
  width: number;
  height: number;
}

export interface Aspect {
  /** Stable id — everything keys off this, never off the label. */
  id: string;
  /** What the shape is called in the trade. */
  label: string;
  /** The name it is sold under. Not a promise about the pixels below. */
  nominal: number;
  /**
   * The same intention written the way a cinematographer writes it on a shot list — "2.39:1",
   * "9:16". `nominal` is the number a machine compares; this is the string a human reads, and the
   * guard proves the two agree before either reaches a page.
   */
  soldAs: string;
  /** nominal computed from the delivery raster, so the page can show the real number. */
  encodeRatio: number;
  /** nominal computed from what a generator is actually asked for. */
  latentRatio: number;
  encode: Raster;
  latent: Raster;
  /** What the shape does to a story, in one line. */
  note: string;
  /** The words the prompt compiler weights in. */
  term: string;
}

export interface Stop {
  id: string;
  label: string;
  /** What the aperture buys. The trade-off is stated, not the marketing. */
  dof: string;
  term: string;
}

const ratio = (r: Raster) => r.width / r.height;

/**
 * The shapes a film is actually delivered in. `wide` is first because it is the default and
 * the only entry whose two rasters agree.
 */
export const ASPECTS: Aspect[] = [
  {
    id: "wide", label: "Widescreen 16:9", nominal: 16 / 9, soldAs: "16:9",
    encode: { width: 1920, height: 1080 }, latent: { width: 832, height: 480 },
    encodeRatio: ratio({ width: 1920, height: 1080 }), latentRatio: ratio({ width: 832, height: 480 }),
    note: "the shape a phone and a laptop already are — nothing is cropped away",
    term: "16:9 widescreen framing",
  },
  {
    id: "scope", label: "CinemaScope 2.39:1", nominal: 2.39, soldAs: "2.39:1",
    encode: { width: 1920, height: 804 }, latent: { width: 832, height: 352 },
    encodeRatio: ratio({ width: 1920, height: 804 }), latentRatio: ratio({ width: 832, height: 352 }),
    note: "the wide frame: two people can talk and the landscape can still matter",
    term: "2.39:1 anamorphic widescreen composition",
  },
  {
    id: "flat", label: "Flat 1.85:1", nominal: 1.85, soldAs: "1.85:1",
    encode: { width: 1920, height: 1038 }, latent: { width: 832, height: 448 },
    encodeRatio: ratio({ width: 1920, height: 1038 }), latentRatio: ratio({ width: 832, height: 448 }),
    note: "the American flat: widescreen without the cost of a huge empty top and bottom",
    term: "1.85:1 flat widescreen composition",
  },
  {
    id: "academy", label: "Academy 1.37:1", nominal: 1.37, soldAs: "1.37:1",
    encode: { width: 1920, height: 1402 }, latent: { width: 768, height: 560 },
    encodeRatio: ratio({ width: 1920, height: 1402 }), latentRatio: ratio({ width: 768, height: 560 }),
    note: "the classical frame: the face fills it, and the period reads before the dialogue does",
    term: "1.37:1 Academy frame composition",
  },
  {
    id: "vertical", label: "Vertical 9:16", nominal: 9 / 16, soldAs: "9:16",
    encode: { width: 1080, height: 1920 }, latent: { width: 576, height: 1024 },
    encodeRatio: ratio({ width: 1080, height: 1920 }), latentRatio: ratio({ width: 576, height: 1024 }),
    note: "the feed: one body, no room to hide, and the only shape a phone shows full-bleed",
    term: "9:16 vertical framing",
  },
  {
    id: "square", label: "Square 1:1", nominal: 1, soldAs: "1:1",
    encode: { width: 1080, height: 1080 }, latent: { width: 1024, height: 1024 },
    encodeRatio: ratio({ width: 1080, height: 1080 }), latentRatio: ratio({ width: 1024, height: 1024 }),
    note: "the grid thumbnail: centred, symmetrical, cropped from anything wider",
    term: "1:1 square framing",
  },
];

/** The shape a shot falls back to when nobody chose. It is 16:9 because that is what shipped. */
export const DEFAULT_ASPECT = "wide";

export const STOPS: Stop[] = [
  { id: "1.4", label: "f/1.4", dof: "razor-thin — the background stops existing", term: "shot at f/1.4 with a razor-thin depth of field, the background dissolving into soft bokeh" },
  { id: "2.0", label: "f/2.0", dof: "shallow — the subject separates from the room", term: "shot at f/2.0 with a shallow depth of field and creamy subject separation" },
  { id: "2.8", label: "f/2.8", dof: "gentle — faces held, edges softened", term: "shot at f/2.8 with a gentle depth of field, the face held sharp against a softening frame" },
  { id: "4.0", label: "f/4", dof: "readable — the scene stays behind the subject", term: "shot at f/4 with a moderate depth of field, the scene legible behind the subject" },
  { id: "5.6", label: "f/5.6", dof: "most of the frame in focus", term: "shot at f/5.6 with most of the frame in focus" },
  { id: "8.0", label: "f/8", dof: "deep focus — foreground and background both act", term: "shot at f/8 in deep focus, foreground and background both readable" },
  { id: "11", label: "f/11", dof: "everything sharp — documentary clarity", term: "shot at f/11 with everything sharp and documentary clarity" },
];

/** The glass. Same five focal lengths the prompt compiler already binds to coverage. */
export const LENSES = [
  { id: "24", label: "24mm", look: "the room, the scale, the weather — edges bend, distance exaggerates" },
  { id: "35", label: "35mm", look: "the body in the space, close enough to feel present" },
  { id: "50", label: "50mm", look: "the natural human eye, no distortion to explain" },
  { id: "85", label: "85mm", look: "the face and the intent, depth compressed flat" },
  { id: "100", label: "100mm", look: "the detail the story turns on" },
];

export function aspectById(id?: string | null): Aspect | null {
  if (!id) return null;
  return ASPECTS.find((a) => a.id === id) ?? null;
}

export function stopById(id?: string | null): Stop | null {
  if (!id) return null;
  return STOPS.find((s) => s.id === id) ?? null;
}

/**
 * The delivery raster for a shape. An unknown id returns the default rather than throwing:
 * a driver that dies on a typo would fail a whole run, and a silently-16:9 film is the
 * outcome the caller can still see and read on the run sheet.
 */
export function encodeRaster(id?: string | null): Raster {
  return { ...(aspectById(id) ?? aspectById(DEFAULT_ASPECT)!).encode };
}

/** The size a generator is actually asked for. Same fallback rule, same reason. */
export function latentRaster(id?: string | null): Raster {
  return { ...(aspectById(id) ?? aspectById(DEFAULT_ASPECT)!).latent };
}

/**
 * The words the compiler weights into the positive prompt — and only for what was actually
 * chosen. A shape nobody picked is not a direction, so an unset deck contributes no language and
 * a brief compiled without a deck produces the same prompt it produced before this file existed.
 */
export function deckTerms(deck: { aspect?: string | null; stop?: string | null } = {}): string[] {
  const out: string[] = [];
  const a = aspectById(deck.aspect);
  if (a) out.push(a.term);
  const s = stopById(deck.stop);
  if (s) out.push(s.term);
  return out;
}

/** One honest line per shape, for a screen: the name it is sold under and the pixels it gets. */
export function deckTable(): { id: string; label: string; encode: string; latent: string; real: string }[] {
  return ASPECTS.map((a) => ({
    id: a.id,
    label: a.label,
    encode: `${a.encode.width}x${a.encode.height}`,
    latent: `${a.latent.width}x${a.latent.height}`,
    real: `${a.encodeRatio.toFixed(3)}:1`,
  }));
}
