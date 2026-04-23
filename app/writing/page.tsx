import Link from "next/link";
import { Section } from "@/components/site/Section";

export default function WritingIndexPage() {
  return (
    <Section eyebrow="Writing" title="Essays and operating notes">
      <p>Point-of-view writing on AI-native product systems, growth economics, and execution.</p>
      <div className="card">
        <h3>AI Revenue Systems</h3>
        <p>How AI moves from content assistance to revenue operating layer.</p>
        <Link className="btn" href="/writing/ai-revenue-systems">Read essay</Link>
      </div>
    </Section>
  );
}
