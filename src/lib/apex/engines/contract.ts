/**
 * The shape of one entry in the engine dictionary.
 *
 * It lives here, apart from the ranking code and apart from the rows themselves, because the rows are
 * now split by craft — audio, boards, motion, writing — each absorbed from a dated research pass in
 * docs/, and every one of them has to answer to the same contract. A field that was not measured is
 * null: the gates below treat null as "not proven", never as "free" or "safe".
 */

export type Stage =
  | "idea"
  | "story"
  | "script"
  | "shotlist"
  | "motion"
  | "storyboard"
  | "character_lock"
  | "dialogue"
  | "music"
  | "sound"
  | "subtitles"
  | "edit"
  | "finish"
  | "publish";

export type Executor = "local-cli" | "local-comfy" | "rented-gpu" | "vendor-api";

/** Where the compute for this engine physically lives. */
export interface Body {
  /** VRAM in GB a single GPU must have to run one clip. Null when it is not self-hostable. */
  vramGb: number | null;
  weightsPublic: boolean;
  executors: Executor[];
}

export interface Ceiling {
  /** Long edge in pixels at the top tier the vendor actually ships. */
  maxEdge: number | null;
  /** Seconds in a single pass, not stitched. For audio engines, the longest single generation. */
  maxSeconds: number | null;
  /** Frame rate for picture, sample rate in Hz for audio. */
  fps: number | null;
  /** Sound generated in the same pass as the picture. This is the 2026 frontier line. */
  nativeAudio: boolean;
  lipSync: boolean | null;
}

export interface Licence {
  spdx: string;
  /** The URL the licence text was read from. Required for any gate that clears it. */
  evidenceUrl: string | null;
  /** Regions the licence itself excludes. A US user and a US platform are both caught by these. */
  excludedTerritories: string[];
  revenueClause: string;
  /** Verified by machine (fetched + hashed) or by a human read. Nothing in between. */
  attested: "machine" | "human" | null;
}

export interface Engine {
  id: string;
  name: string;
  stage: Stage;
  kind: "weights" | "api" | "cli" | "app";
  vendorUrl: string;
  sourceRepository: string | null;
  licence: Licence;
  /** Latest public release date as recorded by the refresh script. */
  released: string | null;
  releasedSource: string | null;
  ceiling: Ceiling;
  body: Body;
  /** US dollars per finished second of output. Null means nobody has a number on record. */
  priceUsdPerSecond: number | null;
  priceSource: string | null;
  /** Independent blind-vote measurement, if one exists. Never a vendor claim. */
  board: { name: string; elo: number | null; rank: number | null; asOf: string } | null;
  driver: "drivable" | "no-driver" | "needs-licence-read";
  /** The sentence a creator needs before choosing: what this is actually good for. */
  fits: string;
  measuredAt: string;
}
