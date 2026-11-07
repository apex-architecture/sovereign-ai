# APEX INTELLIGENCE EMPIRE — Operator Manual

> Sovereign AI film-production command center.
> Single operator. PIN-locked. Controllable from the browser **and** from any
> agentic IDE (OpenCode, Coder, Cursor, Claude Code, cron, curl, GitHub Actions)
> over one authenticated HTTPS endpoint.

---

## 0. TL;DR — the two things you need

| Thing | Where it lives | What it does |
|---|---|---|
| **Operator PIN** (4–10 digits, you set it) | Only in your head | Unlocks the web UI |
| **`OPERATOR_API_TOKEN`** (48-char secret) | Backend → Secrets | Unlocks the HTTP API for external agents |

Two URLs, both point at the same app:

- **Preview (dev builds):** `https://project--ac276ea0-2844-433f-8e86-08ac7330bc50-dev.lovable.app`
- **Published (stable, use this for agents):** `https://lllppp.lovable.app`

Everything below assumes you're hitting the **published** URL.

---

## 1. First-time setup (do this once, on any device)

1. Open `https://lllppp.lovable.app`.
2. Screen says **SEAL THE EMPIRE** → type a PIN (4–10 digits), confirm, submit.
3. That PIN is now the only credential for the web UI. There is no email, no password reset, no recovery. If you forget it, use the **"Forgot PIN? Wipe & re-seal"** button on the unlock screen — it deletes the sovereign identity and lets you set a new PIN. Your render history stays.
4. Install as an app (optional but recommended):
   - **iOS Safari:** Share → *Add to Home Screen*.
   - **Android Chrome:** ⋮ → *Install app*.
   - **Desktop Chrome/Edge:** address-bar install icon.
   You now have an APEX icon that opens full-screen, no browser chrome.

5. Grab your API token:
   - Open the app → **Backend** (the "View Backend" button in chat) → **Secrets**.
   - Copy the value of `OPERATOR_API_TOKEN`. Paste it into your IDE's secret store.
   - Never commit it. Never share it. Rotating = delete + regenerate in Secrets.

---

## 2. How the whole thing is wired (mental model)

```
        ┌─────────────────────────────────────────────────┐
        │  YOU (browser or agentic IDE)                   │
        └───────────────┬─────────────────────────────────┘
                        │
       PIN-locked UI    │    Bearer-token API
       (/, /create, …)  │    (/api/public/render)
                        ▼
        ┌─────────────────────────────────────────────────┐
        │  APEX app  (TanStack Start on Cloudflare edge)  │
        │  • Server functions (createServerFn)            │
        │  • Public API routes (/api/public/*)            │
        └───────────────┬─────────────────────────────────┘
                        │
       ┌────────────────┼─────────────────────────┐
       ▼                ▼                         ▼
   Supabase        Lovable Connector          Lovable AI
   (DB + Auth)   Gateway → Replicate       Gateway (LLMs)
                 (GPU video render)          for /oracle
```

Key facts:
- The **database, auth, and secrets** all live in the built-in backend (Supabase under the hood, but you never touch it directly — use the app's Backend panel).
- **Video renders** go out through the Lovable connector gateway to **Replicate**, so *you* never manage a GPU. RunPod / ComfyUI / SSH are no longer required.
- **LLM calls** (Oracle) go through the Lovable AI gateway using `LOVABLE_API_KEY`.
- **Every render, whether from the UI or the API, writes a row to `render_jobs`** so the Vault/Theater always shows the full history.

---

## 3. The pages, one line each

| Route | What it's for |
|---|---|
| `/`         | Foundry — dashboard with live influencers, recent projects, quick links |
| `/create`   | **Main workspace.** Type a prompt, pick tier, hit GENERATE FILM. Watches its own poll loop. |
| `/oracle`   | LLM chat/prompt tools (Lovable AI Gateway) |
| `/director` | Higher-level shot/scene composition |
| `/theater`  | Playback of completed renders |
| `/vault`    | All render_jobs rows, downloadable |
| `/broadcast`| Publish/share tooling |
| `/nominate` | Influencer nomination + voting (public-facing content) |
| `/beta`     | Beta signup capture |
| `/admin`    | Operator-only controls (roles, jobs, secrets summary) |
| `▮ Lock`   | Nav button — signs you out and re-seals the empire |

---

## 4. THE API — driving APEX from OpenCode / Coder / any script

There is exactly **one** endpoint. It does two things: start a render, then poll it.

### 4.1 Endpoint

```
POST  https://lllppp.lovable.app/api/public/render     ← start a render
GET   https://lllppp.lovable.app/api/public/render?id=<predictionId>   ← check status
OPTIONS same URL                                       ← CORS preflight (handled)
```

### 4.2 Auth (every call)

```
Authorization: Bearer <OPERATOR_API_TOKEN>
```

Missing/wrong token → `401 Unauthorized`. The compare is constant-time.

### 4.3 Start a render — request

```http
POST /api/public/render HTTP/1.1
Host: lllppp.lovable.app
Authorization: Bearer <OPERATOR_API_TOKEN>
Content-Type: application/json

{
  "prompt": "cinematic close-up of a neon samurai in rain, 35mm, shallow depth",
  "tier":   "fast"        // "fast" (minimax/video-01, ~1–2 min)
                          // "quality" (kwaivgi/kling-v2.5-turbo-pro, slower/sharper)
}
```

- `prompt`: 3–2000 chars, required.
- `tier`: `"fast"` (default) or `"quality"`.

### 4.4 Start a render — response

```json
{ "predictionId": "abc123xyz", "status": "starting" }
```

Also writes a `render_jobs` row with `external_job_id = predictionId`, `source = "api"`. You'll see it in `/vault`.

### 4.5 Poll — request

```http
GET /api/public/render?id=abc123xyz HTTP/1.1
Authorization: Bearer <OPERATOR_API_TOKEN>
```

### 4.6 Poll — responses

| status       | body                                              | meaning |
|--------------|---------------------------------------------------|---------|
| `starting`   | `{ "status": "starting" }`                        | queued  |
| `processing` | `{ "status": "processing" }`                      | rendering |
| `done`       | `{ "status": "done", "url": "https://..mp4" }`    | ✅ finished, download the URL |
| `failed`     | `{ "status": "failed", "error": "..." }`          | ❌ investigate |

⚠️ **Replicate output URLs expire in ~1 hour.** For anything you want to keep, download it and re-upload (to your own storage, R2, or commit to a repo) within that window. The `render_jobs` row keeps the URL text for audit but the file itself will 404 after expiry.

### 4.7 Recommended polling cadence

- First 5 polls: every **3s** (fast tier often finishes in ~60s)
- After that: every **10s**
- Hard cap: **15 min** total, then bail with a timeout error.

---

## 5. Copy-paste recipes

### 5.1 Bash / curl (the universal reference)

```bash
export APEX_TOKEN="paste-OPERATOR_API_TOKEN-here"
export APEX_URL="https://lllppp.lovable.app/api/public/render"

# 1. Kick off
PRED=$(curl -sS -X POST "$APEX_URL" \
  -H "Authorization: Bearer $APEX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"neon samurai in rain, 35mm","tier":"fast"}' \
  | jq -r '.predictionId')
echo "started: $PRED"

# 2. Poll until done
for i in $(seq 1 180); do
  sleep $(( i < 5 ? 3 : 10 ))
  R=$(curl -sS "$APEX_URL?id=$PRED" -H "Authorization: Bearer $APEX_TOKEN")
  S=$(echo "$R" | jq -r '.status')
  echo "[$i] $S"
  [ "$S" = "done" ]   && { echo "$R" | jq -r '.url' | xargs -I{} curl -sSL {} -o out.mp4; break; }
  [ "$S" = "failed" ] && { echo "$R"; exit 1; }
done
```

### 5.2 TypeScript / Node (drop into OpenCode)

```ts
const APEX_TOKEN = process.env.APEX_TOKEN!;
const APEX_URL   = "https://lllppp.lovable.app/api/public/render";

async function renderFilm(prompt: string, tier: "fast" | "quality" = "fast") {
  const start = await fetch(APEX_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${APEX_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, tier }),
  }).then(r => r.json());
  if (!start.predictionId) throw new Error(`start failed: ${JSON.stringify(start)}`);

  const id = start.predictionId;
  for (let i = 0; i < 180; i++) {
    await new Promise(r => setTimeout(r, i < 5 ? 3000 : 10000));
    const s = await fetch(`${APEX_URL}?id=${id}`, {
      headers: { Authorization: `Bearer ${APEX_TOKEN}` },
    }).then(r => r.json());
    if (s.status === "done")   return s.url as string;
    if (s.status === "failed") throw new Error(s.error);
  }
  throw new Error("timeout after 15 min");
}

// usage
const url = await renderFilm("cinematic samurai, neon rain", "fast");
console.log("mp4:", url);
```

### 5.3 Python

```python
import os, time, requests
TOKEN = os.environ["APEX_TOKEN"]
URL   = "https://lllppp.lovable.app/api/public/render"
H     = {"Authorization": f"Bearer {TOKEN}"}

def render(prompt, tier="fast", timeout_s=900):
    r = requests.post(URL, headers={**H, "Content-Type":"application/json"},
                      json={"prompt":prompt,"tier":tier}).json()
    pid = r["predictionId"]
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        time.sleep(3 if time.time()-t0 < 15 else 10)
        s = requests.get(URL, headers=H, params={"id":pid}).json()
        if s["status"] == "done":   return s["url"]
        if s["status"] == "failed": raise RuntimeError(s.get("error"))
    raise TimeoutError()
```

### 5.4 GitHub Actions (nightly render)

```yaml
# .github/workflows/nightly-film.yml
name: Nightly Apex render
on:
  schedule: [{ cron: "0 3 * * *" }]
  workflow_dispatch:
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -sS -X POST https://lllppp.lovable.app/api/public/render \
            -H "Authorization: Bearer ${{ secrets.APEX_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"prompt":"daily dispatch of the empire","tier":"fast"}'
```

Store `APEX_TOKEN` in **Repo Settings → Secrets and variables → Actions**.

### 5.5 OpenCode / Coder configuration

In your IDE workspace, add one env var:
```
APEX_TOKEN=<paste OPERATOR_API_TOKEN>
```
Then either drop `apex.ts` (recipe 5.2) into your project, or let the agent shell out with `curl` (recipe 5.1). Either way, one endpoint, one secret.

---

## 6. Where things live in the code (for future edits)

| Concern | File |
|---|---|
| PIN gate UI | `src/components/PinGate.tsx` |
| PIN gate server (owner-exists / wipe) | `src/lib/gate.functions.ts` |
| Cloud render server functions (used by `/create`) | `src/lib/render.functions.ts` |
| **External API endpoint** | `src/routes/api/public/render.ts` |
| Root layout, nav, meta, PWA links | `src/routes/__root.tsx` |
| PWA manifest & icons | `public/manifest.webmanifest`, `public/icon-*.png` |
| Supabase clients | `src/integrations/supabase/*` (auto-generated, do NOT edit) |
| DB tables | `render_jobs`, `projects`, `influencers`, `votes`, `beta_signups`, `user_roles`, `gpu_endpoints` |

Model mapping (change here to swap providers):
```ts
// src/lib/render.functions.ts  AND  src/routes/api/public/render.ts
const MODELS = {
  fast:    "minimax/video-01",
  quality: "kwaivgi/kling-v2.5-turbo-pro",
};
```

---

## 7. Secrets inventory

All managed in Backend → Secrets. Never paste in code.

| Secret | Purpose | Who sets it |
|---|---|---|
| `LOVABLE_API_KEY`         | Auth to Lovable AI + Connector Gateway | auto-provisioned |
| `REPLICATE_API_KEY`       | Connector key for Replicate gateway    | auto (connector) |
| `OPERATOR_API_TOKEN`      | Your API bearer token                   | pre-generated, rotate on suspicion |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_URL` | Backend plumbing | auto |

To rotate `OPERATOR_API_TOKEN`: Backend → Secrets → delete it → regenerate → update `APEX_TOKEN` in every agent that uses it.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Web UI: "Invalid PIN"                | Click **Forgot PIN? Wipe & re-seal**, set a new PIN. |
| API: `401 Unauthorized`              | Wrong/missing `OPERATOR_API_TOKEN`. Re-copy from Backend → Secrets. |
| API: `503 Server not provisioned`    | `OPERATOR_API_TOKEN` secret is missing entirely. Regenerate it in Backend. |
| API: `502` from POST                 | Replicate rejected the prompt or is overloaded. Check the returned `error` field. |
| Poll never leaves `starting`         | Replicate queue backup. Wait, or cancel and retry. |
| MP4 URL returns 404                  | Replicate URLs expire in ~1 hour. Download promptly. |
| `/create` spins forever              | Same as above — check `/vault` for the actual job row. |
| Nav shows a broken link              | Route file missing under `src/routes/`. Create it, don't hand-edit `routeTree.gen.ts`. |

---

## 9. Non-negotiable house rules

1. **One operator.** No signups, no invites, no OAuth. PIN only.
2. **No favicon, no third-party branding.** Keep it silent.
3. **`robots.txt` disallows all.** This app is not indexed.
4. **Every render logs to `render_jobs`.** UI or API — always a row.
5. **Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPERATOR_API_TOKEN` to the browser.** Server functions and `/api/public/*` handlers only.
6. **Replicate URLs are ephemeral.** If it matters, persist it yourself.

---

That's the whole system. One PIN for you, one token for your agents, one endpoint to render films.
