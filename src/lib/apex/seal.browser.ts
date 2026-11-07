/**
 * Sealing on the creator's own device.
 *
 * The rule this file exists to keep: the private key never leaves the browser. The server
 * builds the manifest and checks the receipt; the signature is made here, on the creator's
 * machine, over bytes the server produced. There is no code path in this platform that
 * transmits a private key, and a passport the platform holds hostage is a lease, not a
 * passport.
 *
 * The cryptography is Ed25519 (RFC 8032) through WebCrypto, so the same code runs in a
 * browser and in Node. A receipt signed here verifies under the server's node:crypto
 * verifier — proven by scripts/psi-selftest.mjs, which signs on one side and verifies on
 * the other.
 */

import { canonical } from "./canonical.ts";
import type { ManifestInput, SealedReceipt } from "./psi.ts";

export interface DeviceKey {
  /** SPKI DER, base64 — the same public-key encoding the server's verifier expects. */
  publicKeyB64: string;
  /** PKCS8 DER in PEM. Never transmitted, never stored on a server. */
  privateKeyPem: string;
}

const PEM_HEADER = "-----BEGIN PRIVATE KEY-----";
const PEM_FOOTER = "-----END PRIVATE KEY-----";

/** Whether this browser can sign at all. Checked before anything is offered. */
export async function deviceSigningSupported(): Promise<boolean> {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) return false;
  try {
    await globalThis.crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    return true;
  } catch {
    return false;
  }
}

/** A new creator key, generated in the browser. The private half is returned to the creator. */
export async function generateDeviceKey(): Promise<DeviceKey> {
  const pair = (await globalThis.crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const spki = new Uint8Array(await globalThis.crypto.subtle.exportKey("spki", pair.publicKey));
  const pkcs8 = new Uint8Array(await globalThis.crypto.subtle.exportKey("pkcs8", pair.privateKey));
  return { publicKeyB64: bytesToBase64(spki), privateKeyPem: derToPem(pkcs8) };
}

/** Sign a manifest on this device. The key never leaves this function. */
export async function sealOnDevice(
  manifest: ManifestInput,
  privateKeyPem: string,
  publicKeyB64?: string,
): Promise<SealedReceipt> {
  const key = await importPrivateKey(privateKeyPem);
  const signature = await globalThis.crypto.subtle.sign(
    { name: "Ed25519" },
    key,
    new TextEncoder().encode(canonical(manifest)),
  );
  const publicKey =
    publicKeyB64 ??
    bytesToBase64(new Uint8Array(await globalThis.crypto.subtle.exportKey("spki", key)));
  return {
    format: "apex-psi/1",
    contentHash: manifest.contentHash,
    creatorPublicKey: publicKey,
    algorithm: "ed25519",
    signature: bytesToBase64(new Uint8Array(signature)),
    manifest,
    sealedOn: new Date().toISOString(),
  };
}

/** Check a receipt with no server and no network — the same check, in the creator's browser. */
export async function verifyOnDevice(receipt: SealedReceipt): Promise<boolean> {
  try {
    const key = await globalThis.crypto.subtle.importKey(
      "spki",
      base64ToBytes(receipt.creatorPublicKey) as BufferSource,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return await globalThis.crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      base64ToBytes(receipt.signature) as BufferSource,
      new TextEncoder().encode(canonical(receipt.manifest)) as BufferSource,
    );
  } catch {
    return false;
  }
}

/** The sha256 of the finished master, so a receipt can name the file and not just the evidence. */
export async function hashFile(file: Blob): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return bytesToHex(new Uint8Array(digest));
}

/** The stable identity of a receipt — the primary key it is stored under. */
export async function receiptIdOnDevice(receipt: SealedReceipt): Promise<string> {
  return sha256HexOnDevice(
    canonical({
      manifest: receipt.manifest,
      signature: receipt.signature,
      creatorPublicKey: receipt.creatorPublicKey,
    }),
  );
}

export async function sha256HexOnDevice(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(PEM_HEADER, "").replace(PEM_FOOTER, "").replace(/\s+/g, "");
  const der = base64ToBytes(body);
  return globalThis.crypto.subtle.importKey(
    "pkcs8",
    der as BufferSource,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
}

function derToPem(der: Uint8Array): string {
  const body = bytesToBase64(der)
    .replace(/(.{64})/g, "$1\n")
    .replace(/\n$/, "");
  return `${PEM_HEADER}\n${body}\n${PEM_FOOTER}\n`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
