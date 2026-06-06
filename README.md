# cursorHackathon — Urban Solution Platform

AI-driven urban analysis project for the **Cursor Hackathon Istanbul** (June 6, 2026). This repository hosts the web frontend and will integrate with Go backend and Expo mobile components as the hackathon progresses.

## Tech Stack

| Layer | Technology | Hosting |
|-------|------------|---------|
| Web | Next.js 16 (App Router, TypeScript, Tailwind CSS) | [Vercel](https://vercel.com) |
| Backend | Go (Golang) — _to be added_ | [Render.com](https://render.com) |
| Mobile | Expo — _to be added_ | Expo |
| External API | Google Street View API (10,000 free requests) | Google Cloud |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Production build

```bash
npm run build
npm run start
```

### Environment variables

Copy the example file and add your API keys locally (never commit real keys):

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `GOOGLE_STREET_VIEW_API_KEY` | Google Street View Static API key |

## AI Tooling & Adaptation

This project is developed in **Cursor IDE** with an agentic ruleset defined in [`.cursorrules`](.cursorrules). The ruleset enforces:

- Next.js App Router patterns optimized for Vercel deployment
- KVKK compliance (no identity detection; mandatory face/plate anonymization)
- Incremental, descriptive Git commits
- Google Street View API as the sole external imagery source

### How AI accelerated development

| Stage | AI technique | Outcome |
|-------|--------------|---------|
| Project init | `create-next-app` via Cursor Agent with hackathon-aligned defaults | Next.js 16 scaffold with TypeScript, Tailwind, ESLint, and App Router in minutes |
| Architecture guidance | `.cursorrules` agentic ruleset | Consistent stack choices (Next.js + Go + Expo) and KVKK guardrails baked into every agent session |
| Documentation | Agent-generated README sections | Transparent AI adaptation log for jury scoring |

_Prompt techniques and design patterns will be documented here as development continues._

## Planned Integrations

- **Go backend** — Urban object detection API (signboards, road damage, public infrastructure)
- **Expo mobile** — Cross-platform field data collection
- **Google Street View API** — Street-level imagery ingestion (quota-aware)
- **KVKK pipeline** — Irreversible face and license plate anonymization before any model processing

## KVKK & Data Privacy

- Models are used **only** for urban object detection — identity profiling is prohibited
- Human faces and vehicle plates must be anonymized **before** processing
- Raw unencrypted data must not be uploaded to public repositories
- All API keys must be stored in `.env.local` (gitignored)

## Deploy on Vercel

**Live production:** https://cursor-hackathon-phi.vercel.app

Redeploy after changes:

```bash
npx vercel deploy --prod --yes
```

Required Vercel environment variable: `GOOGLE_STREET_VIEW_API_KEY`

See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Hackathon announcement](announcement.txt)
- [Hackathon rules](RULES.txt)
