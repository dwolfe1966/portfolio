# Acquisition Production Integration Architecture

Last updated: 2026-05-07

This note defines how the Acquisition tool should move from simulated campaigns and read-only Google test-account access into production-safe paid media operations across Google Ads, Microsoft Ads, Meta Ads, and downstream conversion systems.

## Goal

Acquisition should become an agent-assisted paid media operating layer, not a replacement ad platform. The production system needs to:

- connect customer ad accounts with least-privilege OAuth and workspace-scoped credential grants;
- ingest campaign, ad group/ad set, creative, audience, keyword, budget, bid, and performance data;
- normalize cross-channel spend, impressions, clicks, conversions, revenue, and conversion-quality signals;
- compare live account state against policy, experiments, and customer goals;
- recommend or execute bounded actions such as budget shifts, pauses, bid changes, creative tests, and audience updates;
- record every observation, recommendation, approval, write, rollback, and revenue outcome;
- prove profitable incremental revenue rather than only reporting platform metrics.

The current `AdConnector` contract is intentionally read-only. Production should preserve that foundation and add a separate mutation contract so observation cannot accidentally become execution.

## Integration Layers

| Layer | Responsibility | Examples |
|---|---|---|
| Provider connection | Store workspace-scoped encrypted OAuth credentials and account metadata. | Google Ads OAuth, Microsoft Ads OAuth, Meta OAuth, test/live account flags. |
| Account discovery | Identify accessible accounts and safety state. | Manager/customer hierarchy, currency, time zone, test account, permission level. |
| Read sync | Pull platform objects and performance facts. | Campaigns, ad groups/ad sets, ads, creatives, keywords, audiences, budgets, metrics. |
| Conversion enrichment | Join platform activity to first-party quality and revenue. | CRM leads, product signups, billing revenue, refunds, fraud, LTV estimates. |
| Normalization | Convert platform-specific shapes into the acquisition tool model. | Campaign state, cell dimensions, spend cents, attribution window, objective, channel. |
| Diagnosis | Detect winners, losers, budget waste, guardrail breaches, and experiment learnings. | CAC/LTV, ROAS, significance, cooldown, pacing, saturation. |
| Policy gate | Decide whether an action can be auto-applied, needs approval, or is blocked. | Spend cap, max shift, confidence, CAC/LTV threshold, emergency stop. |
| Write operation | Apply bounded platform changes with idempotency and rollback metadata. | Pause campaign, move budget, upload creative, sync audience, change bid strategy. |
| Observation and proof | Track downstream result of actions. | Before/after metrics, control comparison, conversion quality, incremental revenue. |

## Connector Contracts

Read and write interfaces should stay separate.

```ts
type AdProvider = "google_ads" | "microsoft_ads" | "meta_ads";

type AdReadCapability =
  | "read_accounts"
  | "read_campaigns"
  | "read_ad_groups"
  | "read_ads"
  | "read_creatives"
  | "read_audiences"
  | "read_keywords"
  | "read_budgets"
  | "read_performance";

type AdWriteCapability =
  | "create_campaign"
  | "update_budget"
  | "pause_resume"
  | "update_bid_strategy"
  | "upload_creative"
  | "sync_audience"
  | "rollback_change";

type AdConnectorHealth = {
  ok: boolean;
  provider: AdProvider;
  accountLabel: string;
  currencyCode: string;
  timeZone: string;
  readCapabilities: AdReadCapability[];
  writeCapabilities: AdWriteCapability[];
  permissionWarnings: string[];
  lastSyncAt?: string;
};
```

Production write connectors should implement dry-run validation before mutation. A dry run should return the exact provider objects that would be changed, estimated spend exposure, required permissions, rollback support, and policy reasons.

## Provider Scope

### Google Ads

Current state:

- OAuth start/callback exists.
- Encrypted `AdAccountConnection` rows exist.
- `GoogleAdsConnector` can read accounts, campaigns, and performance.
- Non-test customers are refused before campaign/performance reads.

Production additions:

- support manager-account hierarchy and login-customer routing;
- store permission and developer-token tier in connector health;
- add change operations through Google Ads mutate endpoints only after policy approval;
- persist provider change resource names for rollback and audit;
- support campaign budgets, bidding strategies, ad groups, criteria, assets, and conversion action reads;
- ingest offline conversion or first-party conversion quality where customer setup allows it.

### Microsoft Ads

Microsoft Ads should follow the same contract as Google Ads but account for different hierarchy and auth shape:

- Microsoft identity OAuth and refresh-token storage;
- customer/account discovery;
- campaign, ad group, keyword, ad, budget, and performance reports;
- mutation support for budgets, status, bids, and ads;
- explicit mapping between Microsoft campaign states and the normalized acquisition state model.

Microsoft should not be added as a UI-only provider until account discovery, health, and read sync match the Google baseline.

### Meta Ads

Meta differs structurally because campaign, ad set, ad, creative, and audience objects are more tightly coupled.

Production additions:

- replace the current simulated fallback with a real `MetaAdsConnector`;
- read Business Manager ad accounts, campaigns, ad sets, ads, creatives, insights, and custom audiences;
- normalize Meta's campaign/ad set/ad hierarchy into campaign/cell dimensions;
- handle creative review state and learning phase as first-class health signals;
- restrict custom audience sync behind explicit customer approval and data-processing settings;
- implement write actions for pause/resume, budget changes, creative upload, and audience sync only after policy gates are complete.

## Normalized Objects

Production sync should persist normalized snapshots before making recommendations:

- account: provider, external id, currency, time zone, manager/business context;
- campaign: provider id, objective, state, start/end dates, budget, bid strategy;
- cell: campaign x ad group/ad set x creative x audience/keyword dimensions;
- creative: copy, asset ids, channel, status, review state, landing page;
- audience/keyword: targeting definition, match type, size, exclusions, source;
- performance point: date, spend, impressions, clicks, conversions, revenue, attribution window;
- conversion quality: qualified lead, pipeline, purchase, refund, margin, LTV, fraud flag;
- provider change: proposed diff, applied diff, provider operation id, rollback data.

The existing simulated acquisition entities remain useful as a planning model, but production reads need source provenance so users can tell platform state from local experiment state.

## Write Safety

No production write should happen unless all of these gates pass:

- workspace execution enabled;
- provider health ok;
- credential grant has the required write capability;
- target account is allowed for production writes;
- campaign is not inside a customer-defined protected list;
- spend cap and daily budget cap are not breached;
- max budget shift percent is respected;
- CAC/LTV, ROAS, or conversion-quality guardrails are healthy enough for the action;
- confidence and minimum sample thresholds are satisfied;
- cooldown window has elapsed;
- action has an idempotency key and rollback plan;
- approval is complete when required;
- emergency stop is not active.

The system should fail closed. If attribution, conversion quality, or policy state is missing, the agent can recommend but not apply.

## Action Types

Initial production writes should be narrow and reversible:

1. Pause low-performing cell or campaign.
2. Resume a previously paused cell when policy allows.
3. Shift a bounded budget amount between existing cells.
4. Apply a bid adjustment inside a configured range.
5. Upload a new creative draft for review.
6. Sync an approved audience segment.

Later writes can include campaign creation and broader bid-strategy changes, but only after audit, approval, and rollback behavior is proven on narrower operations.

## Agent Runbook

The production acquisition agent should run as a durable workflow:

1. Sync provider account and campaign state.
2. Sync platform performance for the configured attribution window.
3. Enrich conversions with CRM, product, billing, and quality data.
4. Normalize data into campaign/cell snapshots.
5. Diagnose movement against targets, guardrails, and previous actions.
6. Draft a recommended action with expected effect and rollback plan.
7. Run policy gates and decide: block, queue approval, or apply.
8. Execute approved provider mutation with idempotency.
9. Verify provider state after write.
10. Monitor reversal conditions and downstream outcomes.
11. Attribute incremental revenue and update the customer-visible audit trail.

Retries must never duplicate spend changes. Every provider mutation needs an idempotency key, provider operation id where available, and a before/after diff.

## Agent Platform Generalization

Acquisition is the first non-lifecycle candidate for the shared agent operations control loop because approved budget-shift requests already create `acquisition:provider_write` jobs. The generalization path should keep the platform contracts shared while keeping paid-media policy and mutation semantics app-specific.

Initial readiness gates:

- queue ownership: `acquisition:provider_write` is owned by the acquisition provider-write executor; future observation and measurement work should use `acquisition:observation` and `acquisition:measurement`;
- executor mode: keep simulated writes until provider dry-run adapters can return exact proposed diffs, permission checks, spend exposure, and rollback support;
- approval gates: require approval for over-cap budget shifts, high-risk campaign state changes, protected campaigns, low-confidence recommendations, cooldown breaches, emergency-stop state, and any non-reversible write;
- rollback metadata: every future real mutation payload must include idempotency key, previous provider state, intended provider diff, rollback instructions, and provider operation id when available;
- measurement output: completed jobs should report spend moved, wasted spend avoided, CAC/LTV movement, ROAS change, conversion-quality notes, and revenue-impact attribution;
- operations visibility: worker results should stay compact in the shared Agent Operations view, while detailed provider diffs and rollback metadata belong in a later audit/export surface.

The first implementation milestone should remain fake-safe: exercise the `acquisition:provider_write` queue through the same scheduler, allowlist, approval, and operations controls used by lifecycle jobs before enabling any real provider mutation.

The code-facing readiness contract is `buildAcquisitionProviderWriteReadiness` in `lib/acquisition-agent-generalization.ts`. It keeps the current mode simulated by default, graduates to `dry_run` when provider dry-run adapters exist, and only permits `approved_mutation` when rollback metadata, approval policy, measurement output, protected-campaign checks, and emergency-stop controls are all configured.

Agent Operations surfaces this readiness state directly so operators can distinguish queue coverage from mutation readiness. Until real provider dry-run adapters, rollback metadata, and measurement wiring are configured, Acquisition provider writes remain visible but simulated.

## Audit Events

Acquisition production audit should record:

- `ad_account.connected`
- `ad_account.health_checked`
- `campaign.synced`
- `performance.synced`
- `conversion_quality.enriched`
- `cell.diagnosed`
- `action.recommended`
- `policy.checked`
- `approval.requested`
- `approval.completed`
- `provider.dry_run`
- `provider.write_applied`
- `provider.write_failed`
- `provider.rollback_applied`
- `outcome.observed`
- `revenue.attributed`

Each event should include workspace id, account user or service-agent id, provider, external account id, campaign/cell ids, credential grant id, policy version, idempotency key, provider operation id, and public event id.

## Measurement

Production dashboards should separate platform metrics from business outcomes:

- spend under management;
- spend shifted, paused, and protected by policy;
- CAC, ROAS, LTV:CAC, and margin by campaign/cell;
- qualified conversion rate and refund/fraud rate;
- budget saved from blocked or paused cells;
- incremental profitable revenue versus baseline/control;
- action acceptance rate and rollback rate;
- policy-blocked actions and reasons.

Performance-based fees should rely on first-party conversion and revenue quality, not platform-reported conversions alone.

## Implementation Sequence

1. Add acquisition connector health/config persistence parallel to lifecycle connector persistence.
2. Expand `AdConnector` read coverage for campaigns, cells, creatives, audiences, keywords, budgets, and provider health.
3. Add normalized production snapshot tables with source provenance.
4. Add `MetaAdsConnector` and `MicrosoftAdsConnector` read-only implementations.
5. Add conversion-quality enrichment from CSV/Sheets first, then CRM/product/billing connectors.
6. Add write-operation contract with dry-run responses and policy-gate inputs.
7. Add provider mutation audit tables and rollback metadata.
8. Add approval queue for high-risk paid-media actions.
9. Enable one narrow write action in sandbox/test mode.
10. Graduate production writes by provider and action type after manual verification.

## Open Decisions

- Whether Microsoft Ads or Meta Ads should be the second real provider after Google Ads.
- Which first-party conversion source should be canonical for revenue proof.
- Whether account-level production write enablement should require manual database approval or in-app owner approval.
- How long rollback metadata should be retained for each provider.
- Whether creative upload should create drafts only or submit directly for platform review.
- How to handle customer agencies and manager accounts where the logged-in operator does not own the end advertiser.
