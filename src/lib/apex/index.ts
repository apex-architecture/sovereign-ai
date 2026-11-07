/**
 * MASTER_REGISTRY — every technology APEX knows about, in one queryable table.
 *
 * The honest frame: these rows were written by agents against a fixed contract. An agent
 * repeating a licence claim is still a claim. `licenceReviewNeeded()` is what separates a
 * catalogue from a usable one, and it is the queue a human works before anything ships.
 */

import type { TechRecord, Category, Priority } from "./schema.ts";
import { CATEGORIES } from "./schema.ts";
import { CREATIVE_VISUAL } from "./catalog/creative-visual.ts";
import { CREATIVE_TIME } from "./catalog/creative-time.ts";
import { CREATIVE_SOUND_DESIGN } from "./catalog/creative-sound-design.ts";
import { INTELLIGENCE } from "./catalog/intelligence.ts";
import { PLATFORM_INFRA } from "./catalog/platform-infra.ts";
import { ECONOMY_REACH } from "./catalog/economy-reach.ts";

export const MASTER_REGISTRY: TechRecord[] = [
  ...CREATIVE_VISUAL,
  ...CREATIVE_TIME,
  ...CREATIVE_SOUND_DESIGN,
  ...INTELLIGENCE,
  ...PLATFORM_INFRA,
  ...ECONOMY_REACH,
];

export function byCategory(registry: TechRecord[] = MASTER_REGISTRY): Map<Category, TechRecord[]> {
  const m = new Map<Category, TechRecord[]>();
  for (const r of registry) m.set(r.category, [...(m.get(r.category) ?? []), r]);
  return m;
}

export function categoriesCovered(registry: TechRecord[] = MASTER_REGISTRY): Category[] {
  return CATEGORIES.filter((c) => registry.some((r) => r.category === c));
}

export function categoriesEmpty(registry: TechRecord[] = MASTER_REGISTRY): Category[] {
  return CATEGORIES.filter((c) => !registry.some((r) => r.category === c));
}

export function byPriority(priority: Priority, registry: TechRecord[] = MASTER_REGISTRY): TechRecord[] {
  return registry.filter((r) => r.priority === priority);
}

export function localOnly(registry: TechRecord[] = MASTER_REGISTRY): TechRecord[] {
  return registry.filter((r) => r.localExecution && r.cost === "$0");
}

/** A written exit is mandatory. A row without one is a single point of failure with a name. */
export function rowsWithoutExit(registry: TechRecord[] = MASTER_REGISTRY): TechRecord[] {
  return registry.filter((r) => r.replacementOptions.length === 0);
}

/** Duplicate names across catalogues mean two agents described the same thing twice. */
export function duplicateNames(registry: TechRecord[] = MASTER_REGISTRY): string[] {
  const seen = new Map<string, number>();
  for (const r of registry) {
    const k = r.name.trim().toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

/**
 * Nothing in this build has been read by a human, so every "verified" flag is a question.
 * Rows marked licenseVerified=true are the highest-risk ones, not the safest.
 */
export function licenceReviewNeeded(registry: TechRecord[] = MASTER_REGISTRY): TechRecord[] {
  return registry.filter((r) => !r.licenseVerified || r.lastVerified === null);
}

export function assertedVerifiedWithoutDate(registry: TechRecord[] = MASTER_REGISTRY): TechRecord[] {
  return registry.filter((r) => r.licenseVerified && r.lastVerified === null);
}

export function shapeOf(registry: TechRecord[] = MASTER_REGISTRY): {
  rows: number;
  atZeroCost: number;
  runLocally: number;
  clearedForClientWork: number;
  needsLicenceReview: number;
} {
  return {
    rows: registry.length,
    atZeroCost: registry.filter((r) => r.cost === "$0").length,
    runLocally: registry.filter((r) => r.localExecution).length,
    clearedForClientWork: registry.filter((r) => r.licenseVerified && r.commercialUse === "yes").length,
    needsLicenceReview: licenceReviewNeeded(registry).length,
  };
}
