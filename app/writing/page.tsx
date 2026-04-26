import Link from "next/link";
import { Metadata } from "next";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = {
  title: "Writing | David Wolfe",
  description: "Essays on AI revenue systems, lifecycle strategy, and acquisition operating loops."
};

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
