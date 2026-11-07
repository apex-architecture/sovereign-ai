/**
 * APEX Proof — the writer that was missing.
 *
 * Until now the platform could check a passport and could never issue one: `seal()` in
 * psi.ts had no caller anywhere in the repo, and the ledger in ledger.ts had no writer at
 * all. This module is that missing half. It turns production records into a hash-chained
 * ledger, that ledger into a canonical manifest, and the manifest into the bytes a creator's
 * key signs.
 *
 * What a proof is, stated exactly: a signature over a manifest that names a hash-chained
 * list of events, each of which says who acted, what happened, and what the row is worth —
 * a claim, a signature-verified statement, or a row the platform read back from its own
 * database and checked against the chain. It does not prove authorship, ownership, or
 * priority, and nothing in this file pretends otherwise.
 */

import {
  appendEvent,
  deliveryPackage,
  hashOf,
  verifyChain,
  type Actor,
  type EventKind,
  type LedgerEvent,
} from "./ledger.ts";
import { batchRoot, sha256Hex, type ManifestInput, type SealedReceipt } from "./psi.ts";
import { canonical } from "./canonical.ts";

export interface ProductionRecord {
  kind: EventKind;
  at: string;
  actor: Actor;
  statement: string;
  /** Content hashes this event speaks about. Empty is honest; invented hashes are not. */
  refs: string[];
  details: Record<string, string | number | boolean>;
  epistemic: "claim" | "signature-verified" | "independently-checked";
}

/** A render job as the platform's database recorded it. */
export interface JobRecord {
  id: string;
  status: string;
  tool?: string;
  outputUrl?: string;
  promptText?: string;
  createdAt?: string;
  usd?: number;
}

/**
 * Append records to the chain. `existing` is the chain already written for this project,
 * so the new rows continue the same hash chain instead of starting a second one.
 */
export function buildChain(
  projectId: string,
  records: ProductionRecord[],
  existing: LedgerEvent[] = [],
): LedgerEvent[] {
  const chain: LedgerEvent[] = [...existing];
  for (const r of records) {
    chain.push(
      appendEvent(chain, {
        projectId,
        kind: r.kind,
        at: r.at,
        actor: r.actor,
        statement: r.statement,
        refs: r.refs,
        details: r.details,
        epistemic: r.epistemic,
      }),
    );
  }
  return chain;
}

/**
 * One ledger row per render job. The row says what the platform's own database holds —
 * it never says the film is good, and it never upgrades its own epistemic status.
 */
export function recordsFromJobs(
  jobs: JobRecord[],
  epistemic: ProductionRecord["epistemic"] = "independently-checked",
): ProductionRecord[] {
  return jobs.map((job) => ({
    kind: "generation-run" as const,
    at: job.createdAt ?? new Date().toISOString(),
    actor: { kind: "system" as const, id: job.tool ?? "platform" },
    statement: `render job ${job.id} finished as "${job.status}"`,
    refs: [],
    details: {
      jobId: job.id,
      status: job.status,
      ...(job.tool ? { tool: job.tool } : {}),
      ...(job.outputUrl ? { outputUrl: job.outputUrl } : {}),
      ...(job.usd !== undefined ? { usd: job.usd } : {}),
      ...(job.promptText ? { prompt: job.promptText.slice(0, 240) } : {}),
    },
    epistemic,
  }));
}

/** The final row of a sealed film: the work left the studio, and the receipt that says so. */
export function publicationRecord(receiptId: string, at: string): ProductionRecord {
  return {
    kind: "publication",
    at,
    actor: { kind: "human", id: "creator" },
    statement: "the finished master was sealed and offered for verification",
    refs: [receiptId],
    details: { receiptId },
    epistemic: "signature-verified",
  };
}

export interface ManifestMeta {
  title: string;
  attribution: string;
  licenceTerms: string;
  /**
   * "master-file" means this hash is the sha256 of the finished master, so a checker who
   * holds the file can compare. "evidence-root" means it is the root over the event chain —
   * honest, but it names the evidence, not the film.
   */
  contentHash: string;
  contentKind: "master-file" | "evidence-root";
  extra?: Record<string, string | number | boolean>;
}

/**
 * Build the manifest the creator signs. The tools named here are the tools the chain says
 * were used — declared by the record, not asserted by the platform's marketing.
 */
export function manifestFrom(chain: LedgerEvent[], meta: ManifestMeta): ManifestInput {
  const tools = new Map<string, string>();
  for (const e of chain) {
    const tool = e.details.tool;
    if (typeof tool === "string" && tool) tools.set(tool, tool);
  }
  return {
    title: meta.title,
    contentHash: meta.contentHash,
    createdOn: new Date().toISOString(),
    attribution: meta.attribution,
    licenceTerms: meta.licenceTerms,
    stageConfig: {
      events: chain.length,
      contentKind: meta.contentKind,
      chainRoot: chain.length ? chain[chain.length - 1].hash : "0".repeat(64),
      ...(meta.extra ?? {}),
    },
    toolDeclarations: [...tools.values()].map((tool) => ({ tool, declaredBy: "platform-record" })),
  };
}

/** The root over the chain — one hash that stands for every event in it. */
export function chainRoot(chain: LedgerEvent[]): string {
  return batchRoot(chain.map((e) => e.hash));
}

/** Stable identity for a receipt, used as the primary key when it is stored. */
export function receiptId(receipt: SealedReceipt): string {
  return sha256Hex(
    canonical({
      manifest: receipt.manifest,
      signature: receipt.signature,
      creatorPublicKey: receipt.creatorPublicKey,
    }),
  );
}

/** The package a buyer can check with no account and no APEX server. */
export function proofPackage(
  chain: LedgerEvent[],
  projectId: string,
  receipt?: SealedReceipt,
): string {
  return JSON.stringify({
    format: "apex-proof/1",
    projectId,
    events: chain,
    root: chainRoot(chain),
    ...(receipt ? { receipt } : {}),
    howToCheck: "recompute each row's hash over its body with prevHash from the row before",
  });
}

/**
 * Plain-English verdict for the creator's screen: what the chain currently proves, and
 * the row counts behind it. Binary gates only — a chain is intact or it is not.
 */
export function proofSummary(chain: LedgerEvent[]): {
  intact: boolean;
  brokenAt: number | null;
  events: number;
  claims: number;
  verified: number;
  checked: number;
  tools: string[];
} {
  const verdict = verifyChain(chain);
  const claims = chain.filter((e) => e.epistemic === "claim").length;
  const verified = chain.filter((e) => e.epistemic === "signature-verified").length;
  const checked = chain.filter((e) => e.epistemic === "independently-checked").length;
  const tools = [
    ...new Set(
      chain
        .map((e) => e.details.tool)
        .filter((t): t is string => typeof t === "string" && t.length > 0),
    ),
  ];
  return {
    intact: verdict.intact,
    brokenAt: verdict.brokenAt,
    events: chain.length,
    claims,
    verified,
    checked,
    tools,
  };
}

/** The delivery package rows need, re-exported so callers import proof from one place. */
export { deliveryPackage, hashOf };
