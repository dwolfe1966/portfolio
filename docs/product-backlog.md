# Product Backlog (Execution Plan)

Last updated: 2026-05-07

This backlog is the canonical source of truth for the portfolio, product-app, workspace, and performance-business workstreams.

## Workstream map
- **A**: Backlog governance and planning discipline
- **B**: Lifecycle app hardening
- **C**: Acquisition app maturity
- **D**: Website/content expansion
- **E**: Operations and deployment consistency
- **F**: Product app design system
- **G**: Auction Desk product app
- **H**: Pricing Experimentation Control Tower product app
- **I**: Retention Risk Command Center product app
- **J**: Expansion Revenue Intelligence product app
- **K**: Account-aware workspace platform
- **L**: Production integration and agent execution robustness
- **M**: Performance-based revenue business model

## Status legend
- ✅ Completed
- 🟡 In progress
- ⏳ To do
- 🚧 Blocked (waiting on dependency)

## Active sprint: S10 (account-aware product apps and robustness planning)

| ID | Item | Owner | Size | Sprint | Status | Acceptance criteria |
|---|---|---|---|---|---|---|
| K1 | Account login and registration | DW | M | S10 | ✅ | Users can register, log in, receive a signed account session, and attach to the default workspace. |
| K2 | Account-scoped datasets | DW | M | S10 | ✅ | Imported workspace datasets are associated with the account that created them while anonymous users can still use shared sample data. |
| K3 | Account-scoped workspace source configs and presets | DW | M | S10 | ✅ | Mapping configs, saved presets, and source setup are visible to their owner plus shared defaults. |
| K4 | Account-scoped lifecycle activity and import logs | DW | S | S10 | ✅ | Lifecycle imports and activity can be filtered to the logged-in account. |
| K5 | Account-scoped ad connections | DW | S | S10 | ✅ | Google Ads connection rows are attached to the account session. |
| K6 | Per-app data source selection | DW | M | S10 | ✅ | Lifecycle, Acquisition, Auction, Pricing, Retention, and Expansion can track sample vs imported active data source per account. |
| K7 | Product-app source panels | DW | M | S10 | ✅ | Each product app exposes sample data, account-owned imported datasets, active source status, and switch feedback. |
| K8 | End-to-end workspace data verification | DW | M | S10 | 🟡 | Walk each product app anonymously and logged in; verify sample fallback, imported dataset apply flow, and no cross-account leakage. |
| K9 | Account-scope regression tests | DW | M | S10 | ✅ | Add tests for datasets, presets, source configs, active selections, ad connections, and import logs with logged-in and anonymous paths. |
| K10 | Workspace ownership and visibility labels | DW | S | S10 | ✅ | Workspace inventories and product selectors label shared sample/default data, personal account-owned data, and future team/shared visibility. |
| K11 | Multi-workspace/team account model | DW | S | S10 | ✅ | Define future workspace membership, roles, visibility, credential grants, and client hierarchy direction before collaboration work begins. |
| D15 | Product-oriented website language pass | DW | S | S10 | ✅ | Public copy describes the surfaces as tools/products/apps rather than demos, while internal route names remain stable. |
| L0 | Cross-app enterprise operating model | DW | M | S11 | ✅ | Define how Lifecycle, Acquisition, Auction, Pricing, Retention, and Expansion operate in enterprise workflows, including integrations, action surfaces, and revenue proof. |
| L1 | Lifecycle production integration architecture | DW | L | S11 | ✅ | Define connector model for ESPs, enterprise data stores, event ingestion, identity resolution, consent, and outbound delivery. |
| L2 | Lifecycle enterprise ingestion architecture | DW | M | S11 | ✅ | Define source contracts, sync modes, mapping validation, cursoring, replay, dead-letter handling, and health states for enterprise data ingestion. |
| L3 | Lifecycle delivery connector architecture | DW | M | S11 | ✅ | Define SMTP and ESP delivery contracts, send modes, suppression/bounce/unsubscribe handling, engagement/conversion event capture, idempotency, and delivery health. |
| L6 | Acquisition production integration architecture | DW | L | S11 | ⏳ | Define connector model for Google Ads, Microsoft Ads, Meta Ads, budget operations, campaign state sync, and policy-bounded agent actions. |
| M1 | Performance business operating model | DW | M | S11 | ⏳ | Define customer onboarding, baseline measurement, attribution, lift calculation, fee triggers, and risk controls for revenue-share engagements. |

### S8-S10 status snapshot (2026-05-07)

| Sprint | Completed | In progress | Remaining |
|---|---|---|---|
| S8 | C8, C9, C10, C18, C19, C20, E6, E7 | — | — |
| S9 | A6, B7, B13, B14, D6, D8, D9, D12, E8 | D7 | — |
| S10 | K1, K2, K3, K4, K5, K6, K7, K9, K10, K11, D15 | K8 | — |

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
| Richer business context + advanced graph visuals in product-app explanations | B14, B15 (new) |

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
- ✅ B3. Health endpoint exists for product-app DB readiness checks.
- ✅ B4. Scoring explainability UI and assumptions persistence baseline are present.

### Completed
- ✅ B5. Add tests for assumptions lifecycle logic.
- ✅ B6. Add tests for scoring reproducibility logic.

### To do
- ✅ B7. Add regression tests for schema fallback paths (`P2021`/`P2022`) and structured compatibility response payloads.
- ✅ B8. Add richer outputs analytics (run-over-run trend, segment breakdown, filter presets).
- ✅ B9. Add operator audit panel linking run → top candidates → generated message chain.
- ✅ B10. Implement interactive `ScoringSettings` panel (slider + numeric + lock + auto-rebalance).
- ✅ B11. Add `VariableDefinitions` panel (input/output definitions with examples).
- ✅ B12. Add simulation visualizations (pipeline bars + funnel + trend chart) with low-clutter styling.
- ✅ B13. Add contextual tooltips and first-run intro modal in product workspace.
- ✅ B14. Add business-context explanation blocks in product flows (why users/entities/change-events matter commercially).
- ✅ B15. Explore advanced graph-based dataflow visualizations beyond current topology map (multi-hop relationships, influence paths, and cluster views).
- ✅ B16. Improve Monte Carlo UX feedback in simulations (visible run count, refresh confirmation, and distribution summary cues).
- ✅ B17. Add interest relations visibility on Lifecycle Inputs alongside sample users and entities.
- ✅ B18. Derive estimated revenue from funnel (purchaseRate × avgOrderValue × highPriorityLift); replaced standalone `revenuePerHighPriority` editable input with a `highPriorityLift` multiplier so funnel inputs and revenue projection stay internally consistent.

---

## C) Acquisition app maturity

### Completed
- ✅ C1. Acquisition staged IA exists (`/acquisition/*`).
- ✅ C2. Campaign bootstrap, iteration loop, and insights panels are wired through API routes.
- ✅ C3. Overview includes architecture modules and data-flow framing.
- ✅ C4. Outputs page includes empty/schema-guidance behavior.

### Completed
- ✅ C5. Add higher-fidelity insights metrics in outputs panel (CTR, conversion rate, LTV/CAC, budget utilization, target comparison).

### To do (core maturity)
- ✅ C6. Add creative-level and audience-level trend comparisons over iterations.
- ✅ C7. Add budget activity timeline chart (with reason + source/destination cells).
- ✅ C8. Add configurable guardrails UI (approval threshold, max shift policy, cooldown window).
- ✅ C9. Add manual override controls and persist override actions to audit log.
- ✅ C10. Add scenario save/load presets for repeatable acquisition experiments.

### To do (spec-driven expansions)
- ✅ C21. Audience test-cell management area shipped (commit f5b44d4): new AudienceTemplate model + library UX at `/acquisition/audiences` with CRUD, JSON targeting editor, usage rollup, and side-nav entry.
- ✅ C21.1. Campaign Create flow wired to audience templates (commit 84e7416): operators can pick from the library or fall back to built-in defaults; selected templates are cloned into AudienceSegment rows with templateId provenance.
- ✅ C11. Ad-connector abstraction shipped end-to-end across three phases: foundation + AdConnector interface (73ed034), Google OAuth flow + Connections UI (fc32f21), real GoogleAdsConnector with live-data detail page (544d2d6). Read-only against test customers; refuses non-test customers at the connector layer. Meta-Ads connector remains as future work (currently dispatches to simulated).
- ✅ C12. Add multivariate cell management (creative × audience/keyword matrix explorer with significance hints).
- ✅ C13. Add CAC-vs-LTV policy engine controls (target ratio bands + auto-pause thresholds + approval cap).
- ✅ C14. Add campaign state machine UX (`DRAFT → TESTING → SCALING → PAUSED`) with explicit transition history.
- ✅ C15. Add audit feed page (agent action log with filters by action type, actor, and time window).
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

### Completed
- ✅ D5. Expand writing inventory with additional essays/previews.

### To do
- ✅ D6. Add 2–3 new project case studies beyond lifecycle/acquisition.
- ✅ D7. Add richer visual artifacts in case studies (artifact panels with outcome strips, decision frames, evidence links, and guardrails).
- ✅ D8. Add contact form delivery path with spam mitigation and success/error UX.
- ✅ D9. Perform metadata/OG pass on all key pages.
- ✅ D10. Add responsive mobile hamburger behavior to top nav while preserving 5-item IA.
- ✅ D11. Embed lifecycle pipeline diagram on project/product overview and acquisition flow diagram on project page.
- ✅ D12. Copy de-duplication pass across Home/About/Projects/Product pages to remove repeated phrasing.
- ✅ D13. Run visual design review for Home/About/Lifecycle/Acquisition and apply hierarchy, focus-state, card, status, and infographic polish.
- ✅ D14. Enrich About section with LinkedIn profile context (career highlights, credibility signals, and profile linkage).

---

## G) Auction Desk Product App (Tier C)

Third product app — interactive Vickrey-style auction simulator for a closed advertising ecosystem. Spec at [`docs/auction-demo-spec.md`](./auction-demo-spec.md).

### Completed
- ✅ G1. Phase A — pure auction engine (`lib/auction-engine.ts`) + 8-model schema + migration + 22 unit tests covering ranking, reserve, pacing, behavior modes, KPI math, suggestReserve, and HHI/churn (`706c1a5`).
- ✅ G2. Phase B — validation helpers, advertiser/slot/bid CRUD APIs, and run orchestrator that persists results in a single transaction (`0eaf3a6`).
- ✅ G3. Phase C — third-app shell wiring, 7 pages, editor components, SSE live ticker (`fb4bead`).
- ✅ G4. Phase E (partial) — Vickrey case study flipped to live + appHref + home-page launch card (`bcc898a`).
- ✅ G5. Phase D — marketplace health page (trends, HHI, churn) + reserve auto-tuning with one-click apply (`206f5dd`).

---

## H) Pricing Experimentation Control Tower Product App

Fourth product app — pricing experiment operating system for segmented price/packaging tests with margin, churn, support-load, and holdout guardrails. Spec at [`docs/pricing-demo-spec.md`](./pricing-demo-spec.md).

### Completed
- ✅ H1. Phase A — pure pricing experiment engine + schema + validation/tests.
- ✅ H2. Phase B — pricing inputs, segment/variant libraries, experiment CRUD, and side-nav shell wiring.
- ✅ H3. Phase C — simulation runs, KPI outputs, segment-level results, and guardrail bands.
- ✅ H4. Phase D — decision queue, promote/extend/pause/rollback workflow, rationale capture, and audit feed.
- ✅ H5. Phase E — project/home integration, launch card support, empty/schema-fallback states, and visual polish.

---

## I) Retention Risk Command Center Product App

Fifth product app — account retention risk operating system for churn prediction, intervention planning, SLA ownership, and save-rate economics. Spec at [`docs/retention-demo-spec.md`](./retention-demo-spec.md).

### Completed
- ✅ I1. Phase A — pure retention risk engine, schema, migration, seeded account/playbook/policy data, and unit tests.
- ✅ I2. Phase B — run and intervention APIs with mutation guardrails, reset support, and product health endpoint.
- ✅ I3. Phase C — shell wiring plus overview, inputs, accounts, simulations, outputs, interventions, and audit pages.
- ✅ I4. Phase D — portfolio project integration, home-page launch card, and evidence links to live product surfaces.

---

## J) Expansion Revenue Intelligence Product App

Sixth product app — installed-base revenue intelligence system for expansion readiness, upsell motion selection, ARR economics, and auditability. Spec at [`docs/expansion-demo-spec.md`](./expansion-demo-spec.md).

### Completed
- ✅ J1. Phase A — pure expansion engine, schema, migration, seeded account/offer/policy data, and unit tests.
- ✅ J2. Phase B — run API, reset support, and product health endpoint.
- ✅ J3. Phase C — shell wiring plus overview, inputs, accounts, simulations, outputs, and audit pages.
- ✅ J4. Phase D — portfolio project integration, home-page launch card, and evidence links to live product surfaces.

---

## F) Product app design system

Cross-cutting UX/IA workstream covering the revenue product apps. Goal: make the tool experience visually and structurally distinct from the portfolio site.

Design direction: **Mission Control with monospace KPIs**. Full spec: [`docs/demo-design-system.md`](./demo-design-system.md).

### Completed
- ✅ F1. Persistent left vertical navigation rail and app shell wrapping for `/lifecycle/*` and `/acquisition/*` routes. Marketing chrome suppressed inside product routes.
- ✅ F2. Visual differentiation system shipped: design tokens scoped under `.demoAppShell`, monospace KPIs, denser typography/tables, status colors mapped to policy-engine bands, StatusDot/MetricChip/Breadcrumbs primitives, optional global status indicator in app header.
- ✅ F3. Portfolio↔product entry/exit treatment: launch cards on home and project detail pages establish intentional handoff; product breadcrumbs lead with `Portfolio` for one-click return.

---

## K) Account-aware workspace platform

Cross-product platform layer that turns the product apps from seeded examples into account-aware tools. The core product promise is: logged-in users can use their own workspace data, while anonymous visitors can still use sample data immediately.

### Completed
- ✅ K1. Replaced the lightweight workspace password flow with account registration, login, signed sessions, password hashing, and default workspace membership.
- ✅ K2. Added account ownership to imported workspace datasets so CSV and Google Sheets snapshots can belong to the user who created them.
- ✅ K3. Scoped workspace source configs, mapping presets, and saved app presets by account while preserving shared defaults.
- ✅ K4. Scoped lifecycle import logs and activity to account sessions.
- ✅ K5. Scoped ad account connections to account sessions.
- ✅ K6. Added per-app data-source selections for Lifecycle, Acquisition, Auction, Pricing, Retention, and Expansion.
- ✅ K7. Added product source panels that show sample data availability, account-owned imported datasets, active source status, and switch feedback.
- ✅ K9. Added account-scope regression tests and shared policy helpers for anonymous sample fallback, account-owned imports, active source selection, and import snapshot ownership.
- ✅ K10. Added ownership and visibility labels across workspace inventories, source detail pages, lifecycle import history, dashboard active selections, and product imported dataset selectors.
- ✅ K11. Defined the future multi-workspace/team account model in [`docs/multi-workspace-account-model.md`](./multi-workspace-account-model.md), including roles, visibility scopes, credential grants, audit boundaries, and migration path.

### To do
- 🟡 K8. Verify each product app end to end in both anonymous sample mode and logged-in imported-data mode.

---

## L) Production integration and agent execution robustness

Robustness workstream for moving from product tools to production customer infrastructure. The goal is to let customers connect their systems, define policy, and have David Wolfe agents operate revenue programs under measurable controls.

Enterprise app operating model: [`docs/enterprise-app-operating-model.md`](./enterprise-app-operating-model.md).

### Cross-app operating model
- ✅ L0. Defined how each app should operate in enterprise workflows, including integration surfaces, operational cadence, data mapping intelligence, real-time pricing implications, strategic retention/expansion workflows, and revenue-proof dashboards.

### Lifecycle tool robustness
- ✅ L1. Defined lifecycle production integration architecture in [`docs/lifecycle-production-integration-architecture.md`](./lifecycle-production-integration-architecture.md), including source ingestion, ESP/SMTP contracts, identity/consent controls, durable agent runbook, policy gates, and audit events.
- ✅ L2. Defined enterprise ingestion architecture in [`docs/lifecycle-enterprise-ingestion-architecture.md`](./lifecycle-enterprise-ingestion-architecture.md), including source kinds, sync modes, mapping validation, cursoring, replay, dead-letter handling, and source health.
- ✅ L3. Defined delivery connector architecture in [`docs/lifecycle-delivery-connector-architecture.md`](./lifecycle-delivery-connector-architecture.md), including SMTP/ESP contracts, send modes, suppression/bounce/unsubscribe handling, delivery/engagement/conversion event ingestion, idempotency, and provider health.
- ⏳ L4. Add identity resolution and consent controls so user/entity matching respects customer IDs, hashed emails, permissions, geography, opt-out state, and channel eligibility.
- ⏳ L5. Add lifecycle agent runbooks: detect event, score opportunity, draft message, request approval when needed, trigger send, observe result, and update the audit trail.

### Acquisition tool robustness
- ⏳ L6. Expand ad connector abstraction from read-only Google test accounts to production-safe Google Ads, Microsoft Ads, and Meta Ads integrations.
- ⏳ L7. Add write-operation safety for campaign creation, budget edits, pause/resume, creative upload, audience sync, and rollback.
- ⏳ L8. Add policy gates for spend caps, max daily shift, CAC/LTV thresholds, confidence, cooldowns, approvals, and emergency stop.
- ⏳ L9. Add cross-channel normalization for spend, impressions, clicks, conversions, attribution windows, campaign states, and naming conventions.
- ⏳ L10. Add acquisition agent runbooks: observe performance, diagnose cell movement, propose action, apply approved action, monitor reversal conditions, and log revenue impact.

### Cross-tool agent platform
- ⏳ L11. Add connector health checks, permission audits, sync status, credential rotation, and customer-visible integration diagnostics.
- ⏳ L12. Add durable job queues for ingestion, scoring, generation, send/apply actions, retries, idempotency, and dead-letter review.
- ⏳ L13. Add human approval queues and escalation paths for high-risk revenue actions.
- ⏳ L14. Add tenant isolation, secrets management, audit export, and compliance posture needed for partner/customer infrastructure.

---

## M) Performance-based revenue business model

Business-model workstream for using the tools and agents to operate customer revenue programs and earn compensation when measurable performance improves.

### To do
- ⏳ M1. Define the performance contract: baseline period, eligible revenue, attribution logic, incrementality method, exclusions, clawbacks, reporting cadence, and payout schedule.
- ⏳ M2. Define customer onboarding: system access, data permissions, channel credentials, consent review, billing data, historical baselines, and initial policy constraints.
- ⏳ M3. Define measurement for lifecycle: triggered users, messages sent, conversions, incremental revenue, unsubscribe/spam risk, and holdout/control methodology.
- ⏳ M4. Define measurement for acquisition: spend under management, CAC, LTV/CAC, ROAS, conversion quality, budget saved, and incremental profitable revenue.
- ⏳ M5. Define operating packages: audit-only, recommendation-only, human-approved execution, and agent-managed execution.
- ⏳ M6. Define risk controls: spending limits, customer approvals, kill switches, compliance review, channel reputation limits, and revenue-quality checks.
- ⏳ M7. Define pricing model options: setup fee plus revenue share, managed-spend fee plus performance kicker, or success fee against agreed revenue lift.

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
- ✅ E7. Add structured error contract for API routes (consistent JSON shape, including remaining legacy endpoints).
- ✅ E8. Add production-ready logging + basic event IDs for cross-route tracing across lifecycle/acquisition API routes.

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
- ✅ D7
- ✅ B13, B14
- ✅ B7, E7, E8
- ✅ A6

### Sprint S10 (account-aware product apps)
- ✅ K1, K2, K3, K4, K5, K6, K7, K9, K10, K11
- 🟡 K8

### Sprint S11 (production integrations and performance model)
- ✅ L0, L1, L2, L3
- ⏳ L4, L5
- ⏳ L6, L7, L8, L9, L10
- ⏳ M1, M2, M3, M4
