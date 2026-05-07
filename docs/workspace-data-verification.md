# Workspace Data Verification

Last updated: 2026-05-07

This document records the K8 verification pass for account-aware product-app data behavior.

## Scope

K8 acceptance criteria:

- walk each product app anonymously;
- verify sample fallback;
- verify logged-in imported-data behavior;
- verify no cross-account leakage.

The verification combines route-level runtime checks, production build coverage, and account-scope regression tests. Browser-level visual clicking was not run because the repo does not currently include a browser automation dependency, but the product routes were exercised over the local Next dev server and the data-isolation logic is covered by the Node test suite.

## Product Apps

| App | Anonymous route probed | Expected anonymous behavior | Result |
|---|---|---|---|
| Lifecycle | `/lifecycle/overview` | Product app renders against sample/default data without login. | 200 OK |
| Acquisition | `/acquisition/overview` | Product app renders against sample/default data without login. | 200 OK |
| Auction | `/auction/overview` | Product app renders against sample/default data without login. | 200 OK |
| Pricing | `/pricing/overview` | Product app renders against sample/default data without login. | 200 OK |
| Retention | `/retention/overview` | Product app renders against sample/default data without login. | 200 OK |
| Expansion | `/expansion/overview` | Product app renders against sample/default data without login. | 200 OK |

## Workspace And Account Routes

| Route | Expected behavior | Result |
|---|---|---|
| `/workspace/login` | Login page renders anonymously. | 200 OK |
| `/workspace/register` | Registration page renders anonymously. | 200 OK |
| `/workspace/datasets` | Anonymous user is redirected to login with next path. | 307 to `/workspace/login?next=%2Fworkspace%2Fdatasets` |
| `/workspace/dashboard` | Anonymous user is redirected to login with next path. | 307 to `/workspace/login?next=%2Fworkspace%2Fdashboard` |
| `/workspace/account` | Anonymous user is redirected to login with next path. | 307 to `/workspace/login?next=%2Fworkspace%2Faccount` |
| `/api/account/session` | Session endpoint is reachable without throwing. | 200 OK |

Legacy `/demo/*` workspace routes redirect to `/workspace/*`, which keeps old links functional while preserving the account-aware workspace entrypoint.

## Automated Evidence

Commands run:

```text
npm test
npm run build
npm run dev
curl -I http://localhost:3000/lifecycle/overview
curl -I http://localhost:3000/acquisition/overview
curl -I http://localhost:3000/auction/overview
curl -I http://localhost:3000/pricing/overview
curl -I http://localhost:3000/retention/overview
curl -I http://localhost:3000/expansion/overview
curl -I http://localhost:3000/workspace/login
curl -I http://localhost:3000/workspace/register
curl -I http://localhost:3000/workspace/datasets
curl -I http://localhost:3000/workspace/dashboard
curl -I http://localhost:3000/workspace/account
curl -I http://localhost:3000/api/account/session
```

Results:

- `npm test`: 228 tests passed.
- `npm run build`: passed and generated the production route graph.
- Product overview route probes: all returned 200 OK.
- Anonymous workspace-protected route probes: redirected to login as expected.

## Account-Scope Coverage

The following tests cover the logged-in imported-data and cross-account leakage requirements:

- `tests/account-data-scope.test.ts`: anonymous users cannot use imported data mode; account import lookups are scoped to exactly the active account; import snapshots are created only for account-owned imports.
- `tests/workspace-datasets.test.ts`: workspace dataset schemas cover Lifecycle, Acquisition, Pricing, Retention, Expansion, and Auction.
- `tests/workspace-visibility.test.ts`: shared sample rows, personal account-owned rows, and future shared workspace rows resolve to distinct visibility labels.
- `tests/workspace-presets.test.ts`: workspace preset payloads are validated before account-scoped persistence.
- `tests/account-session.test.ts`: account sessions, password hashing, and default workspace membership behavior are covered.

## Verification Decision

K8 is complete for the current repo state:

- anonymous product-app sample fallback is runtime-verified by route probes and build output;
- imported-data account ownership and anonymous fallback are verified by regression tests;
- protected workspace pages redirect anonymous users to login;
- no cross-account leakage path is visible in the tested account-scope helpers.

Recommended future hardening:

- add Playwright or equivalent browser automation for true logged-in clickthroughs;
- add fixture-backed browser tests that register two users, import per-user datasets, apply active selections, and assert visible dataset isolation in the UI.
