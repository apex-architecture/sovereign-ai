/**
 * The public verifier — the door that never locks.
 *
 * This file runs in two places and must behave identically in both: the browser that
 * loads verify.html, and Node, where scripts/psi-selftest.mjs signs a receipt with the
 * platform's own signer and checks it here. One implementation, one canonical form, one
 * answer — if these two ever disagreed, a receipt could be valid for the platform and
 * invalid for the public, which is the same as invalid.
 *
 * The rules this file keeps:
 *   - Nothing here contacts a network. Verification is arithmetic over bytes the checker
 *     already holds.
 *   - The canonical form is sorted by UTF-16 code unit (RFC 8785), never by locale.
 *     `localeCompare` would order "a" before "A", so a manifest with a mixed-case key
 *     would sign different bytes in Node than in a browser with different ICU data, and
 *     the failure would look like a forged signature.
 *   - A check that cannot be performed is reported as "cannot-check". It is never
 *     reported as a pass.
 *   - The verdict names what is proven and what is not. A seal is an audit trail.
 */
(function (root) {
  "use strict";

  var HAS_CRYPTO = typeof root.crypto !== "undefined" && root.crypto && root.crypto.subtle;

  /* ---------------------------------------------------------------- canonical */

  function sortDeep(v) {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (v && typeof v === "object") {
      var keys = Object.keys(v).sort(function (a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
      });
      var out = {};
      for (var i = 0; i < keys.length; i++) out[keys[i]] = sortDeep(v[keys[i]]);
      return out;
    }
    return v;
  }

  function canonical(value) {
    return JSON.stringify(sortDeep(value));
  }

  /* ------------------------------------------------------------------ bytes */

  function base64ToBytes(b64) {
    var clean = String(b64).replace(/\s+/g, "");
    if (root.atob) {
      var bin = root.atob(clean);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new Uint8Array(root.Buffer.from(clean, "base64"));
  }

  function bytesToBase64(bytes) {
    if (root.btoa) {
      var bin = "";
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return root.btoa(bin);
    }
    return root.Buffer.from(bytes).toString("base64");
  }

  function bytesToHex(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
    return out;
  }

  function sha256Hex(data) {
    var bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    return root.crypto.subtle
      .digest("SHA-256", bytes)
      .then(function (d) { return bytesToHex(new Uint8Array(d)); });
  }

  /* ---------------------------------------------------------------- receipt */

  var NOT_CLAIMS = [
    "a valid signature proves a key signed this statement — not that the key's holder made the work",
    "a timestamp proves a hash existed by a moment — not that nobody held it earlier",
    "this verdict does not decide legal ownership, and does not depend on APEX servers"
  ];

  function claimsFor(sig, file, anchor, anchored) {
    var out = [];
    if (sig === "pass") out.push("the named key signed this exact manifest");
    if (file === "pass") out.push("the file you hold is the file the manifest describes");
    if (anchored && anchor === "pass") out.push("an anchoring proof is attached to this receipt");
    if (out.length === 0) out.push("nothing is proven by this check — the receipt is unreadable or the key did not sign it");
    return out;
  }

  /** The stable identity of a receipt — the primary key it is published under. */
  function receiptId(receipt) {
    return sha256Hex(canonical({
      manifest: receipt.manifest,
      signature: receipt.signature,
      creatorPublicKey: receipt.creatorPublicKey
    }));
  }

  function shapeProblem(receipt) {
    if (!receipt || typeof receipt !== "object") return "this is not a JSON object";
    if (receipt.format !== "apex-psi/1") return "format is not apex-psi/1";
    if (receipt.algorithm !== "ed25519") return "algorithm is not ed25519";
    if (!receipt.manifest || typeof receipt.manifest !== "object") return "there is no manifest";
    if (typeof receipt.signature !== "string" || receipt.signature === "") return "there is no signature";
    if (typeof receipt.creatorPublicKey !== "string" || receipt.creatorPublicKey === "") return "there is no creator public key";
    return null;
  }

  /**
   * Check a receipt without contacting anything.
   *
   * `fileBytes` omitted means the checker only holds the receipt, which is a real and
   * legitimate state: it is reported as "cannot-check", never as a pass.
   */
  function verifyReceipt(receipt, fileBytes) {
    return Promise.resolve().then(function () {
      var problem = shapeProblem(receipt);
      if (problem) {
        return {
          signature: "cannot-check",
          fileMatches: "cannot-check",
          anchor: "cannot-check",
          claims: ["nothing is proven by this check — " + problem],
          notClaims: NOT_CLAIMS,
          receipt: receipt || null,
          receiptId: null,
          reason: problem
        };
      }

      var manifestBytes = new TextEncoder().encode(canonical(receipt.manifest));

      var fileMatches = "cannot-check";
      if (fileBytes !== undefined && fileBytes !== null) {
        fileMatches = sha256Hex(fileBytes).then(function (hex) {
          return hex === receipt.contentHash ? "pass" : "fail";
        });
      }

      var anchored = Boolean(receipt.anchor);
      var anchor = receipt.anchor
        ? (receipt.anchor && receipt.anchor.proof && String(receipt.anchor.proof).length > 0 ? "pass" : "fail")
        : "cannot-check";

      var signature = verifySignature(receipt, manifestBytes);

      return Promise.all([signature, fileMatches, receiptId(receipt)]).then(function (all) {
        var sig = all[0];
        var file = all[1];
        return {
          signature: sig.outcome,
          fileMatches: file,
          anchor: anchor,
          claims: claimsFor(sig.outcome, file, anchor, anchored),
          notClaims: NOT_CLAIMS,
          receipt: receipt,
          receiptId: all[2],
          reason: sig.reason || null
        };
      });
    });
  }

  function verifySignature(receipt, manifestBytes) {
    if (!HAS_CRYPTO) {
      return Promise.resolve({ outcome: "cannot-check", reason: "this browser has no WebCrypto" });
    }
    var key;
    try {
      key = root.crypto.subtle.importKey(
        "spki",
        base64ToBytes(receipt.creatorPublicKey),
        { name: "Ed25519" },
        false,
        ["verify"]
      );
    } catch (e) {
      return Promise.resolve({ outcome: "cannot-check", reason: "the public key could not be read as an Ed25519 SPKI key" });
    }
    return key.then(function (k) {
      return root.crypto.subtle.verify(
        { name: "Ed25519" },
        k,
        base64ToBytes(receipt.signature),
        manifestBytes
      ).then(function (ok) {
        return ok
          ? { outcome: "pass", reason: null }
          : { outcome: "fail", reason: "the signature does not hold over this manifest" };
      });
    }).catch(function (e) {
      return { outcome: "cannot-check", reason: "this browser cannot verify Ed25519 — " + (e && e.name ? e.name : "unsupported") };
    });
  }

  /** Whether this browser can check a signature at all — asked before anything is offered. */
  function supportsEd25519() {
    if (!HAS_CRYPTO) return Promise.resolve(false);
    return root.crypto.subtle
      .generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  root.APEX_PSI = {
    canonical: canonical,
    sortDeep: sortDeep,
    sha256Hex: sha256Hex,
    base64ToBytes: base64ToBytes,
    bytesToBase64: bytesToBase64,
    bytesToHex: bytesToHex,
    verifyReceipt: verifyReceipt,
    receiptId: receiptId,
    supportsEd25519: supportsEd25519,
    NOT_CLAIMS: NOT_CLAIMS
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
