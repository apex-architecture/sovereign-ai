import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MASTER_REGISTRY } from "@/lib/apex/index";
import { estimateLocal, estimatePaid, judgeBudget, priceTable, perFinishedMinute } from "@/lib/apex/cost";
import type { PriceEntry, StageCost } from "@/lib/apex/cost";

export const Route = createFileRoute("/cost")({
  head: () => ({
    meta: [
      { title: "Cost — What a Finished Minute Actually Costs" },
      { name: "description", content: "Local stages are free; paid stages need a verified price before anyone is quoted." },
    ],
  }),
  component: Cost,
});

/**
 * Prices are typed in by the operator, never invented by the platform.
 * An empty table is a real and correct starting state.
 */
const STARTER_PRICES: PriceEntry[] = [];

const FILM_STAGES = [
  { stage: "storyboard", tool: "comfyui", localMinutes: 2, paid: false },
  { stage: "character_lock", tool: "comfyui", localMinutes: 1, paid: false },
  { stage: "motion", tool: "replicate", localMinutes: 0, paid: true },
  { stage: "dialogue", tool: "fish_speech", localMinutes: 0, paid: true },
  { stage: "music", tool: "musicgen", localMinutes: 3, paid: false },
  { stage: "sound", tool: "ffmpeg", localMinutes: 1, paid: false },
  { stage: "subtitles", tool: "whisper", localMinutes: 1, paid: false },
  { stage: "edit", tool: "ffmpeg", localMinutes: 1, paid: false },
  { stage: "finish", tool: "ffmpeg", localMinutes: 2, paid: false },
];

function Cost() {
  const [scenes, setScenes] = useState(33);
  const [minutes, setMinutes] = useState(4);
  const [budget, setBudget] = useState(25);
  const [prices, setPrices] = useState<PriceEntry[]>(STARTER_PRICES);
  const [np, setNp] = useState({ provider: "", unit: "", usd: "" });

  const table = useMemo(() => priceTable(prices), [prices]);

  const rows = useMemo<StageCost[]>(() => {
    const out: StageCost[] = [];
    for (const s of FILM_STAGES) {
      if (s.paid) out.push(estimatePaid(s.stage, s.tool, table.get(s.tool), scenes));
      else out.push(estimateLocal(s.stage, s.tool, s.localMinutes * scenes));
    }
    return out;
  }, [table, scenes]);

  const verdict = useMemo(() => judgeBudget(rows, budget), [rows, budget]);
  const machineHours = useMemo(() => Math.round(rows.reduce((s, r) => s + r.minutesOfMachineTime, 0) / 60), [rows]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs tracking-widest opacity-70">STUDIO / INTELLIGENCE</p>
        <h1 className="font-black tracking-tighter text-3xl">PRODUCTION COST</h1>
        <p className="mt-2 max-w-3xl text-sm opacity-80">
          Nine stages run on your own hardware for zero cash and cost only wall-clock time. The two paid
          stages are refused a quote until you paste the provider's real price — this page will print
          "incomplete" rather than invent a number to make itself look decided.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 mb-6">
        <Field label="scenes" value={scenes} onChange={setScenes} />
        <Field label="finished minutes" value={minutes} onChange={setMinutes} />
        <Field label="cash budget (usd)" value={budget} onChange={setBudget} />
        <div className="brutal-border px-3 py-2">
          <div className={`font-black text-xl ${verdict.withinBudget ? "text-emerald-500" : "text-red-500"}`}>
            {verdict.withinBudget ? "QUOTABLE" : "NOT QUOTABLE"}
          </div>
          <div className="text-xs uppercase tracking-wide opacity-70">{verdict.advice}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 mb-8">
        <Fact label="cash total" value={`$${verdict.totalUsd}`} />
        <Fact label="paid-stage cash" value={`$${verdict.bySource["byo-api"]}`} />
        <Fact label="machine hours" value={machineHours} />
        <Fact label="usd per finished minute" value={perFinishedMinute(rows, minutes)} />
      </div>

      <h2 className="font-black tracking-tight text-xl mb-2">STAGE BY STAGE</h2>
      <div className="mb-8 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left uppercase tracking-wide text-xs opacity-70">
          <tr>
            <th className="py-2 pr-4">stage</th>
            <th className="py-2 pr-4">tool</th>
            <th className="py-2 pr-4">where</th>
            <th className="py-2 pr-4">cash</th>
            <th className="py-2 pr-4">note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.stage} className="border-t align-top">
              <td className="py-2 pr-4 uppercase text-xs">{r.stage}</td>
              <td className="py-2 pr-4">{r.tool}</td>
              <td className="py-2 pr-4 text-xs">{r.source === "local" ? "your machine" : "your account"}</td>
              <td className="py-2 pr-4 text-xs">
                {Number.isNaN(r.usd) ? <span className="text-red-500">no verified price</span> : `$${r.usd}`}
              </td>
              <td className="py-2 pr-4 text-xs opacity-70">{r.note || `${r.minutesOfMachineTime} min of your hardware`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2 className="font-black tracking-tight text-xl mb-2">PRICES YOU HAVE VERIFIED</h2>
      {prices.length === 0 && (
        <p className="text-sm opacity-80 mb-3">
          None yet. Until you enter a real figure from a provider's own price page, the paid stages stay
          unquotable — that is the point of the gate.
        </p>
      )}
      <ul className="text-sm mb-3">
        {prices.map((p) => (
          <li key={p.provider} className="border-t py-1">
            {p.provider}: ${p.usdPerUnit} per {p.unit} <span className="opacity-60">({p.verifiedFrom})</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 items-end mb-8">
        <input className="brutal-border bg-transparent px-2 py-1 text-sm w-40" placeholder="tool (e.g. replicate)" value={np.provider} onChange={(e) => setNp({ ...np, provider: e.target.value })} />
        <input className="brutal-border bg-transparent px-2 py-1 text-sm w-48" placeholder="unit (e.g. 8s clip at 720p)" value={np.unit} onChange={(e) => setNp({ ...np, unit: e.target.value })} />
        <input className="brutal-border bg-transparent px-2 py-1 text-sm w-24" placeholder="usd" value={np.usd} onChange={(e) => setNp({ ...np, usd: e.target.value })} />
        <button
          className="brutal-border px-3 py-2 text-sm hover:bg-primary hover:text-primary-foreground"
          onClick={() => {
            const usd = Number(np.usd);
            if (!np.provider || !np.unit || !Number.isFinite(usd) || usd <= 0) return;
            setPrices([...prices, { provider: np.provider, unit: np.unit, usdPerUnit: usd, verifiedFrom: "typed in by the operator", verifiedOn: new Date().toISOString().slice(0, 10) }]);
            setNp({ provider: "", unit: "", usd: "" });
          }}
        >
          ADD PRICE
        </button>
      </div>

      <div className="brutal-border px-4 py-3 text-sm mb-8">
        <div className="font-black uppercase tracking-wide text-xs opacity-70 mb-1">the rule this page enforces</div>
        Never charge to prove a record. Sealing, verification and export are priced at $0 in the protocol
        itself; the money is in running the workflow, not in the receipt.
      </div>

      <div className="flex gap-2">
        <Link to="/registry" className="brutal-border px-3 py-2 text-sm hover:bg-primary hover:text-primary-foreground">MASTER REGISTRY</Link>
        <Link to="/connect" className="brutal-border px-3 py-2 text-sm hover:bg-primary hover:text-primary-foreground">WHAT WE CAN DRIVE</Link>
      </div>

      <p className="mt-6 text-xs opacity-60">
        registry rows behind these tools: {MASTER_REGISTRY.length} · rows at $0: {MASTER_REGISTRY.filter((r) => r.cost === "$0").length} · rows needing a price before quoting: {verdict.unknownPrices.length}
      </p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="brutal-border px-3 py-2 block">
      <input
        type="number"
        value={value}
        min={1}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-full bg-transparent font-black text-xl outline-none"
      />
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
    </label>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="brutal-border px-3 py-2">
      <div className="font-black text-xl">{value}</div>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}
