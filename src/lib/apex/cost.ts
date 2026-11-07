/**
 * Production Cost Intelligence — what a finished minute of film actually costs,
 * before anyone spends money.
 *
 * Honest-by-construction rule: no provider price is hard-coded as fact. Any figure
 * this file does not know comes from `priceList` that the operator supplies, and every
 * estimate carries the assumption it was computed under.
 */

export type CostSource = "local" | "byo-api" | "platform-credit";

export interface PriceEntry {
  provider: string;
  /** What one billable unit is — "second of 720p video", "1000 tokens", "one render". */
  unit: string;
  usdPerUnit: number;
  /** Where the number came from, and when. Never a bare figure. */
  verifiedFrom: string;
  verifiedOn: string | null;
}

export interface StageCost {
  stage: string;
  source: CostSource;
  tool: string;
  units: number;
  usd: number;
  minutesOfMachineTime: number;
  note: string;
}

export interface BudgetVerdict {
  totalUsd: number;
  bySource: Record<CostSource, number>;
  byStage: StageCost[];
  unknownPrices: string[];
  /** Binary gate — Master decides by pass/fail, not by a score. */
  withinBudget: boolean;
  overBy: number;
  advice: string;
}

/** Local runs cost no per-job fee, but they do cost wall-clock time and electricity. */
const LOCAL_RUN = { usdPerUnit: 0, unit: "job (your hardware)" };

export function estimateLocal(stage: string, tool: string, minutes: number, note = ""): StageCost {
  return {
    stage,
    source: "local",
    tool,
    units: 1,
    usd: LOCAL_RUN.usdPerUnit,
    minutesOfMachineTime: minutes,
    note,
  };
}

export function estimatePaid(
  stage: string,
  tool: string,
  price: PriceEntry | undefined,
  units: number,
  minutesOfMachineTime = 0,
): StageCost {
  if (!price) {
    return {
      stage,
      source: "byo-api",
      tool,
      units,
      usd: Number.NaN,
      minutesOfMachineTime,
      note: `no verified price for ${tool} — fill in priceList before quoting a client`,
    };
  }
  return {
    stage,
    source: "byo-api",
    tool,
    units,
    usd: round2(price.usdPerUnit * units),
    minutesOfMachineTime,
    note: `${units} × ${price.unit} @ $${price.usdPerUnit} (${price.verifiedFrom})`,
  };
}

export function totalCost(rows: StageCost[]): number {
  return round2(rows.reduce((s, r) => s + (Number.isFinite(r.usd) ? r.usd : 0), 0));
}

export function judgeBudget(rows: StageCost[], budgetUsd: number): BudgetVerdict {
  const bySource: Record<CostSource, number> = { local: 0, "byo-api": 0, "platform-credit": 0 };
  const unknownPrices: string[] = [];
  for (const r of rows) {
    if (Number.isNaN(r.usd)) unknownPrices.push(`${r.stage}/${r.tool}`);
    else bySource[r.source] = round2(bySource[r.source] + r.usd);
  }
  const totalUsd = totalCost(rows);
  const withinBudget = unknownPrices.length === 0 && totalUsd <= budgetUsd;
  return {
    totalUsd,
    bySource,
    byStage: rows,
    unknownPrices,
    withinBudget,
    overBy: round2(Math.max(0, totalUsd - budgetUsd)),
    advice: !withinBudget
      ? unknownPrices.length > 0
        ? `${unknownPrices.length} tools have no verified price — the quote is incomplete, not expensive`
        : `over by $${round2(totalUsd - budgetUsd)} — swap paid stages for local ones or cut units`
      : "under budget with every price verified — quoteable",
  };
}

/** The only substitution that reduces cash spend: replace a paid stage with a local tool. */
export function localize(rows: StageCost[], stage: string, tool: string, minutes: number): StageCost[] {
  return rows.map((r) => (r.stage === stage ? estimateLocal(stage, tool, minutes, "substituted for cash") : r));
}

export function perFinishedMinute(rows: StageCost[], minutesOfFilm: number): number {
  if (minutesOfFilm <= 0) return Number.NaN;
  return round2(totalCost(rows) / minutesOfFilm);
}

export function priceTable(entries: PriceEntry[]): Map<string, PriceEntry> {
  return new Map(entries.map((e) => [e.provider, e]));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
