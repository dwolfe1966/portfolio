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
      "In-progress concept for an AI-agent system that generates creatives, rebalances budgets, and optimizes CAC-to-LTV economics across channels.",
    problem:
      "Paid acquisition teams frequently lose efficiency due to slow creative iteration and manual budget tuning across fragmented channels.",
    thesis:
      "Agent-managed acquisition can reduce response latency, improve experiment velocity, and maintain tighter economic control over CAC versus LTV.",
    architecture: [
      { title: "1. Creative Factory", detail: "Generate and test ad variants by persona, offer, and channel." },
      { title: "2. Budget Allocator", detail: "Reallocate spend toward high-performing campaigns based on live performance." },
      { title: "3. Economic Guardrails", detail: "Constrain optimization to CAC/LTV targets and margin requirements." }
    ],
    commercialFraming:
      "Focuses spend on high-confidence opportunities while improving campaign learning loops and reducing wasted budget.",
    whatIBuilt:
      "Case-study scaffolding and product architecture blueprint (detailed implementation next).",
    appHref: "/acquisition",
    status: "in-progress"
  }
];

export function getProjectBySlug(slug: string) {
  return projects.find((p) => p.slug === slug);
}
