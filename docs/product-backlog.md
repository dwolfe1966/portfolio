# Product Backlog (Execution Plan)

Last updated: 2026-05-16

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

## Active sprint: S20 (customer workspace administration)

S20 turns the protected workspace into a more credible enterprise administration surface. The goal is to make account ownership, member visibility, role posture, workspace governance, and later invite/edit controls visible before customer collaboration and credential delegation become live workflows.

| ID | Item | Owner | Size | Sprint | Status | Acceptance criteria |
|---|---|---|---|---|---|---|
| K1 | Account login and registration | DW | M | S10 | ✅ | Users can register, log in, receive a signed account session, and attach to the default workspace. |
| K2 | Account-scoped datasets | DW | M | S10 | ✅ | Imported workspace datasets are associated with the account that created them while anonymous users can still use shared sample data. |
| K3 | Account-scoped workspace source configs and presets | DW | M | S10 | ✅ | Mapping configs, saved presets, and source setup are visible to their owner plus shared defaults. |
| K4 | Account-scoped lifecycle activity and import logs | DW | S | S10 | ✅ | Lifecycle imports and activity can be filtered to the logged-in account. |
| K5 | Account-scoped ad connections | DW | S | S10 | ✅ | Google Ads connection rows are attached to the account session. |
| K6 | Per-app data source selection | DW | M | S10 | ✅ | Lifecycle, Acquisition, Auction, Pricing, Retention, and Expansion can track sample vs imported active data source per account. |
| K7 | Product-app source panels | DW | M | S10 | ✅ | Each product app exposes sample data, account-owned imported datasets, active source status, and switch feedback. |
| K8 | End-to-end workspace data verification | DW | M | S10 | ✅ | Walk each product app anonymously and logged in; verify sample fallback, imported dataset apply flow, and no cross-account leakage. |
| K9 | Account-scope regression tests | DW | M | S10 | ✅ | Add tests for datasets, presets, source configs, active selections, ad connections, and import logs with logged-in and anonymous paths. |
| K10 | Workspace ownership and visibility labels | DW | S | S10 | ✅ | Workspace inventories and product selectors label shared sample/default data, personal account-owned data, and future team/shared visibility. |
| K11 | Multi-workspace/team account model | DW | S | S10 | ✅ | Define future workspace membership, roles, visibility, credential grants, and client hierarchy direction before collaboration work begins. |
| D15 | Product-oriented website language pass | DW | S | S10 | ✅ | Public copy describes the surfaces as tools/products/apps rather than demos, while internal route names remain stable. |
| L0 | Cross-app enterprise operating model | DW | M | S11 | ✅ | Define how Lifecycle, Acquisition, Auction, Pricing, Retention, and Expansion operate in enterprise workflows, including integrations, action surfaces, and revenue proof. |
| L1 | Lifecycle production integration architecture | DW | L | S11 | ✅ | Define connector model for ESPs, enterprise data stores, event ingestion, identity resolution, consent, and outbound delivery. |
| L2 | Lifecycle enterprise ingestion architecture | DW | M | S11 | ✅ | Define source contracts, sync modes, mapping validation, cursoring, replay, dead-letter handling, and health states for enterprise data ingestion. |
| L3 | Lifecycle delivery connector architecture | DW | M | S11 | ✅ | Define SMTP and ESP delivery contracts, send modes, suppression/bounce/unsubscribe handling, engagement/conversion event capture, idempotency, and delivery health. |
| L4 | Lifecycle operations connector surface | DW | M | S11 | ✅ | Workspace Connections explains the production lifecycle object connectors, delivery connectors, engagement/conversion observation, revenue proof, and hardening path. |
| L5 | Lifecycle connector contracts and fake providers | DW | L | S11 | ✅ | Add typed connector interfaces and fake warehouse, webhook, ESP, SMTP, engagement, and conversion providers with health, sync, preview, and audit behavior. |
| L5.1 | Lifecycle connector health and preview API | DW | M | S11 | ✅ | Expose fake lifecycle connector health, schema discovery, preview rows, sync dry-run, delivery test-send, and observation preview through account-aware workspace APIs. |
| L5.2 | Persist lifecycle connector configs and audit events | DW | L | S11 | ✅ | Add workspace-scoped connector config, health snapshot, credential-grant placeholder, sync run, and connector audit event persistence before real providers. |
| L6 | Acquisition production integration architecture | DW | L | S11 | ✅ | Define connector model for Google Ads, Microsoft Ads, Meta Ads, budget operations, campaign state sync, and policy-bounded agent actions. |
| L7 | Acquisition write-operation safety contract | DW | M | S11 | ✅ | Add typed safety evaluation for campaign creation, budget edits, pause/resume, creative upload, audience sync, and rollback before provider mutation work. |
| L8 | Acquisition write-policy gates | DW | M | S11 | ✅ | Add policy gates for spend caps, max daily shift, CAC/LTV thresholds, confidence, cooldowns, approvals, and emergency stop before provider mutation work. |
| L9 | Acquisition cross-channel normalization | DW | M | S11 | ✅ | Normalize spend, impressions, clicks, conversions, attribution windows, campaign states, channels, and naming conventions across ad providers. |
| L10 | Acquisition agent runbook planner | DW | M | S11 | ✅ | Add runbook planner for observe, diagnose, propose, check policy, request approval, apply approved action, monitor reversal, and log revenue impact. |
| L5.3 | Lifecycle identity and consent gate | DW | M | S11 | ✅ | Add fail-closed identity, consent, suppression, geography, event freshness, dedupe, and holdout controls before lifecycle delivery. |
| L5.4 | Lifecycle agent runbook planner | DW | M | S11 | ✅ | Add runbook planner for event detection, identity/consent, scoring, message draft, approval, delivery, observation, and revenue audit updates. |
| M1 | Performance business operating model | DW | M | S11 | ✅ | Define customer onboarding, baseline measurement, attribution, lift calculation, fee triggers, and risk controls for revenue-share engagements. |
| M2 | Performance customer onboarding runbook | DW | M | S11 | ✅ | Define system access, data permissions, channel credentials, consent review, billing data, historical baselines, launch states, and initial policy constraints. |
| M3 | Performance lifecycle measurement model | DW | M | S11 | ✅ | Define lifecycle triggered users, message funnel, conversion attribution, incremental revenue, unsubscribe/spam risk, and holdout/control methodology. |
| M4 | Performance acquisition measurement model | DW | M | S11 | ✅ | Define spend under management, CAC, LTV:CAC, ROAS, conversion quality, budget saved, action impact, and incremental profitable revenue. |
| M5 | Performance operating packages | DW | M | S11 | ✅ | Define audit-only, recommendation-only, human-approved execution, and agent-managed execution packages, transition gates, downgrade triggers, and reporting. |
| M6 | Performance risk controls | DW | M | S11 | ✅ | Define spending limits, customer approvals, kill switches, compliance review, channel reputation limits, revenue-quality checks, rollback controls, and control states. |
| M7 | Performance pricing options | DW | M | S11 | ✅ | Define setup fee plus revenue share, managed-spend fee plus performance kicker, success fee against agreed lift, advisory retainer options, fee caps, floors, and adjustments. |
| L11 | Connector diagnostics surface | DW | M | S11 | ✅ | Add customer-visible connector health, permission audit, sync status, credential-rotation placeholder, and diagnostic state checks for lifecycle connectors. |
| L12 | Durable agent job queue | DW | L | S11 | ✅ | Add workspace-scoped durable job queue primitives for ingestion, scoring, generation, delivery, provider writes, observation, measurement, retries, idempotency, and dead-letter review. |
| L13 | Human approval queue and escalation | DW | M | S11 | ✅ | Add workspace-scoped approval request primitives for high-risk revenue actions, approver metadata, proposed action payloads, due/expiry policy, escalation state, and decision audit fields. |
| L14 | Agent platform governance posture | DW | M | S11 | ✅ | Add tenant access decisions, secret redaction and rotation posture, audit export row shaping, and compliance posture checks for partner/customer infrastructure readiness. |
| L15 | Runbook-to-queue execution planner | DW | M | S12 | ✅ | Convert lifecycle/acquisition runbook current steps into durable job queue payloads, approval request payloads, wait/block states, priorities, and idempotency keys before worker orchestration. |
| L16 | Persist execution plans from app flows | DW | M | S12 | ✅ | Wire lifecycle generation and acquisition iteration flows to persist planned `AgentJob` and `AgentApprovalRequest` records from runbook execution plans. |
| L17 | Agent operations workspace view | DW | M | S12 | ✅ | Add customer-visible workspace view for queued jobs, pending approvals, dead-letter items, and governance posture with protected navigation. |
| L18 | Agent approval decision controls | DW | S | S13 | ✅ | Add workspace-scoped approve, reject, and cancel controls for open agent approval requests from the protected operations view. |
| L19 | Agent job transition controls | DW | M | S13 | ✅ | Add worker-safe manual claim, complete, fail, cancel, and requeue controls for queued/running/terminal agent jobs from the protected operations view. |
| L20 | Approval-to-job continuation | DW | M | S13 | ✅ | Enqueue idempotent acquisition provider-write jobs from approved approval requests using the original proposed action payload. |
| L21 | Lifecycle agent role model | DW | S | S13 | ✅ | Define lifecycle agent roles for event watching, identity/consent, scoring, message strategy, approval, delivery, observation, and revenue attribution with readiness gates. |
| L22 | Lifecycle change-event trigger planner | DW | M | S13 | ✅ | Convert detected lifecycle change events into identity/consent decisions, scored runbooks, role ownership, and durable execution plans for generation or delivery jobs. |
| L23 | Simulated change events enqueue lifecycle agent jobs | DW | M | S13 | ✅ | Wire simulated lifecycle deltas to fan out across interested users and persist idempotent role-owned generation jobs when identity, consent, and score gates pass. |
| L24 | Imported change events enqueue lifecycle agent jobs | DW | M | S13 | ✅ | Wire CSV/Google Sheets lifecycle imports to fan out imported change events and persist idempotent role-owned generation jobs with compatibility fallback. |
| L25 | Agent worker run-once executor | DW | M | S13 | ✅ | Add a safe fake executor that claims one queued job, dispatches by app/job type, completes simulated work, or retries/dead-letters failures through existing queue policy. |
| L26 | Agent operations execute control | DW | S | S13 | ✅ | Add a protected operations control that executes one queued job through the run-once worker and refreshes the agent operations view. |
| L27 | Agent execution result visibility | DW | S | S13 | ✅ | Surface completed worker executor/action/provider-mode summaries and failure codes directly in the agent operations job detail rows. |
| L28 | Scheduled agent worker trigger | DW | M | S13 | ✅ | Add a protected batch worker trigger that rotates across configured queues, drains a bounded number of jobs, and supports workspace-session or scheduler-secret execution. |
| L29 | Vercel cron worker deployment wiring | DW | S | S13 | ✅ | Register the batch worker as a Hobby-safe daily Vercel cron, support GET invocations, and document production `CRON_SECRET` setup. |
| L30 | Scheduled worker operations visibility | DW | S | S13 | ✅ | Surface cron cadence, worker endpoint, batch size, scheduler auth readiness, and queue coverage in the protected agent operations view. |
| L31 | Manual scheduled-batch execution control | DW | S | S13 | ✅ | Add a protected operations control that runs the same bounded batch worker path used by cron and refreshes queue state. |
| L32 | Scheduled worker queue allowlist | DW | S | S13 | ✅ | Constrain batch worker queue input to the known lifecycle/acquisition allowlist and report skipped disallowed queue names. |
| L33 | Scheduled worker skipped-queue observability | DW | S | S13 | ✅ | Log skipped disallowed batch queues as warnings with requested/allowed queue counts and skipped queue names. |
| L34 | Explicit disallowed batch no-op | DW | S | S13 | ✅ | Prevent all-disallowed explicit queue requests from falling back to default queues; return a skipped-only no-op result instead. |
| L35 | Scheduled worker auth warning | DW | S | S13 | ✅ | Add a visible operations warning when no scheduler bearer secret is configured and cron calls would be rejected. |
| L36 | Acquisition provider-write generalization plan | DW | S | S13 | ✅ | Define the first non-lifecycle agent generalization target, including queue ownership, executor mode, approval gates, rollback expectations, and measurement outputs for acquisition provider writes. |
| L37 | Acquisition provider-write readiness contract | DW | S | S13 | ✅ | Add a tested code-facing readiness helper for acquisition provider-write generalization, covering queue ownership, execution mode progression, approval gates, rollback metadata, and measurement outputs. |
| L38 | Acquisition provider-write operations visibility | DW | S | S13 | ✅ | Surface acquisition provider-write readiness in Agent Operations, including execution mode, queue ownership, dry-run readiness, approved-mutation blockers, and follow-on queues. |
| L39 | Acquisition provider-write dry-run adapter foundation | DW | M | S14 | ✅ | Add a registered simulated dry-run adapter contract and worker path that returns provider-like diffs, permission checks, spend exposure, and rollback metadata without real provider mutation. |
| L40 | Google Ads provider-write dry-run adapter | DW | M | S14 | ✅ | Add a Google Ads dry-run adapter that builds offline campaign resource diffs, permission checks, mutate-shape metadata, spend exposure, rollback plan, and incomplete-context blockers without calling mutate endpoints. |
| L41 | Persist provider-write dry-run results | DW | M | S14 | ✅ | Persist provider-write dry-run diffs, permission checks, spend exposure, rollback metadata, blockers, warnings, and raw result payloads for operations review before any approved mutation path. |
| L42 | Provider-write measurement handoff | DW | M | S14 | ✅ | Create durable measurement handoff records from ready acquisition dry-runs and enqueue idempotent acquisition observation and measurement jobs with spend/revenue attribution context. |
| L43 | Provider dry-run detail audit view | DW | M | S14 | ✅ | Add a read-only operations detail page for persisted provider dry-runs, including permission checks, before/after diffs, rollback metadata, measurement handoff, raw payload, and activity-feed links. |
| L44 | Provider dry-run audit export | DW | S | S14 | ✅ | Add CSV evidence export for agent jobs, approvals, provider dry-runs, and measurement handoffs with provider, rollback, spend exposure, and related job fields. |
| L45 | Meta Ads provider-write dry-run adapter | DW | M | S14 | ✅ | Add a Meta Ads dry-run adapter that builds offline Graph API-shaped account, campaign, ad set, and ad diffs with permission checks, spend exposure, rollback plan, and incomplete-context blockers. |
| L46 | Provider account and object selection workflow | DW | L | S14 | ✅ | Rethink the Google Ads/Meta provider experience beyond OAuth: account selection, campaign/ad group or ad set/ad browse, ad-level inspection, performance reads, and selected provider IDs flowing into agent dry-runs. |
| L46.1 | Google Ads object inspection workflow | DW | M | S14 | ✅ | Add provider-neutral ad group/ad read contracts and a Google Ads connection detail workflow for selecting campaigns, inspecting ad groups and ads, viewing recent performance, and copying dry-run context IDs. |
| L46.2 | Meta Ads read-side workflow | DW | M | S14 | ✅ | Add Meta OAuth, read-only Meta connector, campaign/ad set/ad/performance inspection, and Meta-shaped dry-run context IDs on the shared provider detail workflow. |
| L46.3 | Provider selection approval handoff | DW | M | S14 | ✅ | Turn selected Google/Meta provider IDs into high-risk approval requests that reuse the existing acquisition provider-write dry-run queue path after approval. |
| L47 | Provider dry-run execution polish | DW | S | S14 | ✅ | Preserve approval idempotency inside provider-write dry-run payloads and expose selected provider context directly in Agent Operations approvals. |
| L48 | Production provider hardening plan | DW | S | S15 | ✅ | Define the mutation-readiness sequence, enablement gates, rollback expectations, and sandbox-first provider write rollout path before any live ad account mutation. |
| L49 | Provider credential grant model | DW | M | S15 | ✅ | Persist workspace-scoped credential grants with provider, account scope, capabilities, token health, rotation metadata, test/live mode, and owner approval state. |
| L50 | Provider health and permission preflight | DW | M | S15 | ✅ | Add operations preflight checks for credential availability, read/mutate permissions, selected object existence, policy readiness, and measurement readiness before approval or execution. |
| L51 | Mutation enablement gates | DW | M | S15 | ✅ | Add a tested helper that blocks approved mutations unless workspace, provider, account, operation, credential, dry-run, approval, rollback, idempotency, measurement, and emergency-stop gates pass. |
| L52 | Sandbox write adapter contract | DW | L | S15 | ✅ | Define and implement a sandbox-only mutation adapter interface for narrow reversible approved writes after dry-run evidence is persisted and mutation gates pass. |
| L53 | Rollback retention and review surface | DW | M | S15 | ✅ | Persist rollback records with before-state, provider operation ids, retention windows, reversal status, and operator review controls. |
| L54 | Production write audit evidence | DW | M | S15 | ✅ | Extend audit export and activity views with mutation enablement decisions, sandbox mutation attempts, provider operation ids, rollback records, and emergency-stop state. |
| L55 | Customer onboarding readiness model | DW | M | S16 | ✅ | Add a tested workspace readiness helper covering required owners, commercial scope, source/channel grants, mapping approval, policy signoff, baseline approval, audit export, and launch mode. |
| L56 | Data quality gate model | DW | M | S16 | ✅ | Add reusable validation gates for required fields, row-count reconciliation, timestamp/currency semantics, identity match rate, freshness, duplicate/rejected rows, and source-of-truth ordering. |
| L57 | Baseline snapshot contract | DW | L | S16 | ✅ | Persist baseline definitions and frozen snapshots for eligible population, period, exclusions, metrics, confidence, and finance/data-owner approval before performance billing. |
| L58 | Revenue proof dashboard foundation | DW | L | S16 | ✅ | Surface customer-visible baseline, treatment/control, agent actions, outcomes, incremental lift, confidence flags, and export links across Lifecycle and Acquisition first. |
| L59 | Billable execution gate | DW | M | S16 | ✅ | Block performance-fee and agent-managed execution modes unless onboarding, data quality, baseline, policy, credential, rollback, audit, and emergency-stop gates pass. |
| L60 | Customer launch packet export | DW | M | S16 | ✅ | Generate an exportable launch packet with owners, connected systems, approved mappings, policy constraints, baseline snapshot, evidence exports, unresolved risks, and launch decision. |
| L61 | Workspace launch readiness operations panel | DW | M | S17 | ✅ | Compose onboarding, data quality, baseline, revenue proof, billable gate, and launch packet decisions into an operator-visible launch readiness panel on Agent Operations. |
| L62 | Persist launch readiness workspace state | DW | L | S17 | ✅ | Store customer owners, connected systems, mapping approvals, launch decisions, unresolved risks, and readiness evidence with workspace/account scope. |
| L63 | Launch packet export endpoint | DW | M | S17 | ✅ | Provide a protected export route for launch packet JSON/Markdown that reflects persisted workspace readiness state. |
| L64 | Billable gate UI enforcement | DW | M | S17 | ✅ | Disable or downgrade billable/performance execution controls in the product UI until launch readiness gates pass. |
| L65 | Customer readiness review workflow | DW | L | S17 | ✅ | Add review/approval states for customer owners, finance, data, channel, and operator approver signoff before launch mode escalation. |
| L66 | Workspace launch evidence settings panel | DW | M | S18 | ✅ | Workspace Settings exposes launch reviewer, connected-system, mapping, policy, baseline, and export evidence status with links into the operational surfaces. |
| L67 | Persist editable launch owner roster | DW | M | S18 | ✅ | Workspace owners can edit launch reviewers, roles, and approval ownership before readiness review. |
| L68 | Persist connected-system evidence inputs | DW | L | S18 | ✅ | Workspace admins can attach read/write grant evidence and token health proof for launch-connected systems. |
| L69 | Persist baseline and revenue proof inputs | DW | L | S18 | ✅ | Workspace admins can attach baseline, holdout, finance approval, and revenue proof evidence used by launch packets. |
| L70 | Launch readiness audit activity trail | DW | M | S18 | ✅ | Launch evidence changes are captured as workspace activity and exportable audit rows. |
| L71 | Workspace launch cockpit | DW | M | S19 | ✅ | Workspace Dashboard summarizes launch readiness status, max launch mode, packet exportability, next action, and recent launch evidence events with links to the right operating surfaces. |
| L72 | Launch packet preview panel | DW | M | S19 | ✅ | Workspace Dashboard exposes a readable packet preview with owners, systems, baseline, risks, and export links before download. |
| L73 | Launch next-action routing | DW | M | S19 | ✅ | Readiness blockers map to specific workspace forms, provider connection pages, agent operations queues, or packet export actions. |
| L74 | Customer-facing readiness report | DW | L | S19 | ✅ | A customer-readable report page explains current launch posture, evidence status, unresolved risks, and billing/execution implications. |
| K12 | Workspace member roster visibility | DW | M | S20 | ✅ | Workspace Account shows the current workspace roster, role labels, signed-in member status, and owner/admin/viewer governance counts before invite/edit flows. |
| K13 | Workspace role capability model | DW | M | S20 | ✅ | Workspace Account explains owner, admin, operator, viewer, and custom role capabilities with tested shared role policy metadata before invite/edit enforcement. |
| K14 | Workspace invite readiness gate | DW | M | S20 | ✅ | Workspace Account shows a read-only invite readiness decision that blocks invites without workspace membership, owner governance, owner/admin actor role, and custom-role review. |

### S8-S10 status snapshot (2026-05-07)

| Sprint | Completed | In progress | Remaining |
|---|---|---|---|
| S8 | C8, C9, C10, C18, C19, C20, E6, E7 | — | — |
| S9 | A6, B7, B13, B14, D6, D8, D9, D12, E8 | D7 | — |
| S10 | K1, K2, K3, K4, K5, K6, K7, K8, K9, K10, K11, D15 | — | — |
| S11 | L0, L1, L2, L3, L4, L5, L5.1, L5.2, L5.3, L5.4, L6, L7, L8, L9, L10, L11, L12, L13, L14, M1, M2, M3, M4, M5, M6, M7 | — | — |
| S12 | L15, L16, L17 | — | — |
| S13 | L18, L19, L20, L21, L22, L23, L24, L25, L26, L27, L28, L29, L30, L31, L32, L33, L34, L35, L36, L37, L38 | — | — |
| S14 | L39, L40, L41, L42, L43, L44, L45, L46, L46.1, L46.2, L46.3, L47 | — | — |
| S15 | L48, L49, L50, L51, L52, L53, L54 | — | — |
| S16 | L55, L56, L57, L58, L59, L60 | — | — |
| S17 | L61, L62, L63, L64, L65 | — | — |
| S18 | L66, L67, L68, L69, L70 | — | — |
| S19 | L71, L72, L73, L74 | — | — |
| S20 | K12, K13, K14 | — | — |

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
- ✅ C11. Ad-connector abstraction shipped end-to-end: provider interface, Google OAuth, Meta OAuth, guarded Google/Meta read connectors, connection detail object inspection, provider-shaped fallback snapshots, and workspace dataset handoff. Live provider reads are gated; writes remain dry-run/governed.
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
- ✅ K8. Completed the workspace data verification pass in [`docs/workspace-data-verification.md`](./workspace-data-verification.md), covering anonymous product route probes, protected workspace redirects, full test/build verification, account-owned imported-data scoping, sample fallback, and cross-account leakage checks.

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
- ✅ L4. Added the lifecycle operations connector surface in Workspace Connections, covering production object connectors, delivery connectors, observation, revenue proof, and hardening path.
- ✅ L5. Added lifecycle connector contracts and fake providers with health, sync, preview, delivery, observation, and audit behavior.
- ✅ L5.2. Persisted workspace-scoped lifecycle connector configs, health snapshots, sync/action runs, connector audit events, and credential-grant placeholders for the fake provider layer.
- ✅ L5.3. Added tested lifecycle identity and consent controls for canonical identity, channel address, eligibility, geography, opt-out/suppression, user/entity relationship, event freshness, dedupe, and holdout assignment.
- ✅ L5.4. Added tested lifecycle agent runbook planner for event detection, identity/consent, opportunity scoring, message draft, approval, delivery trigger, result observation, and revenue audit update.

### Acquisition tool robustness
- ✅ L6. Defined acquisition production integration architecture in [`docs/acquisition-production-integration-architecture.md`](./acquisition-production-integration-architecture.md), including provider scope, normalized objects, write safety, action types, agent runbook, audit events, and measurement.
- ✅ L7. Added a tested acquisition write-operation safety contract in `lib/acquisition.ts` covering dry-run, idempotency, credential, account, approval, protected-campaign, emergency-stop, and rollback prerequisites before paid-media provider mutations.
- ✅ L8. Added tested acquisition write-policy gates covering spend caps, max daily shift, approval threshold, CAC/LTV thresholds, confidence, cooldowns, approvals, emergency stop, and pause-action exceptions before provider mutations.
- ✅ L9. Added provider-agnostic ad normalization helpers for campaign state, channel inference, canonical naming, attribution windows, metric clamping, range filtering, and recomputed performance totals.
- ✅ L10. Added a tested acquisition agent runbook planner covering performance observation, cell diagnosis, action proposal, policy checks, approval waits, approved provider writes, reversal monitoring, and revenue attribution.

### Cross-tool agent platform
- ✅ L11. Added customer-visible lifecycle connector diagnostics covering health checks, permission audits, sync status, credential-rotation placeholder state, missing capabilities, diagnostic severity, API payloads, connector lab UI, and unit coverage.
- ✅ L12. Added durable agent job queue primitives with `AgentJob` persistence, workspace/account ownership, queue/action metadata, idempotency keys, priority/run timing, claim/complete/fail helpers, retry backoff, max-attempt dead-letter decisions, and unit coverage.
- ✅ L13. Added human approval queue primitives with `AgentApprovalRequest` persistence, workspace/requester/decider/job ownership, proposed action and policy payloads, due/expiry windows, approver role metadata, escalation decisions, terminal decision checks, and unit coverage.
- ✅ L14. Added tested agent platform governance primitives covering workspace/account tenant access decisions, operator role gates, nested secret redaction, encryption/token/rotation posture, chronological audit export rows, and compliance readiness status.
- ✅ L15. Added a tested runbook-to-queue execution planner that converts lifecycle/acquisition current steps into durable job queue payloads, approval request payloads, wait/block outcomes, provider-write priority, and stable idempotency keys.
- ✅ L16. Wired the execution planner into lifecycle generation and acquisition iteration flows, persisting generated-message delivery jobs, over-cap budget-shift approval requests, duplicate-safe pending approvals, and idempotent queued jobs.
- ✅ L17. Added a protected workspace agent operations view for queued/recent jobs, pending approvals, dead-letter counts, governance posture, workspace tab navigation, and dashboard discovery.
- ✅ L18. Added workspace-scoped approval decision controls so authenticated users can approve, reject, or cancel open agent approval requests from the operations view.
- ✅ L19. Added tested worker-safe job transition policy plus protected operations controls for manual claim, complete, fail, cancel, and requeue of scoped agent jobs.
- ✅ L20. Added approval-to-job continuation so approved acquisition requests enqueue idempotent provider-write jobs with the original proposed action payload.
- ✅ L21. Added a tested lifecycle agent role model that separates event watching, identity/consent resolution, opportunity scoring, message strategy, approval coordination, delivery operation, outcome observation, and revenue attribution.
- ✅ L22. Added a tested lifecycle change-event trigger planner that turns detected entity/user events into identity/consent decisions, priority scoring, lifecycle runbook state, current role ownership, and durable execution plans for message generation or approved delivery.
- ✅ L23. Wired simulated lifecycle deltas into the change-event trigger planner so new entity deltas fan out to top interested users and persist idempotent lifecycle generation jobs when agent queue tables are available.
- ✅ L24. Wired lifecycle imports into the shared event-trigger queue so imported CSV/Google Sheets change events fan out to interested users and persist idempotent generation jobs while preserving compatibility-mode import success when agent queue tables are unavailable.
- ✅ L25. Added a tested run-once agent worker executor with fake-safe lifecycle/acquisition dispatch, queue claim/complete/fail integration, retry/dead-letter handoff, and a protected workspace API endpoint for executing one queued job.
- ✅ L26. Added a protected Execute control to the workspace agent operations view so queued jobs can run through the fake-safe run-once worker without manual claim/complete transitions.
- ✅ L27. Added compact worker result visibility to the workspace agent operations view, including executor, action, provider mutation mode, summary text, and failure error codes.
- ✅ L28. Added a protected batch worker trigger for scheduled or external worker execution, with bounded queue rotation, default lifecycle/acquisition queue coverage, and scheduler-secret authentication.
- ✅ L29. Added Hobby-safe daily Vercel cron deployment wiring for the batch worker, GET-based cron invocation support, `CRON_SECRET` environment setup, and deployment docs.
- ✅ L30. Added scheduled-worker operations visibility so workspace operators can see cron cadence, endpoint, batch size, auth readiness, and queue coverage without opening deployment config.
- ✅ L31. Added a protected Run batch now control to the scheduled-worker operations card so operators can exercise the same bounded batch worker path used by cron.
- ✅ L32. Added scheduled worker queue allowlist enforcement so batch callers cannot execute arbitrary queue names; skipped disallowed queues are included in the batch result.
- ✅ L33. Added skipped-queue observability so batch worker calls with disallowed queue names log a warning with requested queue count, allowed queue count, and skipped names.
- ✅ L34. Added explicit all-disallowed batch no-op behavior so malformed scheduler requests cannot silently fall back to default queue execution.
- ✅ L35. Added a visible scheduled-worker auth warning in the operations surface when no worker bearer secret is configured.
- ✅ L36. Defined the acquisition provider-write generalization plan with queue ownership, execution mode progression, approval gates, rollback expectations, and measurement outputs.
- ✅ L37. Added a tested acquisition provider-write readiness contract that exposes the shared queue/follow-on queue shape, simulated-to-dry-run-to-approved mutation progression, blockers, approval gates, rollback metadata, and measurement outputs.
- ✅ L38. Surfaced acquisition provider-write readiness in Agent Operations so operators can see current mode, next mode, queue ownership, dry-run readiness, approved-mutation blockers, and follow-on queues.
- ✅ L39. Added the acquisition provider-write dry-run adapter foundation with a registered simulated adapter, worker dry-run execution path, provider-like diff output, permission checks, spend exposure, rollback metadata, and tests.
- ✅ L40. Added the Google Ads provider-write dry-run adapter so acquisition provider-write jobs can produce Google Ads-style campaign resource diffs and mutate-shape metadata offline, with no mutate endpoint calls.
- ✅ L41. Persisted provider-write dry-run results in a dedicated workspace-scoped table and surfaced recent dry runs in Agent Operations for rollback/audit review.
- ✅ L42. Added provider-write measurement handoffs that turn ready acquisition dry-runs into durable observation and measurement jobs with idempotent handoff payloads.
- ✅ L43. Added a provider dry-run detail page and workspace activity links so operators can inspect permission checks, provider diffs, rollback metadata, measurement handoff jobs, and raw dry-run payloads.
- ✅ L44. Added an agent audit evidence CSV export covering jobs, approvals, provider dry-runs, and measurement handoffs with provider, rollback, spend exposure, and related job metadata.
- ✅ L45. Added a Meta Ads provider-write dry-run adapter that creates offline Graph API-shaped diffs for campaign, ad set, and ad operations without calling Meta write endpoints.
- ✅ L46. Completed the provider connection selection and inspection workflow: provider-specific connections can browse campaigns, child groups, ads, performance, and feed selected provider IDs toward agent dry-runs.
- ✅ L46.1. Added the first Google Ads object inspection workflow with campaign selection, selected-campaign performance, ad group and ad reads, and a dry-run context payload that preserves provider IDs for future approval handoff.
- ✅ L46.2. Added Meta OAuth and a read-only Meta Ads connector so the shared connection detail workflow can inspect campaigns, ad sets, ads, recent performance, and Meta-shaped dry-run context IDs.
- ✅ L46.3. Added provider selection approval handoff so selected Google/Meta account, campaign, and child object IDs create high-risk approval requests that feed the existing provider-write dry-run queue after approval.
- ✅ L47. Polished provider dry-run execution by carrying the approval idempotency key inside the queued payload and surfacing selected provider account, campaign, child object, operation, and exposure context in Agent Operations approvals.
- ✅ L48. Defined the S15 production provider hardening path in [`docs/acquisition-provider-production-hardening.md`](./acquisition-provider-production-hardening.md), including enablement gates, rollback expectations, sandbox-first write scope, and follow-on implementation items.
- ✅ L49. Added provider credential grants with workspace/provider/account scope, capabilities, token health, rotation timing, test/live environment, owner approval metadata, OAuth callback upserts, and connection-table visibility.
- ✅ L50. Added provider preflight checks for credential grant state, token health, read/dry-run permission, selected provider object context, live-read health, policy readiness, dry-run adapter availability, and measurement readiness; connection detail pages now show pass/warn/block checks and approval requests are blocked server-side when preflight fails.
- ✅ L51. Added a fail-closed mutation enablement helper that requires workspace, provider, account, operation, credential mutation capability, ready dry-run evidence, mutation-specific approval, rollback, distinct idempotency, measurement handoff, and explicit emergency-stop clearance before any approved mutation path can proceed.
- ✅ L52. Added an opt-in sandbox mutation adapter contract with a simulated sandbox adapter that only applies narrow reversible operations after the mutation gate passes, returns deterministic provider operation ids, preserves dry-run before/after evidence, and emits rollback operation metadata without calling live ad APIs.
- ✅ L53. Added durable provider-write rollback records with before/after state, provider operation ids, rollback operation ids, retention windows, reversal status, review decisions, and a rollback review section on provider dry-run detail pages.
- ✅ L54. Extended agent audit evidence export with rollback records, mutation idempotency keys, provider operation ids, rollback operation ids, reversal status, retention expiry, review decisions, emergency-stop state, and mutation-gate status.
- ✅ L55. Added a tested customer onboarding readiness helper that reports status, maximum allowed launch mode, requested-mode allowance, missing owners, phase blockers/warnings, unresolved-risk readiness, and next required action before enterprise launch.
- ✅ L56. Added a tested customer data quality gate helper that evaluates required field coverage, row-count reconciliation, timestamp and currency semantics, identity match rate, source freshness, duplicates, rejected rows, and source-of-truth ordering before recommendation or execution launch.
- ✅ L57. Added a tested customer baseline snapshot helper that validates baseline period, eligible population, source snapshots, exclusions, metric definitions, confidence posture, holdout/control requirements, and data/finance approvals before billing readiness.
- ✅ L58. Added a tested revenue proof dashboard model and shared panel on Lifecycle and Acquisition overviews showing baseline, treatment/control, actions, observed outcomes, incremental lift/profit, confidence flags, and evidence export links.
- ✅ L59. Added a tested billable execution gate that blocks performance billing and agent-managed execution unless onboarding, data quality, baseline, policy, credential, rollback, audit, emergency-stop, revenue-proof, and performance-billing approvals are ready.
- ✅ L60. Added a tested customer launch packet export builder that compiles owners, connected systems, approved mappings, policy constraints, onboarding/data/baseline/revenue proof decisions, billable gate status, evidence export links, unresolved risks, and launch decision into stable JSON plus Markdown.

### Cross-app generalization path
- Keep shared: `AgentJob`, `AgentApprovalRequest`, runbook-to-queue plans, worker claim/complete/fail semantics, retry/dead-letter policy, scheduler auth, queue allowlists, operations visibility, and governance posture.
- Keep app-specific: event detection, identity/consent gates, provider-write executors, policy gates, measurement attribution, and approval thresholds.
- Before broadening beyond lifecycle: define per-app queue allowlists, executor ownership, provider mutation modes, approval requirements, rollback semantics, and measurement outputs for Acquisition, Pricing, Retention, Expansion, Auction, and platform agents.
- First generalization target should be Acquisition provider-write continuation because it already has approval requests, policy gates, fake provider writes, and measurable spend/revenue impact.
- Acquisition provider-write generalization plan:
  - queue ownership: `acquisition:provider_write`, with future `acquisition:observation` and `acquisition:measurement` follow-on queues;
  - executor mode: fake/simulated provider writes first, then dry-run real provider adapters, then approved mutation adapters;
  - approval gates: over-cap budget shifts, high-risk campaign state changes, protected campaigns, low-confidence recommendations, cooldown breaches, and emergency-stop state;
  - rollback expectations: provider mutation payloads must include idempotency keys, reversible action metadata, previous state, and rollback instructions before real writes;
  - measurement outputs: spend moved, wasted spend avoided, CAC/LTV movement, ROAS change, conversion-quality notes, and revenue-impact attribution.
- The first code-facing contract for this target lives in `lib/acquisition-agent-generalization.ts`; it reports whether the system should remain simulated, graduate to dry-run adapters, or permit approved mutations once all safety controls are configured.

---

## M) Performance-based revenue business model

Business-model workstream for using the tools and agents to operate customer revenue programs and earn compensation when measurable performance improves.

### Completed
- ✅ M1. Defined the performance business operating model in [`docs/performance-business-operating-model.md`](./performance-business-operating-model.md), covering onboarding, baseline measurement, eligible revenue, attribution, incrementality, fee triggers, clawbacks, reporting cadence, audit evidence, and risk controls.
- ✅ M2. Defined the performance customer onboarding runbook in [`docs/performance-customer-onboarding.md`](./performance-customer-onboarding.md), covering owners, system access, credential grants, data mapping, consent review, billing evidence, historical baselines, launch states, and initial policy constraints.
- ✅ M3. Defined the performance lifecycle measurement model in [`docs/performance-lifecycle-measurement.md`](./performance-lifecycle-measurement.md), covering triggered users, eligibility, message funnel metrics, conversion attribution, incremental revenue, unsubscribe/spam risk, holdout/control methodology, billing-grade evidence, and reporting views.
- ✅ M4. Defined the performance acquisition measurement model in [`docs/performance-acquisition-measurement.md`](./performance-acquisition-measurement.md), covering spend under management, CAC, LTV:CAC, ROAS, conversion quality, budget saved, action impact, guardrails, and incremental profitable revenue.
- ✅ M5. Defined performance operating packages in [`docs/performance-operating-packages.md`](./performance-operating-packages.md), covering audit-only, recommendation-only, human-approved execution, agent-managed execution, transition gates, downgrade triggers, package reporting, and implementation state.
- ✅ M6. Defined performance risk controls in [`docs/performance-risk-controls.md`](./performance-risk-controls.md), covering spending limits, customer approvals, kill switches, compliance review, channel reputation, revenue quality, rollback safety, control states, and implementation records.
- ✅ M7. Defined performance pricing options in [`docs/performance-pricing-options.md`](./performance-pricing-options.md), covering setup fee plus revenue share, managed-spend fee plus performance kicker, success fee against agreed lift, advisory retainers, fee caps, floors, adjustments, and billing/package alignment.

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
- ✅ K1, K2, K3, K4, K5, K6, K7, K8, K9, K10, K11

### Sprint S11 (production integrations and performance model)
- ✅ L0, L1, L2, L3, L5.2, L5.3, L5.4, L6, L7, L8, L9, L10, L11, L12, L13, L14, M1, M2, M3, M4, M5, M6, M7

### Sprint S12 (agent execution wiring and operational readiness)
- ✅ L15, L16, L17

### Sprint S13 (agent operations control loop)
- ✅ L18, L19, L20, L21, L22, L23, L24, L25, L26, L27, L28, L29, L30, L31, L32, L33, L34, L35

### Sprint S14 (acquisition provider dry-run foundation)
- ✅ L36, L37, L38, L39, L40, L41, L42, L43, L44, L45, L46, L46.1, L46.2, L46.3, L47

### Sprint S15 (production provider hardening)
- ✅ L48, L49, L50, L51, L52, L53, L54

### Sprint S16 (enterprise rollout readiness)
- ✅ L55
- ✅ L56
- ✅ L57
- ✅ L58
- ✅ L59
- ✅ L60

### Sprint S17 (launch readiness operations)
- ✅ L61, L62, L63, L64, L65

### Sprint S18 (customer launch evidence configuration)
- ✅ L66, L67, L68, L69, L70

### Sprint S19 (customer operating cockpit)
- ✅ L71
- ✅ L72
- ✅ L73
- ✅ L74
