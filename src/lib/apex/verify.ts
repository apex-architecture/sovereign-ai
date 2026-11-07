/**
 * Public verification — the door that never locks.
 *
 * Doctrine enforced in code: checking a receipt costs nothing, needs no account, and does
 * not call APEX infrastructure. If the company disappears tomorrow, this file still works
 * on any machine that has the file and the receipt.
 */

import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

export interface Receipt {
  format: "apex-psi/1";
  /** SHA-256 of the work's bytes, hex. */
  contentHash: string;
  creatorPublicKey: string;
  algorithm: "ed25519";
  signature: string;
  manifest: {
    title: string;
    createdOn: string;
    stageConfig: Record<string, string | number>;
    attribution: string;
    licenceTerms: string;
  };
  /** Present only when the creator chose to anchor. Absence is not a failure. */
  anchor?: { method: "opentimestamps" | "arweave" | "stacks"; proof: string; assertedOn: string };
}

export type CheckOutcome = "pass" | "fail" | "cannot-check";

export interface Verdict {
  /** Signature over the manifest — proves this key signed this statement. */
  signature: CheckOutcome;
  /** Bytes the checker holds vs the hash the receipt names. */
  fileMatches: CheckOutcome;
  /** Only meaningful with an anchor: is a proof attached and parseable. */
  anchor: CheckOutcome;
  /** What the checker is now entitled to say — and what they are not. */
  claims: string[];
  notClaims: string[];
  receipt: Receipt;
}

export function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Verify without contacting anything.
 * `fileBytes` omitted means the checker only has the receipt, which is a real and
 * legitimate state — it is reported as "cannot-check", never as a pass.
 */
export async function verify(receipt: Receipt, fileBytes?: Uint8Array | string): Promise<Verdict> {
  const manifestBytes = canonicalBytes(receipt.manifest);
  const signature = checkSignature(receipt, manifestBytes);

  let fileMatches: CheckOutcome = "cannot-check";
  if (fileBytes !== undefined)
    fileMatches = sha256(fileBytes) === receipt.contentHash ? "pass" : "fail";

  const anchor: CheckOutcome = receipt.anchor
    ? receipt.anchor.proof.length > 0
      ? "pass"
      : "fail"
    : "cannot-check";

  return {
    signature,
    fileMatches,
    anchor,
    claims: claimsFor(signature, fileMatches, anchor, Boolean(receipt.anchor)),
    notClaims: [
      "a valid signature proves a key signed this statement — not that the key's holder made the work",
      "a timestamp proves a hash existed by a moment — not that nobody held it earlier",
      "this verdict does not decide legal ownership, and does not depend on APEX servers",
    ],
    receipt,
  };
}

function checkSignature(receipt: Receipt, manifestBytes: string): CheckOutcome {
  try {
    const pub = createPublicKey({
      key: Buffer.from(receipt.creatorPublicKey, "base64"),
      format: "der",
      type: "spki",
    });
    const ok = cryptoVerify(
      undefined,
      Buffer.from(manifestBytes, "utf8"),
      pub,
      Buffer.from(receipt.signature, "base64"),
    );
    return ok ? "pass" : "fail";
  } catch {
    return "cannot-check";
  }
}

/** RFC 8785-style stable bytes: sorted keys, no whitespace, so re-serialisation cannot dodge a hash. */
export function canonicalBytes(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function claimsFor(
  sig: CheckOutcome,
  file: CheckOutcome,
  anchor: CheckOutcome,
  anchored: boolean,
): string[] {
  const out: string[] = [];
  if (sig === "pass") out.push("the named key signed this exact manifest");
  if (file === "pass") out.push("the file you hold is the file the manifest describes");
  if (anchored && anchor === "pass") out.push("an anchoring proof is attached to this receipt");
  if (out.length === 0)
    out.push(
      "nothing is proven by this check — the receipt is unreadable or the key did not sign it",
    );
  return out;
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, val]) => [k, sortDeep(val)]),
    );
  }
  return v;
}
