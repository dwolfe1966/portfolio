# David Wolfe Portfolio + Lifecycle Revenue Engine

This is a starter Next.js App Router portfolio site and demo app for an AI-driven Lifecycle Revenue Engine.

## Local setup

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Routes

### Public
- `/`
- `/about`
- `/projects/lifecycle-revenue-engine`
- `/writing/ai-revenue-systems`
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
- `/demo/users/[id]`
- `/demo/landing/[id]`

## API routes
- `POST /api/seed`
- `POST /api/simulate-deltas`
- `POST /api/generate-campaigns`
- `POST /api/simulate-outcomes`
- `GET /api/campaign-runs/[id]`
- `GET /api/health/demo-db`

## Notes
- `lib/ai.ts` uses the OpenAI Responses API when `OPENAI_API_KEY` is present.
- If no API key is set, the app falls back to deterministic template output.
- The demo password gate is intentionally left lightweight for refinement in Codex.

## Deployment (Vercel + Neon)

Quick checklist:

1. Create a Neon database and capture:
   - pooled connection string → `DATABASE_URL`
   - direct/non-pooled string → `DATABASE_URL_UNPOOLED`
2. Add all required env vars in Vercel Project Settings.
3. Run schema migrations with `npm run db:migrate:deploy`.
4. Deploy with Vercel using `npm run build`.

Full guide: `docs/deployment-vercel-neon.md`.

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
