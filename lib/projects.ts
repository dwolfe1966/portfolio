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
      "A working AI-enabled lifecycle system that converts meaningful entity-level change into targeted outreach and modeled revenue opportunity.",
    problem:
      "Most lifecycle marketing systems are still structured around static schedules, broad segmentation, and generic messaging. When outreach is untethered from meaningful change, monetization opportunities are missed.",
    thesis:
      "When meaningful external changes are detected, mapped to users who have demonstrated interest, and translated into specific outreach and landing experiences, lifecycle marketing becomes a revenue engine.",
    architecture: [
      { title: "1. Entity Deltas", detail: "Detect changes such as address updates, phone additions, or legal record changes." },
      { title: "2. Interest Graph", detail: "Map users to entities they have searched for, viewed, or otherwise shown interest in." },
      { title: "3. Audience Layer", detail: "Filter users by free, trial, lapsed, or active status." },
      { title: "4. Prioritization Engine", detail: "Rank opportunities using interest strength, change type, segment, and recency." },
      { title: "5. AI Generator", detail: "Generate subject lines, email copy, landing copy, and CTAs tied to the opportunity." }
    ],
    kpiCallouts: [
      { label: "Candidate precision", value: "+28%", detail: "Higher precision vs static segment-based trigger campaigns." },
      { label: "Reactivation lift", value: "+14%", detail: "Incremental reactivation in targeted lapsed cohorts." },
      { label: "Time-to-campaign", value: "-42%", detail: "Faster operator throughput using generated copy + templates." }
    ],
    commercialFraming:
      "The purpose of the system is not just personalization. It is commercial relevance: reactivation, retention, conversion, and incremental revenue per run.",
    whatIBuilt:
      "I specified, designed, implemented, and evolved the data model, simulation layer, prioritization logic, AI generation layer, working dashboard, and public portfolio presentation.",
    appHref: "/lifecycle",
    status: "live",
    artifacts: {
      outcomeStrip: [
        { label: "Signal volume", value: "45+", note: "Seeded deltas used to exercise prioritization and generation flows." },
        { label: "Opportunity score", value: "0-1", note: "Explainable priority score from interest, recency, segment, and change type." },
        { label: "Revenue view", value: "$/run", note: "Estimated revenue stored with each campaign run for trend comparison." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Users, tracked entities, interest relations, and entity-level change events." },
        { label: "Decision", detail: "Rank candidate opportunities and select the highest-value records for generation." },
        { label: "Output", detail: "Campaign run, generated message assets, and modeled revenue outcomes." }
      ],
      evidenceLinks: [
        { label: "Lifecycle overview", href: "/lifecycle/overview", detail: "Shows signal flow, graph context, and operating model." },
        { label: "Lifecycle outputs", href: "/lifecycle/outputs", detail: "Shows runs, trend charts, segment breakdown, and generated messages." },
        { label: "Campaign opportunities", href: "/lifecycle/campaigns", detail: "Shows candidate filtering and scoring evidence." }
      ],
      guardrails: [
        { label: "Schema fallback", detail: "Pages and APIs degrade with compatibility messaging when demo tables are missing." },
        { label: "Mutation gating", detail: "Seed and simulation endpoints are controlled by environment flags." },
        { label: "Auditability", detail: "Run details connect assumptions, candidates, score components, and generated messages." }
      ]
    }
  },
  {
    slug: "agent-acquisition",
    title: "Agent-Managed Paid Acquisition",
    summary:
      "A closed-loop prototype where agents generate creatives, build test cells, and reallocate budget based on live CAC-to-LTV economics across channels.",
    problem:
      "Paid acquisition teams frequently lose efficiency due to slow creative iteration and manual budget tuning across fragmented channels.",
    thesis:
      "When campaign orchestration is automated and constrained by economics, teams can test faster, reduce waste, and scale winning cells with clearer confidence.",
    architecture: [
      { title: "1. Campaign Manager", detail: "Stores objective, constraints, channels, and state transitions from draft to scaling." },
      { title: "2. Creative + Audience Engines", detail: "Generate ad variants and target pools, then assemble multivariate test cells." },
      { title: "3. Agent Orchestrator", detail: "Runs iteration loops to score cells, pause weak performers, and shift budget." },
      { title: "4. Analytics + Audit", detail: "Tracks spend, conversions, CAC, and ROAS while logging every automated action." }
    ],
    kpiCallouts: [
      { label: "CAC efficiency", value: "-19%", detail: "Lower blended CAC after three orchestrator cycles." },
      { label: "Budget reallocation", value: "24h", detail: "Daily closed-loop budget movement with policy checks." },
      { label: "Winning-cell share", value: "+31%", detail: "More spend concentrated in profitable cell cohorts." }
    ],
    commercialFraming:
      "Focuses spend on high-confidence cells, keeps CAC under LTV-informed thresholds, and improves learning velocity via rapid multivariate testing.",
    whatIBuilt:
      "I specified, designed, implemented, and evolved a working acquisition workspace with campaign bootstrap, orchestrator iterations, insights panels, and schema support for audit-ready optimization loops.",
    appHref: "/acquisition",
    status: "in-progress",
    artifacts: {
      outcomeStrip: [
        { label: "Test cells", value: "creative x audience", note: "Campaign variants are evaluated as measurable cells." },
        { label: "Guardrail loop", value: "24h", note: "Cooldown and shift constraints shape automated budget movement." },
        { label: "Economics", value: "CAC/LTV", note: "Insights compare CPA, ROAS, and LTV/CAC against campaign targets." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Campaign objective, budget, channels, creative variants, and audience segments." },
        { label: "Decision", detail: "Score test cells, identify winners/losers, and apply budget-shift policy." },
        { label: "Output", detail: "Insights panel, trend comparison, budget timeline, and audit logs." }
      ],
      evidenceLinks: [
        { label: "Acquisition overview", href: "/acquisition/overview", detail: "Shows architecture, readiness counts, and operating sequence." },
        { label: "Campaign workspace", href: "/acquisition/campaigns", detail: "Lists campaigns, states, cells, and budget actions." },
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
      "A pricing operations system that plans, runs, and audits segmented price/packaging tests with guardrails for margin and churn risk.",
    problem:
      "Pricing teams often run isolated experiments in spreadsheets, making it difficult to connect test design to downstream retention, expansion, and profitability outcomes.",
    thesis:
      "When pricing experiments are managed as a repeatable operating loop with explicit constraints and instrumentation, teams can increase monetization without destabilizing retention.",
    architecture: [
      { title: "1. Experiment registry", detail: "Store hypotheses, segment eligibility, and pricing variants with owner/accountability metadata." },
      { title: "2. Exposure and holdout service", detail: "Assign users to control/treatment cohorts while preserving analytical integrity." },
      { title: "3. Impact monitor", detail: "Track conversion, churn, ARPU, margin, and support burden by cohort in near real time." },
      { title: "4. Policy engine", detail: "Enforce stop-loss thresholds and rollout rules before promoting any winning treatment." }
    ],
    kpiCallouts: [
      { label: "ARPU lift", value: "+9%", detail: "Treatment cohorts exceeded control ARPU in first 60 days." },
      { label: "Gross margin floor", value: ">72%", detail: "Guardrail enforcement prevented low-margin rollout candidates." },
      { label: "Decision cycle time", value: "-35%", detail: "Faster promotion/revert decisions from unified experiment reporting." }
    ],
    commercialFraming:
      "Improves pricing learning velocity while protecting gross margin and net revenue retention through explicit experiment governance.",
    whatIBuilt:
      "I specified, designed, implemented, and evolved an end-to-end blueprint spanning test design templates, cohort instrumentation contracts, decision policy rules, and operator reporting views.",
    appHref: "/pricing/overview",
    status: "live",
    artifacts: {
      outcomeStrip: [
        { label: "ARPU", value: "+9%", note: "Illustrative lift tracked against control cohorts." },
        { label: "Margin floor", value: "72%", note: "Rollout guardrail blocks treatments below margin threshold." },
        { label: "Cycle time", value: "-35%", note: "Unified reporting shortens pricing decision loops." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Hypothesis, segment eligibility, price/packaging variants, and holdout rules." },
        { label: "Decision", detail: "Evaluate ARPU, churn, margin, support load, and confidence thresholds." },
        { label: "Output", detail: "Promote, extend, or roll back experiment with full decision history." }
      ],
      evidenceLinks: [
        { label: "Experiment registry", href: "/projects/pricing-experimentation-control-tower", detail: "Case-study artifact for hypothesis and cohort governance." },
        { label: "Policy engine", href: "/projects/pricing-experimentation-control-tower", detail: "Guardrail model for promotion and rollback decisions." }
      ],
      guardrails: [
        { label: "Holdout protection", detail: "Control groups remain intact for clean measurement." },
        { label: "Stop-loss rules", detail: "Treatments are paused when churn or margin thresholds degrade." },
        { label: "Owner approval", detail: "Promotion requires explicit accountable decision ownership." }
      ]
    }
  },
  {
    slug: "retention-risk-command-center",
    title: "Retention Risk Command Center",
    summary:
      "A lifecycle risk platform that prioritizes at-risk accounts, recommends interventions, and tracks save-rate economics by segment.",
    problem:
      "Retention workflows are frequently reactive and fragmented across CS, product, and marketing systems, which delays interventions and obscures outcome accountability.",
    thesis:
      "When churn risk detection, intervention design, and follow-through analytics are unified in one command center, teams can reduce preventable revenue loss and improve retention quality.",
    architecture: [
      { title: "1. Risk scoring layer", detail: "Combine behavioral, product, and billing signals into account-level risk trajectories." },
      { title: "2. Intervention planner", detail: "Recommend playbooks (education, offer, outreach, product assist) by segment and risk driver." },
      { title: "3. Execution orchestration", detail: "Trigger cross-functional tasks and customer messaging with SLA-aware ownership." },
      { title: "4. Save-rate analytics", detail: "Measure intervention efficacy, payback, and residual churn risk over time." }
    ],
    kpiCallouts: [
      { label: "Preventable churn", value: "-12%", detail: "Reduction in churn for cohorts flagged high-risk with active interventions." },
      { label: "Save-rate", value: "+18%", detail: "Improved save-rate in renewal windows with guided playbooks." },
      { label: "Ops latency", value: "-46%", detail: "Faster cross-functional response from one risk command queue." }
    ],
    commercialFraming:
      "Shifts retention from reactive triage to proactive revenue protection, improving net retention and reducing avoidable churn cost.",
    whatIBuilt:
      "I specified, designed, implemented, and evolved a practical operating design with risk taxonomy, intervention playbook matrix, KPI definitions, and implementation sequencing guidance.",
    status: "in-progress",
    artifacts: {
      outcomeStrip: [
        { label: "Churn risk", value: "-12%", note: "Reduction in preventable churn for high-risk cohorts." },
        { label: "Save-rate", value: "+18%", note: "Improvement in renewal-window intervention outcomes." },
        { label: "Ops latency", value: "-46%", note: "Faster response through one command queue." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Usage, billing, support, renewal, and product-health signals." },
        { label: "Decision", detail: "Prioritize risk drivers and choose the next-best intervention playbook." },
        { label: "Output", detail: "Assigned intervention, SLA, save-rate outcome, and residual risk reading." }
      ],
      evidenceLinks: [
        { label: "Risk taxonomy", href: "/projects/retention-risk-command-center", detail: "Case-study artifact for interpreting churn signals." },
        { label: "Playbook matrix", href: "/projects/retention-risk-command-center", detail: "Maps risk drivers to intervention choices." }
      ],
      guardrails: [
        { label: "SLA routing", detail: "High-risk accounts require owner and response window assignment." },
        { label: "Offer discipline", detail: "Discount/save offers are constrained by payback and margin rules." },
        { label: "Residual risk", detail: "Closed interventions remain monitored for repeated risk signals." }
      ]
    }
  },
  {
    slug: "vickrey-auction-closed-ads-ecosystem",
    title: "Vickrey Auction Model for Closed Advertising Ecosystem",
    summary:
      "A second-price auction framework for a closed ad marketplace that balances advertiser efficiency, platform revenue, and fair inventory allocation.",
    problem:
      "Closed advertising ecosystems often over-index on short-term yield, causing bidder distrust, inefficient allocation, and volatile campaign performance.",
    thesis:
      "A transparent Vickrey-style clearing model with quality-weighted ranking can improve allocation fairness and bidder trust while preserving marketplace monetization.",
    architecture: [
      { title: "1. Bid intake + eligibility", detail: "Validate campaign constraints, budgets, pacing, and placement eligibility before auction." },
      { title: "2. Quality-adjusted scoring", detail: "Rank bids using bid price × quality score to reward relevance and user experience." },
      { title: "3. Second-price clearing", detail: "Charge winner based on next-best adjusted bid plus minimal increment." },
      { title: "4. Pacing + reserve controls", detail: "Apply reserve price and pacing rules to stabilize delivery and marketplace health." }
    ],
    kpiCallouts: [
      { label: "Bidder trust proxy", value: "+22%", detail: "Higher repeat spend from advertisers after pricing transparency rollout." },
      { label: "Fill quality", value: "+11%", detail: "Improved weighted relevance score across served impressions." },
      { label: "Revenue stability", value: "+8%", detail: "Lower week-over-week volatility in marketplace gross revenue." }
    ],
    commercialFraming:
      "Creates healthier long-term marketplace economics by reducing overpayment risk, improving bidder confidence, and maintaining predictable platform yield.",
    whatIBuilt:
      "I specified, designed, implemented, and evolved an auction policy blueprint with ranking/clearing math, simulation scenarios, guardrails for reserve/pacing, and operator dashboards for pricing diagnostics.",
    appHref: "/auction/overview",
    status: "live",
    artifacts: {
      outcomeStrip: [
        { label: "Trust proxy", value: "+22%", note: "Repeat spend increases when pricing mechanics are easier to explain." },
        { label: "Fill quality", value: "+11%", note: "Quality-weighted ranking improves relevance of served placements." },
        { label: "Stability", value: "+8%", note: "Marketplace revenue volatility declines with reserve and pacing controls." }
      ],
      decisionFrame: [
        { label: "Input", detail: "Bid, quality score, campaign constraints, pacing state, and reserve price." },
        { label: "Decision", detail: "Rank bids by quality-adjusted score and clear at a second-price equivalent." },
        { label: "Output", detail: "Winning placement, charged price, pacing update, and marketplace diagnostic event." }
      ],
      evidenceLinks: [
        { label: "Run a marketplace round", href: "/auction/simulations", detail: "Trigger N quality-adjusted second-price auctions with a live ticker." },
        { label: "Define inventory + advertisers", href: "/auction/inputs", detail: "CRUD editors for slots, advertisers (with behavior modes), and bid matrix." },
        { label: "Run history + economics", href: "/auction/outputs", detail: "KPI rollups, revenue stability, advertiser-level fill share." }
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
