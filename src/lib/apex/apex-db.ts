/**
 * Access to the apex_* tables.
 *
 * These tables come from the platform's own migration and are not in the generated
 * Database type, so they are reached through one narrow accessor rather than by widening
 * the whole client. What this does not change: RLS still decides what can be written.
 * The caller's own session is the authority, whichever door the row arrives through.
 */

export type ApexTable = "apex_projects" | "apex_ledger_events" | "apex_receipts";
export type ApexRow = Record<string, unknown>;

export interface ApexResult {
  data: ApexRow[] | null;
  error: { message: string } | null;
}

export interface ApexBuilder {
  select: (columns: string) => ApexBuilder;
  eq: (column: string, value: unknown) => ApexBuilder;
  order: (column: string, options: { ascending: boolean }) => PromiseLike<ApexResult>;
  insert: (row: ApexRow) => PromiseLike<ApexResult>;
  upsert: (row: ApexRow, options: { onConflict: string }) => PromiseLike<ApexResult>;
}

export function apexFrom(client: unknown, table: ApexTable): ApexBuilder {
  return (client as { from: (t: ApexTable) => ApexBuilder }).from(table);
}
