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
        Product discovery in AI-native systems should connect user signal quality, decision latency,
        and economics from day one. The strongest loops start with clear hypotheses, measurable
        outcomes, and explicit operator controls.
      </p>
      <p>
        In practice this means: define constraints up front, instrument every major decision point,
        and treat model output as an input to workflow design, not a final answer.
      </p>
      <p>
        This note is the first draft of a broader series on discovery methods for AI-enabled growth products.
      </p>
    </Section>
  );
}
