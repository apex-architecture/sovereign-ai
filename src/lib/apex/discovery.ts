/**
 * Discovery Engine — the reason the registry never becomes a museum.
 *
 * The catalogue of tools is finite for a week and infinite in truth, so the product is not
 * the list, it is the pipeline that keeps refreshing it. Nothing leaves this pipeline as
 * "adopted" without a human having read a licence.
 */

import type { TechRecord } from "./schema.ts";

export interface Source {
  id: string;
  url: string;
  /** What this source is actually good at surfacing — and what it reliably misses. */
  surfaces: string;
  blindSpot: string;
  cadenceDays: number;
}

export const SOURCES: Source[] = [
  { id: "awesomeselfhosted", url: "https://awesomeselfhosted.app", surfaces: "self-hostable apps with licence labels", blindSpot: "anything that needs a GPU or a cloud account", cadenceDays: 14 },
  { id: "open-awesome", url: "https://open-awesome.com/self-hosted", surfaces: "large cross-category self-hosted catalogue", blindSpot: "maintenance recency", cadenceDays: 14 },
  { id: "selfhostindex", url: "https://selfhostindex.com", surfaces: "media, storage, AI, comms", blindSpot: "developer libraries", cadenceDays: 30 },
  { id: "github-topics", url: "https://github.com/topics", surfaces: "activity, releases, issue pressure", blindSpot: "Codeberg-first and abandoned-but-good projects", cadenceDays: 7 },
  { id: "codeberg", url: "https://codeberg.org", surfaces: "independent hosting, non-US maintainers", blindSpot: "visibility and star signal", cadenceDays: 30 },
  { id: "huggingface", url: "https://huggingface.co/models", surfaces: "open-weight models and datasets", blindSpot: "the licence text behind each checkpoint, which is per-file", cadenceDays: 3 },
  { id: "openssf", url: "https://openssf.org", surfaces: "supply-chain and security posture", blindSpot: "creative tools that are not packaged as dependencies", cadenceDays: 30 },
  { id: "repology", url: "https://repology.org", surfaces: "whether a distro actually ships it, which implies maintenance", blindSpot: "projects with no packaging", cadenceDays: 60 },
  { id: "libraries-io", url: "https://libraries.io", surfaces: "package-level dependency discovery", blindSpot: "desktop applications", cadenceDays: 30 },
  { id: "alternativeto", url: "https://alternativeto.net", surfaces: "substitutes for the commercial tool a creator already uses", blindSpot: "crowd-sourced licence claims, which are frequently wrong", cadenceDays: 30 },
  { id: "flathub", url: "https://flathub.org", surfaces: "Linux desktop creative apps", blindSpot: "Windows/mac-only tools", cadenceDays: 30 },
  { id: "f-droid", url: "https://f-droid.org", surfaces: "open-source Android", blindSpot: "anything requiring Google services", cadenceDays: 60 },
  { id: "choosealicense", url: "https://choosealicense.com", surfaces: "licence text comparison", blindSpot: "custom and dual licences, which it explicitly does not bless", cadenceDays: 180 },
  { id: "npm", url: "https://www.npmjs.com", surfaces: "node libraries the platform can import directly", blindSpot: "maintenance quality behind a polished README", cadenceDays: 7 },
  { id: "pypi", url: "https://pypi.org", surfaces: "python tooling behind ComfyUI/Ardour/Blender addons", blindSpot: "licence classifiers that disagree with the file", cadenceDays: 7 },
];

export type Stage = "candidate" | "triaged" | "licence-read" | "registry-row" | "pilot" | "adopted" | "rejected";

export const PIPELINE: Stage[] = ["candidate", "triaged", "licence-read", "registry-row", "pilot", "adopted", "rejected"];

/** The moves the pipeline is allowed to make. Anything else is a stalled row. */
export const NEXT_STAGES: Record<Stage, Stage[]> = {
  candidate: ["triaged", "rejected"],
  triaged: ["licence-read", "rejected"],
  "licence-read": ["registry-row", "rejected"],
  "registry-row": ["pilot", "rejected"],
  pilot: ["adopted", "registry-row", "rejected"],
  adopted: ["registry-row"],
  rejected: ["candidate"],
};

export const EVALUATOR_AXES = [
  "does-it-do-the-one-job",
  "licence-cleared-for-our-use",
  "runs-on-creators-hardware",
  "exit-path-if-it-dies",
  "data-exports-in-open-format",
  "maintained-in-last-12-months",
  "no-telemetry-we-cannot-audit",
  "works-offline",
  "scriptable-or-file-exchange",
  "community-size",
  "known-security-issues",
  "cost-at-our-volume",
] as const;
export type EvaluatorAxis = (typeof EVALUATOR_AXES)[number];

export interface Finding {
  sourceId: string;
  name: string;
  foundOn: string;
  stage: Stage;
  /** Axis -> pass/fail. Binary, because a 7/10 does not tell anyone what to do next. */
  axes: Partial<Record<EvaluatorAxis, boolean>>;
  note: string;
  record?: TechRecord;
}

export function canMove(from: Stage, to: Stage): boolean {
  return NEXT_STAGES[from].includes(to);
}

/**
 * Adoption gate. Checked against the record itself, not against a reviewer's memory:
 * a human must have read the licence, commercial use must be affirmative, and the
 * replacement options must be non-empty — no exit, no adoption.
 */
export function admissible(f: Finding): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const r = f.record;
  if (!r) missing.push("no registry record attached");
  else {
    if (!r.licenseVerified) missing.push("licence text never read by a human");
    if (r.commercialUse !== "yes") missing.push(`commercial use is "${r.commercialUse}", not "yes"`);
    if (r.replacementOptions.length === 0) missing.push("no written exit");
    if (!r.dataPortability || r.dataPortability === "unverified") missing.push("data portability unknown");
  }
  const unevaluated = EVALUATOR_AXES.filter((a) => f.axes[a] === undefined);
  if (unevaluated.length > 0) missing.push(`${unevaluated.length} evaluator axes untested`);
  return { ok: missing.length === 0, missing };
}

export function dueForRefresh(findings: Finding[], today: string): Finding[] {
  const bySource = new Map(SOURCES.map((s) => [s.id, s]));
  return findings.filter((f) => {
    const src = bySource.get(f.sourceId);
    if (!src) return true;
    const ageDays = (new Date(today).getTime() - new Date(f.foundOn).getTime()) / 86_400_000;
    return ageDays > src.cadenceDays;
  });
}

/** The queue a human actually works through, ordered by how close each item is to a decision. */
export function reviewQueue(findings: Finding[]): Finding[] {
  const rank: Record<Stage, number> = { candidate: 6, triaged: 5, "licence-read": 4, "registry-row": 3, pilot: 2, adopted: 1, rejected: 0 };
  return [...findings].sort((a, b) => rank[a.stage] - rank[b.stage]);
}
