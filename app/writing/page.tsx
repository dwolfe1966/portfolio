import Link from "next/link";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = buildMetadata({
  title: "Writing | David Wolfe",
  description: "Essays on AI revenue systems, lifecycle strategy, and acquisition operating loops.",
  path: "/writing"
});

const essays = [
  {
    slug: "generic-lifecycle-marketing-is-dying",
    title: "Generic lifecycle marketing is dying",
    preview: "Why calendar-based campaigns are giving way to signal logic, opportunity scoring, and AI-assisted relevance."
  },
  {
    slug: "ai-revenue-systems",
    title: "AI Revenue Systems",
    preview: "How AI moves from content assistance into policy-bound operating loops for revenue decisions."
  },
  {
    slug: "product-discovery-ai-loops",
    title: "Product discovery in AI operating loops",
    preview: "Discovery patterns for AI products that participate in decisions, not just generate answers."
  },
  {
    slug: "acquisition-guardrails",
    title: "Acquisition agents need guardrails before autonomy",
    preview: "Why paid-growth agents need CAC/LTV policy, budget limits, cooldowns, and audit trails before autonomy."
  },
  {
    slug: "lifecycle-signal-quality",
    title: "Lifecycle signal quality beats message volume",
    preview: "Why the best lifecycle systems prioritize signal quality, customer relationship, timing, and measurable action."
  },
  {
    slug: "pricing-experiments-operating-system",
    title: "Pricing experiments should be operating systems",
    preview: "How pricing tests become safer when hypotheses, cohorts, simulations, guardrails, and decisions live together."
  }
];

export default function WritingIndexPage() {
  return (
    <Section eyebrow="Writing" title="Essays and operating notes">
      <p>Point-of-view writing on AI-native product systems, growth economics, and execution.</p>
      <div className="grid" style={{ marginTop: 16 }}>
        {essays.map((essay) => (
          <div key={essay.slug} className="card">
            <h3>{essay.title}</h3>
            <p>{essay.preview}</p>
            <Link className="btn" href={`/writing/${essay.slug}`}>Read Essay</Link>
          </div>
        ))}
      </div>
    </Section>
  );
}
