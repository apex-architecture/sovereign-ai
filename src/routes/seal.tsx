import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OwnerWall } from "@/components/OwnerWall";
import { toast } from "sonner";
import { prepareProof } from "@/lib/apex/seal.fn";
import { checkReceipt } from "@/lib/apex/verify.fn";
import {
  deviceSigningSupported,
  generateDeviceKey,
  hashFile,
  receiptIdOnDevice,
  sealOnDevice,
  verifyOnDevice,
} from "@/lib/apex/seal.browser";
import type { LedgerEvent } from "@/lib/apex/ledger";
import type { SealedReceipt } from "@/lib/apex/psi";
import { apexFrom, type ApexRow, type ApexTable } from "@/lib/apex/apex-db";

/**
 * The Sealing Room — the door that issues a passport.
 *
 * Until this page existed the platform could check a receipt and could never issue one.
 * The order of operations is deliberate and is the whole point:
 *   1. the platform reads its own database and hashes the record into a chain,
 *   2. the creator signs the exact bytes with a key that never leaves this browser,
 *   3. the receipt is stored where anybody can read it, and checked by the server's own
 *      verifier before this screen claims it works.
 *
 * Nothing here says the receipt proves authorship. It proves a key signed a manifest that
 * names the production record, and the screen says exactly that much.
 */

export const Route = createFileRoute("/seal")({
  head: () => ({
    meta: [
      { title: "Seal — Issue a Film Passport" },
      {
        name: "description",
        content:
          "Sign a finished film with a key that never leaves your device. Anyone can verify it, forever, for free.",
      },
    ],
  }),
  component: Seal,
});

const DEVICE_KEY_STORE = "apex.deviceKey.v1";

interface DeviceKeyState {
  publicKeyB64: string;
  privateKeyPem: string;
}

interface Verdict {
  signature: "pass" | "fail" | "cannot-check";
  file: "pass" | "fail" | "cannot-check";
  anchor: "pass" | "fail" | "cannot-check";
  sealedOn: string;
  title: string;
  attribution: string;
  toolDeclarations: string[];
  claims: string[];
  notClaims: string[];
}

function Seal() {
  const [userId, setUserId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [attribution, setAttribution] = useState("");
  const [licenceTerms, setLicenceTerms] = useState("all rights reserved");
  const [masterHash, setMasterHash] = useState<string | null>(null);
  const [masterName, setMasterName] = useState<string | null>(null);
  const [key, setKey] = useState<DeviceKeyState | null>(null);
  const [remember, setRemember] = useState(false);
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareProof>> | null>(null);
  const [receipt, setReceipt] = useState<SealedReceipt | null>(null);
  const [stored, setStored] = useState<{ ok: boolean; note: string } | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      if (data.user?.user_metadata?.full_name)
        setAttribution(String(data.user.user_metadata.full_name));
    });
    deviceSigningSupported().then(setSupported);
    try {
      const stored = localStorage.getItem(DEVICE_KEY_STORE);
      if (stored) {
        setKey(JSON.parse(stored) as DeviceKeyState);
        setRemember(true);
      }
    } catch {
      /* no key on this device yet */
    }
  }, []);

  const projects = useQuery({
    queryKey: ["seal-projects", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase.from("projects").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });

  useEffect(() => {
    if (!projectId && projects.data?.length) setProjectId(projects.data[0].id);
  }, [projects.data, projectId]);

  const project = (projects.data ?? []).find((p) => p.id === projectId);
  const title = (project?.title as string) || "Untitled Film";

  async function prepare() {
    if (!projectId) return toast.error("Pick a project first.");
    setBusy(true);
    setReceipt(null);
    setVerdict(null);
    setStored(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("no session — sign in again");

      const { data: jobs } = await supabase
        .from("render_jobs")
        .select("*")
        .eq("project_id", projectId);
      const existing = await apexSelect("apex_ledger_events", projectId);

      const proof = await prepareProof({
        data: {
          projectId,
          title,
          attribution: attribution || "creator",
          licenceTerms,
          accessToken: token,
          masterHash: masterHash ?? undefined,
          fallbackJobs: (jobs ?? []).map((j) => {
            const row = j as Record<string, unknown>;
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
          }),
          existingEvents: (existing as unknown as Record<string, unknown>[]).map(
            rowToEvent,
          ) as never,
        },
      });
      setPrepared(proof);
      toast.success(
        `proof prepared — ${proof.summary.events} events, chain ${proof.summary.intact ? "intact" : `broken at ${proof.summary.brokenAt}`}`,
      );
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function makeKey() {
    if (supported === false) return toast.error("this browser cannot sign — no Ed25519 support");
    try {
      const k = await generateDeviceKey();
      setKey(k);
      if (remember) localStorage.setItem(DEVICE_KEY_STORE, JSON.stringify(k));
      toast.success("key generated in this browser — download it and keep it offline");
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    }
  }

  function forgetKey() {
    localStorage.removeItem(DEVICE_KEY_STORE);
    setKey(null);
    setRemember(false);
    toast.success("key removed from this browser");
  }

  async function seal() {
    if (!prepared) return toast.error("prepare the proof first");
    if (!key) return toast.error("no key on this device — generate one first");
    setBusy(true);
    try {
      const signed = await sealOnDevice(prepared.manifest, key.privateKeyPem, key.publicKeyB64);
      const localOk = await verifyOnDevice(signed);
      setReceipt(signed);
      setVerdict(null);
      toast.success(
        localOk
          ? "signed on this device and verified locally"
          : "signed, but local verification failed — do not trust this receipt",
      );
      await store(signed, prepared);
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function store(signed: SealedReceipt, proof: NonNullable<typeof prepared>) {
    const notes: string[] = [];
    try {
      const id = await receiptIdOnDevice(signed);
      const fresh = proof.chain.slice(proof.existingCount);

      await apexUpsert("apex_projects", {
        id: proof.chain[0]?.projectId ?? projectId,
        owner_id: userId,
        title,
        visibility: "private",
      });

      for (const e of fresh) {
        const { error } = await apexInsert("apex_ledger_events", {
          seq: e.seq,
          project_id: e.projectId,
          kind: e.kind,
          at: e.at,
          actor_kind: e.actor.kind,
          actor_id: e.actor.id,
          statement: e.statement,
          refs: e.refs,
          details: e.details,
          epistemic: e.epistemic,
          prev_hash: e.prevHash,
          hash: e.hash,
          created_by: userId,
        });
        if (error) notes.push(`ledger row ${e.seq}: ${error.message}`);
      }

      const { error: receiptError } = await apexInsert("apex_receipts", {
        receipt_hash: id,
        project_id: proof.chain[0]?.projectId ?? projectId,
        content_hash: signed.contentHash,
        creator_public_key: signed.creatorPublicKey,
        algorithm: signed.algorithm,
        signature: signed.signature,
        manifest: signed.manifest,
        sealed_at: signed.sealedOn,
        created_by: userId,
      });
      if (receiptError) notes.push(`receipt: ${receiptError.message}`);

      setStored({
        ok: notes.length === 0,
        note: notes.length
          ? notes.join(" — ")
          : "chain and receipt written to the public verification table",
      });
    } catch (e) {
      setStored({ ok: false, note: String(e instanceof Error ? e.message : e) });
    }
  }

  async function verifyNow() {
    if (!receipt) return;
    setBusy(true);
    try {
      setVerdict(await checkReceipt({ data: { receipt: receipt as never } }));
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  function download(name: string, body: string, type = "application/json") {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!userId) return <OwnerWall title="Seal a film" note="Sealing gives a film its passport of who made it. It is done by the film's owner." />;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header>
        <p className="text-xs tracking-widest opacity-70">TRUST + PORTABILITY</p>
        <h1 className="font-black tracking-tighter text-3xl">THE SEALING ROOM</h1>
        <p className="mt-2 max-w-3xl text-sm opacity-80">
          A finished film can leave this room with a signed passport. The key is made in this
          browser and never transmitted. The server reads the production record, hashes it, and
          hands you the exact bytes to sign.
        </p>
      </header>

      {supported === false && (
        <p className="brutal-border p-3 text-sm text-red-500">
          This browser has no Ed25519 support, so it cannot sign. Open the room in a current Chrome,
          Edge, Firefox or Safari.
        </p>
      )}

      <section className="brutal-border p-4 space-y-3">
        <div className="text-xs neon-text font-bold">▮ 1 · THE FILM</div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full brutal-border bg-background px-3 py-2 text-sm"
        >
          {(projects.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {String((p as Record<string, unknown>).title ?? p.id)}
            </option>
          ))}
        </select>
        <input
          value={attribution}
          onChange={(e) => setAttribution(e.target.value)}
          placeholder="attribution — who made this"
          className="w-full brutal-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={licenceTerms}
          onChange={(e) => setLicenceTerms(e.target.value)}
          placeholder="licence terms"
          className="w-full brutal-border bg-background px-3 py-2 text-sm"
        />
        <label className="block text-[10px] uppercase font-bold">
          attach the master (optional) —{" "}
          {masterName ? masterName : "no file attached, the receipt will name the evidence instead"}
          <input
            type="file"
            className="mt-1 block w-full text-xs"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setMasterName(file.name);
              setMasterHash(await hashFile(file));
            }}
          />
        </label>
        <button
          onClick={prepare}
          disabled={busy}
          className="brutal-border px-4 py-2 text-xs font-bold uppercase hover:bg-primary disabled:opacity-40"
        >
          {busy ? "READING THE RECORD…" : "▮ PREPARE THE PROOF"}
        </button>
      </section>

      {prepared && (
        <section className="brutal-border p-4 space-y-2">
          <div className="text-xs neon-text font-bold">▮ 2 · THE CHAIN</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <Stat label="events" value={prepared.summary.events} />
            <Stat label="checked" value={prepared.summary.checked} />
            <Stat label="claims" value={prepared.summary.claims} />
            <Stat label="tools" value={prepared.summary.tools.length} />
          </div>
          <p className="text-xs opacity-80">
            chain{" "}
            {prepared.summary.intact ? "INTACT" : `BROKEN at row ${prepared.summary.brokenAt}`} ·
            root {prepared.root.slice(0, 16)}… · source{" "}
            {prepared.source === "platform-database"
              ? "the platform's own database"
              : "your own records (claims, not checked)"}
          </p>
          {prepared.summary.tools.length > 0 && (
            <p className="text-xs opacity-70">
              tools in the record: {prepared.summary.tools.join(", ")}
            </p>
          )}
          <p className="text-[10px] uppercase opacity-60">
            {prepared.manifest.stageConfig.contentKind === "master-file"
              ? "this receipt names the master file you attached"
              : "this receipt names the evidence chain — attach the master file if you want the receipt to name the film itself"}
          </p>
        </section>
      )}

      <section className="brutal-border p-4 space-y-3">
        <div className="text-xs neon-text font-bold">▮ 3 · THE KEY</div>
        {key ? (
          <div className="space-y-2">
            <p className="text-xs">
              public key · <code className="font-mono">{key.publicKeyB64.slice(0, 32)}…</code>
            </p>
            <p className="text-[10px] uppercase opacity-70">
              the private half never leaves this browser and was never sent to the server
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  download("creator-key.pem", key.privateKeyPem, "application/x-pem-file")
                }
                className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-primary"
              >
                ↓ DOWNLOAD KEY
              </button>
              <label className="flex items-center gap-2 text-[10px] uppercase font-bold">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    setRemember(e.target.checked);
                    if (e.target.checked && key)
                      localStorage.setItem(DEVICE_KEY_STORE, JSON.stringify(key));
                    else localStorage.removeItem(DEVICE_KEY_STORE);
                  }}
                />{" "}
                remember on this device
              </label>
              <button
                onClick={forgetKey}
                className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-destructive"
              >
                FORGET KEY
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={makeKey}
              disabled={busy || supported === false}
              className="brutal-border px-4 py-2 text-xs font-bold uppercase hover:bg-primary disabled:opacity-40"
            >
              ▮ GENERATE KEY ON THIS DEVICE
            </button>
            <label className="brutal-border px-4 py-2 text-xs font-bold uppercase cursor-pointer hover:bg-primary">
              IMPORT A .PEM
              <input
                type="file"
                accept=".pem,text/plain"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const pem = await file.text();
                  setKey({ publicKeyB64: "", privateKeyPem: pem });
                  toast.success("key imported — the public key is derived at signing time");
                }}
              />
            </label>
          </div>
        )}
      </section>

      <section className="brutal-border p-4 space-y-3">
        <div className="text-xs neon-text font-bold">▮ 4 · THE SEAL</div>
        <button
          onClick={seal}
          disabled={busy || !prepared || !key}
          className="brutal-border bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "WORKING…" : "▮ SEAL IT"}
        </button>
        {stored && (
          <p className={`text-xs ${stored.ok ? "text-emerald-500" : "text-amber-500"}`}>
            {stored.note}
          </p>
        )}
        {receipt && (
          <div className="space-y-2">
            <textarea
              readOnly
              value={JSON.stringify(receipt, null, 2)}
              rows={10}
              className="w-full brutal-border bg-background p-3 text-[10px] font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
                  toast.success("receipt copied");
                }}
                className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-primary"
              >
                COPY RECEIPT
              </button>
              <button
                onClick={() =>
                  download(
                    `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-receipt.json`,
                    JSON.stringify(receipt, null, 2),
                  )
                }
                className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-primary"
              >
                ↓ DOWNLOAD
              </button>
              <button
                onClick={verifyNow}
                disabled={busy}
                className="brutal-border px-3 py-2 text-[10px] font-bold uppercase hover:bg-primary"
              >
                VERIFY IT NOW
              </button>
            </div>
          </div>
        )}
        {verdict && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <VerdictCell label="signature" state={verdict.signature} />
              <VerdictCell label="file matches" state={verdict.file} />
              <VerdictCell label="anchor" state={verdict.anchor} />
            </div>
            <p className="text-xs font-bold uppercase">
              {verdict.title} · {verdict.attribution} · sealed {verdict.sealedOn}
            </p>
            <ul className="text-xs list-disc pl-5 space-y-1">
              {verdict.claims.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="text-[10px] uppercase opacity-70">what this does not prove</p>
            <ul className="text-xs list-disc pl-5 opacity-75 space-y-1">
              {verdict.notClaims.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <Link
          to="/verify"
          className="brutal-border px-3 py-2 text-sm hover:bg-primary hover:text-primary-foreground"
        >
          VERIFY A RECEIPT
        </Link>
        <Link
          to="/vault"
          className="brutal-border px-3 py-2 text-sm hover:bg-primary hover:text-primary-foreground"
        >
          THE VAULT
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="brutal-border px-3 py-2">
      <div className="font-black text-xl">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}

function VerdictCell({ label, state }: { label: string; state: "pass" | "fail" | "cannot-check" }) {
  const colour =
    state === "pass" ? "text-emerald-500" : state === "fail" ? "text-red-500" : "text-amber-500";
  return (
    <div className="brutal-border px-3 py-2">
      <div className={`font-black text-lg uppercase ${colour}`}>{state}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}

/**
 * The apex_* tables were created by migration and are not in the generated Database type.
 * They are reached through the same RLS-scoped client as everything else, so the owner's
 * session — not this file — decides what can be written.
 */
function apex(table: ApexTable) {
  return apexFrom(supabase, table);
}

async function apexSelect(table: ApexTable, projectId: string) {
  const { data, error } = await apex(table)
    .select("*")
    .eq("project_id", projectId)
    .order("seq", { ascending: true });
  if (error) return [];
  return data ?? [];
}

async function apexInsert(table: ApexTable, row: ApexRow) {
  return apex(table).insert(row);
}

async function apexUpsert(table: ApexTable, row: ApexRow) {
  return apex(table).upsert(row, { onConflict: "id" });
}

/** The database stores ledger rows in snake_case; the chain speaks camelCase. */
function rowToEvent(row: Record<string, unknown>): LedgerEvent {
  return {
    seq: Number(row.seq ?? 0),
    projectId: String(row.project_id ?? ""),
    kind: String(row.kind ?? "generation-run") as LedgerEvent["kind"],
    at: String(row.at ?? new Date().toISOString()),
    actor: {
      kind: String(row.actor_kind ?? "system") as "human" | "agent" | "system",
      id: String(row.actor_id ?? "platform"),
    },
    statement: String(row.statement ?? ""),
    refs: Array.isArray(row.refs) ? (row.refs as string[]) : [],
    details: (row.details ?? {}) as Record<string, string | number | boolean>,
    epistemic: String(row.epistemic ?? "claim") as LedgerEvent["epistemic"],
    prevHash: String(row.prev_hash ?? "0".repeat(64)),
    hash: String(row.hash ?? ""),
  };
}
