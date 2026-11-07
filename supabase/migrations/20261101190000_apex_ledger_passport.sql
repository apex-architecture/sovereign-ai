-- APEX Project Ledger + Portable Passport.
--
-- Design rule carried from the code (src/lib/apex/ledger.ts): the database stores events
-- and their hashes, it does not compute truth. `epistemic` travels with every row so a
-- claim can never be queried as though it were a verified fact, and a chain can be
-- rebuilt and re-verified from these rows alone — including after an export, with no
-- dependence on this server staying up.

create table if not exists public.apex_ledger_events (
  seq bigint not null,
  project_id text not null,
  kind text not null check (kind in (
    'asset-intake','generation-run','human-review','approval',
    'contributor-agreement','licence-declaration','version-cut',
    'delivery-package','publication','retraction'
  )),
  at timestamptz not null default now(),
  actor_kind text not null check (actor_kind in ('human','agent','system')),
  actor_id text not null,
  statement text not null,
  refs jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  epistemic text not null default 'claim' check (epistemic in ('claim','signature-verified','independently-checked')),
  prev_hash text not null,
  hash text not null,
  created_by uuid references auth.users (id) on delete set null,
  primary key (project_id, seq)
);

create unique index if not exists apex_ledger_hash_unique on public.apex_ledger_events (hash);
create index if not exists apex_ledger_project_time on public.apex_ledger_events (project_id, at desc);
create index if not exists apex_ledger_open_claims on public.apex_ledger_events (project_id) where epistemic = 'claim';

alter table public.apex_ledger_events enable row level security;

-- A delivery recipient must be able to read the evidence without holding an account:
-- verification is free forever and is never the paid lock.
create policy "ledger events are readable by their owner"
  on public.apex_ledger_events for select
  using (auth.uid() = created_by or exists (
    select 1 from public.apex_projects p
    where p.id = apex_ledger_events.project_id and p.visibility in ('public','client')
  ));

create policy "owner appends to their own ledger"
  on public.apex_ledger_events for insert
  with check (auth.uid() = created_by and seq >= 0);

-- History is evidence. Once written by its owner it cannot be edited or removed here —
-- a retraction is a new event, not an UPDATE.
create policy "ledger events cannot be updated" on public.apex_ledger_events for update using (false);
create policy "ledger events cannot be deleted" on public.apex_ledger_events for delete using (false);

-- Public verification surface: the whole receipt, readable by anyone, by design.
create table if not exists public.apex_receipts (
  receipt_hash text primary key,
  project_id text not null,
  content_hash text not null,
  creator_public_key text not null,
  algorithm text not null default 'ed25519',
  signature text not null,
  manifest jsonb not null,
  sealed_at timestamptz not null,
  anchor jsonb,
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists apex_receipts_content on public.apex_receipts (content_hash);

alter table public.apex_receipts enable row level security;

create policy "receipts are public by design" on public.apex_receipts for select using (true);
create policy "owner writes their receipts" on public.apex_receipts for insert with check (auth.uid() = created_by);
create policy "receipts are immutable" on public.apex_receipts for update using (false);
create policy "receipts are undeletable" on public.apex_receipts for delete using (false);

-- Passport: the record the creator owns and exports. The private key is never a column.
create table if not exists public.apex_passports (
  handle text primary key,
  user_id uuid unique references auth.users (id) on delete cascade,
  public_key text not null,
  display_name text not null default '',
  bio text not null default '',
  location text not null default '',
  site text not null default '',
  skills jsonb not null default '[]'::jsonb,
  contributions jsonb not null default '[]'::jsonb,
  licensing_preferences jsonb not null default '{"permits":[],"requires":[],"refuses":[]}'::jsonb,
  created_at timestamptz not null default now(),
  -- A passport that is only a server row is a lease, not a document. Export is mandatory.
  export_format text not null default 'apex-passport/1'
);

alter table public.apex_passports enable row level security;

create policy "passports are readable" on public.apex_passports for select using (true);
create policy "owner manages their passport" on public.apex_passports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.apex_projects (
  id text primary key,
  owner_id uuid references auth.users (id) on delete set null,
  title text not null,
  visibility text not null default 'private' check (visibility in ('private','client','public')),
  created_at timestamptz not null default now()
);

alter table public.apex_projects enable row level security;

create policy "projects readable when published" on public.apex_projects for select
  using (auth.uid() = owner_id or visibility in ('public','client'));
create policy "owner manages their projects" on public.apex_projects for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
