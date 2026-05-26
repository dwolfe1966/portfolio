export type ProjectEntry = {
  slug: string;
  title: string;
  summary: string;
  problem: string;
  thesis: string;
  architecture: Array<{ title: string; detail: string }>;
  kpiCallouts: Array<{ label: string; value: string; detail: string }>;
  commercialFraming: string;
  whatIBuilt: string;
  appHref?: string;
  status?: "live" | "in-progress";
  artifacts: {
    outcomeStrip: Array<{ label: string; value: string; note: string }>;
    decisionFrame: Array<{ label: string; detail: string }>;
    evidenceLinks: Array<{ label: string; href: string; detail: string }>;
    guardrails: Array<{ label: string; detail: string }>;
  };
};

export const projects: ProjectEntry[] = [
  {
    slug: "lifecycle-revenue-engine",
    title: "Lifecycle Revenue Engine",
    summary:
      "A working AI-enabled lifecycle system that turns entity-level change signals into scored campaign opportunities, generated outreach, and modeled revenue outcomes.",
    problem:
      "Most lifecycle programs still start with a calendar, a broad segment, and a message template. That structure misses the moments when a user has fresh intent tied to a specific person, place, record, or entity change.",
    thesis:
      "Lifecycle marketing becomes a revenue system when the unit of work shifts from campaigns to opportunities: detect a meaningful change, prove user interest, score the commercial value, then generate the right action.",
    architecture: [
      { title: "1. Change detection", detail: "Seed and simulate entity deltas such as address, phone, associate, and legal-record changes." },
      { title: "2. Interest graph", detail: "Connect users to entities they searched, viewed, saved, or otherwise demonstrated interest in." },
      { title: "3. Eligibility layer", detail: "Apply segment and subscription context so free, trial, active, and lapsed users can be treated differently." },
      { title: "4. Priority scoring", detail: "Rank candidates using interest strength, recency, segment value, and change-type weight." },
      { title: "5. Generation and outcome loop", detail: "Create message assets, persist campaign runs, and model downstream funnel/revenue outcomes." }
    ],
    kpiCallouts: [
      { label: "Priority score", value: "0-1", detail: "Inspectable score built from interest, recency, segment, and change-type contribution." },
      { label: "Generated assets", value: "Email + landing", detail: "Each selected opportunity can produce subject, preview, body, landing copy, and CTA." },
      { label: "Revenue model", value: "$/run", detail: "Campaign runs store estimated revenue so scenarios can be compared over time." }
    ],
    commercialFraming:
      "The system is not trying to send more lifecycle messages. It is trying to identify which moments deserve action, why they matter, and what revenue path they create.",
    whatIBuilt:
      "I built the lifecycle schema, editable input surfaces, entity/user graph, scoring logic, generation endpoint, simulation flow, output views, documentation, and audit-aware run details.",
    appHref: "/lifecycle/overview",
    status: "live",
    artifacts: {
      outcomeStrip: [
        { label: "Signal volume", value: "45+", note: "Seeded and simulated deltas exercise the prioritization and generation flow." },
        { label: "Opportunity score", value: "0-1", note: "Explainable priority score from interest, recency, segment, and change type." },
        { label: "Revenue view", value: "$/run", note: "Estimated revenue stored with each campaign run for trend comparison." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Editable users, tracked entities, interest relations, assumptions, and entity-level change events." },
        { label: "Decision", detail: "Rank candidate opportunities and select the highest-value records for campaign generation." },
        { label: "Output", detail: "Persisted campaign run, generated message assets, score breakdowns, and modeled revenue outcomes." }
      ],
      evidenceLinks: [
        { label: "Lifecycle overview", href: "/lifecycle/overview", detail: "Shows signal flow, graph context, and operating model." },
        { label: "Lifecycle inputs", href: "/lifecycle/inputs", detail: "Shows editable users, entities, interest edges, scoring weights, and assumptions." },
        { label: "Lifecycle outputs", href: "/lifecycle/outputs", detail: "Shows runs, trend charts, segment breakdown, and generated messages." },
        { label: "Campaign opportunities", href: "/lifecycle/campaigns", detail: "Shows candidate filtering, scoring evidence, and generated campaign runs." }
      ],
      guardrails: [
        { label: "Schema fallback", detail: "Pages and APIs degrade with compatibility messaging when product tables are missing." },
        { label: "Mutation gating", detail: "Seed and simulation endpoints are controlled by environment flags." },
        { label: "Auditability", detail: "Run details connect assumptions, candidates, score components, and generated messages." }
      ]
    }
  },
  {
    slug: "agent-acquisition",
    title: "Agent-Managed Paid Acquisition",
    summary:
      "A policy-bounded acquisition workspace where campaigns, audiences, creatives, test cells, simulations, and budget decisions operate against explicit CAC/LTV guardrails.",
    problem:
      "Paid growth teams can now generate more creative and audience variants than they can responsibly govern. Without policy, automation simply creates faster spend movement and noisier optimization.",
    thesis:
      "Acquisition agents become useful when their action space is constrained by economics: target CAC, target LTV, confidence thresholds, budget-shift limits, cooldowns, and audit logs.",
    architecture: [
      { title: "1. Campaign workspace", detail: "Stores objective, channel mix, budget, state, policy thresholds, and approval constraints." },
      { title: "2. Audience + creative library", detail: "Maintains editable targeting templates and creative variants with predicted CPC/CAC assumptions." },
      { title: "3. Test-cell engine", detail: "Combines creative, audience, and channel into measurable cells with spend, conversion, CAC, and ROAS." },
      { title: "4. Policy-aware iteration", detail: "Scores cells, proposes pauses or reallocations, and records every budget action in the audit trail." }
    ],
    kpiCallouts: [
      { label: "Economic policy", value: "CAC/LTV", detail: "Campaign decisions are evaluated against target CAC, target LTV, and LTV:CAC guardrails." },
      { label: "Budget control", value: "Shift cap", detail: "Budget movement is constrained by max-shift policy and operator override controls." },
      { label: "Simulation lab", value: "50 runs", detail: "Revenue scenarios use saved presets and Monte Carlo output for planning confidence." }
    ],
    commercialFraming:
      "The commercial goal is not autonomous media buying for its own sake. It is faster learning under explicit unit-economics constraints, with enough auditability to trust the budget decisions.",
    whatIBuilt:
      "I built the acquisition schema, campaign builder, audience and creative editors, test-cell controls, operator override flow, simulation panel, output views, connection scaffolding, and audit trail.",
    appHref: "/acquisition/overview",
    status: "live",
    artifacts: {
      outcomeStrip: [
        { label: "Test cells", value: "Creative x audience", note: "Campaign variants are evaluated as measurable performance cells." },
        { label: "Guardrail loop", value: "Policy first", note: "Budget shifts are bounded by caps, confidence, and target economics." },
        { label: "Economics", value: "CAC/LTV", note: "Insights compare CPA, ROAS, and LTV:CAC against campaign targets." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Campaign objective, budget, channels, policy, creative variants, and audience templates." },
        { label: "Decision", detail: "Score test cells, identify winners/losers, and apply policy-bound budget movement." },
        { label: "Output", detail: "Insights panel, simulation distribution, budget timeline, override controls, and audit logs." }
      ],
      evidenceLinks: [
        { label: "Acquisition overview", href: "/acquisition/overview", detail: "Shows architecture, readiness counts, and operating sequence." },
        { label: "Campaign workspace", href: "/acquisition/campaigns", detail: "Lists campaigns, states, cells, policy, and budget actions." },
        { label: "Audience inputs", href: "/acquisition/audiences", detail: "Shows editable audience templates and predicted CPC/CAC assumptions." },
        { label: "Simulation lab", href: "/acquisition/simulations", detail: "Shows scenario presets and Monte Carlo revenue distribution." },
        { label: "Acquisition outputs", href: "/acquisition/outputs", detail: "Shows economics, creative/audience trends, and budget timeline." }
      ],
      guardrails: [
        { label: "Budget locks", detail: "Operators can lock or revert budget overrides with audit records." },
        { label: "Max shift policy", detail: "Campaign guardrails cap how much budget moves per iteration." },
        { label: "Target economics", detail: "CAC and LTV thresholds inform scoring and scale/pause decisions." }
      ]
    }
  },
  {
    slug: "pricing-experimentation-control-tower",
    title: "Pricing Experimentation Control Tower",
    summary:
      "A pricing operations system that makes segments, variants, scenario assumptions, simulation runs, guardrail bands, and decisions editable and auditable.",
    problem:
      "Pricing tests are often spread across spreadsheets, analytics dashboards, and decision meetings. That makes it hard to preserve the hypothesis, cohort rules, guardrails, and final decision rationale in one place.",
    thesis:
      "Pricing experiments become safer when they are managed as governed operating loops: define the test, edit the inputs, simulate the risk, inspect the guardrails, and record the decision.",
    architecture: [
      { title: "1. Experiment registry", detail: "Store the hypothesis, owner, segment eligibility, variants, and minimum sample rules." },
      { title: "2. Editable inputs", detail: "Let operators update price variants, segment baselines, margin, conversion, churn, and assumptions." },
      { title: "3. Scenario simulation", detail: "Run conversion, churn, support-load, ARPU, margin, and confidence logic against each segment." },
      { title: "4. Decision record", detail: "Persist segment results, guardrail bands, recommendations, decisions, and audit entries." }
    ],
    kpiCallouts: [
      { label: "Scenario output", value: "Promote/extend/pause", detail: "Each run produces a recommendation based on confidence, holdout health, and guardrails." },
      { label: "Guardrail bands", value: "Segment-level", detail: "Segment results expose revenue lift and guardrail status before rollout." },
      { label: "Editable economics", value: "$ not cents", detail: "Operator inputs use dollar fields for variants and segment economics." }
    ],
    commercialFraming:
      "The system protects monetization decisions from spreadsheet drift by keeping the hypothesis, assumptions, guardrails, simulation output, and decision trail together.",
    whatIBuilt:
      "I built the pricing schema, editable segment and variant inputs, scenario assumption form, simulation endpoint, guardrail visualization, output tables, decision queue, audit logs, and docs.",
    appHref: "/pricing/overview",
    status: "live",
    artifacts: {
      outcomeStrip: [
        { label: "Recommendation", value: "4 states", note: "Runs can promote, extend, pause, or roll back based on policy." },
        { label: "Segment lift", value: "$/segment", note: "Each segment stores simulated net revenue lift and guardrail band." },
        { label: "Holdout health", value: "Tracked", note: "Sample size and control health influence the recommendation." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Hypothesis, segment eligibility, price variants, segment baselines, and scenario assumptions." },
        { label: "Decision", detail: "Evaluate conversion, churn, margin, support load, holdout health, and confidence." },
        { label: "Output", detail: "Segment results, guardrail bands, recommendation, decision record, and audit trail." }
      ],
      evidenceLinks: [
        { label: "Pricing overview", href: "/pricing/overview", detail: "Shows the control tower framing, reset controls, and operating model." },
        { label: "Pricing inputs", href: "/pricing/inputs", detail: "Shows editable experiment, variants, segments, and assumptions." },
        { label: "Pricing simulation", href: "/pricing/simulations", detail: "Shows scenario controls, guardrail response, and segment lift map." },
        { label: "Pricing outputs", href: "/pricing/outputs", detail: "Shows latest run KPIs, segment results, and simulation output." },
        { label: "Decision queue", href: "/pricing/decisions", detail: "Shows promote/extend/pause/rollback decisions and rationale." }
      ],
      guardrails: [
        { label: "Holdout health", detail: "Sample and holdout checks influence whether a test can be promoted." },
        { label: "Margin and churn", detail: "Treatments are paused or rolled back when margin or churn pressure breaks policy." },
        { label: "Decision ownership", detail: "Promotion decisions require explicit rationale and actor history." }
      ]
    }
  },
  {
    slug: "retention-risk-command-center",
    title: "Retention Risk Command Center",
    summary:
      "A churn-risk operating console that scores accounts, identifies risk drivers, assigns playbooks, and models expected saved revenue and payback.",
    problem:
      "Retention work often starts after the account is already in trouble. Usage, support, payment, renewal, and relationship signals sit in different places, so intervention work becomes reactive and hard to measure.",
    thesis:
      "Retention improves when risk scoring, driver diagnosis, playbook selection, intervention ownership, and save-rate economics live in the same operating loop.",
    architecture: [
      { title: "1. Account risk inputs", detail: "Maintain editable MRR, usage, support, NPS, renewal, payment, sponsor, touch, and trend signals." },
      { title: "2. Risk scoring layer", detail: "Classify account risk and identify the primary churn driver behind each recommendation." },
      { title: "3. Playbook assignment", detail: "Map risk drivers to intervention playbooks with save-rate lift, cost, discount, and SLA assumptions." },
      { title: "4. Save economics", detail: "Persist expected saved revenue, intervention cost, payback ratio, and portfolio recommendation." }
    ],
    kpiCallouts: [
      { label: "Risk band", value: "Low/med/high", detail: "Every account receives an interpretable risk score and driver." },
      { label: "Expected saved", value: "$/run", detail: "Portfolio runs model preventable churn and saved revenue." },
      { label: "Payback", value: "Ratio", detail: "Playbooks are evaluated against intervention cost and minimum payback policy." }
    ],
    commercialFraming:
      "The system turns retention from reactive triage into economic prioritization: which account is at risk, why, what action should happen, and whether the save motion is worth the cost.",
    whatIBuilt:
      "I built the retention schema, editable account/playbook/policy inputs, risk simulation endpoint, run visualization, intervention queue, output economics, audit trail, and docs.",
    status: "live",
    appHref: "/retention/overview",
    artifacts: {
      outcomeStrip: [
        { label: "Risk scoring", value: "0-1", note: "Account signals combine into interpretable churn-risk scores." },
        { label: "Saved revenue", value: "$/run", note: "Runs estimate preventable churn and expected saved revenue." },
        { label: "Interventions", value: "Queued", note: "High-risk accounts can be routed to owner-assigned playbooks." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Editable account health, MRR, renewal, payment, sponsor, support, NPS, playbook, and policy data." },
        { label: "Decision", detail: "Score churn risk, identify the primary driver, and select the strongest playbook." },
        { label: "Output", detail: "Risk run, account recommendations, expected saved revenue, payback, and intervention queue." }
      ],
      evidenceLinks: [
        { label: "Retention overview", href: "/retention/overview", detail: "Shows the command-center framing and operating sequence." },
        { label: "Account inputs", href: "/retention/inputs", detail: "Shows editable accounts, playbooks, and policy thresholds." },
        { label: "Risk simulation", href: "/retention/simulations", detail: "Shows model controls, risk/save visualization, and driver mix." },
        { label: "Interventions", href: "/retention/interventions", detail: "Shows owner-assigned playbooks and intervention workflow." },
        { label: "Save economics", href: "/retention/outputs", detail: "Shows expected saved revenue, payback, and account recommendations." }
      ],
      guardrails: [
        { label: "SLA routing", detail: "High-risk accounts require owner and response window assignment." },
        { label: "Offer discipline", detail: "Discount/save offers are constrained by payback and margin rules." },
        { label: "Residual risk", detail: "Closed interventions remain monitored for repeated risk signals." }
      ]
    }
  },
  {
    slug: "expansion-revenue-intelligence",
    title: "Expansion Revenue Intelligence Command Center",
    summary:
      "An installed-base growth console that scores expansion readiness, selects the right upsell motion, and models expected ARR, margin, SLA, and payback.",
    problem:
      "Expansion revenue is often hidden in scattered CSM notes, usage dashboards, renewal timing, and sales intuition. Teams know some accounts are ready, but the readiness signal is rarely operationalized.",
    thesis:
      "Expansion becomes repeatable when account readiness, offer fit, margin, pursuit cost, SLA, and payback are evaluated before the team chooses pursue, nurture, or defer.",
    architecture: [
      { title: "1. Account-base inputs", detail: "Maintain editable ARR, seats, usage growth, PQS, support health, renewal timing, sponsors, and expansion signals." },
      { title: "2. Readiness scorer", detail: "Classify accounts by readiness and infer the strongest motion from seat, usage, product, and commercial signals." },
      { title: "3. Offer recommender", detail: "Map account signals to seat expansion, feature upgrade, usage commit, or services attach offers." },
      { title: "4. ARR economics", detail: "Persist expected expansion ARR, margin, pursuit cost, payback, SLA fit, decision band, and audit event." }
    ],
    kpiCallouts: [
      { label: "Readiness score", value: "0-1", detail: "Each account is scored using utilization, growth, PQS, support health, timing, and signals." },
      { label: "Expected ARR", value: "$/run", detail: "Runs model expected expansion ARR by account and offer." },
      { label: "Decision lane", value: "Pursue/nurture/defer", detail: "Policy checks turn readiness into pipeline action." }
    ],
    commercialFraming:
      "The system makes expansion less anecdotal by converting installed-base signals into an accountable pipeline with offer fit, margin, and payback attached.",
    whatIBuilt:
      "I built the expansion schema, editable account/offer/policy inputs, readiness scoring engine, run endpoint, pipeline board, account recommendations, output economics, audit trail, and docs.",
    status: "live",
    appHref: "/expansion/overview",
    artifacts: {
      outcomeStrip: [
        { label: "Expected ARR", value: "$/run", note: "Expansion motions are modeled as incremental ARR by account." },
        { label: "Readiness", value: "0-1", note: "Signals combine into inspectable expansion readiness scores." },
        { label: "Payback", value: "Policy", note: "Pursuit decisions respect margin, SLA, and payback thresholds." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Editable ARR, seats, usage growth, product qualification, support health, renewal timing, sponsor status, offers, and policy." },
        { label: "Decision", detail: "Score readiness and select seat expansion, feature upgrade, usage commit, or services attach." },
        { label: "Output", detail: "Expected ARR, margin, pursuit cost, payback, decision band, and audit event." }
      ],
      evidenceLinks: [
        { label: "Expansion overview", href: "/expansion/overview", detail: "Shows the command-center framing and operating sequence." },
        { label: "Expansion inputs", href: "/expansion/inputs", detail: "Shows editable accounts, offers, and policy thresholds." },
        { label: "Readiness simulation", href: "/expansion/simulations", detail: "Shows run controls, KPI output, and the pipeline board." },
        { label: "Account queue", href: "/expansion/accounts", detail: "Shows account-base signal table with readiness scores." },
        { label: "ARR output", href: "/expansion/outputs", detail: "Shows expected ARR, margin, payback, and account recommendations." }
      ],
      guardrails: [
        { label: "Margin floor", detail: "Offers below policy margin are deferred." },
        { label: "Payback floor", detail: "Pursuit recommendations require gross-profit payback above threshold." },
        { label: "SLA discipline", detail: "High-readiness opportunities must fit the pursuit SLA window." }
      ]
    }
  },
  {
    slug: "email-engine-esp",
    title: "Email Engine ESP",
    summary:
      "A live provider-backed email service platform for template authoring, audience ingestion, campaign launch, journey orchestration, delivery operations, tracking, suppressions, and analytics.",
    problem:
      "Most teams either outgrow lightweight email tools or inherit brittle one-off sending code. They need the operational surface of an ESP without losing control of data contracts, delivery state, compliance rules, and provider portability.",
    thesis:
      "An ESP becomes more durable when campaign operations are modeled as an auditable platform: import contacts, build audiences, validate templates, approve launches, process queued delivery, capture provider events, and close the analytics loop.",
    architecture: [
      { title: "1. Contact and audience layer", detail: "Ingest contacts through APIs, CSV import, data sources, mappings, audience rules, previews, and snapshots." },
      { title: "2. Template and content system", detail: "Author, lint, validate, version, preview, and render Jinja templates with tracking and unsubscribe variables." },
      { title: "3. Campaign and journey orchestration", detail: "Create campaigns, approve scheduled launches, process due sends, clone workflows, and run multi-step journey enrollments." },
      { title: "4. Delivery and compliance engine", detail: "Queue durable send records, process provider-backed delivery, handle retries, and enforce unsubscribe, bounce, complaint, and manual suppressions." },
      { title: "5. Analytics and operations console", detail: "Expose campaign, audience, domain, journey, event, tracking-link, send-record, and delivery dashboards through API and admin views." }
    ],
    kpiCallouts: [
      { label: "API surface", value: "80+ endpoints", detail: "FastAPI contracts cover templates, contacts, audiences, campaigns, journeys, delivery, tracking, suppressions, analytics, and webhooks." },
      { label: "Migrations", value: "15", detail: "Alembic migrations evolve the ESP schema from initial entities through scheduling, journeys, retries, snapshots, and auth/session tables." },
      { label: "Live provider", value: "SendGrid", detail: "Production delivery is provider-backed while the platform boundary remains neutral for future SMTP or ESP providers." }
    ],
    commercialFraming:
      "The system is framed as owned email infrastructure: the product team controls lifecycle data, campaign workflow, delivery auditability, compliance state, and analytics rather than outsourcing the operating model to a black-box ESP.",
    whatIBuilt:
      "I built the FastAPI service, SQLAlchemy/Alembic schema, provider abstraction, template renderer and linting, contacts and audiences, CSV/data-source ingestion, campaign approval and launch flow, journey engine, queued delivery processing, SendGrid webhook ingestion, tracking links, suppressions, analytics endpoints, admin console, tester, deployment docs, and production smoke tests.",
    appHref: "https://email-engine.app/esp",
    status: "live",
    artifacts: {
      outcomeStrip: [
        { label: "Live app", value: "email-engine.app", note: "Production FastAPI deployment routes the root URL into the admin console." },
        { label: "Campaign loop", value: "Approve/queue/send", note: "Campaigns validate, approve, launch into durable send jobs, and process queued records." },
        { label: "Tracking", value: "Open/click", note: "Generated links and pixels record engagement and roll up into campaign analytics." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Contacts, attributes, audiences, templates, variables, data-source mappings, journeys, and campaign schedules." },
        { label: "Decision", detail: "Validate render data, audience match count, suppressions, approval state, scheduled timing, and queued delivery eligibility." },
        { label: "Output", detail: "Provider-backed sends, send records, tracking events, suppression records, campaign timelines, and analytics summaries." }
      ],
      evidenceLinks: [
        { label: "Live admin", href: "https://email-engine.app/esp", detail: "Opens the deployed Email Engine admin console." },
        { label: "API docs", href: "https://email-engine.app/docs", detail: "Shows the generated OpenAPI schema for the production API." },
        { label: "Source repository", href: "https://github.com/dwolfe1966/email-engine", detail: "Contains the FastAPI service, migrations, docs, tests, and deployment configuration." },
        { label: "Template editor", href: "https://email-engine.app/template-editor", detail: "Shows the production template authoring, preview, and validation surface." }
      ],
      guardrails: [
        { label: "Approval gate", detail: "Non-dry-run campaigns must validate and move through approval before production launch." },
        { label: "Suppression enforcement", detail: "Unsubscribes, bounces, spam complaints, and manual suppressions block future sends." },
        { label: "Webhook verification", detail: "SendGrid event-webhook signature verification is supported for production hardening." }
      ]
    }
  },
  {
    slug: "vickrey-auction-closed-ads-ecosystem",
    title: "Vickrey Auction Model for Closed Advertising Ecosystem",
    summary:
      "A closed-marketplace auction desk that runs quality-adjusted second-price auctions with advertiser behavior modes, reserve floors, pacing controls, and live clearing output.",
    problem:
      "Closed ad marketplaces can over-index on short-term yield and obscure how clearing prices are set. That weakens advertiser trust, creates allocation inefficiency, and makes marketplace health hard to diagnose.",
    thesis:
      "A transparent second-price mechanism with quality weighting, reserve floors, pacing, and behavior simulation gives operators a clearer way to balance bidder trust, relevance, and yield.",
    architecture: [
      { title: "1. Marketplace inputs", detail: "Maintain editable slots, advertisers, quality scores, behavior modes, budget, reserve price, and bid matrix." },
      { title: "2. Eligibility + pacing", detail: "Filter bids by reserve, budget state, behavior mode, target CAC, and smoothing factor." },
      { title: "3. Quality-adjusted ranking", detail: "Rank bids using adjusted bid x quality score to reward relevance as well as price." },
      { title: "4. Second-price clearing", detail: "Charge the winner from the next-best adjusted score, then persist run history and marketplace KPIs." }
    ],
    kpiCallouts: [
      { label: "Clearing logic", value: "2nd price", detail: "Winner pays a quality-adjusted second-price equivalent, not a max-charge black box." },
      { label: "Behavior modes", value: "3 modes", detail: "Advertisers can bid truthfully, shade bids, or auto-bid against target CAC." },
      { label: "Health KPIs", value: "5 signals", detail: "Runs summarize fill rate, fill quality, revenue stability, trust proxy, and concentration." }
    ],
    commercialFraming:
      "The system frames marketplace monetization as a trust problem as much as a yield problem: advertisers need predictable clearing logic, and operators need health diagnostics before changing reserves or pacing rules.",
    whatIBuilt:
      "I built the auction schema, advertiser/slot/bid editors, clearing engine, simulation endpoint, live ticker, run history, marketplace health calculations, reserve suggestion logic, audit views, and docs.",
    appHref: "/auction/overview",
    status: "live",
    artifacts: {
      outcomeStrip: [
        { label: "Clearing", value: "2nd price", note: "Winner is charged from the next-best adjusted score and winner quality." },
        { label: "Fill quality", value: "Tracked", note: "Quality-weighted ranking exposes relevance of served placements." },
        { label: "Health", value: "KPI rollup", note: "Marketplace runs track stability, trust proxy, concentration, and fill." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Editable slot, advertiser, bid, quality score, behavior mode, pacing state, target CAC, and reserve price." },
        { label: "Decision", detail: "Filter eligibility, rank by quality-adjusted score, and clear at a second-price equivalent." },
        { label: "Output", detail: "Winning placement, charged price, ranked bids, health KPIs, reserve suggestion, and audit event." }
      ],
      evidenceLinks: [
        { label: "Run a marketplace round", href: "/auction/simulations", detail: "Trigger N quality-adjusted second-price auctions with a live ticker." },
        { label: "Define inventory + advertisers", href: "/auction/inputs", detail: "CRUD editors for slots, advertisers (with behavior modes), and bid matrix." },
        { label: "Run history + economics", href: "/auction/outputs", detail: "KPI rollups, revenue stability, advertiser-level fill share." },
        { label: "Marketplace health", href: "/auction/health", detail: "Shows bidder concentration, reserve suggestion, and health diagnostics." }
      ],
      guardrails: [
        { label: "Reserve price", detail: "Placements do not clear below marketplace floor pricing." },
        { label: "Quality weighting", detail: "Bids must compete on relevance, not just maximum price." },
        { label: "Pacing control", detail: "Spend delivery is smoothed to avoid early exhaustion and volatility." }
      ]
    }
  }
];

export function getProjectBySlug(slug: string) {
  return projects.find((p) => p.slug === slug);
}
