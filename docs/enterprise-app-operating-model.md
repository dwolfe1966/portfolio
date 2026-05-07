# Enterprise App Operating Model

Last updated: 2026-05-07

This document defines how each product app should be used by enterprise customers in daily operations, what systems it must integrate with, and how it proves that the customer generates more revenue with the system than without it.

## Operating Principle

Enterprise customers will not use these tools as isolated demos. They will use them inside existing operating loops: marketing automation, ad platforms, product systems, billing, data warehouses, sales/customer-success workflows, and executive reporting.

The integration strategy therefore has two jobs:

1. Make customer setup easy enough that a real enterprise team can connect data, map fields, validate data quality, and start operating without bespoke engineering every time.
2. Make revenue lift visible enough that the customer can see baseline, treatment, incremental outcomes, guardrails, and payout logic.

## Cross-App Platform Needs

### Easy Integration

The workspace should become an integration assistant, not just a static import page.

Required capabilities:

- connector discovery by app and system type;
- schema discovery for databases, warehouses, APIs, files, streams, and ESP/ad providers;
- AI-assisted field mapping into app object models;
- confidence scoring for mappings and joins;
- sample preview, validation, rejected-row repair, and replay;
- persistent connector health, freshness, permissions, sync status, and dead-letter diagnostics;
- object-level provenance so users know which system supplied each object class;
- reusable mapping presets per workspace/customer.

### Revenue Proof

Every app needs an evidence layer:

- baseline period and baseline metric;
- treatment/control or holdout where possible;
- operational actions taken by the agent or operator;
- downstream outcomes and revenue events;
- incremental lift calculation;
- confidence/quality flags;
- customer-visible dashboard and exportable audit trail.

For performance-based engagements, this evidence layer is the business model.

## App Operating Models

| App | Enterprise role | Operational intensity | Primary action surface | Revenue proof |
|---|---|---|---|---|
| Lifecycle | Triggered outbound messaging based on user/entity/event signals. | Daily/real-time operations. | Email, outbound text, ESP journey trigger, SMTP/API send. | Holdout lift, conversions, revenue per message, unsubscribe/spam risk. |
| Acquisition | Agent-assisted paid media operation. | Daily/near-real-time operations. | Google Ads, Microsoft Ads, Meta Ads campaign/budget/creative/audience changes. | CAC, LTV:CAC, ROAS, conversion quality, profitable incremental revenue. |
| Auction | Didactic marketplace and mechanism-design tool. | Primarily analysis/demo. | Simulated auction rules, reserve pricing, bidder behavior. | Education, strategic decision support, marketplace health framing. |
| Pricing | Real-time or near-real-time price decisioning plus experiment governance. | High-intensity operational system when used in production. | Price quote/API response, experimentation policy, segment guardrails. | Margin, conversion, churn, revenue lift, confidence, rollback avoidance. |
| Retention | Risk prioritization and intervention planning. | Strategic/analytical with workflow handoff. | CS queue, CRM task, playbook recommendation, save offer approval. | Preventable churn, saved ARR, intervention ROI, risk reduction. |
| Expansion | Expansion readiness and offer prioritization. | Strategic/analytical with workflow handoff. | Sales/CS queue, CRM opportunity, offer recommendation. | Expansion ARR, pipeline quality, win rate, time-to-offer, account readiness lift. |

## Lifecycle Enterprise Use

Lifecycle is an operational messaging system.

### Inputs

Lifecycle needs persistent access to:

- users: account users, contacts, subscribers, customers, visitors, members;
- entities: companies, accounts, products, properties, people, records, assets, locations, opportunities;
- interest edges: user-entity relationships, views, follows, searches, product usage, account associations, intent signals;
- trigger events: product events, account changes, lifecycle milestones, entity changes, billing events, legal/public record changes, inventory changes;
- consent and suppression state;
- engagement events: opens, clicks, visits, replies, form submissions, app sessions;
- conversion/revenue events: signup, activation, purchase, upgrade, renewal, retained account, expansion, refund, cancellation.

These objects may live in different systems. A customer might store users in Postgres, entities in a warehouse, interest edges in Spark/Databricks or Redis, product events in Segment, and billing events in Stripe or a warehouse. The system must support object-specific connectors rather than assuming one source has everything.

### Output

Lifecycle must be able to:

- publish generated messages into an ESP or marketing automation system;
- trigger an ESP journey/campaign;
- send directly through transactional API or SMTP when appropriate;
- write generated copy and rationale back into the customer's system;
- create approval tasks before sending when policy requires it.

### Measurement

Lifecycle dashboards should show:

- triggered population;
- eligible vs suppressed users;
- messages generated, approved, sent, delivered;
- opens, clicks, visits, replies, unsubscribes, complaints;
- conversions and revenue events by attribution window;
- holdout/control lift;
- revenue per triggered user and revenue per message;
- channel risk and deliverability health.

## Acquisition Enterprise Use

Acquisition is the most straightforward enterprise operating app: connect ad systems, observe downstream conversion behavior, and let agents operate within policy.

### Inputs

- ad account/campaign/ad set/ad/creative data;
- spend, impressions, clicks, conversions, revenue and quality signals;
- landing-page analytics;
- CRM or product conversion events;
- LTV, margin, refund, fraud, and conversion-quality data.

### Output

- campaign creation;
- budget allocation;
- pause/resume;
- bid strategy changes;
- creative upload;
- audience sync;
- experiment/cell changes;
- rollback when policy thresholds fail.

### Measurement

- spend under management;
- CAC, ROAS, LTV:CAC;
- profitable conversions;
- conversion quality;
- budget saved from bad cells;
- incremental revenue vs baseline or holdout.

## Auction Enterprise Use

Auction is primarily didactic. It helps customers understand marketplace rules, reserve pricing, bidder concentration, trust, and auction mechanism tradeoffs.

It may later become operational for marketplace customers, but for now it should be framed as:

- strategy simulation;
- mechanism education;
- sales/board-facing artifact;
- marketplace health diagnostic.

Integration can stay lighter than the other apps unless a real marketplace customer appears.

## Pricing Enterprise Use

Pricing requires the hardest real-time integration.

If used operationally, the pricing tool must provide a price point inside customer request paths, often below 100 milliseconds. That makes it different from a dashboard or batch recommendation system.

### Inputs

- customer/account identity;
- segment and eligibility attributes;
- product/SKU/package context;
- inventory, capacity, or usage context where relevant;
- contract, discount, entitlement, or renewal state;
- experiment assignment;
- margin and cost data;
- conversion, churn, and support outcomes.

### Output

- real-time price quote API;
- price experiment assignment;
- package/discount recommendation;
- rollback or guardrail decision;
- analytics feed for conversion/margin/churn effects.

### Architecture Implications

Pricing may need:

- low-latency policy cache;
- precomputed segment eligibility;
- deterministic experiment assignment;
- edge/runtime-safe decision engine;
- fallback default price when dependency health fails;
- strict audit of every quote decision;
- offline experiment analysis separate from online serving.

The product should support both strategic pricing experiments and real-time operational price serving, but those should be clearly separated in architecture and UI.

## Retention Enterprise Use

Retention is likely strategic/analytical first, operational second.

### Inputs

- customer/account health;
- usage trends;
- support burden;
- NPS/sentiment;
- renewal timing;
- contract value;
- payment risk;
- relationship owner and last-touch data.

### Output

- prioritized risk queue;
- recommended intervention;
- CS/CRM task;
- playbook assignment;
- discount or save-offer approval;
- executive risk dashboard.

### Measurement

- preventable churn;
- saved ARR;
- intervention cost;
- save-rate by playbook;
- renewal movement;
- false positive/negative risk classification.

Retention may not need to directly execute digital actions at first. It should integrate deeply with CRM/CS systems and prove that teams are focusing on the right accounts.

## Expansion Enterprise Use

Expansion is also likely strategic/analytical first.

### Inputs

- account ARR/MRR;
- seat usage and utilization;
- product-qualified signals;
- support and customer health;
- renewal timing;
- feature usage;
- open expansion signals;
- executive sponsor/relationship data.

### Output

- expansion readiness queue;
- recommended motion: seat expansion, feature upgrade, usage commit, services/support package;
- CRM opportunity creation/update;
- seller/CS task;
- offer rationale and expected ARR lift.

### Measurement

- expansion pipeline created;
- win rate;
- ARR lift;
- time-to-offer;
- attach rate;
- offer acceptance;
- revenue quality and retention after expansion.

## Integration Intelligence

Field mapping must become smarter than manual dropdowns.

The system should infer:

- object type: user, entity, edge, trigger event, engagement event, conversion event, revenue event;
- identifier candidates and join keys;
- timestamp semantics;
- enum mappings;
- consent/suppression meaning;
- entity relationship direction;
- event freshness and dedupe keys;
- revenue value/currency fields;
- confidence and missing critical fields.

The workflow should be:

1. Discover schema or sample payload.
2. Infer app object mappings.
3. Show confidence and required-field gaps.
4. Let the user approve or correct.
5. Validate against sample rows.
6. Save mapping version.
7. Run preview sync.
8. Persist source config and health state.
9. Create normalized snapshot.

## Dashboards Required For Enterprise Trust

Each app needs dashboards at three levels:

- Integration health: sources connected, freshness, permissions, rejected rows, dead letters.
- Operating performance: actions taken, decisions pending, active policies, outputs generated.
- Revenue impact: baseline, treatment, control/holdout, conversions, revenue, confidence, risk, payout calculation.

The customer should be able to answer: what did the system do, why did it do it, what changed, and how much money did it make or save?

## Priority Implications

1. Finish lifecycle identity/consent and runbook specs with this object model in mind.
2. Define a cross-app connector/source-config model before building many one-off integrations.
3. Build AI-assisted mapping as a product feature, not a developer utility.
4. Treat pricing real-time serving as a separate architectural track from pricing analysis.
5. Keep retention and expansion focused on CRM/CS workflow integration and measurable account outcomes before trying to automate digital execution.
