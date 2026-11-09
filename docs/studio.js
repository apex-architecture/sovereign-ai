/**
 * Studio Home — the desk.
 *
 * One job on this page: take a sentence and route it to a tool that is really on this machine.
 * Every number here is counted — the engines come from the dictionary, their states come from a
 * probe that walked this disk, and the films are files this house rendered and hashed.
 */
(function () {
  const V = window.V;
  const ST = window.APEX_STUDIO || {};
  const VE = window.APEX_VERSE || { stats: {}, rows: [] };
  const EN = window.APEX_ENGINES || {};
  const AV = window.APEX_AVAIL || {};

  const id = (x) => document.getElementById(x);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
  const num = (n) => (n === null || n === undefined || Number.isNaN(n) ? "—" : Number(n).toLocaleString("en-AU"));
  const chip = (cls, text) => `<span class="chip ${cls || ""}">${esc(text)}</span>`;

  /**
   * Where the engine room lives, from the point of view of this page.
   *
   * On the creator's own machine the page and the rail share an origin, so a relative path is the
   * whole address. The published mirror is an https page on the public internet and the engine room
   * is on the loopback address, so the page has to name the rail outright — otherwise the request
   * goes to the mirror, finds no rail, and the platform reads as offline. Chrome then asks, once,
   * whether this site may reach the local network.
   */
  const ON_THE_RAIL = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
  const RAIL_HOST = "http://127.0.0.1:5188";
  const rail = (p) => (ON_THE_RAIL ? p : RAIL_HOST + p);

  /** True once the browser has let this page reach the engine room on this machine. */
  let ENGINE_AWAKE = ON_THE_RAIL;

  /** What has to be repainted once the engine room answers. */
  const wakeHooks = [];

  /**
   * Ask the browser for the local network, then wake the engine room.
   *
   * The published site is a mirror; the engine room is on the creator's machine. Chrome gates that
   * with a permission it raises on the first request from this origin. One press by the creator
   * turns the whole page live — the desk, the grid and the foreman — so the permission is asked
   * once and the answer is shared.
   */
  async function wakeEngine(button) {
    const label = button ? button.textContent : "Wake the engine room";
    if (button) {
      button.disabled = true;
      button.textContent = "Asking the browser…";
    }
    const ok = await fetch(rail("/api/status"))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (!ok) {
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
      for (const fn of wakeHooks) fn(false);
      return false;
    }
    ENGINE_AWAKE = true;
    for (const fn of wakeHooks) fn(true);
    return true;
  }


  function bytes(n) {
    if (!n && n !== 0) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
    return `${(n / 1073741824).toFixed(2)} GB`;
  }
  function dur(s) { return s ? `${Number(s).toFixed(2)} s` : "—"; }
  function when(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d) ? String(iso).slice(0, 16).replace("T", " ") : d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  }

  /**
   * House rules. The platform does not put a model hosted by a body its own house has ruled out in
   * front of a creator, and the exclusion is printed rather than hidden — a silent filter is a lie
   * about the list. An open-weight project that merely carries a vendor's name is not a hosted API.
   */
  const HOUSE = [
    { re: /anthropic|claude/i, why: "house rule: Anthropic models are never recommended here" },
    { re: /\bxai\b|\bgrok\b/i, why: "house rule: US-hosted API — not recommended" },
    { re: /openai|chatgpt|gpt-|gpt4|sora|dall-?e/i, unless: /openai whisper|openai clip|\bgpt-oss\b/i, why: "house rule: US-hosted API — not recommended" },
    { re: /google|gemini|imagen|\bveo\b/i, unless: /google magenta|google mediapipe/i, why: "house rule: US-hosted API — not recommended" },
  ];
  const banned = (name) => HOUSE.find((h) => h.re.test(name || "") && !(h.unless && h.unless.test(name || "")));

  const STATE_LABEL = { ready: "Ready here", fetch: "One fetch away", key: "Runs on your key", manual: "Desktop app", blocked: "Blocked by licence" };
  const STATE_CLS = { ready: "ok", fetch: "warn", key: "", manual: "", blocked: "bad" };

  const stateOf = (engineId) => (AV.engines && AV.engines[engineId]) || { state: "fetch", evidence: "not measured" };

  /* ---------------------------------------------------------------- topbar */

  function buildTopbar() {
    const bar = document.querySelector(".topbar");
    if (!bar) return;
    const crumb = bar.querySelector(".crumb");
    const search = document.createElement("div");
    search.className = "st-search";
    search.innerHTML =
      '<span class="ico">&#8981;</span>' +
      '<input id="st-q" type="search" autocomplete="off" placeholder="Search projects, engines, tools…" aria-label="Search projects, engines and tools">' +
      '<span class="kbd">&#8984;K</span>' +
      '<div class="st-results" id="st-results" hidden></div>';
    bar.insertBefore(search, crumb ? crumb.nextSibling : bar.firstChild);

    const chips = document.createElement("span");
    chips.className = "row";
    chips.style.gap = "8px";
    const ready = AV.counts?.ready;
    chips.innerHTML = (ready === undefined ? "" : chip("ok", `${ready} engines run here now`));
    bar.appendChild(chips);

    const input = id("st-q");
    const out = id("st-results");
    const run = () => {
      const raw = input.value.trim().toLowerCase();
      if (raw.length < 2) { out.hidden = true; return; }
      const hits = [];
      for (const p of ST.projects || []) {
        if ((p.title + " " + p.kind).toLowerCase().includes(raw)) {
          hits.push({ g: "Your films", n: p.title, m: `${p.kind} · ${dur(p.seconds)}`, href: "#projects" });
        }
      }
      for (const e of EN.ENGINES || []) {
        if ((e.name + " " + e.fits).toLowerCase().includes(raw) && hits.length < 40) {
          const s = stateOf(e.id);
          hits.push({ g: "Engines", n: e.name, m: STATE_LABEL[s.state] || s.state, href: `engines.html#${e.stage}` });
        }
      }
      for (const r of (VE.rows || []).slice(0, 400)) {
        if ((r.n + " " + (r.cap || "")).toLowerCase().includes(raw) && hits.length < 60) {
          hits.push({ g: "Registry", n: r.n, m: r.c || "", href: `tools.html?q=${encodeURIComponent(r.n)}` });
        }
      }
      if (!hits.length) {
        out.innerHTML = `<div class="rg">Nothing found</div><a href="tools.html?q=${encodeURIComponent(input.value.trim())}"><span class="n">Search the whole registry for &ldquo;${esc(input.value.trim())}&rdquo;</span><span class="m">&rarr;</span></a>`;
      } else {
        let html = "";
        let lastG = "";
        for (const h of hits.slice(0, 30)) {
          if (h.g !== lastG) { html += `<div class="rg">${h.g}</div>`; lastG = h.g; }
          html += `<a href="${h.href}"><span class="n">${esc(h.n)}</span><span class="m">${esc(h.m)}</span></a>`;
        }
        out.innerHTML = html;
      }
      out.hidden = false;
    };
    input.addEventListener("input", run);
    input.addEventListener("focus", run);
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.focus(); input.select(); }
      if (e.key === "Escape") { out.hidden = true; input.blur(); }
    });
    document.addEventListener("click", (e) => { if (!search.contains(e.target)) out.hidden = true; });
  }

  /* ---------------------------------------------------------------- desk */

  function desk() {
    const counts = AV.counts || {};
    const total = (EN.ENGINES || []).length;
    const gpu = AV.gpu;
    const comfy = AV.comfy || {};

    id("desk-lede").textContent = counts.ready === undefined
      ? "One sentence in, a real frame out — rendered by a tool that is genuinely on this machine."
      : `${counts.ready} of ${total} engines in the dictionary run on this machine right now. ` +
        `${counts.fetch} are open source and one fetch away. ${counts.key} run on your own key. ${counts.manual} are desktop apps you drive yourself.`;

    id("desk-rig").textContent = gpu
      ? `${gpu.name} · ${gpu.vramGb} GB${comfy.up ? ` · ComfyUI ${comfy.version}` : ""}`
      : "No GPU reported";

    const form = id("desk-form");
    const btn = id("desk-run");
    const prompt = id("desk-prompt");
    const result = id("desk-result");
    const live = id("desk-live");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = prompt.value.trim();
      if (!text) {
        live.hidden = false;
        live.innerHTML = `<div class="dl bad"><b>No shot described.</b> One sentence is enough — “a lone figure walking across a rain-soaked rooftop at night”.</div>`;
        prompt.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = "Rendering…";
      live.hidden = false;
      live.innerHTML = `<div class="dl"><span class="spin"></span> Rendering on ${esc(gpu?.name ?? "this machine")} — Wan 2.1, 832×480. This is a real GPU render; it takes a minute or two.</div>`;
      result.hidden = true;

      try {
        const res = await fetch(rail("/api/run"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: text, seconds: Number(id("desk-seconds").value) || 2 }),
        });
        const body = await res.json();
        if (!res.ok || body.error) throw new Error(body.error || `the engine room answered ${res.status}`);
        showResult(body);
      } catch (err) {
        live.innerHTML =
          `<div class="dl bad"><b>The engine room is not answering.</b> It runs on your machine, not on the web — the public rail is the mirror. ` +
          `Start it and this button works:<code>node --experimental-strip-types scripts/local-rail.mjs</code>` +
          `<div class="dl-err">${esc(String(err.message ?? err))}</div></div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = "Render it";
      }
    });

    // On the public rail there is no engine room behind the page; say so before he presses it.
    const askStatus = () =>
      fetch(rail("/api/status"), { method: "GET" })
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => {
          if (!s) {
            btn.disabled = true;
            btn.textContent = "Engine room offline";
            live.hidden = false;
            live.innerHTML = `<div class="dl">This is the public mirror. The engine room — ComfyUI, ffmpeg, Whisper and your GPU — runs on your own machine at <code>http://127.0.0.1:5188</code>.</div>`;
          } else {
            btn.disabled = false;
            btn.textContent = "Render it";
            live.hidden = false;
            live.innerHTML = `<div class="dl"><span class="dot on"></span> Engine room live · probed ${when(s.avail?.probedAt)} · ${s.avail?.counts?.ready ?? 0} engines ready · ComfyUI ${s.comfy?.up ? s.comfy.version : "down"}</div>`;
          }
          return s;
        })
        .catch(() => null);

    if (ON_THE_RAIL) {
      askStatus();
    } else {
      // The mirror does not wake the local machine on its own — that is a permission the creator
      // grants, not one the page takes. Offer the door.
      btn.disabled = false;
      live.hidden = false;
      live.innerHTML = `<div class="dl">This is the public mirror. The engine room — ComfyUI, ffmpeg, Whisper and your GPU — runs on your own machine at <code>http://127.0.0.1:5188</code>. <button class="btn ghost" type="button" id="desk-connect">Wake the engine room</button></div>`;
      wakeHooks.push((ok) => {
        if (!ok) {
          live.innerHTML = `<div class="dl">The browser refused the local network. Allow <code>${esc(location.host)}</code> to reach your local network, then press again.</div>`;
          return;
        }
        btn.disabled = false;
        btn.textContent = "Render it";
        live.innerHTML = `<div class="dl"><span class="dot on"></span> Engine room live — this page can now run tools on your own machine.</div>`;
      });
      id("desk-connect")?.addEventListener("click", (e) => wakeEngine(e.target));
    }
  }

  function showResult(body) {
    const live = id("desk-live");
    const result = id("desk-result");
    const arts = body.artefacts || [];
    live.innerHTML = `<div class="dl"><span class="dot on"></span> ${esc(body.used || "the driver")} rendered it in ${dur(body.wallClockSeconds)} · ${body.frames} frames · $${Number(body.usdSpent ?? 0).toFixed(2)} spent</div>`;
    result.hidden = false;
    result.innerHTML =
      (arts.length
        ? `<video class="desk-video" controls playsinline preload="metadata" src="${esc(arts[0].url)}"></video>`
        : `<div class="dl bad">The run finished without an artefact. The tool said: ${esc((body.log || []).join(" · ") || "nothing")}</div>`) +
      `<div class="desk-meta"><span>${esc(body.prompt || "")}</span><span>${arts.length ? bytes(arts[0].bytes) : ""} · ${esc(body.stamp || "")}</span></div>` +
      `<details class="desk-log"><summary>the run sheet</summary><pre>${esc((body.log || []).join("\n"))}</pre></details>`;
  }

  /* ---------------------------------------------------------------- spine */

  const SPINE_STEPS = [
    { stage: "idea", name: "Idea", what: "You write the premise. This stage is yours by design — the writing brain takes it from the next step.", href: "mission.html#idea", creator: true },
    { stage: "story", name: "Story", what: "The house ranks the open models that can write it and says which one your body can run.", href: "mission.html#story" },
    { stage: "script", name: "Script", what: "A 9B open-weights model fits this card once its weights are on the disk.", href: "mission.html#script" },
    { stage: "storyboard", name: "Storyboard", what: "ComfyUI holds the stack — panels render here tonight, for nothing.", href: "mission.html#storyboard" },
    { stage: "motion", name: "Film", what: "Wan 2.1 draws the shot on your GPU; ffmpeg cuts, grades and delivers it.", href: "mission.html#motion" },
  ];

  function rankFor(stage) {
    if (!EN.rankEngines) return null;
    const ctx = {
      stage,
      seconds: 5,
      qualityEdge: 832,
      needsAudio: false,
      territory: AV.territory || "Australia",
      intent: "personal",
      budgetUsd: 0,
      vramGb: AV.gpu?.vramGb ?? null,
      executors: AV.executors || [],
      drivableOnly: false,
    };
    try {
      const road = EN.rankEngines(ctx, EN.ENGINES);
      return road.offers.filter((o) => !banned(o.engine.name));
    } catch {
      return null;
    }
  }

  function spine() {
    const steps = id("spine-steps");
    let readyCount = 0;
    const engineSteps = SPINE_STEPS.filter((s) => !s.creator).length;
    steps.innerHTML = SPINE_STEPS.map((s, i) => {
      if (s.creator) {
        return `<li class="spine-step creator">
          <a href="${s.href}">
            <span class="sp-n">${String(i + 1).padStart(2, "0")}</span>
            <span class="sp-name">${esc(s.name)}</span>
            <span class="sp-what">${esc(s.what)}</span>
            <span class="sp-engine">your line</span>
            <span class="sp-badge ok">yours</span>
            <span class="sp-ev">the creator writes this one — every stage after it has an engine behind it</span>
          </a>
        </li>`;
      }
      const offers = rankFor(s.stage);
      const pick = offers ? offers.find((o) => stateOf(o.engine.id).state === "ready") || offers[0] : null;
      const engine = pick ? pick.engine : null;
      const st = engine ? stateOf(engine.id) : null;
      if (st && st.state === "ready") readyCount++;
      const label = engine ? engine.name : "no engine holds this stage";
      const ev = st ? st.evidence : "the dictionary counts zero engines here";
      const badge = st ? STATE_LABEL[st.state] : "gap";
      const cls = st ? STATE_CLS[st.state] : "bad";
      return `<li class="spine-step">
        <a href="${s.href}">
          <span class="sp-n">${String(i + 1).padStart(2, "0")}</span>
          <span class="sp-name">${esc(s.name)}</span>
          <span class="sp-what">${esc(s.what)}</span>
          <span class="sp-engine">${esc(label)}</span>
          <span class="sp-badge ${cls}">${esc(badge)}</span>
          <span class="sp-ev">${esc(ev)}</span>
        </a>
      </li>`;
    }).join("");
    id("spine-note").textContent = `${readyCount} of ${engineSteps} engine steps have an engine that runs here tonight · step 01 is yours to write`;
  }

  /* ---------------------------------------------------------------- ledger */

  function ledger() {
    const counts = AV.counts || {};
    const total = (EN.ENGINES || []).length;
    id("ledger-note").textContent = AV.probedAt
      ? `measured ${when(AV.probedAt)} by walking this disk — not declared by a vendor`
      : "";

    const order = [
      { k: "ready", label: "Ready here", cls: "ok" },
      { k: "fetch", label: "One fetch away", cls: "warn" },
      { k: "key", label: "Runs on your key", cls: "" },
      { k: "manual", label: "Desktop apps", cls: "" },
    ];
    id("ledger-counts").innerHTML =
      order.map((o) => `<div class="lc ${o.cls}"><div class="v">${num(counts[o.k] ?? 0)}</div><div class="k">${o.label}</div></div>`).join("") +
      `<div class="lc"><div class="v">${num(total)}</div><div class="k">In the dictionary</div></div>`;

    const readyIds = Object.keys(AV.engines || {}).filter((k) => AV.engines[k].state === "ready");
    const byId = Object.fromEntries((EN.ENGINES || []).map((e) => [e.id, e]));

    id("ledger-ready").innerHTML = readyIds.map((eid) => {
      const e = byId[eid] || {};
      const s = AV.engines[eid];
      return `<div class="lr"${s.path ? ` title="${esc(s.path)}"` : ""}>
        <div class="lr-t">${esc(e.name || eid)}</div>
        <div class="lr-s">${esc(s.evidence)}</div>
        <div class="lr-m">${chip(STATE_CLS[s.state], STATE_LABEL[s.state])}<span class="lr-stage">${esc(e.stage || "")}</span></div>
      </div>`;
    }).join("");
  }

  /* ---------------------------------------------------------------- films */

  function films() {
    const list = (ST.projects || []).filter((p) => p.present);
    id("films-note").textContent = list.length
      ? `${list.length} files this house rendered, measured and hashed`
      : "no rendered file on this disk yet";
    id("films-grid").innerHTML = list.map((p) => `
      <a class="film" href="dailies.html">
        ${p.poster ? `<img loading="lazy" src="${esc(p.poster.img)}" alt="A frame from ${esc(p.title)}">` : `<div class="film-noimg"></div>`}
        <div class="film-t">${esc(p.title)}</div>
        <div class="film-m">${esc(p.kind)} · ${dur(p.seconds)} · ${p.width}×${p.height} · ${bytes(p.bytes)}</div>
        ${p.badge ? `<div class="film-b ${esc(p.badge.cls || "")}">${esc(p.badge.label)}<i>${esc(p.badge.note || "")}</i></div>` : ""}
      </a>`).join("");
  }

  /**
   * The last shot this machine drew, offered before anything is asked for. It is the same file
   * the button produces, with the same hash — not a picture of one.
   */
  function lastRender() {
    const box = id("desk-clip");
    if (!box) return;
    const p = (ST.projects || []).find((x) => x.present && x.video);
    if (!p) return;
    box.hidden = false;
    box.innerHTML =
      `<video class="desk-video" controls playsinline preload="none"` +
      (p.poster ? ` poster="${esc(p.poster.img)}"` : "") +
      ` src="${esc(p.video)}"></video>` +
      `<div class="desk-meta"><span>the last shot this machine drew — ${esc(p.title)}</span>` +
      `<span>${esc(p.kind)} · ${dur(p.seconds)} · ${p.width}×${p.height} · ${bytes(p.bytes)} · sha256 ${esc(String(p.sha256 || "").slice(0, 16))}…</span></div>`;
  }

  /* ---------------------------------------------------------------- foreman */

  /**
   * The agent that builds this platform, speaking in its own measured words.
   * Nothing here is asserted by the page: it renders the Foreman's journal, and the button
   * asks the rail to run another audit-repair-verify pass and print what changed.
   *
   * A journal older than the tick interval is a measurement of a machine that has since moved,
   * so it is labelled as frozen rather than read as live.
   */
  const STALE_AFTER_MS = 60 * 60 * 1000;

  function ago(ms) {
    const m = Math.floor(ms / 60000);
    if (m < 1) return "moments ago";
    if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }

  function renderForeman(a) {
    const rows = id("foreman-rows");
    if (!a || !a.audit || !Array.isArray(a.audit.rows)) {
      id("foreman-note").textContent = "no journal yet";
      rows.innerHTML = "";
      id("foreman-brief").innerHTML = `<span class="fw-why">${esc(a && a.why ? a.why : "the Foreman has not written a journal on this machine")}</span>`;
      return;
    }
    // A frozen journal is a measurement, not a live answer. Past the tick interval the panel says
    // "ran", never "runs", so nobody reads yesterday's probe as today's answer.
    const ageMs = Date.now() - Date.parse(a.at);
    const stale = !(ageMs >= 0) || ageMs > STALE_AFTER_MS;
    const age = ageMs >= 0 ? ago(ageMs) : "an unknown time ago";
    id("foreman-note").textContent = stale
      ? `measured ${age} — a frozen snapshot, not a live answer`
      : `measured ${age} · ${a.audit.reachable.length} of ${a.audit.rows.length} stages run`;
    // The briefing is written in the present tense at tick time, so a stale journal needs its
    // tense corrected — otherwise a three-day-old measurement reads as today's answer.
    id("foreman-brief").textContent = stale
      ? `As measured ${age} — ${a.briefing.replace(/\brun today\b/g, "ran then")}`
      : a.briefing;
    const word = stale
      ? { reachable: "ran", "licence-gated": "gated", "dead-ended": "dead" }
      : { reachable: "runs", "licence-gated": "gated", "dead-ended": "dead" };
    rows.innerHTML = a.audit.rows.map((r) => {
      const live = [...(r.up || []).map((u) => u.toolId), ...(r.gated || []).map((g) => g.toolId)].join(", ");
      const upWhy = (r.up || []).map((u) => `${u.toolId}: ${u.why}`).join(" · ");
      const downs = r.down || [];
      const downWhy = downs.length
        ? downs.slice(0, 3).map((d) => `${d.toolId}: ${d.why}`).join(" · ") + (downs.length > 3 ? ` · +${downs.length - 3} more not answering` : "")
        : "";
      const note = [upWhy, downWhy].filter(Boolean).join(" — ") || ((r.gated || []).length ? "a human must read its licence before the stage is admitted" : "");
      return `<div class="fw-row">
        <span class="fw-stage">${esc(r.stage)}</span>
        <span class="fw-engines">${esc(live || "nothing")}<div class="fw-why">${esc(note)}</div></span>
        <span class="fw-state ${esc(word[r.state] || "dead")}">${esc(word[r.state] || "gap")}</span>
      </div>`;
    }).join("");
    const acted = Array.isArray(a.acted) ? a.acted : [];
    id("foreman-acted").innerHTML = acted.length
      ? acted.map((x) => `<div class="fw-act ${x.pass ? "" : "bad"}">${x.pass ? "did" : "not"} · ${esc(x.title)} — ${esc(String(x.evidence).slice(0, 240))}</div>`).join("")
      : `<div class="fw-act">nothing was agent-repairable in that pass · next: ${esc(a.next || "")}</div>`;
  }

  let foremanBound = false;

  function foreman() {
    const box = id("foreman-rows");
    if (!box) return;
    const snapshot = () => (typeof window !== "undefined" && window.APEX_FOREMAN) || null;
    const btn = id("foreman-tick");

    if (!ENGINE_AWAKE) {
      // The public mirror shows the last measured pass and does not reach into the machine on its
      // own — that is the creator's permission to give, not the page's to take.
      renderForeman(snapshot() || { why: "the engine room is not answering on this machine" });
      if (btn) {
        btn.disabled = true;
        btn.title = "Wake the engine room first — a build pass runs on the creator's own machine.";
      }
      return;
    }

    fetch(rail("/api/agent"))
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => renderForeman(r || snapshot()))
      .catch(() => renderForeman(snapshot() || { why: "the engine room is not answering on this machine" }));

    if (btn) {
      btn.disabled = false;
      btn.title = "";
    }
    if (foremanBound) return;
    foremanBound = true;
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "Measuring…";
      fetch(rail("/api/agent/tick"), { method: "POST" })
        .then((r) => r.json())
        .then((t) => {
          renderForeman(t);
          btn.textContent = "Run a build pass";
        })
        .catch(() => {
          btn.disabled = false;
          btn.textContent = "Run a build pass";
          id("foreman-brief").textContent = "The build pass could not be started on this machine.";
        });
    });
  }

  /* --------------------------------------------------------------- connect */

  /**
   * The Connect layer: every tool the platform can reach, with the button that runs it.
   *
   * Two states of the same truth. On the creator's own engine room the rail answers /api/drivers
   * with a live probe and /api/connect runs the real driver. On the published site there is no
   * engine room — only the frozen probe from the last build — so the Run button says plainly
   * that it runs on the creator's machine and the Open source button carries the real upstream.
   */
  /**
   * The badge names the reason, not the ambition.
   *
   * A tool that answered its own probe runs. A tool that answered but whose licence no human has
   * read will be refused when you press it — so the badge says that, and the press still tells you
   * the truth. A tool that did not answer is not ready for any reason; the line under the badge
   * carries the tool's own words about which reason it is.
   */
  function cxBadge(d) {
    if (d.depth === "portal-only") return `<span class="cx-badge portal">portal</span>`;
    if (!d.ok) {
      return d.depth === "file-exchange"
        ? `<span class="cx-badge off">not installed</span>`
        : `<span class="cx-badge off">not ready</span>`;
    }
    if (d.gated) return `<span class="cx-badge gate">licence read</span>`;
    return `<span class="cx-badge up">runs here</span>`;
  }

  function renderConnect(drivers, live) {
    const grid = id("connect-grid");
    if (!grid) return;
    if (!drivers || !drivers.length) {
      grid.innerHTML = `<div class="cx-card"><span class="cx-name">No tool answered</span><p class="cx-why">The engine room is not answering on this machine, and no frozen probe is bundled with this build.</p></div>`;
      return;
    }
    const order = { drivable: 0, "file-exchange": 1, "portal-only": 2 };
    const sorted = [...drivers].sort((a, b) => {
      const ao = a.ok ? 0 : 1, bo = b.ok ? 0 : 1;
      return ao - bo || (order[a.depth] ?? 3) - (order[b.depth] ?? 3) || String(a.name).localeCompare(String(b.name));
    });

    grid.innerHTML = sorted.map((d) => {
      const stages = (d.stages || []).slice(0, 3).map((s) => `<span class="cx-chip">${esc(s)}</span>`).join("");
      const licence = d.licence ? `<span class="cx-lic">${esc(String(d.licence).slice(0, 90))}</span>` : "";
      const open = d.url
        ? `<a class="cx-btn ghost" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`
        : /written for APEX/i.test(String(d.licence || ""))
          ? `<span class="cx-btn ghost" aria-disabled="true" style="opacity:.55">In-house bench</span>`
          : `<span class="cx-btn ghost" aria-disabled="true" style="opacity:.4">No upstream link</span>`;
      const run = d.depth === "drivable" && d.ok && !d.gated
        ? live
          ? `<button class="cx-btn run" data-run="${esc(d.toolId)}">Run here</button>`
          : `<a class="cx-btn run" href="http://127.0.0.1:5188/" target="_blank" rel="noopener noreferrer" title="The engine room runs on the creator's own machine">Run on the engine room ↗</a>`
        : d.depth === "drivable"
          ? live
            ? `<button class="cx-btn ghost" data-run="${esc(d.toolId)}" title="Press it and the engine room answers with the exact reason">Try it</button>`
            : `<a class="cx-btn ghost" href="http://127.0.0.1:5188/" target="_blank" rel="noopener noreferrer">Open the engine room ↗</a>`
          : d.depth === "file-exchange" && d.ok && !d.gated
            ? live
              ? `<button class="cx-btn run" data-run="${esc(d.toolId)}" title="Builds the handoff package the app opens">Prepare handoff</button>`
              : `<a class="cx-btn run" href="http://127.0.0.1:5188/" target="_blank" rel="noopener noreferrer" title="The engine room runs on the creator's own machine">Prepare on the engine room ↗</a>`
            : d.depth === "file-exchange" && d.ok
              ? live
                ? `<button class="cx-btn ghost" data-run="${esc(d.toolId)}" title="Press it and the engine room answers with the exact reason">Try it</button>`
                : `<a class="cx-btn ghost" href="http://127.0.0.1:5188/" target="_blank" rel="noopener noreferrer">Open the engine room ↗</a>`
              : "";
      return `<article class="cx-card" data-tool="${esc(d.toolId)}">
        <div class="cx-top"><span class="cx-name">${esc(d.name)}</span>${cxBadge(d)}</div>
        <div class="cx-meta">${stages || `<span class="cx-chip">unrouted</span>`}</div>
        <p class="cx-why">${esc(d.why || d.name)}</p>
        ${licence}
        <div class="cx-actions">${run}${open}</div>
      </article>`;
    }).join("");

    grid.querySelectorAll("[data-run]").forEach((btn) => {
      btn.addEventListener("click", () => runConnect(btn.dataset.run, btn));
    });
  }

  function runConnect(toolId, btn) {
    const out = id("connect-out");
    if (!out) return;
    out.hidden = false;
    out.innerHTML = `<div class="co-head"><span class="co-title">${esc(toolId)}</span><span class="co-state">running…</span></div><pre class="co-log">The engine room is starting the job.</pre>`;
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "Running…";

    fetch(rail("/api/connect"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toolId }),
    })
      .then((r) => r.json())
      .then((r) => {
        const state = r.error ? "failed" : String(r.state || "");
        const cls = state === "succeeded" ? "succeeded"
          : state === "blocked-by-licence" ? "blocked"
            : state === "needs-human" ? "blocked"
              : state === "portal" ? "blocked"
                : state === "not-installed" ? "blocked"
                  : "failed";
        const log = Array.isArray(r.log) ? r.log.join("\n") : String(r.log ?? "");
        const arts = (r.artefacts || []).map((a) => {
          const isAudio = /\.(wav|mp3|m4a|flac|ogg)$/i.test(a.name);
          const isVideo = /\.(mp4|webm|mov)$/i.test(a.name);
          // The rail hands back a path on itself; from the public mirror that path has to be
          // addressed to the rail, not to the mirror that served this page.
          const href = ON_THE_RAIL ? a.url : RAIL_HOST + a.url;
          const media = isAudio
            ? `<audio controls preload="none" src="${esc(href)}"></audio>`
            : isVideo
              ? `<video controls playsinline preload="none" src="${esc(href)}"></video>`
              : "";
          return `<div class="co-art">${media}<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(a.name)} · ${bytes(a.bytes)} ↗</a></div>`;
        }).join("");
        out.innerHTML = `<div class="co-head">
            <span class="co-title">${esc(r.name || toolId)}</span>
            <span class="co-state ${cls}">${esc(state || "failed")}</span>
            <span class="co-state">${dur(r.wallClockSeconds)} · $${Number(r.usdSpent || 0).toFixed(2)}</span>
          </div>
          ${log ? `<pre class="co-log">${esc(log)}</pre>` : ""}
          ${arts ? `<div class="co-arts">${arts}</div>` : ""}`;
        if (r.error) out.innerHTML += `<pre class="co-log">${esc(r.error)}</pre>`;
      })
      .catch((e) => {
        out.innerHTML = `<div class="co-head"><span class="co-title">${esc(toolId)}</span><span class="co-state failed">no answer</span></div><pre class="co-log">${esc(String(e.message ?? e))}</pre>`;
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = old;
      });
  }

  function connect() {
    const brief = id("connect-brief");
    const note = id("connect-note");
    const snapshot = () => (typeof window !== "undefined" && window.APEX_DRIVERS) || null;

    /**
     * The frozen probe is drawn first, so the grid is never an empty box. The live probe is
     * slower — it walks every tool on the disk — and when it lands it replaces the frozen rows
     * with the truth from right now. A visitor never stares at a placeholder.
     */
    const snap = snapshot();
    if (snap) {
      renderConnect(snap.drivers, false);
      if (brief) brief.textContent = `${snap.drivers.length} tools · last probe ${when(snap.at)} · asking the engine room now…`;
    }

    const askDrivers = () =>
      fetch(rail("/api/drivers"))
        .then((r) => (r.ok ? r.json() : null))
        .then((r) => {
          if (r && Array.isArray(r.drivers) && r.drivers.length) {
            if (brief) brief.textContent = `${r.drivers.length} tools · ${r.drivers.filter((d) => d.ok).length} answer on this machine right now · press Run and the file appears below.`;
            if (note) note.textContent = "live from the engine room on this machine";
            renderConnect(r.drivers, true);
            return true;
          }
          return false;
        })
        .catch(() => false);

    const frozen = () => {
      if (brief) brief.textContent = snap
        ? `${snap.drivers.length} tools · frozen probe from ${when(snap.at)} · Run happens on the creator's engine room`
        : "the engine room is not answering on this machine";
      renderConnect(snap ? snap.drivers : [], false);
    };

    if (ON_THE_RAIL) {
      askDrivers().then((ok) => {
        if (!ok) frozen();
      });
      return;
    }

    // The public mirror does not reach into the creator's machine without being asked to. Chrome
    // raises a local-network permission for this origin; one press by the creator turns the frozen
    // grid into the live one, with the same Run buttons the engine room answers.
    frozen();
    if (!brief) return;
    const wake = document.createElement("button");
    wake.type = "button";
    wake.className = "cx-btn run";
    wake.textContent = "Wake the engine room";
    wake.title = "Ask the browser for permission to reach the engine room on this machine";
    wake.addEventListener("click", () => wakeEngine(wake));
    brief.appendChild(document.createTextNode(" · "));
    brief.appendChild(wake);

    wakeHooks.push(async (ok) => {
      if (!ok) {
        if (brief) brief.textContent = "The browser refused the local network. Allow this site to reach your local network, then press again.";
        return;
      }
      await askDrivers();
      foreman();
    });
  }

  /* ---------------------------------------------------------------- boot */

  function boot() {
    buildTopbar();
    desk();
    lastRender();
    spine();
    foreman();
    connect();
    ledger();
    films();
    const s = id("st-stamp");
    if (s) {
      s.textContent = AV.probedAt
        ? `Probed ${when(AV.probedAt)} · ${AV.gpu?.name ?? "no GPU"} · registry ${num(VE.stats?.rows ?? 0)} rows`
        : `Registry ${num(VE.stats?.rows ?? 0)} rows`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
