/**
 * PSI self-test — the cross-implementation proof.
 *
 * The platform has two cryptography stacks: node:crypto on the server and WebCrypto in
 * the creator's browser. A receipt is signed in the browser and verified on the server, so
 * the only question that matters is whether the two agree. This script answers it by
 * doing exactly that, and prints a binary verdict per gate.
 *
 *   node --experimental-strip-types scripts/psi-selftest.mjs
 */

import { canonical } from "../src/lib/apex/canonical.ts";
import { verifySeal } from "../src/lib/apex/psi.ts";
import {
  buildChain,
  manifestFrom,
  chainRoot,
  receiptId,
  recordsFromJobs,
  proofSummary,
} from "../src/lib/apex/proof.ts";
import {
  generateDeviceKey,
  sealOnDevice,
  verifyOnDevice,
  receiptIdOnDevice,
  sha256HexOnDevice,
} from "../src/lib/apex/seal.browser.ts";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";

// The public verifier that ships on the static rail, loaded the way the browser loads it.
const publicSource = readFileSync(new URL("../docs/psi-verify.js", import.meta.url), "utf8");
runInThisContext(publicSource, { filename: "verse-site/psi-verify.js" });
const PUBLIC = globalThis.APEX_PSI;

const gates = [];
function gate(name, ok, detail = "") {
  gates.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

// 1. Canonical JSON is the same on both sides (the foundation of every other gate).
const sample = { b: 2, a: { d: 4, c: [3, { f: 6, e: 5 }] } };
gate(
  "canonical JSON sorts keys and drops whitespace",
  canonical(sample) === '{"a":{"c":[3,{"e":5,"f":6}],"d":4},"b":2}',
  canonical(sample),
);

// 2. SHA-256 is identical in WebCrypto and node:crypto.
const { createHash } = await import("node:crypto");
const payload = "the quick brown fox jumps over the lazy dog";
const nodeHash = createHash("sha256").update(payload).digest("hex");
const webHash = await sha256HexOnDevice(payload);
gate("sha256 agrees between node:crypto and WebCrypto", nodeHash === webHash, webHash.slice(0, 16));

// 3. A real chain, built the way the platform builds it.
const jobs = [
  {
    id: "job-1",
    status: "done",
    tool: "comfyui",
    outputUrl: "https://cdn/x1.mp4",
    createdAt: "2026-11-07T00:00:00.000Z",
    usd: 0.04,
  },
  {
    id: "job-2",
    status: "done",
    tool: "wan-2.1",
    outputUrl: "https://cdn/x2.mp4",
    createdAt: "2026-11-07T00:02:00.000Z",
    usd: 0.11,
  },
];
const chain = buildChain("proj-self-test", recordsFromJobs(jobs));
const summary = proofSummary(chain);
gate(
  "ledger chain verifies intact",
  summary.intact,
  `${summary.events} events, brokenAt=${summary.brokenAt}`,
);

// 4. Tampering with any row breaks the chain.
const tampered = chain.map((e, i) => (i === 1 ? { ...e, statement: "quietly rewritten" } : e));
const tamperedSummary = proofSummary(tampered);
gate(
  "a rewritten row breaks the chain",
  !tamperedSummary.intact,
  `brokenAt=${tamperedSummary.brokenAt}`,
);

// 5. The manifest the creator signs.
const manifest = manifestFrom(chain, {
  title: "Self Test Feature",
  attribution: "self-test",
  licenceTerms: "all rights reserved",
  contentHash: chainRoot(chain),
  contentKind: "evidence-root",
});

// 6. Sign in the browser stack.
const deviceKey = await generateDeviceKey();
const receipt = await sealOnDevice(manifest, deviceKey.privateKeyPem, deviceKey.publicKeyB64);
gate(
  "receipt is well formed",
  receipt.format === "apex-psi/1" &&
    receipt.algorithm === "ed25519" &&
    receipt.signature.length > 16,
);

// 7. Verify in the SERVER stack — the cross-implementation gate that matters.
gate("browser-signed receipt verifies under node:crypto", verifySeal(receipt));

// 8. And in the browser stack.
gate("browser-signed receipt verifies under WebCrypto", await verifyOnDevice(receipt));

// 9. A tampered manifest must not verify.
const tamperedReceipt = { ...receipt, manifest: { ...manifest, title: "Someone Else's Film" } };
gate("a rewritten manifest does not verify", !verifySeal(tamperedReceipt));

// 10. The receipt id is the same string on both sides, so the database key is stable.
const idServer = receiptId(receipt);
const idBrowser = await receiptIdOnDevice(receipt);
gate(
  "receipt id agrees between node:crypto and WebCrypto",
  idServer === idBrowser,
  idServer.slice(0, 16),
);

// 11. The public key format is the one the server's verifier expects (SPKI DER).
const spkiDer = Buffer.from(receipt.creatorPublicKey, "base64");
gate(
  "creator public key is SPKI DER",
  spkiDer.length === 44 && spkiDer[0] === 0x30,
  `${spkiDer.length} bytes`,
);

// 12. A wrong key cannot sign someone else's manifest.
const otherKey = await generateDeviceKey();
const forged = await sealOnDevice(manifest, otherKey.privateKeyPem, otherKey.publicKeyB64);
gate(
  "a different key's signature does not verify the manifest",
  !verifySeal({ ...forged, creatorPublicKey: receipt.creatorPublicKey }),
);

// 13. The canonical form is locale-independent. A manifest with a mixed-case key must sort
//     by code unit, or the same manifest signs different bytes in different engines.
const mixed = { Zebra: 1, apple: 2, A: 3, _x: 4, "10lives": 5 };
const codeUnitOrder = JSON.stringify({ "10lives": 5, A: 3, Zebra: 1, _x: 4, apple: 2 });
const localeOrder = JSON.stringify(
  Object.fromEntries(
    Object.entries(mixed)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, v]),
  ),
);
gate(
  "canonical sorts by code unit, not by locale",
  canonical(mixed) === codeUnitOrder && codeUnitOrder !== localeOrder,
  canonical(mixed),
);

// 14. The public rail's canonical and the platform's canonical produce the same bytes.
const crossFixture = {
  title: "T",
  contentHash: "h",
  stageConfig: { Model: "x", model: "y", Z: 1, a: 2 },
  toolDeclarations: [],
};
gate(
  "the public verifier canonicalises identically to the platform",
  PUBLIC.canonical(crossFixture) === canonical(crossFixture),
  PUBLIC.canonical(crossFixture).slice(0, 60),
);

// 15. A receipt signed by the platform's own signer verifies in the PUBLIC verifier — the
//     door a stranger stands at, running the file that ships on the static rail.
const publicVerdict = await PUBLIC.verifyReceipt(receipt);
gate(
  "a platform-signed receipt verifies in the public verifier",
  publicVerdict.signature === "pass",
  publicVerdict.signature,
);

// 16. And the public verifier rejects a rewritten manifest.
const publicTampered = await PUBLIC.verifyReceipt({
  ...receipt,
  manifest: { ...manifest, title: "Someone Else's Film" },
});
gate(
  "the public verifier rejects a rewritten manifest",
  publicTampered.signature === "fail",
  publicTampered.signature,
);

// 17. The public verifier and the platform agree on which receipt this is.
gate(
  "the public verifier and the platform agree on the receipt id",
  (await PUBLIC.receiptId(receipt)) === idServer,
  idServer.slice(0, 16),
);

// 18. A receipt for a mixed-case manifest survives the trip to the public door.
const mixedManifest = {
  ...manifest,
  stageConfig: { ...manifest.stageConfig, Model: "wan-2.1", model: "flux" },
};
const mixedReceipt = await sealOnDevice(
  mixedManifest,
  deviceKey.privateKeyPem,
  deviceKey.publicKeyB64,
);
const mixedVerdict = await PUBLIC.verifyReceipt(mixedReceipt);
gate(
  "a mixed-case manifest verifies in the public verifier",
  mixedVerdict.signature === "pass",
  mixedVerdict.signature,
);

// 19. A browser with no Ed25519 support is told "cannot-check", never "pass".
const unsupported = await PUBLIC.verifyReceipt({ ...receipt, algorithm: "rsa-sha1" });
gate(
  "an unreadable receipt is reported as cannot-check",
  unsupported.signature === "cannot-check" && unsupported.claims.length === 1,
  unsupported.reason,
);

const failed = gates.filter((g) => !g.ok);
console.log(`\n${gates.length - failed.length}/${gates.length} gates passed`);
if (failed.length) {
  console.log("FAILED: " + failed.map((f) => f.name).join(" | "));
  process.exit(1);
}
console.log("ALL GATES PASSED — the browser signer and the server verifier agree.");
