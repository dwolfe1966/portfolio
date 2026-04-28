# Product Backlog (Execution Plan)

Last updated: 2026-04-28

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
- 🚧 Blocked (waiting on dependency)

## Active sprint: S9 (content, conversion, and polish)

| ID | Item | Owner | Size | Sprint | Status | Acceptance criteria |
|---|---|---|---|---|---|---|
| C18 | Campaign workflow pages (`/acquisition/campaigns`, `/acquisition/create`, `/acquisition/campaigns/[id]`) | DW | M | S8 | ✅ | Operators can list campaigns, create new campaigns, and inspect campaign detail state/cell/activity data. |
| C19 | Operator override controls (budget locks + max-shift tuning) | DW | M | S8 | ✅ | Dashboard exposes explicit override controls and persists operator actions in audit log. |
| C20 | Scenario-level controls + Monte Carlo distribution outputs | DW | M | S8 | ✅ | Acquisition simulation supports scenario settings and distribution results for planning confidence. |
| C8 | Guardrails UI (approval threshold/max-shift/cooldown) | DW | S | S8 | ✅ | Guardrail controls are editable and reflected in run behavior. |
| C9 | Manual override controls + persisted override logs | DW | S | S8 | ✅ | Override actions are visible, reversible, and audit-logged. |
| C10 | Scenario save/load presets | DW | S | S8 | ✅ | Users can save named acquisition scenarios and rerun them reliably. |
| E6 | Environment-specific endpoint guardrails | DW | S | S8 | ✅ | Seed/simulation mutator endpoints are environment-gated. |
| E7 | Structured API error contract | DW | S | S8 | 🟡 | API responses follow consistent JSON error shape across routes. (Core routes complete; continue harmonizing legacy endpoints.) |

### S8 & S9 status snapshot (2026-04-28)

| Sprint | Completed | In progress | Remaining |
|---|---|---|---|
| S8 | C8, C9, C10, C18, C19, C20, E6 | E7 | — |
| S9 | A6, D6, D8, D9, D12 | D7, B13, E8 | — |

Notes:
- New remote spec folders referenced on 2026-04-28 (`docs/assets - 4-27`, `docs/specs--updated-4-27`) returned GitHub "Page not found" from this environment; statuses above were validated against the current repository implementation.

---

## Acquisition spec intake note

Spec set reviewed from user-provided material on 2026-04-24:
- Codex Implementation Specification – Site & Demo Enhancements
- Refinement Specification for David Wolfe Portfolio
- Visual mockups for lifecycle/acquisition flow, simulation lab, and IA/layout

Detailed analysis: `docs/acq-app-specs/spec-impact-summary.md`.

---

## Spec impact matrix (newly confirmed scope)

| Spec theme | Backlog impact |
|---|---|
| Sticky 5-item nav + mobile hamburger | D10 (new) |
| Pipeline + acquisition flow diagrams | C16 (new), D11 (new) |
| Interactive scoring weights with lock/rebalance | B10 (new) |
| Variable definitions/data dictionary panel | B11 (new) |
| Simulation charts/funnel visuals with low-clutter style | B12 (new), C17 (new) |
| Acquisition pages (campaigns/create/detail/dashboard) + operator controls | C18, C19, C20 (new) |
| Contact form + anti-spam + UX states | D8 (existing, now priority raised) |
| Copy cleanup + contextual tooltips + first-run intro modal | D12, B13 (new) |
| About section informed by LinkedIn profile | D14 (new) |
| Richer business context + advanced graph visuals in demo explanations | B14, B15 (new) |

---

## A) Backlog governance and planning discipline

### Completed
- ✅ A1. Established staged app IA for both domains (overview / inputs / simulations / outputs).
- ✅ A2. Added route/API inventory and deployment notes in README.
- ✅ A3/A4/A5. Added canonical backlog structure with owner/status/size/sprint criteria.
- ✅ A6. Add release checklists (pre-release, release, post-release) linked to this backlog.

### To do
- ✅ A7. Normalize top-level app route contexts (`/lifecycle/*` + `/acquisition/*`) and finalize lifecycle-first route structure.
- ✅ A8. Normalize API namespaces (`/api/lifecycle/*` + `/api/acquisition/*`) and update lifecycle UI surfaces to use namespaced endpoints.
- ✅ A9. Migrate lifecycle web routes from `/demo/*` to `/lifecycle/*` and minimize legacy `/demo` surface via redirects.

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
- ✅ B10. Implement interactive `ScoringSettings` panel (slider + numeric + lock + auto-rebalance).
- ✅ B11. Add `VariableDefinitions` panel (input/output definitions with examples).
- ✅ B12. Add simulation visualizations (pipeline bars + funnel + trend chart) with low-clutter styling.
- ⏳ B13. Add contextual tooltips and first-run intro modal in demo workspace.
- 🟡 B14. Add business-context explanation blocks in demo flows (why users/entities/change-events matter commercially).
- ✅ B15. Explore advanced graph-based dataflow visualizations beyond current topology map (multi-hop relationships, influence paths, and cluster views).

---

## C) Acquisition app maturity

### Completed
- ✅ C1. Acquisition staged IA exists (`/acquisition/*`).
- ✅ C2. Campaign bootstrap, iteration loop, and insights panels are wired through API routes.
- ✅ C3. Overview includes architecture modules and data-flow framing.
- ✅ C4. Outputs page includes empty/schema-guidance behavior.

### In progress
- 🟡 C5. Add higher-fidelity insights metrics in outputs panel (initial summary expansion).

### To do (core maturity)
- ⏳ C6. Add creative-level and audience-level trend comparisons over iterations.
- ⏳ C7. Add budget activity timeline chart (with reason + before/after deltas).
- ✅ C8. Add configurable guardrails UI (approval threshold, max shift policy, cooldown window).
- ✅ C9. Add manual override controls and persist override actions to audit log.
- ✅ C10. Add scenario save/load presets for repeatable acquisition experiments.

### To do (spec-driven expansions)
- 🚧 C11. Add ad-connector abstraction layer (stub + pluggable provider interfaces for Google/Meta).
- 🚧 C12. Add multivariate cell management (creative × audience/keyword matrix explorer with significance hints).
- 🚧 C13. Add CAC-vs-LTV policy engine controls (target ratio bands + auto-pause thresholds + approval cap).
- 🚧 C14. Add campaign state machine UX (`DRAFT → TESTING → SCALING → PAUSED`) with explicit transition history.
- 🚧 C15. Add audit feed page (agent action log with filters by action type, actor, and time window).
- ✅ C16. Add `AcquisitionFlowDiagram` visual to case-study and acquisition workspace.
- ✅ C17. Add acquisition simulation charts for impressions/clicks/conversions/CAC/ROAS over time.
- ✅ C18. Add campaign CRUD UX pages (`/acquisition/campaigns`, `/acquisition/create`, `/acquisition/campaigns/[id]`).
- ✅ C19. Add operator override controls (budget locks, max-shift constraint tuning) in dashboard.
- ✅ C20. Add scenario-level Monte Carlo controls and distribution output panels.

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
- ✅ D6. Add 2–3 new project case studies beyond lifecycle/acquisition.
- 🟡 D7. Add richer visual artifacts in case studies (architecture diagrams, screenshots, KPI callouts).
- ✅ D8. Add contact form delivery path with spam mitigation and success/error UX.
- ✅ D9. Perform metadata/OG pass on all key pages.
- ✅ D10. Add responsive mobile hamburger behavior to top nav while preserving 5-item IA.
- ✅ D11. Embed lifecycle pipeline diagram on project/demo overview and acquisition flow diagram on project page.
- ✅ D12. Copy de-duplication pass across Home/About/Projects/Demo pages to remove repeated phrasing.
- 🟡 D13. Run visual design agent review for Home/About/Lifecycle/Acquisition and apply imagery + infographic upgrades.
- ✅ D14. Enrich About section with LinkedIn profile context (career highlights, credibility signals, and profile linkage).

---

## E) Operations and deployment consistency

### Completed
- ✅ E1. Deployment runbook exists for Vercel + Neon.
- ✅ E2. Deployment and smoke scripts exist in `scripts/`.
- ✅ E3. Schema drift troubleshooting guidance exists.
- ✅ E4. Migrations-first strategy codified in docs + migrations folder.
- ✅ E5. CI workflow added for lint/test/build gates.

### To do
- ✅ E6. Add environment-specific endpoint guardrails for seed/simulation mutators.
- 🟡 E7. Add structured error contract for API routes (consistent JSON shape, including remaining legacy endpoints).
- 🟡 E8. Add production-ready logging + basic event IDs for cross-route tracing (baseline helper + contact route integrated).

---

## Next sprint sequence

### Sprint S7 (structure alignment + spec-priority UX + analytics)
- ✅ A7, A8, A9
- ✅ B10, B11, B12
- ✅ C16, C17
- ✅ D10, D11

### Sprint S8 (operator controls + acquisition workflows)
- ✅ C18, C19, C20
- ✅ C8, C9, C10
- ✅ E6
- 🟡 E7

### Sprint S9 (content, conversion, and polish)
- ✅ D6, D8, D9, D12
- 🟡 D7
- ⏳ B13
- 🟡 E8
- ✅ A6
