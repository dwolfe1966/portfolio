# Release Checklists

Date added: 2026-04-25

This checklist supports backlog item **A6** and should be run for every lifecycle/acquisition release.

## 1) Pre-release checklist

- [ ] Confirm `docs/product-backlog.md` statuses are up to date for the target sprint.
- [ ] Run local quality gates:
  - `npm run lint`
  - `npm test`
  - `npm run build`
- [ ] Verify Prisma migration state:
  - `npm run db:generate`
  - `npm run db:migrate:deploy`
- [ ] Verify demo mutation guard posture for target environment (`DEMO_MUTATIONS_ENABLED`).
- [ ] Smoke check critical pages:
  - `/lifecycle/overview`
  - `/lifecycle/outputs`
  - `/acquisition/overview`
  - `/acquisition/campaigns`
  - `/acquisition/outputs`

## 2) Release checklist

- [ ] Deploy app with environment variables configured (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEXT_PUBLIC_SITE_URL`, etc.).
- [ ] Run production migration deploy:
  - `npm run db:migrate:deploy`
- [ ] Confirm API health:
  - `/api/health/demo-db`
  - `/api/lifecycle/health/demo-db`
- [ ] Confirm lifecycle/acquisition nav and route accessibility.
- [ ] Confirm acquisition operator controls can read/write successfully in expected environments.

## 3) Post-release checklist

- [ ] Run smoke script:
  - `./scripts/smoke-test-production.sh`
- [ ] Validate logs for API error-rate spikes and migration/runtime issues.
- [ ] Verify key conversion surfaces and metadata previews (home/about/projects/writing).
- [ ] Capture any regressions in `docs/product-backlog.md` and assign sprint follow-up IDs.
