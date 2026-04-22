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
- `DEMO_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`
- `OPENAI_API_KEY` (optional; fallback mode works without it)

## 3) Apply Prisma schema to Neon

For an existing schema, run one of these approaches:

### Option A: Prisma Migrate (recommended for long-term)

```bash
npx prisma migrate dev --name init
npm run db:migrate:deploy
```

### Option B: Prisma DB Push (quick start)

```bash
npx prisma db push
```

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
- `DEMO_PASSWORD`
- `NEXT_PUBLIC_SITE_URL` (set to your Vercel domain, e.g. `https://your-app.vercel.app`)

## 6) Production migration workflow

Before or during each release that includes schema changes:

```bash
npm run db:migrate:deploy
```

You can run this from CI/CD or locally against the production environment variables.

## 7) Post-deploy smoke checks

After deployment, verify:

- `/` loads
- `/demo/dashboard` loads
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
npx prisma db push
npm run db:seed
```

## Optional: Vercel CLI quick setup

```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add DATABASE_URL_UNPOOLED
vercel env add DEMO_PASSWORD
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
export DEMO_PASSWORD=...
export NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
export SEED_PROD=yes

./scripts/deploy-vercel-neon.sh
./scripts/smoke-test-production.sh
```

Behavior:

- if `prisma/migrations/*` exists, script runs `npm run db:migrate:deploy`
- if migrations do not exist yet, script runs `npx prisma db push`
- if `SEED_PROD=yes`, script runs `npm run db:seed`
