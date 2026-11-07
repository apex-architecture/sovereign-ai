import type { TechRecord } from "./schema.ts";
import { R } from "./schema.ts";

/**
 * The eight things a rights system must never silently convert into one another.
 * A creator's claim is not a licence. A licence is not an agreement. An agreement is not a
 * verified signature. A verified signature is not a legal conclusion.
 */
export type AssertionKind =
  | "creator-claim"
  | "licence-document"
  | "third-party-licence"
  | "model-licence"
  | "dataset-licence"
  | "agreement"
  | "verified-signature"
  | "legal-conclusion";

export interface Assertion {
  id: string;
  kind: AssertionKind;
  /** The asset, tool, model or deliverable this is about. */
  subject: string;
  /** Where the statement came from — a URL, a person, a document hash. */
  source: string;
  /** What was actually stated, verbatim where possible. */
  text: string;
  recordedAt: string;
  /** Set only when a PSI seal was verified against it. Never inferred. */
  signatureVerified?: boolean;
}

export type UseCase = "personal" | "client-work" | "platform-bundle";

export type Verdict = "cleared" | "verify-first" | "blocked";

export interface GuardResult {
  verdict: Verdict;
  tool: string;
  reason: string;
  /** The single physical action that would move this row forward. */
  nextAction: string;
}

const PERMISSIVE = ["MIT", "Apache-2.0", "BSD", "ISC", "CC0", "public domain"];
const COPYLEFT = ["GPL", "AGPL", "LGPL", "MPL"];

function matches(license: string, families: string[]): boolean {
  return families.some((f) => license.includes(f));
}

/**
 * Binary gate over a registry row. Nothing becomes "cleared" until a human has read the licence
 * and recorded the date — the registry's honest default is that no row is cleared.
 */
export function guard(rec: TechRecord, use: UseCase): GuardResult {
  const base = { tool: rec.name };

  if (rec.commercialUse === "no") {
    return { ...base, verdict: "blocked", reason: "Licence forbids commercial use", nextAction: `Do not offer ${rec.name} for ${use}; pick a replacement from its exit list` };
  }

  if (!rec.licenseVerified) {
    return {
      ...base,
      verdict: "verify-first",
      reason: `Licence "${rec.license}" is recorded but no human has read and dated it`,
      nextAction: `Read the licence text at ${rec.sourceRepository || rec.officialUrl || rec.name}, then set licenseVerified with lastVerified`,
    };
  }

  if (rec.license.startsWith("proprietary-service")) {
    return use === "platform-bundle"
      ? { ...base, verdict: "blocked", reason: "A rented service cannot be shipped as if it were APEX's own", nextAction: "Expose it as a bring-your-own-key connector only" }
      : { ...base, verdict: "cleared", reason: "Paid per job by whoever runs it; the output belongs to the payer", nextAction: "Record the cost basis in the project ledger" };
  }

  if (rec.license.startsWith("proprietary")) {
    return use === "platform-bundle"
      ? { ...base, verdict: "blocked", reason: "Free to use is not free to redistribute", nextAction: "Keep it as an operator-side tool, never bundled" }
      : { ...base, verdict: "cleared", reason: "Operator uses it; the rendered media is theirs", nextAction: "Note the tool in the delivery evidence package" };
  }

  if (rec.commercialUse === "restricted") {
    return { ...base, verdict: "verify-first", reason: `Marked restricted: "${rec.license}"`, nextAction: `Confirm the exact clause before offering ${rec.name}; if unclear keep it unverified` };
  }

  if (rec.commercialUse !== "yes") {
    return { ...base, verdict: "verify-first", reason: `Commercial permission recorded as "${rec.commercialUse}"`, nextAction: `Establish commercial terms for ${rec.name} before use in ${use}` };
  }

  if (use === "platform-bundle" && rec.redistribution !== "yes") {
    return { ...base, verdict: "verify-first", reason: "Commercial use is permitted but redistribution inside a product is not established", nextAction: `Check redistribution rights for ${rec.name} before bundling` };
  }

  if (use === "platform-bundle" && matches(rec.license, COPYLEFT)) {
    return { ...base, verdict: "verify-first", reason: `${rec.license} source obligations attach when it ships inside a product`, nextAction: `Decide how ${rec.name} is distributed: separate process, or disclose source` };
  }

  return { ...base, verdict: "cleared", reason: `${rec.license} permits ${use}`, nextAction: "Proceed and seal the decision in the ledger" };
}

export function isCleared(rec: TechRecord, use: UseCase): boolean {
  return guard(rec, use).verdict === "cleared";
}

/** The rows a human must actually read. This is the review queue, not an error list. */
export function reviewQueue(registry: TechRecord[]): TechRecord[] {
  return registry.filter((r) => !r.licenseVerified || r.commercialUse === "unverified");
}

/** Asserts must be recorded as their own kind. This refuses a conclusion with no evidence under it. */
export function canPromote(a: Assertion): { ok: boolean; why: string } {
  if (a.kind === "legal-conclusion") {
    return { ok: false, why: "APEX records evidence of claims; legal ownership and admissibility are decided elsewhere" };
  }
  if (a.kind === "verified-signature" && a.signatureVerified !== true) {
    return { ok: false, why: "A signature assertion requires an actual verification result, not a description" };
  }
  return { ok: true, why: `${a.kind} recorded as ${a.kind}` };
}

/** Used by the licence pass itself: apply a human read to a copy of a row. */
export function applyHumanRead(
  rec: TechRecord,
  read: Partial<TechRecord>,
  datedOn: string,
): TechRecord {
  return {
    ...rec,
    ...read,
    licenseVerified: true,
    lastVerified: datedOn,
  };
}

/** A row that has been read and found unusable is still recorded, never deleted. */
export const REJECTED_EXAMPLE: TechRecord = applyHumanRead(
  R({ name: "EXAMPLE rejected row", category: "video-generation" }),
  { commercialUse: "no", redistribution: "no" },
  "2026-11-01",
);
