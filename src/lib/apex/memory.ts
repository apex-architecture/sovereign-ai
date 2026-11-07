/**
 * Creative Memory — the standing record of what was decided, what was tried,
 * and what the frames actually looked like.
 *
 * This is the module that stops the empire from re-paying for the same failed experiment.
 * Every entry is a *record of a claim or an observation*, never an assertion of truth —
 * the same line the seal holds to.
 */

export type MemoryKind =
  | "decision"
  | "observation"
  | "failed-attempt"
  | "look-reference"
  | "provider-outage"
  | "cost-outcome"
  | "licence-finding";

export interface MemoryEntry {
  id: string;
  kind: MemoryKind;
  /** Which project this belongs to; "" for empire-wide memory. */
  projectId: string;
  stage: string;
  summary: string;
  /** What was seen or measured, in the operator's own words. */
  detail: string;
  /** Artefacts that back the entry — a file, a clip, a receipt hash. Optional. */
  evidenceRefs: string[];
  tags: string[];
  createdAt: string;
  /** Who wrote it — a human, or which agent. An agent's summary is a claim, not a fact. */
  author: string;
}

export interface MemoryQuery {
  projectId?: string;
  kind?: MemoryKind;
  stage?: string;
  text?: string;
  limit?: number;
}

export function remember(
  input: Omit<MemoryEntry, "id" | "createdAt"> & { id?: string; createdAt?: string },
): MemoryEntry {
  return {
    ...input,
    id: input.id ?? slug(input.projectId, input.kind, input.summary),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Recall. `text` matches against summary, detail and tags — deliberately dumb substring
 * rather than a similarity score, so the reason an entry surfaced is always explainable.
 */
export function recall(entries: MemoryEntry[], q: MemoryQuery): MemoryEntry[] {
  const needle = q.text?.toLowerCase().trim();
  return entries
    .filter((e) => (q.projectId === undefined ? true : e.projectId === q.projectId))
    .filter((e) => (q.kind === undefined ? true : e.kind === q.kind))
    .filter((e) => (q.stage === undefined ? true : e.stage === q.stage))
    .filter((e) =>
      !needle
        ? true
        : e.summary.toLowerCase().includes(needle) ||
          e.detail.toLowerCase().includes(needle) ||
          e.tags.some((t) => t.toLowerCase().includes(needle)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, q.limit ?? 50);
}

/** Before spending on a run, ask what already failed at this stage. */
export function dontRepeat(entries: MemoryEntry[], projectId: string, stage: string): MemoryEntry[] {
  return recall(entries, { projectId, stage, kind: "failed-attempt" });
}

/** Everything learned about one tool's licence, across every project. */
export function licenceFindings(entries: MemoryEntry[], toolName: string): MemoryEntry[] {
  return recall(entries, { kind: "licence-finding", text: toolName });
}

/**
 * Portable by rule: the memory leaves with the creator. No server holds the only copy,
 * and the export is the same shape as the store.
 */
export function exportMemory(entries: MemoryEntry[]): string {
  return JSON.stringify({ format: "apex-memory/1", count: entries.length, entries }, null, 2);
}

export function importMemory(blob: string): MemoryEntry[] {
  const parsed = JSON.parse(blob) as { format: string; entries: MemoryEntry[] };
  if (parsed.format !== "apex-memory/1") throw new Error(`unknown memory format: ${parsed.format}`);
  return parsed.entries;
}

function slug(projectId: string, kind: string, summary: string): string {
  const head = summary.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(1, 28).replace(/-$/, "");
  return `${projectId || "empire"}/${kind}/${head || "entry"}-${Date.now().toString(36)}`;
}
