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
- `/demo/dashboard`
- `/demo/campaigns`
- `/demo/campaigns/[id]`
- `/demo/users/[id]`
- `/demo/landing/[id]`

## API routes
- `POST /api/seed`
- `POST /api/simulate-deltas`
- `POST /api/generate-campaigns`
- `GET /api/campaign-runs/[id]`

## Notes
- `lib/ai.ts` uses the OpenAI Responses API when `OPENAI_API_KEY` is present.
- If no API key is set, the app falls back to deterministic template output.
- The demo password gate is intentionally left lightweight for refinement in Codex.
