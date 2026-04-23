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
    appHref: "/demo",
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
  }
];

export function getProjectBySlug(slug: string) {
  return projects.find((p) => p.slug === slug);
}
