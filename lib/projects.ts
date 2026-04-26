export type ProjectEntry = {
  slug: string;
  title: string;
  summary: string;
  problem: string;
  thesis: string;
  architecture: Array<{ title: string; detail: string }>;
  commercialFraming: string;
  whatIBuilt: string;
  appHref?: string;
  status?: "live" | "in-progress";
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
    commercialFraming:
      "The purpose of the system is not just personalization. It is commercial relevance: reactivation, retention, conversion, and incremental revenue per run.",
    whatIBuilt:
      "A data model, simulation layer, prioritization logic, AI generation layer, working dashboard, and public portfolio presentation.",
    appHref: "/lifecycle",
    status: "live"
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
    commercialFraming:
      "Focuses spend on high-confidence cells, keeps CAC under LTV-informed thresholds, and improves learning velocity via rapid multivariate testing.",
    whatIBuilt:
      "Working acquisition workspace with campaign bootstrap, orchestrator iterations, insights panels, and schema support for audit-ready optimization loops.",
    appHref: "/acquisition",
    status: "in-progress"
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
    commercialFraming:
      "Improves pricing learning velocity while protecting gross margin and net revenue retention through explicit experiment governance.",
    whatIBuilt:
      "An end-to-end blueprint spanning test design templates, cohort instrumentation contracts, decision policy rules, and operator reporting views.",
    status: "in-progress"
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
    commercialFraming:
      "Shifts retention from reactive triage to proactive revenue protection, improving net retention and reducing avoidable churn cost.",
    whatIBuilt:
      "A practical operating design with risk taxonomy, intervention playbook matrix, KPI definitions, and implementation sequencing guidance.",
    status: "in-progress"
  }
];

export function getProjectBySlug(slug: string) {
  return projects.find((p) => p.slug === slug);
}
