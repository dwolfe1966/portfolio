# Product Backlog (Execution Plan)

Last updated: 2026-04-24

This backlog converts the current repo state into an execution plan across five workstreams:

- **A**: Backlog governance and planning discipline
- **B**: Lifecycle app hardening
- **C**: Acquisition app maturity
- **D**: Website/content expansion
- **E**: Operations and deployment consistency

---

## Status legend

- ✅ Completed
- 🟡 In progress
- ⏳ To do

---

## A) Backlog governance and planning discipline

### Completed
- ✅ A1. Established staged app IA for both domains (overview / inputs / simulations / outputs), which gives a natural structure for ticket grouping.
- ✅ A2. Added route/API inventory and deployment notes in README.

### To do
- ⏳ A3. Create one canonical backlog source of truth with ticket IDs and acceptance criteria.
- ⏳ A4. Add owner and status fields per ticket (Todo/In progress/Done).
- ⏳ A5. Add effort sizing (S/M/L) and target sprint labels.
- ⏳ A6. Add release checklists (pre-release, release, post-release) tied to this backlog.

---

## B) Lifecycle app hardening

### Completed
- ✅ B1. Workspace IA exists with dedicated pages for overview/inputs/simulations/outputs.
- ✅ B2. Outputs page includes schema compatibility handling and graceful fallback.
- ✅ B3. Health endpoint exists for demo DB readiness checks.
- ✅ B4. Scoring explainability UI and assumptions persistence baseline are present.

### To do
- ⏳ B5. Add integration tests for assumptions CRUD + active set lifecycle.
- ⏳ B6. Add integration tests for run generation reproducibility and assumption snapshots.
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

### To do
- ⏳ C5. Add channel-level performance breakdown views.
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

### To do
- ⏳ D5. Add 2–3 new project case studies beyond lifecycle/acquisition.
- ⏳ D6. Add richer visual artifacts in case studies (architecture diagrams, screenshots, KPI callouts).
- ⏳ D7. Expand writing section with multiple essays and previews.
- ⏳ D8. Add contact form delivery path with spam mitigation and success/error UX.
- ⏳ D9. Perform metadata/OG pass on all key pages.

---

## E) Operations and deployment consistency

### Completed
- ✅ E1. Deployment runbook exists for Vercel + Neon.
- ✅ E2. Deployment and smoke scripts exist in `scripts/`.
- ✅ E3. Schema drift troubleshooting guidance exists.

### To do
- ⏳ E4. Standardize one production schema strategy (migrations-first vs db-push fallback) and codify it.
- ⏳ E5. Add CI gates for lint/build/tests + optional smoke-test job.
- ⏳ E6. Add environment-specific endpoint guardrails for seed/simulation mutators.
- ⏳ E7. Add structured error contract for API routes (consistent JSON shape).
- ⏳ E8. Add production-ready logging + basic event IDs for cross-route tracing.

---

## Recommended sprint sequence

### Sprint S6 (stability + execution controls)
- A3, A4, A5
- B5, B6
- E4, E5

### Sprint S7 (analytics depth)
- B8, B9
- C5, C6, C7

### Sprint S8 (operator controls + content)
- C8, C9, C10
- D5, D6, D7
- E6, E7, E8

### Sprint S9 (website conversion polish)
- D8, D9
- Final UX polish and docs refresh

