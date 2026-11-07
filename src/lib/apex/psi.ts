/**
 * APEX PSI — the seal itself. L1 signature over a canonical manifest, plus the
 * optional L3 anchoring interface.
 *
 * What this module will and will not say (the doctrine, in code):
 *   - a signature proves a key signed a statement, not that its holder authored a work
 *   - an anchor proves a hash existed by a moment, not that nobody held it earlier
 *   - anchoring is opt-in, batched, and never a prerequisite for verification
 *   - sealing is free forever; it can never be the lock the business sells around
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  verify as edVerify,
} from "node:crypto";
import { canonical } from "./canonical.ts";

export { canonical };

export const FREE_FOREVER = Object.freeze({
  seal: 0,
  verify: 0,
  exportReceipt: 0,
  note: "charging to prove a record is closed as a business path — see decision log",
});

export interface ManifestInput {
  title: string;
  contentHash: string;
  createdOn: string;
  attribution: string;
  licenceTerms: string;
  stageConfig: Record<string, string | number | boolean>;
  /** Tools and models actually used, recorded as declared by the creator. */
  toolDeclarations: Array<{ tool: string; variant?: string; declaredBy: string }>;
}

export interface SealedReceipt {
  format: "apex-psi/1";
  contentHash: string;
  creatorPublicKey: string;
  algorithm: "ed25519";
  signature: string;
  manifest: ManifestInput;
  sealedOn: string;
  anchor?: AnchorProof;
}

export interface AnchorProof {
  method: "opentimestamps" | "arweave" | "stacks";
  /** A real receipt from the anchoring service — never a placeholder string. */
  proof: string;
  assertedOn: string;
  anchoredBy: string;
}

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Seal a finished work. Takes the private key PEM as an argument and never stores it —
 * the caller keeps it on the creator's device.
 */
export function seal(manifest: ManifestInput, privateKeyPem: string): SealedReceipt {
  const bytes = Buffer.from(canonical(manifest), "utf8");
  const key = createPrivateKey(privateKeyPem);
  const signature = edSign(undefined, bytes, key);
  const publicKey = createPublicKey(key).export({ type: "spki", format: "der" }).toString("base64");
  return {
    format: "apex-psi/1",
    contentHash: manifest.contentHash,
    creatorPublicKey: publicKey,
    algorithm: "ed25519",
    signature: signature.toString("base64"),
    manifest,
    sealedOn: new Date().toISOString(),
  };
}

export function verifySeal(receipt: SealedReceipt): boolean {
  const bytes = Buffer.from(canonical(receipt.manifest), "utf8");
  return edVerify(
    undefined,
    bytes,
    createPublicKey({
      key: Buffer.from(receipt.creatorPublicKey, "base64"),
      format: "der",
      type: "spki",
    }),
    Buffer.from(receipt.signature, "base64"),
  );
}

/** A detached signature over any file, for cases where no manifest is being published yet. */
export function signStatement(
  statement: string,
  privateKeyPem: string,
): { statement: string; signature: string; publicKey: string } {
  const key = createPrivateKey(privateKeyPem);
  const raw = edSign(undefined, Buffer.from(statement, "utf8"), key);
  return {
    statement,
    signature: raw.toString("base64"),
    publicKey: createPublicKey(key).export({ type: "spki", format: "der" }).toString("base64"),
  };
}

export function checkStatement(s: {
  statement: string;
  signature: string;
  publicKey: string;
}): boolean {
  return edVerify(
    undefined,
    Buffer.from(s.statement, "utf8"),
    createPublicKey({ key: Buffer.from(s.publicKey, "base64"), format: "der", type: "spki" }),
    Buffer.from(s.signature, "base64"),
  );
}

/**
 * Attaching an anchor is a separate, deliberate act. This refuses anything that is not a
 * proof object, because a receipt stamped "pending" has taught people to distrust receipts.
 */
export function attachAnchor(receipt: SealedReceipt, proof: AnchorProof): SealedReceipt {
  if (proof.proof.trim().length < 16)
    throw new Error("anchor rejected: no actual proof from the anchoring service");
  return { ...receipt, anchor: proof };
}

/** Batch root for L3: many hashes, one anchoring transaction, one proof shared by all. */
export function batchRoot(hashes: string[]): string {
  const concat = [...hashes].sort().join("");
  return sha256Hex(concat);
}

export function describeScope(receipt: SealedReceipt): string[] {
  return [
    `the key ending ${receipt.creatorPublicKey.slice(-8)} signed this manifest`,
    receipt.contentHash
      ? `the manifest names bytes hashing to ${receipt.contentHash.slice(0, 12)}...`
      : "no content hash named",
    receipt.anchor
      ? `a ${receipt.anchor.method} proof is attached, asserted ${receipt.anchor.assertedOn}`
      : "no anchor attached — verification is unaffected",
    "not proven by this receipt: who made the work, who owns it, or that no earlier copy exists",
  ];
}
