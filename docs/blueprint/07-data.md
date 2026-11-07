# 07 — Data Model & Backend

Scope: the database as it actually is, the database the platform needs, and the rules that
keep one honest while becoming the other. Evidence base: every file in
`supabase/migrations/`, `src/integrations/supabase/*`, `src/lib/*.functions.ts`,
`src/lib/apex/*`, `src/lib/filmforge/*`, plus `git ls-files` / `git check-ignore` on `.env`.

**No secret value appears anywhere in this document.** Secrets are referenced by variable
name only. The `.env` file was never opened for reading its values — only its key names were
extracted (`grep -oE '^[A-Z_][A-Z0-9_]* *='`) so that no value entered a transcript, an
editor buffer, or this file.

---

## 7.1 What exists today, and which schema the live project actually has

### 7.1.1 The live schema = 7 tables

The deployed project has the schema from the two Lovable-era migrations only. Counts below
are from `grep -c` over the migration files, not from memory.

| Migration | Tables | Policies | GRANTs |
|---|---|---|---|
| `20260531031841_90392380…​.sql` | **7** | 17 | 16 |
| `20260531032112_86b64a9a…​.sql` | 0 (realtime + replica identity only) | 0 | 0 |
| `20261101190000_apex_ledger_passport.sql` | **4** (written, **not applied**) | 12 | **0** |

The 7 live tables: `user_roles`, `gpu_endpoints`, `projects`, `render_jobs`, `influencers`,
`votes`, `beta_signups`. Plus `public.app_role` enum, `handle_vote()` / `handle_new_user()`
security-definer functions, two triggers, and `influencers`/`votes` in the
`supabase_realtime` publication (`influencers` set to `REPLICA IDENTITY FULL`).

The 4 drafted-but-undeployed tables: `apex_ledger_events`, `apex_receipts`,
`apex_passports`, `apex_projects`.

### 7.1.2 State of the apex migration — plainly

**The live project has the 7-table Lovable schema. It does not have a single apex table.**
Three independent confirmations:

1. `git ls-files --error-unmatch supabase/migrations/20261101190000_apex_ledger_passport.sql`
   → *did not match any file(s) known to git*. The file is **untracked**: never committed,
   never reviewed, never deployed.
2. `grep -rn "apex_ledger_events|apex_receipts|apex_passports|apex_projects" src scripts` →
   **no hits**. No repository, no query builder, no route reads or writes those tables.
   The draft schema is orphaned: even if applied, nothing would populate it.
3. Every `.from()` call in `src/` resolves to one of the 7 legacy tables
   (`beta_signups`, `gpu_endpoints`, `influencers`, `projects`, `render_jobs`, `user_roles`,
   `votes`). Zero `.rpc()` calls exist, so the SQL functions are used only by triggers/policies.

### 7.1.3 Defects in the new migration as written (fix before any deploy)

These are not stylistic. Two of them stop the migration cold.

**(a) Forward reference — the migration aborts.** `apex_ledger_events` is created at line 9,
and its SELECT policy at line 38 subqueries `public.apex_projects` (line 41) — but
`apex_projects` is not created until line 100. Postgres parses and validates a policy
expression at `CREATE POLICY` time; an `EXISTS (SELECT 1 FROM public.apex_projects …)` over a
relation that does not yet exist raises `relation "public.apex_projects" does not exist` and
aborts. **Fix: create `apex_projects` first** (top of the file), then the ledger, receipts,
passports.

**(b) Zero GRANTs.** The legacy migration carries 16 explicit grants; the apex file has none.
On hosted Supabase this is masked by project-level `ALTER DEFAULT PRIVILEGES`, so it will
appear to work. On a self-hosted Postgres (the stated portability goal, §7.5) `anon` and
`authenticated` have no rights on the new tables and every PostgREST read returns a permission
error. Add grants explicitly — least privilege, per table, not `ALL`.

**(c) Column/field mismatch with the code that owns it.** `apex_receipts.sealed_at` vs
`SealedReceipt.sealedOn` in `src/lib/apex/psi.ts` (and the zod schema in
`src/lib/apex/verify.fn.ts`). `apex_receipts.receipt_hash` as PK is not a field the code
produces — `seal()` returns no receipt hash; it must be derived (`sha256Hex(canonical(receipt))`)
by whichever adapter writes the row. Pick one name and make the migration match the shipped
object, otherwise the first insert silently drops `sealedOn` and a NOT NULL fails.

**(d) Nullable `created_by` defeats the owner policies.** On `apex_ledger_events` and
`apex_receipts`, `created_by uuid` is nullable (`on delete set null`) while the INSERT policy
is `auth.uid() = created_by` and the SELECT policy is `auth.uid() = created_by`. `NULL = anything`
is NULL → not true. So: any row written by the service role (i.e. every row written by an
agent pipeline, which is the whole point) is **unreadable by its owner** unless the project's
`visibility` is `public`/`client`. For a private project the creator cannot see their own
ledger. Either make `created_by NOT NULL`, or drive authorisation from
`apex_projects.owner_id`/membership rather than a nullable per-row column.

**(e) No chain-containment at the DB layer.** `PRIMARY KEY (project_id, seq)` and
`UNIQUE (hash)` prevent duplicates but not fabrication: an INSERT can supply any `seq`,
`prev_hash` and `hash`. The hash chain is only authoritative when the row was written by the
code that computes it. `seq bigint not null` also has no per-project contiguity check, so a
gap is storable. Treat the DB as a *mirror of a chain verified in `ledger.ts`*, and enforce
gaps with a trigger (`seq = max(seq)+1 per project_id`) or restrict writes to the service role.

**(f) `apex_projects.id` is `text`, legacy `projects.id` is `uuid`.** Deliberate and
defensible for a portable, export-safe identifier — but it means the two project tables do not
and must not be joined. Documented as two namespaces in §7.2.1.

---

## 7.2 Target schema

Naming: new tables are `apex_*`. Ids are `text` — a UUID generated on our server is not a
portable identifier when the creator's own tool mints it, and `apex_*` must survive an export.
Money is `numeric`, never float. Timestamps `timestamptz`. Every `jsonb` column that carries
legal/financial weight gets a shape CHECK.

RLS posture vocabulary:
- **PUBLIC-READ** — `select using (true)`, anon included. Reserved for things a stranger must
  be able to check without an account.
- **OWNER-ONLY** — `auth.uid() = owner_id`, or membership-table EXISTS for collaborators.
- **APPEND-ONLY** — insert for the owner; `update using (false)`; `delete using (false)`.
- **SERVICE-WRITE** — no `authenticated` insert grant; only the service role writes, users read.
- **ADMIN-GATED** — `has_role(auth.uid(),'admin')`.

21 target tables: 4 already drafted (marked ✎), 17 new.

### 7.2.1 Film structure (6)

**`apex_projects`** ✎ — `id text PK`, `owner_id uuid → auth.users on delete set null`,
`title text NOT NULL`, `visibility text check in ('private','client','public')`,
`slug text unique`, `use_case text check in ('personal','commercial','client-work')`,
`budget text check in ('free-only','open-source-first','balanced','max-quality')`,
`created_at`, `updated_at`.
Keys: PK `id`. Index `(owner_id, created_at desc)`.
RLS: PUBLIC-READ *on visibility only* (`owner_id = auth.uid() or visibility in ('public','client')`);
`for all` scoped to `owner_id`. Why: a client must open their own film without holding an
APEX account; nobody else reads a private project.

**`apex_scenes`** — `id text PK`, `project_id text → apex_projects on delete cascade`,
`scene_no int NOT NULL`, `act int`, `title`, `slugline`, `description`, `mood`, `camera`,
`film_forge_prompt text`, `duration text`, `priority text check in ('critical','high','medium','low')`,
`location text`, `characters jsonb`, `status text check in ('planned','generating','review','approved','cut')`,
`created_at`, `updated_at`.
Keys: `UNIQUE (project_id, scene_no)`, FK cascade, index `(project_id, status)`.
Shape from `Scene` in `filmforge/planner.ts` — the field names match the code so a JSON
round-trip is lossless.
RLS: OWNER-ONLY, inherited via `EXISTS (SELECT 1 FROM apex_projects p WHERE p.id = project_id
AND (p.owner_id = auth.uid() or p.visibility in ('public','client')))`. Why: scenes carry
unreleased plot and prompt text; no public read by default, and definitely not
`using (true)` the way legacy `projects` does today (§7.3.2).

**`apex_shots`** — `id text PK`, `scene_id text → apex_scenes on delete cascade`,
`project_id text` (denormalised for tenancy checks), `shot_no int`, `stage text` (the 10
`FilmStage` values), `tool_id text → apex_tools`, `prompt jsonb`, `seed int`,
`takes int`, `best_take int`, `clip_asset_id text → apex_assets`, `status text check in
('queued','running','succeeded','failed','rejected','superseded')`, `cost_usd numeric`,
`machine_minutes numeric`, `created_at`, `updated_at`.
Keys: `UNIQUE (scene_id, shot_no)`, index `(project_id, status)`, index `(tool_id)`.
RLS: OWNER-ONLY as for scenes. Why: a shot is the unit that actually costs money, so it must
carry `cost_usd` and `machine_minutes` — the fields `cost.ts` computes but nowhere stores.

**`apex_assets`** — `id text PK`, `project_id text`, `kind text check in ('clip','still','audio','voice','music','subtitle','model','lut','doc','archive')`,
`storage_path text`, `bytes bigint`, `mime text`, `content_hash text NOT NULL` (sha256 hex, 64),
`source_job_attempt_id text`, `tool_id text`, `licence_id text → apex_licences`,
`provenance_basis text check in ('generated','uploaded','licensed-library','third-party','scraped')`,
`cleared_for text check in ('personal','commercial','client-work','unverified')`,
`created_at`.
Keys: `UNIQUE (project_id, content_hash)`, index `(content_hash)` — cross-project dedupe, so a
clip already paid for is found and re-used rather than re-rendered.
RLS: OWNER-ONLY for rows; bytes served through short-lived signed URLs, never public buckets.
Why: `content_hash` is the join key to receipts and ledger `refs`. Without it stored, the
ledger references hashes the platform cannot resolve — an evidence trail with no exhibit.

**`apex_characters`** — `id text PK`, `project_id text`, `name text`, `age text`,
`description text`, `film_forge_prompt text`, `phases jsonb`, `ref_sheet_asset_id text`,
`lock_status text check in ('unlocked','locked','drifted')`, `voice_asset_id text`,
`consent_basis text check in ('original','synthetic-self','licensed-likeness','unverified')`,
`created_at`.
Keys: `UNIQUE (project_id, lower(name))` — `hasReferenceSheet()` in `planner.ts` matches on a
lowercased, split name, so case-variant duplicates break the reference-sheet gate.
RLS: OWNER-ONLY. Why: likeness and voice consent is the highest-exposure data in the repo;
`consent_basis` defaulting to `unverified` mirrors the `R()` constructor discipline in
`apex/schema.ts` — nothing is permitted because someone said so.

**`apex_project_members`** — `project_id text`, `user_id uuid`, `role text check in
('owner','editor','reviewer','client','contributor')`, `granted_by uuid`, `created_at`.
Keys: `PK (project_id, user_id)`, FKs cascade.
RLS: OWNER-ONLY + `ADMIN-GATED` insert. Why: tenancy must stop being a single `owner_id`
column. Client review, contributor sign-off and co-direction all need it, and every
`apex_*` policy below reads it instead of repeating owner logic.

### 7.2.2 Execution & tools (4)

**`apex_jobs`** — `id text PK`, `project_id text`, `shot_id text`, `kind text check in
('render','upscale','voice','music','subtitles','assemble','verify','bakeoff')`,
`tool_id text`, `status text check in ('queued','running','succeeded','failed','cancelled')`,
`requested_by uuid`, `spec jsonb NOT NULL`, `budget_cap_usd numeric`, `attempt_count int default 0`,
`created_at`, `updated_at`.
Keys: index `(status, created_at)`, `project_id`.
RLS: OWNER-ONLY. Why: a job is the intent; it must be separately addressable because it is
what a retry, a cancellation and a budget cap act on.

**`apex_job_attempts`** — `id bigint generated always as identity PK`, `job_id text → apex_jobs on delete cascade`,
`attempt_no int NOT NULL`, `provider text`, `external_id text`, `request jsonb`,
`response jsonb`, `status text check in ('starting','processing','succeeded','failed','cancelled','timeout')`,
`error text`, `usd numeric`, `machine_minutes numeric`, `started_at`, `finished_at`,
`content_hash text`.
Keys: `UNIQUE (job_id, attempt_no)`, index `(external_id)`, index `(content_hash)`.
RLS: **APPEND-ONLY** (+ `SERVICE-WRITE` for the callback path). Why: this is the table whose
absence is currently destroying evidence — `pollCloudRender` in `render.functions.ts`
`UPDATE`s one `render_jobs` row and overwrites `response_log` on every poll, so the provider's
own status history is erased by observation. Attempts are facts; they never mutate.

**`apex_tools`** — `id text PK`, `name text`, `category text` (the 57 `CATEGORIES`),
`official_url text`, `source_repo text`, `license text default 'unverified'`,
`commercial_use / redistribution / modification / attribution / api_terms` each
`text check in ('yes','restricted','no','unverified') default 'unverified'`,
`output_conditions text`, `training_data_disclosure text`, `geographic_restrictions text`,
`self_hosting bool`, `local_execution bool`, `api_available bool`, `hardware text`,
`maintenance_status / security_status text check in ('active','stale','abandoned','unverified')`,
`data_portability text`, `integration_method text` (the 9 `INTEGRATION_METHODS`),
`cost text check in ('$0','per-job','subscription','self-host-hardware')`,
`replacement_options jsonb NOT NULL default '[]'`, `capability text`,
`priority text check in ('now','after-foundation','after-usage','when-justified')`,
`last_verified date`.
Keys: `UNIQUE (lower(name))`, index `(category)`, index `(last_verified)` for staleness sweeps.
RLS: PUBLIC-READ, `SERVICE-WRITE` / `ADMIN-GATED` write. Why: the tool registry is a claim
about the world that every customer is entitled to audit. It is the DB projection of
`TechRecord` in `apex/schema.ts`, whose rule we carry over verbatim: every permission field
starts `unverified` and is lifted only by an individual human read. The `R()` invariant —
`last_verified is null → license_verified = false` — must be a CHECK here, not only in TS:
`CHECK (license_verified = false OR last_verified IS NOT NULL)`. Also the
`replacement_options` NOT NULL default `'[]'` should be enforced as
`jsonb_array_length(...) > 0` for any row with `cost <> '$0'`: "what APEX runs instead if
this disappears" is stated in the code comment to be *never empty*, and a DB that permits
empty makes that claim false on day one.

**`apex_licence_reads`** — `id bigint identity PK`, `tool_id text → apex_tools on delete cascade`,
`read_by uuid NOT NULL`, `read_on date NOT NULL`, `licence_text_hash text`,
`source_url text`, `commercial_use text check in ('yes','restricted','no')`,
`attribution text check in ('yes','restricted','no')`, `output_conditions text`,
`raw_excerpt text`, `notes text`, `superseded_at timestamptz`.
Keys: index `(tool_id, read_on desc)`; partial unique for one live read per tool per person.
RLS: PUBLIC-READ, **APPEND-ONLY**. Why: this is *who read the licence text, when, and what
they concluded*. `licenseVerified: true` is a bare assertion until there is a signed,
dated, append-only record behind it. A re-read is a new row with the old row's
`superseded_at` stamped by trigger — never an UPDATE, because "we thought X in March" is
itself evidence. `Tool.exit` / `TechRecord.replacementOptions` are the same honesty device on
the exit side; this table is it on the rights side.

### 7.2.3 Evidence (4)

**`apex_ledger_events`** ✎ — keep as drafted after the §7.1.3 fixes: `seq`, `project_id`,
`kind` (10-value CHECK), `at`, `actor_kind` (`human|agent|system`), `actor_id`, `statement`,
`refs jsonb`, `details jsonb`, `epistemic` (`claim|signature-verified|independently-checked`
default `claim`), `prev_hash`, `hash`, `created_by`.
Keys: PK `(project_id, seq)`, `UNIQUE (hash)`, index `(project_id, at desc)`, partial index on
`epistemic = 'claim'` (the review queue).
RLS: PUBLIC-READ *for projects whose visibility is public/client*, owner-read otherwise;
INSERT for owner; `update using (false)`; `delete using (false)`.
Why: `epistemic` travels with every row so a claim can never be queried as if it were a
verified fact, and the chain re-verifies from the rows alone. Preserve exactly that; do not
add a boolean `verified` column beside it, which is how a three-state ladder quietly becomes
a two-state one plus a lie.

**`apex_receipts`** ✎ — `receipt_hash text PK`, `project_id text`, `content_hash text`,
`creator_public_key text`, `algorithm text default 'ed25519' check in ('ed25519')`,
`signature text`, `manifest jsonb NOT NULL`, `sealed_at timestamptz` (rename or alias to match
`sealedOn`), `anchor jsonb`, `created_by uuid`.
Keys: PK `receipt_hash`, index `(content_hash)`, index `(creator_public_key)`,
`CHECK (length(signature) > 0)`, `CHECK (manifest ? 'title')` plus the `apex-psi/1` shape.
RLS: **PUBLIC-READ, APPEND-ONLY**. Why: verification is the free, permanent surface — a buyer
must check a receipt forever with no account and no payment. The anchor methods in
`verify.fn.ts` are `opentimestamps | arweave | stacks`; keep that as a CHECK so an invented
anchor method cannot be stored as if it were a real anchoring route.

**`apex_passports`** ✎ — `handle text PK`, `user_id uuid unique`, `public_key text NOT NULL`,
`display_name`, `bio`, `location`, `site`, `skills jsonb`, `licensing_preferences jsonb`
(`{"permits":[],"requires":[],"refuses":[]}`), `created_at`, `export_format text default 'apex-passport/1'`.
Keys: PK `handle`, `UNIQUE (user_id)`, `CHECK (public_key <> '')`.
RLS: PUBLIC-READ; owner `for all` **except delete** (see §7.3.3).
Why: the passport is the record the creator owns. **`contributions` must leave this table**
and become `apex_contributions` — see below.

**`apex_contributions`** — `id bigint identity PK`, `handle text → apex_passports on delete cascade`,
`project_id text`, `role text`, `basis text check in ('self-declared','signed-event','counterparty-confirmed')`,
`evidence_refs jsonb default '[]'`, `on timestamptz`, `source_event_hash text`.
Keys: `UNIQUE (handle, source_event_hash)`, index `(handle, on desc)`.
RLS: **APPEND-ONLY**, written by the derivation job, not typed by the user.
Why: `deriveContributions()` in `passport.ts` lifts contributions *from the ledger*, and each
carries the ledger's epistemic weight. Embedding them in a mutable `jsonb` on `apex_passports`
(which the owner may freely `UPDATE`) lets a creator hand-edit credits that were supposed to
be derived from evidence — and it lets the whole credit history be replaced in one keystroke.
Separate, append-only, and hash-linked back to `source_event_hash`. `standing()` already
refuses to let a count look like a credential; the schema must not undo that at rest.

### 7.2.4 Memory, economics, evaluation (5)

**`apex_memory_entries`** — `id text PK` (the `slug()` output from `memory.ts`), `kind text
check in ('decision','observation','failed-attempt','look-reference','provider-outage','cost-outcome','licence-finding')`,
`project_id text NOT NULL default ''` (`''` = empire-wide, matching the code), `stage text`,
`summary text`, `detail text`, `evidence_refs jsonb`, `tags text[]`, `author text`,
`created_at`.
Keys: index `(project_id, stage, kind)`, GIN on `tags`, and a `tsvector` generated column over
`summary || detail || tags` for recall.
RLS: OWNER-ONLY; **empire-wide rows (`project_id = ''`) are PLATFORM-READ for all members.**
Why: `memory.ts` deliberately uses dumb substring recall "so the reason an entry surfaced is
always explainable". Keep that. FTS is an *additive* index, never a similarity score replacing
the explainable path. This table is the one that stops the empire re-paying for a failed
experiment, so `failed-attempt` rows are append-only — a lesson learned must not be deletable
by whoever finds it inconvenient.

**`apex_price_entries`** — `id bigint identity PK`, `provider text`, `tool_id text`,
`unit text NOT NULL`, `usd_per_unit numeric NOT NULL`, `verified_from text NOT NULL`,
`verified_on date`, `source_url text`, `superseded_at timestamptz`, `created_at`.
Keys: index `(provider)`; partial unique `(provider, unit) where superseded_at is null`.
RLS: PUBLIC-READ, **APPEND-ONLY**.
Why: `cost.ts` states the honest-by-construction rule — "no provider price is hard-coded as
fact", and "every estimate carries the assumption it was computed under" (`verifiedFrom`,
`verifiedOn`). A quote to a client is only defensible if the price *and its date and its
source* are preserved. UPDATE-in-place would let today's number silently rewrite yesterday's
quote. Supersession by new row, exactly like `gpu_endpoints` *should* work (§7.3.3).

**`apex_bakeoffs`** — `id text PK`, `capability text`, `ran_on date`, `prompt_set_hash text NOT NULL`,
`clips_per_model int NOT NULL`, `winner text`, `reason text`, `decided bool generated always as
(winner is not null and trim(reason) <> '') stored`, `created_by uuid`.
**`apex_bakeoff_results`** — `id bigint identity PK`, `bakeoff_id text → apex_bakeoffs on delete cascade`,
`model_id text`, `axis text`, `pass boolean NOT NULL`, `evidence text NOT NULL`,
`asset_id text`, `created_at`.
Keys: `UNIQUE (bakeoff_id, model_id, axis)`, index `(capability, ran_on desc)`.
RLS: PUBLIC-READ, APPEND-ONLY, `SERVICE-WRITE`/`ADMIN-GATED` insert.
Why: straight from `apex/models.ts`. `prompt_set_hash` is NOT NULL because "the same fixed
prompt set for every entrant, or the comparison is worthless". `isDecided()` is the binary
gate — no scores anywhere, and `decided` as a stored generated column makes the code's rule
(`winner` present **and** `reason` non-blank) queryable rather than re-implementable in five
places. Results are per-axis pass/fail with the observation attached; a score column here
would violate the platform's own binary-gate rule.

**`apex_plans`** — `id text PK`, `name text`, `usd_per_month numeric`, `credits numeric`,
`concurrent_jobs int`, `storage_bytes bigint`, `tool_access text check in ('open-source-only','all-cleared','all')`,
`active bool default true`.
RLS: PUBLIC-READ (catalogue is a commercial promise), `ADMIN-GATED` write.
Why: entitlements cannot be derived without a plan definition. `tool_access` is expressed as
*clearance*, not as a licence grant — the licence decision stays in `apex_tools` /
`apex_licence_reads`, so paying money can never flip a `unverified` licence to `yes`. That is
the same firewall `isClearedForWork()` enforces in code, and it must not be bridgeable from
the billing side.

**`apex_entitlements`** — `id bigint identity PK`, `user_id uuid`, `project_id text`,
`plan_id text → apex_plans`, `source text check in ('purchased','granted','founder','refund- clawback','expired')`,
`starts_at timestamptz`, `ends_at timestamptz`, `stripe_subscription_id text`,
`granted_by uuid`, `created_at`.
Keys: index `(user_id, ends_at desc)`, partial unique for one live entitlement per user+scope.
RLS: `select using (user_id = auth.uid())` only for the holder; read by admins. **Never
PUBLIC-READ.** APPEND-ONLY.
Why: who-pays-what-for-how-long is commercial fact and personal data at once. It is append-only
because a refund, a clawback and a grant-down must each leave a row; the current state is the
latest row, not an overwritten field. Note `STRIPE_SECRET_KEY` is referenced only inside a
comment in `config.server.ts` and appears in no `.env` — **billing is not implemented**, so
`apex_plans`/`apex_entitlements` are the schema slot, not a live integration. Do not let a
blueprint imply a payment rail exists.

**`apex_exports`** — `id bigint identity PK`, `kind text check in ('apex-delivery/1','apex-psi/1','apex-passport/1','apex-memory/1','apex-project/1','apex-registry/1','apex-economics/1')`,
`project_id text`, `requested_by uuid`, `root_hash text NOT NULL`, `bytes bigint`,
`storage_path text`, `created_at`.
RLS: OWNER-ONLY, append-only.
Why: a creator's right to leave must be *evidenced*. Every export records its own root hash,
so "I handed you the complete record" is checkable later. Without this table, portability is
a promise with no audit trail.

### 7.2.5 Legacy disposition

| Live table | Disposition |
|---|---|
| `projects` | Keep for legacy routes; **stop writing**. Mirror into `apex_projects` on cutover. |
| `render_jobs` | Keep; new writes go to `apex_jobs` + `apex_job_attempts`. |
| `gpu_endpoints` | Fold into `apex_tools` + `apex_price_entries`; must become append-only first. |
| `user_roles`, `app_role`, `has_role()` | Keep — it is the admin primitive every policy still needs. |
| `influencers`, `votes`, `beta_signups` | Keep as the nomination/vote surface; out of the film data model. |
| `auth.users` | Canonical identity. `apex_passports.user_id` binds to it. |

---

## 7.3 Immutability: what is enforced, and where the rule is currently wrong

### 7.3.1 Correctly enforced today (in the draft)

`apex_ledger_events`: `"ledger events cannot be updated" … for update using (false)` and
`… cannot be deleted … for delete using (false)`. Same pair on `apex_receipts`
(`receipts are immutable` / `receipts are undeletable`). This is the right mechanism, and the
comment states the reason correctly: history is evidence, so **a retraction is a new event of
`kind = 'retraction'`, never an UPDATE** — and the code already carries `'retraction'` in
`EventKind`, plus an `openClaims()` review queue. Keep this pattern and extend it; do not
"fix" the `using (false)` policies by adding an admin override, because an admin-editable
ledger is not a ledger.

### 7.3.2 Where immutability is missing on the live schema

- **`projects`** has `"projects public read" … FOR SELECT USING (true)` — *every* project row,
  including `status='draft'` titles and `style_tags` of every creator, readable by `anon`.
  Combined with `GRANT SELECT … TO anon` this is an unconditional leak of unreleased work.
  Unreleased film data is the crown jewel; this policy hands it to anyone who can guess the
  URL. Fix at cutover: `USING (featured = true OR owner_id = auth.uid())`.
- **`votes`** exposes `voter_fingerprint` to public read, and its INSERT policy is
  `WITH CHECK (true)` for `anon`, with the uniqueness key `(influencer_id, voter_fingerprint)`
  — a client-supplied string. One ballot per fingerprint only means one ballot per browser
  cache. Also note the memory rule that a substring/fingerprint probe is not identity: this
  table treats a client string as a person.
- **`render_jobs`** is mutable by design and that is the active evidence-destroyer (§7.2.2).
  Every poll overwrites `response_log`; the transition history that would prove what the
  provider actually returned is gone. `INSERT` is allowed with `WITH CHECK (owner_id = auth.uid())`
  but `UPDATE` has **no `WITH CHECK`**, so an owner may move a row to another `owner_id`
  (policy `USING` only guards the old row).
- **No DELETE policy exists for `render_jobs`, `votes`, `beta_signups`.** With RLS on, that is
  implicit deny — correct in effect, but `GRANT … DELETE TO authenticated` is still issued on
  `gpu_endpoints`, `projects`, `render_jobs`, `influencers`. A grant with no policy is a
  standing invitation to "just add the policy" later. Revoke the grants you do not intend to
  back with a policy.

### 7.3.3 Tables in the plan where the immutability rule must be inverted or extended

**`gpu_endpoints` is the clearest wrong one, and it is live.** `status`, `latency_ms`,
`cost_per_minute` are `UPDATE`able by admins with no history. `cost_per_minute` is the number
a quote was built on. If a client was quoted from `cost_per_minute = 0.42` and an admin later
writes `0.80`, the platform has destroyed the only record of what it said. This table must be
append-only-with-supersession — i.e. dissolved into `apex_price_entries` +
`apex_job_attempts` — before any real money moves.

- **`influencers`**: `admin deletes influencer` cascades `votes` (`ON DELETE CASCADE`).
  Deleting a nomination silently deletes the vote record that justified promoting it to `live`
  at 1000. Promotion history must survive the nominee; make it a `status` transition event.
- **`apex_passports`** (draft): `create policy "owner manages their passport" … FOR ALL` grants
  the owner `UPDATE` **and `DELETE`**. `UPDATE` on profile fields is right. `UPDATE` on the
  `contributions` jsonb is wrong (fixed by §7.2.3). `DELETE` is wrong outright: the handle is
  the primary key that ledger rows and receipts point at, so a passport delete orphans the
  evidence chain and lets a bad year be erased. Replace `FOR ALL` with
  `FOR UPDATE` (profile columns) + `FOR INSERT`, and a `retraction`-style tombstone.
- **`apex_projects`**: `FOR ALL` is acceptable for the owner, but `DELETE` must cascade
  deliberately — with `apex_ledger_events` keyed on `project_id text` and **no FK** to
  `apex_projects`, deleting a project leaves ledger rows permanently orphaned and unreferenced
  while their own read policy (`p.visibility in ('public','client')`) can no longer resolve.
  Either add the FK (`on delete restrict`, so evidence cannot be dropped by deleting a folder)
  or accept orphan policy and prove the chain only from `apex_exports`. **Recommend
  `on delete restrict`**: the ledger outlives the project.
- **`apex_memory_entries`** / **`apex_price_entries`** / **`apex_licence_reads`** /
  **`apex_entitlements`**: append-only as specified, each with a supersession marker rather
  than mutation.

### 7.3.4 The DB is not the verifier

`verifyChain()` recomputes `hashOf(body)` over the whole body including `prevHash`; the DB
cannot do this without duplicating `canonical()`'s key-sorting exactly (`sortDeep` sorts with
`localeCompare`, which is locale-dependent). Two consequences:
1. `canonical()`'s sort must be pinned to a byte-wise comparison or the hash is unreproducible
   in another language or locale — and an export the buyer re-hashes in Python must match.
2. Immutability policies stop edits; they do not prove authorship. The chain's authority comes
   from `verifyChain()` plus `apex_receipts.signature`, made with the creator's device-held
   key. Never let a `verified` boolean in the DB be treated as stronger than a recomputed hash.

---

## 7.4 Portability

The rule that governs this section is in `passport.ts` already, in one sentence: *a portfolio
the platform holds hostage is not a passport, it is a lease.* `export_format text not null
default 'apex-passport/1'` in the draft migration exists precisely so the column cannot be
filled in later by someone who forgot.

### 7.4.1 Export format per entity

| Entity | Format | Shape | Re-verifiable without APEX? |
|---|---|---|---|
| Ledger events | `apex-delivery/1` (in code) | `{format, projectId, events[], root, howToCheck}` | **Yes** — recompute each row's hash over its body with `prevHash` from the row before |
| Receipts | `apex-psi/1` (in code) | full `SealedReceipt`: `contentHash`, `creatorPublicKey`, `algorithm`, `signature`, `manifest`, `sealedOn`, optional `anchor` | **Yes** — Ed25519 verify against the SPKI public key, offline in `psi.ts` |
| Passport | `apex-passport/1` (in code) | full `Passport`, private key absent by construction | **Yes** — `importPassport()` rejects unknown formats |
| Memory | `apex-memory/1` (in code) | `{format, count, entries[]}` | **Yes** — plain JSON, no server |
| Project structure | `apex-project/1` (**new**) | projects/scenes/shots/characters/assets as JSON, matching `Scene`/`Character` field names | Yes — text + hashes; media by `content_hash` + storage path |
| Tool registry | `apex-registry/1` (**new**) | every `TechRecord` incl. `replacementOptions`, `dataPortability`, `lastVerified` | Yes — and it is the map of what to run instead |
| Licence reads | `apex-licence-reads/1` (**new**) | CSV: tool, read_by, read_on, verdicts, `licence_text_hash` | Yes — the audit of who asserted what |
| Prices / jobs / attempts | `apex-economics/1` (**new**) | CSV, one row per attempt, `verified_from`/`verified_on` retained | Yes — what a minute of film actually cost |
| Bakeoffs | `apex-bakeoff/1` (**new**) | JSON + per-axis pass/fail with `prompt_set_hash` | Yes — a comparison is only portable if the prompt set travels with it |
| Media bytes | `manifest + signed-URL batch` | tar/zip + `SHA256SUMS` | Yes — checksums are the portable part; URLs are not |

Formats marked *in code* are already implemented (`deliveryPackage`, `exportPassport`,
`exportMemory`). The remaining five are named here so the repository layer writes them from
day one instead of retrofitting an exporter onto a schema that lost the data needed to build it
(which is exactly what happens to `verified_from`/`verified_on` if prices are UPDATEd in place).

### 7.4.2 What a creator takes with them if APEX disappears

Everything that is *theirs*, in forms their own tools open:

1. The **delivery package** — the whole chain, root hash, and the plain-language
   `howToCheck`. A buyer can still prove what they bought with our servers off.
2. The **receipts**, signed by their key. Verification stays free forever, by policy:
   `"receipts are public by design"` and the ledger read policy for `public`/`client`
   projects are deliberately not the paid lock.
3. The **passport**, with `public_key` only.
4. The **memory export** — including every `failed-attempt`. `memory.ts` states it:
   "the memory leaves with the creator. No server holds the only copy."
5. The **project structure** + `SHA256SUMS` over every byte, so the re-import into Blender /
   ComfyUI / a different pipeline is verifiable rather than "trust the download".
6. The **registry + licence reads** — arguably the most valuable portable asset, because it is
   the accumulated human work of having actually read 57 categories' licences with dates.
   `TechRecord.replacementOptions` is the "what runs instead" list; it must never be
   APEX-confidential.
7. The **economics** CSV — what each stage cost, per attempt, with the price's source and date.

What they do *not* take, and must not: other creators' data, other projects' ledgers, any
`created_by` mapping that identifies another person, and — absolutely — any private key.

### 7.4.3 The passport rule: a portable record must never carry a private key

`generateIdentity()` in `passport.ts` returns `{ publicKey, privateKeyPem }` together. That is
correct *on the device* and dangerous everywhere else. The code already guards the boundary:

```ts
if ("privateKey" in parsed || "privateKeyPem" in parsed)
  throw new Error("a passport must never carry a private key");
```

This check is on **import** only, and a substring `in` test on one parsed object. It does not
cover: an `exportPassport()` blob that nested the key under a different name, a key inside
`skills`/`contributions`/`licensingPreferences`, a key in a `details` jsonb on a ledger event,
or a key sitting in `apex_ledger_events.statement` because a human pasted their PEM into a
statement field. Enforcement must therefore be layered:

1. **Schema**: `apex_passports` has exactly one key column — `public_key`. There is no
   `private_key` column, and there must never be one (the draft comment already says so;
   keep it as a design constraint, not a comment).
2. **DB constraint over the jsonb**: a `CHECK` rejecting reserved key names inside the
   passport blobs, and a trigger rejecting the PEM armour markers
   (`-----BEGIN … PRIVATE KEY-----`, `PRIVATE KEY`) across `apex_ledger_events.statement`,
   `.details`, `.refs`, and `apex_passports.contributions`. Fail the write, loudly.
3. **Code**: `generateIdentity()` should be split so the private half never crosses a network
   or a function boundary that could be a server-fn response. Server functions return
   serialised data to the browser — a handler that returns `{publicKey, privateKeyPem}`
   ships the key. Nothing may return an object containing `privateKeyPem` from
   `createServerFn(...).handler`.
4. **Export**: the writer emits only `publicKey`; the private key is stored once, by the
   creator's device, in their own keystore, and APEX never holds a copy. If recovery is needed,
   it is the creator's own escrow, not ours.
5. **Test**: the portability suite asserts that every exporter's output does not match
   `/PRIVATE KEY/` — the same way `scripts/apex-check.mjs` asserts code invariants today.

Consequence to accept explicitly: **we cannot re-sign a lost passport.** If APEX held the key,
"the record is yours" would mean "we can impersonate you". No private key at rest is the price
of the claim, and it is the right price.

---

## 7.5 Supabase / Lovable dependency audit

There are two distinct dependencies here and they must not be conflated: **Supabase** (hosted
Postgres + GoTrue auth + PostgREST + RLS helpers) and **the Lovable connector/gateway layer**
(generated client files, `ai.gateway.lovable.dev`, Lovable-issued keys, the project ref).
Several are load-bearing in code, not config.

### 7.5.1 Every place the connector gateway is assumed

| # | Site | Assumption | Hardness |
|---|---|---|---|
| 1 | `src/integrations/supabase/client.ts` | `import.meta.env.VITE_SUPABASE_URL ‖ process.env.SUPABASE_URL` + `*_PUBLISHABLE_KEY`; throws on first Proxy property access | Runtime, lazy |
| 2 | `client.ts` | `storage: localStorage` when `typeof window` — browser session store | Breaks SSR-only hosts |
| 3 | `src/integrations/supabase/client.server.ts` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, "bypasses RLS" | **Currently fatal** — see 7.5.2 |
| 4 | `auth-middleware.ts` `requireSupabaseAuth` | server-side `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`, `Authorization: Bearer` only, `supabase.auth.getClaims(token)` | Requires a GoTrue-issued JWT |
| 5 | `auth-attacher.ts` `attachSupabaseAuth` | global `functionMiddleware` in `start.ts`; **client-side only** | Not a security boundary |
| 6 | All 29 policies | `auth.uid()`, `auth.users`, `public.has_role()`, `public.app_role` | PostgREST-provided `auth.*`; fails to compile on bare Postgres |
| 7 | `20260531032112…​.sql` | `ALTER PUBLICATION supabase_realtime` | Host-specific; error on any other DB |
| 8 | `src/lib/oracle.functions.ts` | hard-coded `https://ai.gateway.lovable.dev/v1/chat/completions`, model `google/gemini-2.5-flash`, `process.env.LOVABLE_API_KEY` | **Pure Lovable SaaS** |
| 9 | `gate.functions.ts` | `supabaseAdmin.auth.admin.listUsers/deleteUser` | GoTrue admin API; no Postgres equivalent |
| 10 | `routes/api/public/render.ts` | `supabaseAdmin.auth.admin.listUsers` to find an owner for a row, `OPERATOR_API_TOKEN` bearer check | GoTrue + our own token |
| 11 | `supabase/config.toml` | a single line: `project_id = "<live project ref>"`, no `[db]`/`[api]`/`[auth]` blocks | Ref is hard-coded; a `db push` runs against defaults |
| 12 | `.lovable/project.json` | `template: "tanstack_start_ts_2026-05-29"` | Lovable scaffolding marker |
| 13 | `src/routes/__root.tsx` | **2** references to a Lovable `r2.dev` / `.lovable.app` asset URL | External asset host; 404s off Lovable |
| 14 | `client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts` | Each headed "This file is automatically generated. Do not edit it directly." | Regeneration on Lovable overwrites edits |
| 15 | `src/integrations/supabase/types.ts` | Generated `Database` type from the live schema | Goes stale against the target schema |

### 7.5.2 What breaks today, before any portability work

`SUPABASE_SERVICE_ROLE_KEY` is **not in `.env`** (verified: the file's 8 names do not include
it) — yet `client.server.ts` throws when it is absent. So the observed dev warning *"Missing
Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY"* is not cosmetic; it means every
`supabaseAdmin` path is dead right now:
`ownerExists`, `resetOwner`, and the `render_jobs` insert/update in
`routes/api/public/render.ts`. The sovereign render endpoint and the PIN gate's owner check are
both non-functional. Same class of failure for `oracle.functions.ts`, which reads
`LOVABLE_API_KEY` — **also absent from `.env`** — so the prompt enhancer throws
`AI gateway key missing`.

Conversely, `render.functions.ts` (`startCloudRender`, `pollCloudRender`) is fully wired to
live code and depends on `requireSupabaseAuth` — the one path that breaks hardest when leaving
Lovable, since `getClaims()` needs a Supabase JWT.

And the sharp edge: **`resetOwner` has no server-side auth.** `start.ts` registers
`attachSupabaseAuth` globally, but that middleware is `.client()` — it merely attaches a bearer
token *if the browser has one* and does not reject anonymous calls; a direct HTTP POST to the
server-fn endpoint reaches the handler with nothing attached. `resetOwner` never calls
`requireSupabaseAuth`, and with `{confirm:"WIPE"}` (a literal the attacker can read in the
shipped client bundle at `PinGate.tsx:144`) it iterates `listUsers` and calls `deleteUser` on
every account using the RLS-bypassing service client. Because `projects.owner_id`,
`render_jobs.owner_id` are `REFERENCES auth.users(id) ON DELETE CASCADE`, one unauthenticated
POST deletes every identity and cascades away all film and job data. Note the contrast: the
hand-written route at `api/public/render.ts` *does* constant-time-check a bearer token, so the
pattern exists in the repo — it is simply missing here. **This is the single worst data risk in
the codebase** and must be closed before any migration deploy.

### 7.5.3 Replacement path (off Lovable)

Ordered, each reversible:

1. **Close the wipe hole first** (§7.7 step 1) — add `.middleware([requireSupabaseAuth])` plus
   an explicit `has_role(auth.uid(),'admin')` check to `resetOwner`, and make it a no-op unless
   the caller is the sole admin.
2. **Add the missing server secret** (`SUPABASE_SERVICE_ROLE_KEY`) to the *host's* secret store,
   not `.env` — this alone re-enables the three dead paths.
3. **Keep Postgres, drop the gateway.** Move to the Supabase CLI against our own project, or
   plain Postgres. Replace `ai.gateway.lovable.dev` in `oracle.functions.ts` with the provider
   abstraction `connectors.ts` already models (`TechConnector`/`apiBaseUrl`) and route by a
   registry row instead of a hard-coded URL + key.
4. **Fork the four "automatically generated" files** into `src/lib/db/` with the headers
   removed, so a Lovable regeneration can never silently revert the auth path.
5. **Auth portability**: the `auth.uid()`/`auth.users`/`app_role`/`has_role()` quartet is the
   real lock-in — 29 policies call it. Introduce a shim schema (`auth.users` view + `auth.uid()`
   over `request.jwt.claims`) so the policies compile unchanged under a different JWT issuer
   (better-auth / Auth.js), then swap the issuer behind a flag. Do **not** rewrite policies first.
6. **Storage**: replace the Lovable `r2.dev` asset URLs in `__root.tsx` with own-bucket URLs and
   a rewrite step in the deploy.
7. **Realtime**: the `supabase_realtime` publication and `REPLICA IDENTITY FULL` become a
   logical-replication slot on self-host, or delete the migration line and poll.
8. **Types**: regenerate `types.ts` from the target schema, and add a CI check that every
   `.from("…")` string exists in it — currently a typo in a table name is a runtime error.
9. **Deploy doors** for all of the above must stay separate (§7.7): a code deploy and a schema
   deploy and a secret write are three different approvals and must not be bundled.

---

## 7.6 Secrets posture

### 7.6.1 The live wound

`.env` is **tracked in git with no ignore rule**:
- `git ls-files --error-unmatch .env` → `.env` (tracked).
- `git check-ignore --no-index .env` → **no rule matches**. `.gitignore` (366 bytes) covers
  logs, `node_modules`, `dist`, `.output`, `.wrangler/`, `.dev.vars`, editor files — and has no
  `.env` line at all, not even `.env.local`.
- `git log --oneline --all -- .env` → **3 commits** have touched it.

So every value that has ever been written to this file is in git history on three commits.
Deleting the file from the working tree does not fix it; the history must be rewritten
(`git filter-repo`) **and** every value in it rotated, because a value that reached a remote is
spent regardless of later erasure. Rotation before purge is the wrong order: purge first, then
rotate, and the purge is itself only worth doing once the remote copies are gone. Treat all
present values as disclosed.

### 7.6.2 Variable names (names only — values were never read or transcribed)

Present in `.env` (8): `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`,
`VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`,
`REPLICATE_API_KEY`, `OPERATOR_API_TOKEN`.

Referenced in code but **absent** from `.env` (and therefore throwing at runtime):
`SUPABASE_SERVICE_ROLE_KEY` (`client.server.ts`, via `supabaseAdmin` in `gate.functions.ts` and
`routes/api/public/render.ts`), `LOVABLE_API_KEY` (`oracle.functions.ts`), `DATABASE_URL`,
`STRIPE_SECRET_KEY`, `X` (both only as comments in `config.server.ts` / `oracle.functions.ts`),
`NODE_ENV`, `VITE_FOO` (illustrative only).

Referenced in code, driver/local surface (no values anywhere yet): `APEX_BLENDER_BIN`,
`APEX_COMFY_URL`, `APEX_FFMPEG_BIN`, `APEX_LOCAL_LLM`, `APEX_OLLAMA_URL`,
`APEX_WHISPER_BIN`.

Also not a secret but hard-coded where a secret belongs in spirit: the live Supabase project ref
in `supabase/config.toml`, and the project ref inside the Lovable `r2.dev` asset URL in
`__root.tsx`.

### 7.6.3 Rules to adopt

1. **Ignore first, then untrack.** Add `.env`, `.env.*`, `!.env.example` to `.gitignore`;
   `git rm --cached .env`; ship `.env.example` listing **names and comments only**.
2. **Never print a value** — no tool, log, error message, screenshot or blueprint may echo one.
   `render.functions.ts` currently throws `"REPLICATE_API_KEY not set in .env"` (name only —
   correct; keep it that way). Any "missing variable" message must name, never show.
   Fingerprint a suspect value by hashing the full bare token, never with `grep`'s `\s` or a
   truncated capture — a regex that crosses the newline or clips the tail produces a hash that
   matches nothing.
3. **`VITE_` is a disclosure boundary, not a prefix convention.** `import.meta.env.VITE_*` is
   inlined into the client bundle at build time. `VITE_SUPABASE_PUBLISHABLE_KEY` is fine because
   it is the public/anon key. The rule is absolute: *nothing server-only may carry `VITE_`*, and
   `config.server.ts` already documents it — make it a CI check (grep for
   `VITE_(SERVICE|SECRET|TOKEN|KEY)` excluding the publishable pair) so it cannot be violated by
   habit. Note the duplicated trio (`SUPABASE_URL` + `VITE_SUPABASE_URL`) invites exactly that
   mistake; keep both only because `client.ts` reads one and SSR reads the other.
4. **Two trust tiers.** Browser-safe: publishable key, project ref, `VITE_*`. Server-only:
   service-role key, `REPLICATE_API_KEY`, `OPERATOR_API_TOKEN`, `LOVABLE_API_KEY`, any Stripe
   key, any driver token. A tier violation is a build failure, not a review comment.
5. **`OPERATOR_API_TOKEN` is a static shared bearer with no rotation story** and the render
   route compares `token.length` before comparing bytes — acceptable, but a long-lived static
   token that gates paid provider spend is the one that must become short-lived and scoped.
6. **Service-role key stays optional-by-design where possible.** `supabaseAdmin` bypasses all
   RLS, so every use is a hole-shaped-by-default. `ownerExists` needs only a count; replace it
   with an RPC or a public read. That reduces how often the key must exist at all.

### 7.6.4 Rotation plan

| Step | Action | Door | Blast radius |
|---|---|---|---|
| R1 | Publish `.env.example` (names only) + `.gitignore` entry; `git rm --cached .env` | Local git commit | None — history still holds the values |
| R2 | Move all real values into the host secret store; delete them from the working file | Hosted secrets console (Master's approval) | Dev-only until R3 |
| R3 | Rotate in dependency order: Supabase publishable → **service-role** → `REPLICATE_API_KEY` → `OPERATOR_API_TOKEN` → `LOVABLE_API_KEY` | Provider consoles | Replicate rotation breaks in-flight renders; `OPERATOR_API_TOKEN` breaks external callers — announce first |
| R4 | Rewrite history (`git filter-repo`), force a fresh clone, confirm the old commits are unreachable on every remote | Local git + remote admin | Any fork/stale checkout keeps the leaked values — hence R3 before R4 in effect |
| R5 | Add the CI guard (`VITE_`-prefix rule + no tracked `.env` + every `.from()` exists in `types.ts`) | CI | None |
| R6 | Schedule rotation: service-role 90 days, `OPERATOR_API_TOKEN` 30 days, provider keys 180 days | Ops | — |

Order matters: R1/R2 stop new disclosure, R3 removes the value of what was disclosed, R4 is
cleanup that only has meaning after R3.

---

## 7.7 Migrations & rollout order

New migration files, in this order. Deploy doors are named per step and must be applied one at
a time.

| # | Step | Artifact | **Deploy door** | Gate to pass |
|---|---|---|---|---|
| 0 | **Seal the unauthenticated wipe.** Add `requireSupabaseAuth` + admin check to `resetOwner`; leave `ownerExists` as a count-only read | diff in `src/lib/gate.functions.ts` | **Code deploy** (`vite build` → publish) | A direct POST without a bearer header must fail before this is merged |
| 1 | Fix the apex migration: create `apex_projects` **first**, add explicit grants, reconcile `sealed_at`/`sealedOn`, resolve nullable `created_by`, add the `on delete restrict` FK | **replace** `20261101190000_apex_ledger_passport.sql` (still untracked, so rewrite, don't stack) | **Local review** — no deploy yet | `psql --single-transaction` on a scratch DB must apply it cleanly |
| 2 | Commit the fixed migration | git | **Local git commit** | File must be tracked before it is deployed; an untracked migration is an unreviewed schema |
| 3 | Apply the 4 apex tables | migration from step 1 | **`supabase db push`** / Lovable Cloud → *Apply migrations* | Read back: 4 tables, 12+ policies, grants present |
| 4 | Core film structure | `2026…_apex_film_core.sql`: `apex_scenes`, `apex_shots`, `apex_assets`, `apex_characters`, `apex_project_members` | **`supabase db push`** | No public-read policy on any of them; `apex_assets.content_hash NOT NULL` |
| 5 | Execution | `…_apex_execution.sql`: `apex_jobs`, `apex_job_attempts`, `apex_tools`, `apex_licence_reads` with the `license_verified ⇒ last_verified NOT NULL` CHECK | **`supabase db push`** | Attempts table insert-then-verify: an UPDATE against it must be refused |
| 6 | Repository layer | `src/lib/apex/db.ts` adapters writing `apex_*`, plus `exportMemory`/`deliveryPackage`/`exportPassport` exporters | **Code deploy** | `node scripts/apex-check.mjs` green; a round-trip export re-verifies with `verifyChain()` |
| 7 | Memory + economics | `…_apex_memory_economics.sql`: `apex_memory_entries`, `apex_price_entries`, `apex_bakeoffs`, `apex_bakeoff_results` | **`supabase db push`** | Price/registry rows reject UPDATE; `prompt_set_hash NOT NULL` enforced |
| 8 | Passport immutability + contributions | `…_apex_passport_split.sql`: move `contributions` to `apex_contributions`, narrow `apex_passports` policy from `FOR ALL` to UPDATE(profile)+INSERT, add the private-key `CHECK`/trigger | **`supabase db push`**, then **code deploy** | `importPassport` and the DB trigger must both independently reject a PEM |
| 9 | Portability evidence | `…_apex_exports.sql` (`apex_exports`) | **`supabase db push`** | Every export writes a `root_hash` |
| 10 | Entitlements | `…_apex_plans_entitlements.sql` + Stripe server envs | **`supabase db push`**, then **secrets write** (host console) | Only exists once a payment rail is real; until then, schema slot with no writes |
| 11 | Legacy read-only freeze | drop `GRANT SELECT … TO anon` on `projects`, add `WITH CHECK` to `render_jobs` UPDATE, revoke orphaned DELETE grants, supersession for `gpu_endpoints` | **`supabase db push`** (destructive-adjacent — staged, backup first) | Verify no live route 500s; `PinGate`/`nominate`/`theater` still work |
| 12 | Secrets remediation | §7.6.4 R1→R6 | **git + provider consoles + CI** | Independent of schema; run in parallel from step 0 |
| 13 | Off-Lovable auth port | shim `auth.uid()`/`auth.users`, forked `src/lib/db/` clients, provider-routed gateway | **Feature flag** before deploy; dual-run against both issuers | The 29-policy `auth.*` dependency is the last thing to break — do it last, never first |

Rollout invariants:
- **Never bundle doors.** A schema deploy, a code deploy and a secret write are three approvals.
  Steps that need both (8, 10) go schema-first only when the schema is additive — every table
  here is additive until step 11, which is the first subtractive one and gets its own backup.
- Step 11 is the only migration that can break a live page. Everything before it can be
  applied while the 7-table app keeps running untouched.
- Each step is a **binary** gate: applies cleanly / does not; policy refuses the write / does
  not; export re-verifies / does not. No partial-credit states.
- `config.toml` carries only a `project_id` and no `[db]/[api]/[auth]` blocks, so confirm which
  project each `db push` targets **before** running it — a defaults-targeted push against the
  wrong ref is how an unreviewed schema lands somewhere unexpected.

---

## 7.8 Counts (verified, not estimated)

| Measure | Value | How verified |
|---|---|---|
| Tables in the live schema | **7** | `grep -oE 'create table …'` over the two Lovable migrations |
| Tables in the undeployed apex migration | **4** | same, over `20261101190000_apex_ledger_passport.sql` |
| Tables declared across all migration files | **11** | union of the above, deduped, `wc -l` |
| Policies: legacy / apex | **17 / 12** (29 total) | `grep -ci 'create policy'` per file |
| GRANTs: legacy / apex | **16 / 0** | `grep -c` per file |
| Target tables | **21** (4 drafted + 17 new) | count of `apex_*` table definitions in §7.2 |
| Tables actually queried by app code | **7** | `grep -ohE '\.from("…")' src \| sort -u` |
| Code touching any `apex_*` table | **0** | `grep -rn` over `src` and `scripts` |
| `.from()` table names not in the schema | 0 | all 7 resolve |
| `.rpc()` calls | 0 | grep |
| `.validator` vs `.inputValidator` | **6 / 0** | grep — the repo is consistently on `.validator`; no `.inputValidator` to fix |
| Files importing the supabase integration | 17 | `grep -rl` |
| Lovable `r2.dev` asset URLs in source | **2** (`__root.tsx`) | `grep -c` |
| `.env` names present / code-referenced | **8 / 19** | key-name extraction only, never values |
