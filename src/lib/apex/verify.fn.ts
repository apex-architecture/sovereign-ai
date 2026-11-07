import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canonical, sha256Hex, verifySeal, type SealedReceipt } from "./psi.ts";

const receiptSchema = z.object({
  format: z.literal("apex-psi/1"),
  contentHash: z.string().length(64),
  creatorPublicKey: z.string().min(16),
  algorithm: z.literal("ed25519"),
  signature: z.string().min(16),
  manifest: z.object({
    title: z.string(),
    contentHash: z.string(),
    createdOn: z.string(),
    attribution: z.string(),
    licenceTerms: z.string(),
    stageConfig: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    toolDeclarations: z.array(z.object({ tool: z.string(), variant: z.optional(z.string()), declaredBy: z.string() })),
  }),
  sealedOn: z.string(),
  anchor: z
    .object({
      method: z.enum(["opentimestamps", "arweave", "stacks"]),
      proof: z.string(),
      assertedOn: z.string(),
      anchoredBy: z.string(),
    })
    .optional(),
});

/**
 * Check a receipt. No account, no payment, no APEX server required in principle — this
 * endpoint exists for convenience, and the same bytes verify offline in
 * src/lib/apex/psi.ts on any machine.
 */
export const checkReceipt = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ receipt: receiptSchema, contentHash: z.string().length(64).optional() }).parse(v))
  .handler(async ({ data }) => {
    const receipt = data.receipt as SealedReceipt;
    const signatureValid = verifySeal(receipt);
    const fileMatches = data.contentHash ? data.contentHash === receipt.contentHash : null;

    return {
      signature: signatureValid ? "pass" : "fail",
      file: fileMatches === null ? "cannot-check" : fileMatches ? "pass" : "fail",
      anchor: receipt.anchor ? (receipt.anchor.proof.trim().length >= 16 ? "pass" : "fail") : "cannot-check",
      sealedOn: receipt.sealedOn,
      title: receipt.manifest.title,
      attribution: receipt.manifest.attribution,
      toolDeclarations: receipt.manifest.toolDeclarations.map((t) => t.tool),
      claims: [
        signatureValid ? `the key in this receipt signed the manifest for "${receipt.manifest.title}"` : "the signature does not match this manifest",
        fileMatches === true ? "the file you supplied is the file the manifest names" : fileMatches === false ? "the file you supplied is NOT the file the manifest names" : "no file supplied — content not checked",
        receipt.anchor ? `a ${receipt.anchor.method} proof is attached, asserted ${receipt.anchor.assertedOn}` : "no anchor attached",
      ],
      notClaims: [
        "a valid signature proves a key signed this statement — not that its holder created the work",
        "an anchor proves a hash existed by a moment — not that nobody held it earlier",
        "this verdict decides nothing in law; legal ownership is settled elsewhere",
      ],
    };
  });
