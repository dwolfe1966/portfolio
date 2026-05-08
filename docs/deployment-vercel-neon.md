# Deploying to Vercel + Neon

This project is ready to deploy on **Vercel** with a **Neon Postgres** database.

## 1) Create and prepare a Neon database

1. In Neon, create a new project/database.
2. Copy both connection strings:
   - **Pooled** connection (for app runtime): use for `DATABASE_URL`.
   - **Direct / non-pooled** connection (for migrations): use for `DATABASE_URL_UNPOOLED`.
3. Ensure SSL is enabled (`sslmode=require`).

## 2) Configure local env for development

Use `.env.example` as your template:

```bash
cp .env.example .env.local
```

Set at least:

- `DATABASE_URL` (pooled Neon connection)
- `DATABASE_URL_UNPOOLED` (direct Neon connection)
- `ACCOUNT_SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `OPENAI_API_KEY` (optional; fallback mode works without it)

## 3) Apply Prisma schema to Neon

For an existing schema, run one of these approaches:

### Option A: Prisma Migrate (recommended for long-term)

```bash
npx prisma migrate dev --name init
npm run db:migrate:deploy
```

### Option B: Prisma DB Push (quick start, fallback only)

```bash
npx prisma db push
```

> Note: this repo includes baseline migrations, so prefer `npm run db:migrate:deploy` for consistent environments.

Then seed data if desired:

```bash
npm run db:seed
```

## 4) Import project into Vercel

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, click **Add New Project** and import the repo.
3. Keep framework preset as **Next.js**.
4. Build command: `npm run build`
5. Install command: `npm install`

## 5) Add environment variables in Vercel

In **Project Settings → Environment Variables**, add for Production (and Preview as needed):

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `OPENAI_API_KEY` (optional)
- `ACCOUNT_SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL` (set to your Vercel domain, e.g. `https://your-app.vercel.app`)

## 6) Production migration workflow

Before or during each release that includes schema changes:

```bash
npm run db:migrate:deploy
```

You can run this from CI/CD or locally against the production environment variables.

## Agent worker deployment requirements

The current agent architecture still works on a standard Vercel + Neon deployment:

- `AgentJob` and `AgentApprovalRequest` require Prisma migrations to be deployed.
- The first worker executor is run-once and request-driven through a protected API route, so it does not require a separate long-running process yet.
- Fake provider-write executors do not send messages or mutate ad accounts. Real delivery/ad-provider executors will require provider credentials, stricter secret rotation, and customer policy controls.

Future background execution will add one of these deployment requirements:

- a scheduler that calls the run-once endpoint for known queues;
- Vercel cron or an equivalent scheduled function if staying fully serverless;
- an external worker service if jobs need long runtimes, high concurrency, streaming connectors, or provider webhooks with heavier retry semantics.

When background workers are enabled, production will also need concurrency limits, queue allowlists, worker auth, observability/alerts, and database connection sizing for worker load.

## 7) Post-deploy smoke checks

After deployment, verify:

- `/` loads
- `/demo/dashboard` loads
- `GET /api/health/demo-db` returns `{ ready: true }`
- `POST /api/seed` works (if enabled for your environment)
- `POST /api/simulate-deltas` works
- `POST /api/generate-campaigns` works

If API routes fail with DB connectivity errors, re-check:

- `DATABASE_URL` is pooled
- `DATABASE_URL_UNPOOLED` is direct/non-pooled
- both include SSL params

If demo routes fail with Prisma `P2021` (missing table), your production schema has not been applied yet. Run:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

If your environment is intentionally db-push based (no migration history yet), use `npx prisma db push` as a fallback.

If `db:seed` fails in Codespaces with pooler host connectivity errors, set `DATABASE_URL_UNPOOLED` and rerun. This repo prefers the unpooled URL outside production for Prisma CLI/seed workflows.

## Optional: Vercel CLI quick setup

```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add DATABASE_URL_UNPOOLED
vercel env add ACCOUNT_SESSION_SECRET
vercel env add NEXT_PUBLIC_SITE_URL
vercel --prod
```

## Automated deployment script in this repo

This repository includes:

- `scripts/deploy-vercel-neon.sh`
- `scripts/smoke-test-production.sh`

Usage:

```bash
export VERCEL_TOKEN=...
export VERCEL_ORG_ID=...
export VERCEL_PROJECT_ID=...
export DATABASE_URL=...
export DATABASE_URL_UNPOOLED=...
export ACCOUNT_SESSION_SECRET=...
export NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
export SEED_PROD=yes

./scripts/deploy-vercel-neon.sh
./scripts/smoke-test-production.sh
```

Behavior:

- if `prisma/migrations/*` exists, script runs `npm run db:migrate:deploy`
- if migrations do not exist yet, script runs `npx prisma db push`
- if `SEED_PROD=yes`, script runs `npm run db:seed`
