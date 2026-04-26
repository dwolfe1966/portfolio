# David Wolfe Portfolio + Lifecycle Revenue Engine

This is a starter Next.js App Router portfolio site and demo app for an AI-driven Lifecycle Revenue Engine.

## Local setup

```bash
npm install
cp .env.example .env.local
npx prisma generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Routes

### Public
- `/`
- `/about`
- `/projects`
- `/projects/[slug]`
- `/acquisition`
- `/acquisition/overview`
- `/acquisition/inputs`
- `/acquisition/simulations`
- `/acquisition/outputs`
- `/writing`
- `/writing/ai-revenue-systems`
- `/writing/product-discovery-ai-loops`
- `/contact`

### Demo
- `/demo`
- `/demo/overview`
- `/demo/inputs`
- `/demo/simulations`
- `/demo/outputs`
- `/demo/dashboard`
- `/demo/campaigns`
- `/demo/campaigns/[id]`
- `/demo/candidates/[id]`
- `/demo/users/[id]`
- `/demo/landing/[id]`

## API routes
- `POST /api/seed`
- `POST /api/simulate-deltas`
- `POST /api/generate-campaigns`
- `GET /api/assumptions`
- `POST /api/assumptions`
- `POST /api/simulate-outcomes`
- `GET /api/campaign-runs/[id]`
- `GET /api/health/demo-db`
- `GET /api/acquisition/campaigns`
- `POST /api/acquisition/campaigns`
- `POST /api/acquisition/campaigns/[id]/iterate`
- `GET /api/acquisition/campaigns/[id]/insights`

## Notes
- `lib/ai.ts` uses the OpenAI Responses API when `OPENAI_API_KEY` is present.
- If no API key is set, the app falls back to deterministic template output.
- The demo password gate is intentionally left lightweight for refinement in Codex.


## Acquisition app quickstart

1. Open `/acquisition/inputs` and create a campaign from **Campaign bootstrap**.
2. Open `/acquisition/simulations` and run one or more orchestrator iterations.
3. Open `/acquisition/outputs` to inspect spend, revenue, ROAS, and top cells.

If you see schema/compatibility messages, run:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

## Deployment (Vercel + Neon)

Quick checklist:

1. Create a Neon database and capture:
   - pooled connection string → `DATABASE_URL`
   - direct/non-pooled string → `DATABASE_URL_UNPOOLED`
2. Add all required env vars in Vercel Project Settings.
   - Set `DEMO_MUTATIONS_ENABLED=false` in production unless you explicitly need seed/simulation endpoints.
3. Run schema migrations with `npm run db:migrate:deploy`.
4. Deploy with Vercel using `npm run build`.

Full guide: `docs/deployment-vercel-neon.md`.

Backlog and execution plan: `docs/product-backlog.md`.
Release checklist: `docs/release-checklist.md`.


## One-command deployment helper

If you already have Vercel + Neon credentials, you can run:

```bash
export VERCEL_TOKEN=...
export VERCEL_ORG_ID=...
export VERCEL_PROJECT_ID=...
export DATABASE_URL=...
export DATABASE_URL_UNPOOLED=...
export DEMO_PASSWORD=...
export NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
export SEED_PROD=yes

./scripts/deploy-vercel-neon.sh
```

After deployment:

```bash
export NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
./scripts/smoke-test-production.sh
```

## Prisma migrations in this repo

This repository now includes baseline Prisma migrations under `prisma/migrations/*`.
Use this for schema rollout:

```bash
npm run db:migrate:deploy
```

## Troubleshooting schema drift (P2022/P2021)

If you see errors like `The column CampaignRun.assumptionSetId does not exist`, your DB schema is behind the app code.

Run:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```


## CI checks

GitHub Actions workflow: `.github/workflows/ci.yml` runs:

- `npm run lint`
- `npm test`
- `npm run build`
