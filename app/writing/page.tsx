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
    preview: "Why event-driven relevance is replacing static lifecycle calendars and broad segmentation."
  },
  {
    slug: "ai-revenue-systems",
    title: "AI Revenue Systems",
    preview: "How AI moves from content assistance to revenue operating layer."
  },
  {
    slug: "product-discovery-ai-loops",
    title: "Product discovery in AI operating loops",
    preview: "Discovery patterns for AI-native products that need measurable operator outcomes."
  },
  {
    slug: "acquisition-guardrails",
    title: "Acquisition agents need guardrails before autonomy",
    preview: "Why CAC/LTV policy, budget caps, cooldowns, and audit logs matter before campaign automation scales."
  },
  {
    slug: "lifecycle-signal-quality",
    title: "Lifecycle signal quality beats message volume",
    preview: "A practical note on why signal selection, interest relations, and timing drive lifecycle performance."
  },
  {
    slug: "pricing-experiments-operating-system",
    title: "Pricing experiments should be operating systems",
    preview: "How pricing tests become safer and faster when hypotheses, cohorts, guardrails, and decisions live together."
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
