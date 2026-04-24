# Product Backlog (Execution Plan)

Last updated: 2026-04-24

This backlog is the canonical source of truth for workstreams A–E.

## Workstream map
- **A**: Backlog governance and planning discipline
- **B**: Lifecycle app hardening
- **C**: Acquisition app maturity
- **D**: Website/content expansion
- **E**: Operations and deployment consistency

## Status legend
- ✅ Completed
- 🟡 In progress
- ⏳ To do

## Active sprint: S6 (stability + execution controls)

| ID | Item | Owner | Size | Sprint | Status | Acceptance criteria |
|---|---|---|---|---|---|---|
| A3 | Canonical backlog with ticket IDs/criteria | DW | S | S6 | ✅ | Backlog contains IDs, status, owners, sizes, and criteria. |
| A4 | Owner/status fields | DW | S | S6 | ✅ | All active S6 tickets include owner + status. |
| A5 | Effort sizing and sprint labels | DW | S | S6 | ✅ | S6/S7/S8/S9 labels and S/M/L included. |
| B5 | Tests for assumptions lifecycle logic | DW | M | S6 | 🟡 | Tests validate defaulting/normalization and edge handling. |
| B6 | Tests for scoring reproducibility logic | DW | M | S6 | 🟡 | Tests validate contribution math and deterministic output. |
| E4 | Migrations-first schema strategy | DW | S | S6 | ✅ | Docs and repo enforce `db:migrate:deploy` as primary path. |
| E5 | CI gates (lint/test/build) | DW | M | S6 | ✅ | CI workflow runs lint, test, and build on push/PR. |

---

## A) Backlog governance and planning discipline

### Completed
- ✅ A1. Established staged app IA for both domains (overview / inputs / simulations / outputs).
- ✅ A2. Added route/API inventory and deployment notes in README.
- ✅ A3/A4/A5. Added canonical backlog structure with owner/status/size/sprint criteria.

### To do
- ⏳ A6. Add release checklists (pre-release, release, post-release) linked to this backlog.

---

## B) Lifecycle app hardening

### Completed
- ✅ B1. Workspace IA exists with dedicated pages for overview/inputs/simulations/outputs.
- ✅ B2. Outputs page includes schema compatibility handling and graceful fallback.
- ✅ B3. Health endpoint exists for demo DB readiness checks.
- ✅ B4. Scoring explainability UI and assumptions persistence baseline are present.

### In progress
- 🟡 B5. Add tests for assumptions lifecycle logic.
- 🟡 B6. Add tests for scoring reproducibility logic.

### To do
- ⏳ B7. Add regression tests for schema fallback paths (`P2021`/`P2022`).
- ⏳ B8. Add richer outputs analytics (run-over-run trend, segment breakdown, filter presets).
- ⏳ B9. Add operator audit panel linking run → top candidates → generated message chain.

---

## C) Acquisition app maturity

### Completed
- ✅ C1. Acquisition staged IA exists (`/acquisition/*`).
- ✅ C2. Campaign bootstrap, iteration loop, and insights panels are wired through API routes.
- ✅ C3. Overview includes architecture modules and data-flow framing.
- ✅ C4. Outputs page includes empty/schema-guidance behavior.

### In progress
- 🟡 C5. Add higher-fidelity insights metrics in outputs panel (initial summary expansion).

### To do
- ⏳ C6. Add creative-level and audience-level trend comparisons over iterations.
- ⏳ C7. Add budget activity timeline chart (with reason + before/after deltas).
- ⏳ C8. Add configurable guardrails UI (approval threshold, max shift policy, cooldown window).
- ⏳ C9. Add manual override controls and persist override actions to audit log.
- ⏳ C10. Add scenario save/load presets for repeatable acquisition experiments.

---

## D) Website/content expansion

### Completed
- ✅ D1. Home page positioning updated around revenue-minded growth leadership.
- ✅ D2. About page expanded with expertise, timeline, values, and CTA.
- ✅ D3. Projects index + dynamic project pages implemented.
- ✅ D4. Writing index route exists.

### In progress
- 🟡 D5. Expand writing inventory with additional essays/previews.

### To do
- ⏳ D6. Add 2–3 new project case studies beyond lifecycle/acquisition.
- ⏳ D7. Add richer visual artifacts in case studies (architecture diagrams, screenshots, KPI callouts).
- ⏳ D8. Add contact form delivery path with spam mitigation and success/error UX.
- ⏳ D9. Perform metadata/OG pass on all key pages.

---

## E) Operations and deployment consistency

### Completed
- ✅ E1. Deployment runbook exists for Vercel + Neon.
- ✅ E2. Deployment and smoke scripts exist in `scripts/`.
- ✅ E3. Schema drift troubleshooting guidance exists.
- ✅ E4. Migrations-first strategy codified in docs + migrations folder.
- ✅ E5. CI workflow added for lint/test/build gates.

### To do
- ⏳ E6. Add environment-specific endpoint guardrails for seed/simulation mutators.
- ⏳ E7. Add structured error contract for API routes (consistent JSON shape).
- ⏳ E8. Add production-ready logging + basic event IDs for cross-route tracing.

---

## Next sprint sequence

### Sprint S7 (analytics depth)
- B8, B9
- C6, C7

### Sprint S8 (operator controls + content)
- C8, C9, C10
- D6, D7
- E6, E7, E8

### Sprint S9 (website conversion polish)
- D8, D9
- Release checklist hardening (A6)
