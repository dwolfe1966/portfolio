import type { DebateFamily } from "./compounding-expertise-lab";

// Framework hypotheses, not assertions about a company or new evidence scores.
export const DEBATE_ARGUMENT_STRUCTURE: Record<DebateFamily, { thesis: string; subclaims: [string, string, string] }> = {
  EXPERIENCE_CAPTURE: {
    thesis: "The selected cases contain linked, graded experience available for learning.",
    subclaims: ["Decisions and actions can be linked to their outcomes.", "Outcomes receive meaningful, reliable grades.", "Coverage across the selected cases is sufficient to evaluate the loop."]
  },
  LEARNING_CAUSALITY: {
    thesis: "Learning from graded experience causes better future decisions.",
    subclaims: ["Outcome grades inform identifiable model or policy changes.", "Those changes reach production and improve held-out decisions.", "The improvement is attributable to experience, not a newer base model or an easier case mix."]
  },
  CROSS_CUSTOMER_TRANSFER: {
    thesis: "Experience from one customer improves decisions for other customers.",
    subclaims: ["Customers share decision-relevant patterns.", "Pooled experience beats customer-only history on held-out customers.", "The benefit generalizes beyond one customer or segment without material negative transfer."]
  },
  MARGINAL_INFORMATION_VALUE: {
    thesis: "Additional graded experience continues to improve decision quality.",
    subclaims: ["New cohorts add useful lessons or improve estimates of known patterns.", "Adding those cohorts produces incremental performance gains against a fixed baseline.", "Those gains persist after accounting for redundancy and changing conditions."]
  },
  REBUILDABILITY_COMPRESSION: {
    thesis: "A capable challenger cannot cheaply reconstruct the useful expertise.",
    subclaims: ["The incumbent has a measurable performance advantage.", "Public data, compressed rules, simulation, and limited calibration do not close the gap cheaply.", "The time or cost to catch up is material, even as foundation models improve."]
  },
  LEARNING_RIGHTS: {
    thesis: "The company has usable rights and access to retain and learn from experience.",
    subclaims: ["Contracts permit retaining the relevant records or derived features.", "The intended evaluation, training, and cross-customer reuse are permitted.", "Operational access and governance make those permissions usable in practice."]
  },
  ECONOMIC_MATERIALITY: {
    thesis: "Better decisions create economically meaningful value.",
    subclaims: ["Decision quality is linked to measurable economic outcomes.", "Improvement produces net value after operating and learning costs.", "The customer or company captures that value at meaningful scale."]
  },
  ALTERNATIVE_POWER: {
    thesis: "The company may have durable Power independent of Compounding Expertise.",
    subclaims: ["A specific alternative mechanism produces a customer or cost advantage.", "Evidence shows a barrier to copying or switching, not just a useful product feature.", "The advantage remains defensible without assuming a compounding learning loop."]
  }
};
