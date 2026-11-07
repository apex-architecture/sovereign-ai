/**
 * APEX Project Ledger — the production evidence trail.
 *
 * The line this module exists to hold: a ledger row records that a statement was made
 * or an event was observed. It never upgrades a claim into verified fact, and every row
 * says which of the two it is.
 */

import { createHash } from "node:crypto";
import { canonical } from "./canonical.ts";

export { canonical };

export type EventKind =
  | "asset-intake"
  | "generation-run"
  | "human-review"
  | "approval"
  | "contributor-agreement"
  | "licence-declaration"
  | "version-cut"
  | "delivery-package"
  | "publication"
  | "retraction";

/** Who or what produced the statement. An agent's word is a claim, same as a creator's. */
export type Actor = { kind: "human" | "agent" | "system"; id: string };

export interface LedgerEvent {
  seq: number;
  projectId: string;
  kind: EventKind;
  at: string;
  actor: Actor;
  /** Plain statement of what happened, written by the actor. */
  statement: string;
  /** Content hashes this event speaks about — files, receipts, model weights. */
  refs: string[];
  /** Metadata that travelled with the event (tool used, cost, resolution). */
  details: Record<string, string | number | boolean>;
  /** "claim" until a signature or an independent check lifts it. Never defaulted upward. */
  epistemic: "claim" | "signature-verified" | "independently-checked";
  prevHash: string;
  hash: string;
}

export function hashOf(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

/**
 * Append an event. The hash covers the previous hash, so editing any earlier row breaks
 * every later one — that is the whole audit property, and it needs no server to prove.
 */
export function appendEvent(
  chain: LedgerEvent[],
  input: Omit<LedgerEvent, "seq" | "prevHash" | "hash" | "at"> & { at?: string },
): LedgerEvent {
  const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : "0".repeat(64);
  const body = {
    projectId: input.projectId,
    kind: input.kind,
    at: input.at ?? new Date().toISOString(),
    actor: input.actor,
    statement: input.statement,
    refs: input.refs,
    details: input.details,
    epistemic: input.epistemic,
    prevHash,
  };
  return { seq: chain.length, ...body, hash: hashOf(body) };
}

/** Binary verdict: is this chain intact, and which row is the first broken one. */
export function verifyChain(chain: LedgerEvent[]): { intact: boolean; brokenAt: number | null } {
  for (const e of chain) {
    const prevHash = e.seq === 0 ? "0".repeat(64) : chain[e.seq - 1]?.hash;
    if (prevHash === undefined) return { intact: false, brokenAt: e.seq };
    const { seq: _seq, hash: _hash, ...body } = e;
    if (hashOf(body) !== e.hash || e.prevHash !== prevHash)
      return { intact: false, brokenAt: e.seq };
  }
  return { intact: true, brokenAt: null };
}

/** Rows that are still somebody's word, unverified — the review queue, not a bug list. */
export function openClaims(chain: LedgerEvent[]): LedgerEvent[] {
  return chain.filter((e) => e.epistemic === "claim");
}

/**
 * A delivery package is the thing a buyer can check without an APEX account:
 * the events, the canonical text they hash over, and nothing that requires our servers.
 */
export function deliveryPackage(chain: LedgerEvent[], projectId: string): string {
  const rows = chain.filter((e) => e.projectId === projectId);
  return JSON.stringify({
    format: "apex-delivery/1",
    projectId,
    events: rows,
    root: hashOf(rows.map((e) => e.hash)),
    howToCheck: "recompute each row's hash over its body with prevHash from the row before",
  });
}
