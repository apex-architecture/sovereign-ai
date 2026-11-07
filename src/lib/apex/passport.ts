/**
 * APEX Passport — the creator's portable record of themselves.
 *
 * Two rules this file will not bend: the private key is generated on the creator's device
 * and never transmitted, and the passport is an export anyone can open — because a
 * portfolio the platform holds hostage is not a passport, it is a lease.
 */

import { generateKeyPairSync } from "node:crypto";
import type { LedgerEvent } from "./ledger.ts";

export interface PassportContribution {
  projectId: string;
  role: string;
  /** Whose word this is. Self-declared until a signed event or a counterparty backs it. */
  basis: "self-declared" | "signed-event" | "counterparty-confirmed";
  evidenceRefs: string[];
  on: string;
}

export interface Passport {
  format: "apex-passport/1";
  handle: string;
  /** Ed25519 public key, base64 SPKI. The private half never appears in this object. */
  publicKey: string;
  displayName: string;
  bio: string;
  location: string;
  site: string;
  skills: string[];
  contributions: PassportContribution[];
  /** Licences the creator has granted, and terms they require — declared, not adjudicated. */
  licensingPreferences: { permits: string[]; requires: string[]; refuses: string[] };
  createdOn: string;
}

export function generateIdentity(): { publicKey: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey: publicKey.toString("base64"), privateKeyPem: privateKey };
}

export function newPassport(handle: string, publicKey: string): Passport {
  return {
    format: "apex-passport/1",
    handle,
    publicKey,
    displayName: handle,
    bio: "",
    location: "",
    site: "",
    skills: [],
    contributions: [],
    licensingPreferences: { permits: [], requires: [], refuses: [] },
    createdOn: new Date().toISOString(),
  };
}

/**
 * Contributions are lifted from the project ledger, not typed in by hand — so a passport
 * row carries the same epistemic weight as the event it came from, and says which.
 */
export function deriveContributions(passport: Passport, chain: LedgerEvent[]): PassportContribution[] {
  const mine = chain.filter((e) => e.actor.id === passport.handle);
  return mine.map((e) => ({
    projectId: e.projectId,
    role: e.kind,
    basis: e.epistemic === "claim" ? "self-declared" : e.epistemic === "signature-verified" ? "signed-event" : "counterparty-confirmed",
    evidenceRefs: e.refs,
    on: e.at,
  }));
}

export function exportPassport(passport: Passport): string {
  return JSON.stringify(passport, null, 2);
}

export function importPassport(blob: string): Passport {
  const parsed = JSON.parse(blob) as Passport;
  if (parsed.format !== "apex-passport/1") throw new Error(`unknown passport format: ${parsed.format}`);
  if ("privateKey" in parsed || "privateKeyPem" in parsed) throw new Error("a passport must never carry a private key");
  return parsed;
}

/**
 * What a stranger can conclude from this passport, in their own words.
 * A passport with three self-declared rows is not evidence of work — the platform must
 * say that plainly rather than let the count look like a credential.
 */
export function standing(passport: Passport): { verified: number; declared: number; sentence: string } {
  const verified = passport.contributions.filter((c) => c.basis !== "self-declared").length;
  const declared = passport.contributions.length - verified;
  return {
    verified,
    declared,
    sentence:
      verified === 0
        ? `${passport.handle}: ${declared} declared credits, none independently checkable yet`
        : `${passport.handle}: ${verified} checkable credits, ${declared} declared`,
  };
}
