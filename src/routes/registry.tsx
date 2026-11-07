import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MASTER_REGISTRY } from "@/lib/apex/index";
import { CATEGORIES } from "@/lib/apex/schema";
import type { Category, TechRecord } from "@/lib/apex/schema";
import { CONNECTIONS } from "@/lib/apex/connection";
import { Corners, Pip, Stat, Tag, type Tone } from "@/components/hud";

const DEPTH_BY_NAME = new Map(CONNECTIONS.map((c) => [c.name.toLowerCase(), c.depth]));
const DEPTH_TAG: Record<string, { tone: Tone; label: string }> = {
  drivable: { tone: "ok", label: "Drivable" },
  "file-exchange": { tone: "signal", label: "Hand-off" },
  "portal-only": { tone: "warn", label: "Portal only" },
  "not-yet": { tone: "bad", label: "Catalogue only" },
};

export const Route = createFileRoute("/registry")({
  head: () => ({
    meta: [
      { title: "Registry — Global Technology Map · Sovereign AI Film Verse" },
      { name: "description", content: "Every tool the studio knows, its licence state, and the written exit if it disappears." },
    ],
  }),
  component: Registry,
});

const NO_EXIT = "no-exit-researched";

function Registry() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [onlyNoExit, setOnlyNoExit] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MASTER_REGISTRY.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (onlyNoExit && r.replacementOptions.length > 0 && !r.replacementOptions.includes(NO_EXIT)) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.capability.toLowerCase().includes(needle) ||
        r.license.toLowerCase().includes(needle)
      );
    });
  }, [q, cat, onlyNoExit]);

  const stats = useMemo(() => {
    const cleared = MASTER_REGISTRY.filter((r) => r.licenseVerified && r.commercialUse === "yes").length;
    const awaitingRead = MASTER_REGISTRY.filter((r) => !r.licenseVerified).length;
    const missingExit = MASTER_REGISTRY.filter(
      (r) => r.replacementOptions.length === 0 || r.replacementOptions.includes(NO_EXIT),
    ).length;
    return {
      total: MASTER_REGISTRY.length,
      cleared,
      awaitingRead,
      missingExit,
      categories: new Set(MASTER_REGISTRY.map((r) => r.category)).size,
      atZero: MASTER_REGISTRY.filter((r) => r.cost === "$0").length,
      local: MASTER_REGISTRY.filter((r) => r.localExecution).length,
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-4 md:px-4 md:py-5">
      <header className="panel relative mb-3 overflow-hidden bg-grid p-5 md:p-7">
        <Corners />
        <p className="hud flex items-center gap-2 text-warn"><Pip tone="warn" pulse /> Studio / trust + portability</p>
        <h1 className="mt-3 text-4xl leading-[0.9] md:text-6xl">Master <span className="text-warn">Registry</span></h1>
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
          A catalogue is only worth what it refuses to promise. Every row below was written by an agent
          against a fixed contract, so no licence is marked as read and nothing is cleared for client work.
          Those two columns are the work queue, not a defect list.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 mb-3">
        <Stat label="rows on disk" value={stats.total} />
        <Stat label="categories covered" value={`${stats.categories}/${CATEGORIES.length}`} />
        <Stat label="cleared for client work" value={stats.cleared} tone={stats.cleared === 0 ? "bad" : "ok"} />
        <Stat label="awaiting a human licence read" value={stats.awaitingRead} tone="warn" />
        <Stat label="run at $0" value={stats.atZero} />
        <Stat label="run on your machine" value={stats.local} />
        <Stat label="no written exit" value={stats.missingExit} tone={stats.missingExit === 0 ? "ok" : "bad"} />
        <Stat label="export format" value="open JSON" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search name, capability, licence"
          className="border border-border bg-screen px-3 py-2 text-sm w-full md:w-80 focus:border-signal focus:outline-none"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as Category | "all")}
          className="border border-border bg-screen px-3 py-2 text-sm"
        >
          <option value="all">all categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="text-sm flex items-center gap-2 px-2">
          <input type="checkbox" checked={onlyNoExit} onChange={(e) => setOnlyNoExit(e.target.checked)} />
          only rows with no exit
        </label>
        <Link to="/connect" className="brutal-border ml-auto px-3 py-2 text-sm hover:bg-primary hover:text-primary-foreground">
          WHAT WE CAN DRIVE
        </Link>
      </div>

      <p className="text-xs opacity-70 mb-2">
        showing {rows.length} of {stats.total}
      </p>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="hud text-left">
            <tr>
              <th className="py-2 px-3">tool</th>
              <th className="py-2 pr-4">studio can</th>
              <th className="py-2 pr-4">category</th>
              <th className="py-2 pr-4">licence</th>
              <th className="py-2 pr-4">cost</th>
              <th className="py-2 pr-4">exit if it dies</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((r) => (
              <Row key={`${r.category}-${r.name}`} r={r} />
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 300 && (
        <p className="mt-3 text-xs opacity-70">first 300 shown — narrow with the search or category filter</p>
      )}
    </div>
  );
}

function Row({ r }: { r: TechRecord }) {
  const exit = r.replacementOptions.length === 0 || r.replacementOptions.includes(NO_EXIT);
  return (
    <tr className="border-t border-hairline align-top hover:bg-rack">
      <td className="py-2 px-3">
        <div className="font-semibold">{r.name}</div>
        <div className="text-xs opacity-70">{r.capability}</div>
      </td>
      <td className="py-2 pr-4">
        {(() => { const d = DEPTH_TAG[DEPTH_BY_NAME.get(r.name.toLowerCase()) ?? "not-yet"]; return <Tag tone={d.tone}>{d.label}</Tag>; })()}
      </td>
      <td className="py-2 pr-4 text-xs">{r.category}</td>
      <td className="py-2 pr-4 text-xs">
        <span className={r.licenseVerified ? "opacity-90" : "opacity-60"}>{r.license}</span>
        <div className="opacity-60">{r.licenseVerified ? `read ${r.lastVerified}` : "unread"}</div>
      </td>
      <td className="py-2 pr-4 text-xs">
        {r.cost}
        <div className="opacity-60">{r.localExecution ? "local" : "remote"}</div>
      </td>
      <td className="py-2 pr-4 text-xs">
        <span className={exit ? "text-primary" : "opacity-80"}>
          {exit ? "NONE — flagged for human research" : r.replacementOptions.filter((x) => x !== NO_EXIT).join(" / ")}
        </span>
      </td>
    </tr>
  );
}
