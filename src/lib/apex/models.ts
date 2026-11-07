/**
 * Universal Model Competition — every capability held by more than one model,
 * so losing any single provider never stops production.
 *
 * Doctrine enforced here: the router never ranks by reputation or by our own preference.
 * A model wins a slot only from a recorded bake-off against measurable axes, and the
 * challenger stays installed so the champion is always replaceable.
 */

import type { TechRecord } from "./schema.ts";
import { isClearedForWork } from "./schema.ts";

export type Capability =
  | "video-motion"
  | "image-still"
  | "identity-lock"
  | "voice-clone"
  | "music"
  | "sound-separate"
  | "transcribe"
  | "upscale"
  | "script-language";

export interface ModelSlot {
  modelId: string;
  capability: Capability;
  provider: string;
  /** Where the weights/service actually run — decides whether a provider outage stops us. */
  runs: "local" | "byo-api" | "platform";
  /** Non-empty: this slot is not a single point of failure. */
  fallbacks: string[];
  record: TechRecord;
}

/** Axes a human can look at and agree on. No vibes, no fractional marketing scores. */
export const EVAL_AXES = [
  "identity-stability",
  "motion-plausibility",
  "prompt-adherence",
  "artifact-rate",
  "seconds-per-clip",
  "usd-per-clip",
  "max-resolution",
  "control-surface",
  "licence-cleared",
  "runs-without-internet",
] as const;
export type EvalAxis = (typeof EVAL_AXES)[number];

export interface Bakeoff {
  capability: Capability;
  ranOn: string;
  /** The same fixed prompt set for every entrant, or the comparison is worthless. */
  promptSetHash: string;
  clipsPerModel: number;
  results: Array<{
    modelId: string;
    axis: EvalAxis;
    /** Pass/fail per axis, plus the observation that made it pass or fail. */
    pass: boolean;
    evidence: string;
  }>;
  winner: string | null;
  reason: string;
}

/** A model may only be offered to a customer when its licence row was read by a human. */
export function eligible(slot: ModelSlot): boolean {
  return isClearedForWork(slot.record);
}

export function rejectedForWork(slots: ModelSlot[]): ModelSlot[] {
  return slots.filter((s) => !eligible(s));
}

/**
 * Who runs this capability if the preferred provider vanishes tonight.
 * Returns empty when a capability has exactly one entrant — that is a real risk to name,
 * not something to hide behind a routing table.
 */
export function alternatives(slots: ModelSlot[], modelId: string): ModelSlot[] {
  const target = slots.find((s) => s.modelId === modelId);
  if (!target) return [];
  return slots.filter((s) => s.capability === target.capability && s.modelId !== modelId);
}

export function singlePointCapabilities(slots: ModelSlot[]): Capability[] {
  const seen = new Map<Capability, number>();
  for (const s of slots) seen.set(s.capability, (seen.get(s.capability) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n === 1).map(([c]) => c);
}

/** Route order: local first when offline is required, then cleared providers by recorded rank. */
export function routeOrder(
  slots: ModelSlot[],
  capability: Capability,
  need: { offline: boolean; budgetUsd: number },
  rank: Record<string, number> = {},
): ModelSlot[] {
  return slots
    .filter((s) => s.capability === capability)
    .filter((s) => (need.offline ? s.runs === "local" : true))
    .filter((s) => eligible(s))
    .sort((a, b) => (rank[a.modelId] ?? 99) - (rank[b.modelId] ?? 99));
}

/** A bake-off with no winner recorded is an unfinished test, not a decision. */
export function isDecided(b: Bakeoff): boolean {
  return b.winner !== null && b.reason.trim().length > 0;
}

export function undecidedBakeoffs(list: Bakeoff[]): Bakeoff[] {
  return list.filter((b) => !isDecided(b));
}
