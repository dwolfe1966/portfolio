import { Metadata } from "next";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI Revenue Systems | David Wolfe",
  description: "How AI evolves from content assistance into an operating layer for lifecycle and revenue decisions.",
  path: "/writing/ai-revenue-systems"
});

export default function WritingPage() {
  return (
    <Section eyebrow="Essay" title="AI Revenue Systems">
      <p>
        The first wave of generative AI in revenue teams was mostly a content story: faster email drafts,
        more ad variants, better sales notes, cheaper research. Useful, but not a new operating model.
        The larger shift is that AI can now sit inside the revenue system itself: reading signals, applying
        policy, choosing actions, and handing operators a decision record instead of another dashboard.
      </p>
      <p>
        That matters because most revenue organizations are constrained less by ideas than by operating
        bandwidth. Teams already know they should test more segments, respond faster to customer behavior,
        tune acquisition spend, find retention risk earlier, and run tighter pricing experiments. The problem
        is that each motion requires data work, judgment, coordination, and follow-through. AI becomes valuable
        when it compresses that loop without hiding the reasoning.
      </p>
      <p>
        McKinsey&apos;s 2025 AI survey points to the same pattern: adoption is broad, agent experimentation is
        growing, but many organizations are still early in scaling enterprise value. The practical implication
        is that AI value does not come from sprinkling assistants across every function. It comes from redesigning
        high-value workflows where a better decision produces measurable commercial impact.
      </p>
      <p>
        A revenue system has four layers. First, it needs signal ingestion: customer behavior, entity changes,
        campaign performance, account health, price response, and sales activity. Second, it needs decision
        logic: scoring, thresholds, policies, eligibility, and guardrails. Third, it needs action generation:
        outreach, budget shifts, offer recommendations, intervention plans, or experiment decisions. Fourth,
        it needs operating memory: audit logs, outcome feedback, and a record of what the system believed when
        it acted.
      </p>
      <p>
        The mistake is to treat the model as the product. The model is one component. The product is the loop:
        what data enters, what decision gets made, what action gets taken, who can override it, and how the next
        decision improves. That is why NIST&apos;s AI Risk Management Framework is useful even for revenue systems:
        it forces builders to think in terms of governance, mapping, measurement, and management rather than
        only model capability.
      </p>
      <p>
        In practice, an AI revenue system should be narrow before it is broad. Pick a commercially meaningful
        loop: lifecycle prioritization, acquisition budget movement, retention intervention, expansion readiness,
        or pricing rollout. Define the action space. Define the economic metric. Define the risk controls. Then
        let the system work repeatedly enough that operators can judge whether decision quality is actually
        improving.
      </p>
      <p>
        The next generation of revenue software will not look like a static CRM report with a chatbot attached.
        It will look more like an operating console: live signals, policy-bound agents, simulations, recommended
        actions, human approvals where risk is high, and audit trails everywhere. The companies that win will not
        be the ones with the most AI features. They will be the ones that turn AI into a repeatable decision system.
      </p>
      <p className="small">
        Research context:{" "}
        <a href="https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai/" target="_blank" rel="noreferrer noopener">
          McKinsey State of AI 2025
        </a>
        {" "}and{" "}
        <a href="https://www.nist.gov/itl/ai-risk-management-framework" target="_blank" rel="noreferrer noopener">
          NIST AI Risk Management Framework
        </a>
        .
      </p>
    </Section>
  );
}
