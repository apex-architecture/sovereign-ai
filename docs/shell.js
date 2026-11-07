/**
 * Sovereign AI Film Verse — the shell every page shares.
 *
 * A page declares itself with <body data-page="tools" data-crumb="Open Source Power"> and
 * includes this file after data.generated.js. The sidebar, topbar and the measured facts
 * come from here, so no page can quietly invent a number or drift the navigation.
 *
 * Every entry in NAV points at a page that exists. Where the house has not built the surface
 * yet, the entry is marked off and is not a link — a navigation that lies about where it goes
 * is worse than a navigation that admits a gap.
 */
(function () {
  const D = window.APEX_VERSE || { stats: {}, depths: {}, coverage: {}, connections: [], stages: [], modules: [], rows: [] };
  const S = D.stats || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");

  const NAV = [
    { group: "Studio", items: [
      { id: "home", href: "studio.html", label: "Studio Home", ico: "⌂" },
      { id: "projects", href: "studio.html#projects", label: "Projects", ico: "▣" },
      { id: "engines", href: "engines.html", label: "AI Tools", ico: "⌁" },
      { id: "media", href: "dailies.html", label: "Media Library", ico: "▤" },
      { id: "rights", href: "rights.html", label: "Rights & Licensing", ico: "§" },
      { id: "market", href: "tools.html", label: "Marketplace", ico: "◈" },
      { id: "collab", off: true, label: "Collaboration", ico: "⇄" },
      { id: "verify", href: "verify.html", label: "Verification", ico: "✓" },
      { id: "foreman", href: "studio.html#foreman", label: "The Foreman", ico: "◔" },
      { id: "academy", off: true, label: "Academy", ico: "✎" },
      { id: "community", off: true, label: "Community", ico: "☷" },
      { id: "settings", off: true, label: "Settings", ico: "⚒" },
    ]},
    { group: "Craft", items: [
      { id: "mission", href: "mission.html", label: "Start a Mission", ico: "✦" },
      { id: "verse", href: "verse.html", label: "The Verse Map", ico: "◈" },
      { id: "cinema", href: "cinema.html", label: "Cinema", ico: "◐" },
    ]},
    { group: "Trust", items: [
      { id: "passport", href: "passport.html", label: "Creator Passport", ico: "◉" },
    ]},
    { group: "Operator", items: [
      { id: "console", href: "console.html", label: "Operator Console", ico: "▮" },
    ]},
  ];

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function sidebar(active) {
    let h = '<div class="brand"><div class="mark">SOVEREIGN</div><div class="sub">AI Film Verse</div></div><div class="side-scroll">';
    for (const g of NAV) {
      h += `<div class="nav-label">${g.group}</div><nav class="nav">`;
      for (const i of g.items) {
        if (i.off) {
          h += `<span class="off" title="Not built yet — this house does not link to a page it has not made"><span class="ico">${i.ico}</span><span>${i.label}</span></span>`;
          continue;
        }
        const cur = i.id === active ? ' aria-current="page"' : "";
        h += `<a href="${i.href}"${cur}><span class="ico">${i.ico}</span><span>${i.label}</span></a>`;
      }
      h += "</nav>";
    }
    h += "</div>";
    h += sideFoot();
    return el(`<aside class="sidebar">${h}</aside>`);
  }

  /**
   * The foot of the rail: who is holding the machine, and what the last run cost.
   *
   * There is no credit balance in this house and no house account. Paid bodies run on the
   * creator's own key, so the honest figure is the spend the last run actually made.
   */
  function sideFoot() {
    const ST = window.APEX_STUDIO || {};
    const spent = ST.run && typeof ST.run.spentUsd === "number" ? ST.run.spentUsd : null;
    const ran = ST.run ? ST.run.stamp : null;
    const state = ST.run ? (ST.run.succeeded || []).length : null;
    const total = ST.run ? (ST.run.routed || []).length : null;
    const meter = spent === null || !total ? 0 : Math.min(100, Math.round((spent / Math.max(1, total * 2)) * 100));
    return `<div class="side-foot">
      <div class="side-user">
        <span class="avatar">KS</span>
        <span class="side-user-txt">
          <b>Kawaljeet Singh</b>
          <i>Filmmaker · Artist · Creator</i>
          <em>ROCKYFILMS888 PTY LTD · Melbourne</em>
        </span>
      </div>
      <div class="side-budget">
        <div class="sc-top"><span>Last run spend</span><b>${spent === null ? "—" : "$" + spent.toFixed(2)}</b></div>
        <div class="sc-meter"><i style="width:${meter}%"></i></div>
        <div class="sc-note">${ran ? `${esc(ran)} · ${state} of ${total} stage jobs succeeded` : "No run recorded yet"}</div>
        <div class="sc-note">BYOK — paid bodies run on your own key. No credits, no house account.</div>
      </div>
    </div>`;
  }

  function topbar(crumb) {
    const free = '<span class="chip ok">Verification free forever</span>';
    return el(
      `<header class="topbar"><span class="crumb">${crumb}</span><span class="spacer"></span>${free}</header>`,
    );
  }

  // Every figure printed by these helpers is counted in scripts/verse-data.mjs.
  const V = {
    data: D,
    stats: S,
    el,
    num(n) { return (n === null || n === undefined || Number.isNaN(n)) ? "—" : Number(n).toLocaleString("en-AU"); },
    stat(value, key, cls) { return `<div class="stat ${cls || ""}"><div class="v">${value}</div><div class="k">${key}</div></div>`; },
    depthChip(depth) {
      const map = { drivable: "drive", "file-exchange": "warn", "portal-only": "", "not-yet": "bad", none: "bad" };
      return `<span class="chip ${map[depth] || ""}">${depth}</span>`;
    },
    /** The honesty line: what the platform may not claim. */
    fence(text) { return `<div class="fence">${text}</div>`; },
    generated() {
      return `Registry snapshot ${S.rows ? V.num(S.rows) : "—"} rows · generated ${D.generatedAt ? D.generatedAt.slice(0, 10) : "—"} · source ${D.sourceHash ? D.sourceHash.slice(0, 12) : "—"} · regenerate: node --experimental-strip-types scripts/verse-data.mjs`;
    },
    mount() {
      const page = document.body.dataset.page || "";
      const crumb = document.body.dataset.crumb || "Sovereign AI Film Verse";
      const shell = document.body.querySelector(".shell");
      if (!shell) return;
      shell.prepend(sidebar(page));
      const main = shell.querySelector(".main");
      if (main) main.prepend(topbar(crumb));
    },
  };

  window.V = V;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", V.mount);
  else V.mount();
})();
