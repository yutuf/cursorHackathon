# Monumation — Walk any city by mood

Mood-based pedestrian routing for **Cursor Hackathon Istanbul** (June 6, 2026). Monumation scores walking corridors by vibe — heritage, scenic green, arts, or promenade — using **Google Places (photo-backed landmarks only)**, **Hugging Face vision**, optional **Street View** samples, and the **Go Monumation Engine**.

> *Google draws A→B. Monumation tells you which walk actually matches your mood.*

- **Landing:** `/`
- **Navigator:** `/app`

## What works today

| Feature | Status |
|---------|--------|
| Mood picker (4 corridors) | ✅ |
| Map pin → walking route scan | ✅ worldwide |
| Sea / non-walkable pin blocking | ✅ geocode + Street View snap + route shape |
| Places **with Google photos only** | ✅ no photo = not a landmark for CV |
| Hugging Face ViT on place photos | ✅ |
| Street View corridor samples | ✅ supplementary |
| Corridor battle (good vs weak) | ✅ preset demos |
| Go scoring engine | ✅ local or HF Spaces (free cloud) |

## Demo script (~2 min)

1. Open `/app` → pick a mood (e.g. **Heritage**)
2. **Compare** → good corridor scores higher than weak stretch
3. Tap a **demo chip** (Istanbul examples) or draw two pins on land
4. **Scan corridor** → street samples first, then landmark cards (all have photos)
5. Mention: Go engine + HF vision on **Google Places photos** (primary signal)

## Architecture

```
User picks mood → Google Walking Directions
        ↓
Google Places along route (photo-backed only)
        ↓
Hugging Face ViT on Place Photos  ← primary CV story
        ↓
Street View samples (optional texture layer)
        ↓
Go Monumation Engine normalizes mood vectors
        ↓
Combined score + corridor compare
```

## Local development

**Terminal 1 — Go engine:**

```bash
npm run go:monumation
# http://localhost:8090/health
```

**Terminal 2 — Next.js:**

```bash
npm install
cp .env.example .env.local   # fill API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Enter the navigator**.

Navigator shows `engine live` when Go is reachable.

## Environment variables

| Variable | Where | Description |
|----------|-------|-------------|
| `GOOGLE_STREET_VIEW_API_KEY` | Vercel | Directions, **Geocoding**, Places, Place Photos, Street View |
| `HUGGINGFACE_API_KEY` | Vercel | HF inference router (ViT + DETR) |
| `MONUMATION_GO_URL` | Vercel | Go engine URL (e.g. `https://USER-monumation-go.hf.space`) |
| `CURSOR_API_KEY` | Vercel | Optional — opportunity briefs |

**Google Cloud APIs to enable:** Directions, Geocoding, Places, Street View Static.

## Deploy — Vercel (frontend) + Go in the cloud

Go **must** be online for the jury. **Koyeb/Render ask for payment** — use **Hugging Face Spaces** (free CPU, no credit card).

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for full steps.

### 1) Go backend — Hugging Face Spaces (free)

1. [huggingface.co/new-space](https://huggingface.co/new-space) → SDK **Docker**, hardware **CPU basic**
2. Publish `backend/`:

```powershell
$env:HF_SPACE = "YOUR_USERNAME/monumation-go"
.\scripts\publish-hf-go.ps1
```

3. Test: `https://YOUR_USERNAME-monumation-go.hf.space/health`
4. That URL → Vercel env `MONUMATION_GO_URL`

### 2) Next.js on Vercel

```bash
npm run build
npx vercel deploy --prod
```

Or connect [github.com/yutuf/cursorHackathon](https://github.com/yutuf/cursorHackathon) in the Vercel dashboard.

**Vercel → Project → Settings → Environment Variables:**

```
GOOGLE_STREET_VIEW_API_KEY=...
HUGGINGFACE_API_KEY=...
MONUMATION_GO_URL=https://YOUR_USERNAME-monumation-go.hf.space
```

Redeploy after adding env vars. Open `/app` and confirm **engine live**.

> **Note:** Free tiers may sleep — first request after idle can take ~20–30s.

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/monumation/scan` | Full corridor scan |
| `POST /api/monumation/compare` | Corridor battle |
| `POST /api/monumation/validate` | Pin / route walkability check |
| `GET /api/monumation/engine` | Go engine health proxy |

## Go engine endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness |
| `POST /monumation/normalize` | HF labels → mood vector |
| `POST /monumation/scan` | Batch node scoring |

## Places policy

Only landmarks **with a Google photo** count toward scoring and UI. No photo → skipped (not worth showing to tourists or running ViT on).

## Privacy

- Uses Google imagery (faces/plates already blurred by Google)
- No face recognition, plate reading, or identity profiling
- No raw image storage
- See [KVKK_DATA_DELETION.md](docs/KVKK_DATA_DELETION.md)

## Tech stack

| Layer | Tech | Host |
|-------|------|------|
| Web | Next.js 16, TypeScript, Tailwind | Vercel |
| Engine | Go `monumation-api` | HF Spaces / local |
| AI | Hugging Face ViT + DETR | HF API |
| Maps | Google Directions, Places, Street View | Google Cloud |
| Dev AI | Cursor IDE + Ruleset + Cursor SDK | Local / Vercel |

## AI development — Cursor Ruleset & Cursor SDK

> Hackathon rules require documenting AI tooling in README. We use **Cursor**, not Anthropic Claude CLI/SDK.

### Cursor Ruleset (agentic rules)

- **[`.cursorrules`](.cursorrules)** — project-wide agent rules: Next.js + Go + Hugging Face CV, KVKK constraints, incremental commits, Monumation product scope.
- **[`docs/RULES.txt`](docs/RULES.txt)** — official hackathon stack & ethics (masterfabric-go, KVKK, Vercel, etc.).
- **[`docs/announcement.txt`](docs/announcement.txt)** — event brief the agent must follow.

All hackathon code was built in **Cursor IDE** with these rules loaded so the agent stays on-stack (no custom backend rewrite, no face/plate detection, photo-only POI policy).

### Cursor SDK (`@cursor/sdk`) — integrated in product

Optional **municipal opportunity brief** agent for the Bulan/signboard module:

| Piece | Path |
|-------|------|
| SDK wrapper | [`lib/cursor-agent.ts`](lib/cursor-agent.ts) — `Agent.prompt()`, model `composer-2.5` |
| API route | `POST /api/opportunity-brief` |
| CLI script | `npm run brief` → [`scripts/generate-brief.ts`](scripts/generate-brief.ts) |
| Fallback template | [`lib/opportunity-brief.ts`](lib/opportunity-brief.ts) when `CURSOR_API_KEY` is unset |

**Runtime:** local agent when developing; cloud agent on Vercel when `CURSOR_API_KEY` + `GITHUB_REPO_URL` are set.

```bash
# .env.local
CURSOR_API_KEY=...          # https://cursor.com/dashboard/integrations
GITHUB_REPO_URL=https://github.com/yutuf/cursorHackathon

npm run brief              # terminal brief via Cursor SDK
```

**Note:** Main jury demo is **Monumation** (`/app`). Cursor SDK powers the supplementary brief endpoint, not corridor scoring.

### What we did *not* use

- **Anthropic Claude CLI / Claude SDK** — not in this repo.
- **Expo mobile** — not shipped in this hackathon slice.

## Learn more

- [Pitch deck (PDF)](docs/pitch/MonumationPitchDeck.pdf) · [PPTX](docs/pitch/MonumationPitchDeck.pptx)
- [Project docs](docs/README.md)
- [Hackathon announcement](docs/announcement.txt)
- [Hackathon rules](docs/RULES.txt)
