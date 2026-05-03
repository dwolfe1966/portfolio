import { Metadata } from "next";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Product Discovery in AI Loops | David Wolfe",
  description: "Discovery patterns for AI-native products with explicit operator controls and measurable outcomes.",
  path: "/writing/product-discovery-ai-loops"
});

export default function ProductDiscoveryAiLoopsEssayPage() {
  return (
    <Section eyebrow="Writing" title="Product discovery in AI operating loops">
      <p>
        Product discovery for AI systems is different because the product does not only present information.
        It participates in decisions. That means discovery cannot stop at user needs, task flows, and feature
        desirability. It has to test whether the system can improve judgment under real constraints.
      </p>
      <p>
        The most important discovery question is not &quot;Can the model produce an answer?&quot; It is
        &quot;Can the workflow use that answer responsibly?&quot; An AI recommendation is only valuable if the
        operator knows what evidence was used, what policy was applied, what action is allowed, and what
        outcome will be measured.
      </p>
      <p>
        That changes the artifact of discovery. A prototype is not enough if it only demonstrates a clever
        generation moment. The prototype needs a decision frame: inputs, confidence, uncertainty, constraints,
        fallback behavior, approval rules, and audit history. Without that frame, discovery overestimates value
        because the demo works in isolation but the operating loop fails in production.
      </p>
      <p>
        NIST&apos;s AI risk work is useful here because it gives product teams a vocabulary beyond accuracy. Govern,
        map, measure, and manage are product questions as much as compliance questions. Who owns the decision?
        What is the system allowed to do? Where can it fail? How will failures be detected? Which harms are
        unacceptable even if the aggregate metric improves?
      </p>
      <p>
        Discovery should therefore start with a decision inventory. List the decisions the system could support,
        then classify them by impact, reversibility, data quality, and required human judgment. Low-risk decisions
        can be automated earlier. High-risk decisions may need recommendations, simulations, approval queues, or
        explicit override paths. The roadmap follows the risk profile, not the model demo.
      </p>
      <p>
        The second discovery artifact is an outcome contract. For a revenue system, that might be CAC, LTV, ARPU,
        churn risk, expansion ARR, margin, or payback. For an internal workflow, it might be cycle time, quality,
        exception rate, or operator throughput. If the team cannot name the metric, the AI feature is probably
        still a capability in search of a product.
      </p>
      <p>
        The third artifact is operator trust. Operators do not need the model to be magical. They need it to be
        legible. They need to see why a recommendation appeared, what data it used, when it is allowed to act, and
        how to correct it. Trust is built less through persuasion than through repeated, inspectable decisions.
      </p>
      <p>
        Good AI product discovery is therefore operational. It asks what the system should decide, what it should
        never decide, what evidence it needs, how humans interact with it, and how the business will know whether
        the loop got better. That is the path from AI feature to AI operating system.
      </p>
      <p className="small">
        Research context:{" "}
        <a href="https://www.nist.gov/itl/ai-risk-management-framework/nist-ai-rmf-playbook" target="_blank" rel="noreferrer noopener">
          NIST AI RMF Playbook
        </a>
        {" "}and{" "}
        <a href="https://www.gartner.com/en/newsroom/press-releases/2025-06-11-gartner-predicts-that-guardian-agents-will-capture-10-15-percent-of-the-agentic-ai-market-by-2030" target="_blank" rel="noreferrer noopener">
          Gartner on guardian agents
        </a>
        .
      </p>
    </Section>
  );
}
