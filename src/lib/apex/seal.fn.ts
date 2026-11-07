import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  buildChain,
  chainRoot,
  manifestFrom,
  proofSummary,
  recordsFromJobs,
  type JobRecord,
  type ProductionRecord,
} from "./proof.ts";
import type { LedgerEvent } from "./ledger.ts";
import type { ManifestInput } from "./psi.ts";
import { apexFrom } from "./apex-db.ts";

/**
 * The server half of the sealing room.
 *
 * The rule this file keeps: the manifest is built from the platform's own database, not
 * from what the browser says happened. The browser signs; the server reads the record,
 * hashes it into the chain, and hands the creator the exact bytes to sign. If the database
 * cannot be reached, the creator's own records are used instead and every row says so —
 * the fallback is visible, never silent.
 */

const jobSchema = z.object({
  id: z.string().max(120),
  status: z.string().max(60),
  tool: z.string().max(200).optional(),
  outputUrl: z.string().max(2000).optional(),
  promptText: z.string().max(4000).optional(),
  createdAt: z.string().max(60).optional(),
  usd: z.number().optional(),
});

const eventSchema = z.object({
  seq: z.number().int().nonnegative(),
  projectId: z.string().max(200),
  kind: z.enum([
    "asset-intake",
    "generation-run",
    "human-review",
    "approval",
    "contributor-agreement",
    "licence-declaration",
    "version-cut",
    "delivery-package",
    "publication",
    "retraction",
  ]),
  at: z.string().max(60),
  actor: z.object({ kind: z.enum(["human", "agent", "system"]), id: z.string().max(200) }),
  statement: z.string().max(4000),
  refs: z.array(z.string().max(400)).max(400),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  epistemic: z.enum(["claim", "signature-verified", "independently-checked"]),
  prevHash: z.string().max(200),
  hash: z.string().max(200),
});

export interface PreparedProof {
  chain: LedgerEvent[];
  manifest: ManifestInput;
  root: string;
  summary: ReturnType<typeof proofSummary>;
  /** Where the rows came from, so the screen can say so. */
  source: "platform-database" | "creator-records";
  ownerId: string | null;
  /** How many rows were already on the chain — everything after this is new. */
  existingCount: number;
}

export const prepareProof = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z
      .object({
        projectId: z.string().min(1).max(200),
        title: z.string().min(1).max(300),
        attribution: z.string().min(1).max(200),
        licenceTerms: z.string().min(1).max(400),
        accessToken: z.string().min(10).max(4000),
        /** The sha256 of the finished master, when the creator attaches the file. */
        masterHash: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .optional(),
        fallbackJobs: z.array(jobSchema).max(1000),
        existingEvents: z.array(eventSchema).max(5000),
      })
      .parse(v),
  )
  .handler(async ({ data }): Promise<PreparedProof> => {
    let jobs = data.fallbackJobs as JobRecord[];
    let source: "platform-database" | "creator-records" = "creator-records";
    let existing = data.existingEvents as unknown as LedgerEvent[];
    let ownerId: string | null = null;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: userData } = await supabaseAdmin.auth.getUser(data.accessToken);
      ownerId = userData?.user?.id ?? null;
      if (ownerId) {
        const { data: rows } = await supabaseAdmin
          .from("render_jobs")
          .select("*")
          .eq("project_id", data.projectId)
          .eq("owner_id", ownerId);
        if (rows && rows.length) {
          jobs = rows.map((r) => {
            const row = r as Record<string, unknown>;
            const prompt = (row.prompt ?? {}) as Record<string, unknown>;
            const log = (row.response_log ?? {}) as Record<string, unknown>;
            return {
              id: String(row.id),
              status: String(row.status ?? "unknown"),
              tool:
                typeof log.provider === "string"
                  ? log.provider
                  : typeof log.used === "string"
                    ? log.used
                    : "platform",
              outputUrl: typeof log.url === "string" ? log.url : undefined,
              promptText: typeof prompt.text === "string" ? prompt.text : undefined,
              createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
              usd: typeof log.usdSpent === "number" ? log.usdSpent : undefined,
            };
          });
          source = "platform-database";
        }

        const { data: events } = await apexAdmin(supabaseAdmin, "apex_ledger_events")
          .select("*")
          .eq("project_id", data.projectId)
          .order("seq", { ascending: true });
        if (events && events.length)
          existing = events.map((e: Record<string, unknown>) => rowToEvent(e));
      }
    } catch {
      // The platform database is not reachable from here. The creator's own records are
      // used instead and every row stays a claim — the fallback is stated, not hidden.
    }

    const records: ProductionRecord[] = recordsFromJobs(
      jobs,
      source === "platform-database" ? "independently-checked" : "claim",
    );
    const existingCount = existing.length;
    const chain = buildChain(data.projectId, records, existing);
    const root = chainRoot(chain);
    const manifest = manifestFrom(chain, {
      title: data.title,
      attribution: data.attribution,
      licenceTerms: data.licenceTerms,
      contentHash: data.masterHash ?? root,
      contentKind: data.masterHash ? "master-file" : "evidence-root",
      extra: { source, projectId: data.projectId },
    });

    return { chain, manifest, root, summary: proofSummary(chain), source, ownerId, existingCount };
  });

/**
 * The apex_* tables come from the platform's own migration and are not in the generated
 * Database type, so they are reached through one narrow accessor rather than by widening
 * the whole client.
 */
function apexAdmin(
  client: unknown,
  table: "apex_projects" | "apex_ledger_events" | "apex_receipts",
) {
  return apexFrom(client, table);
}

function rowToEvent(row: Record<string, unknown>): LedgerEvent {
  const actor = (row.actor ?? {}) as Record<string, unknown>;
  return {
    seq: Number(row.seq ?? 0),
    projectId: String(row.project_id ?? ""),
    kind: String(row.kind ?? "generation-run") as LedgerEvent["kind"],
    at: String(row.at ?? new Date().toISOString()),
    actor: {
      kind: (actor.kind ?? "system") as "human" | "agent" | "system",
      id: String(actor.id ?? "platform"),
    },
    statement: String(row.statement ?? ""),
    refs: Array.isArray(row.refs) ? (row.refs as string[]) : [],
    details: (row.details ?? {}) as Record<string, string | number | boolean>,
    epistemic: (row.epistemic ?? "claim") as LedgerEvent["epistemic"],
    prevHash: String(row.prev_hash ?? "0".repeat(64)),
    hash: String(row.hash ?? ""),
  };
}
