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
      <p>Most lifecycle marketing systems were built for a world in which software was expensive to create, experimentation was relatively slow, and messaging logic had to be manageable by humans. That produced broad segments, campaign calendars, static triggers, and increasingly generic content.</p>
      <p>AI is not just improving the cost and speed of content generation. More importantly, it is changing what a lifecycle system can be. When software creation becomes cheaper and decision logic becomes more dynamic, the constraint is no longer how many campaigns a team can manage. It becomes what signals matter, and what the system should do when they appear.</p>
      <p>A strong lifecycle system increasingly needs to detect meaningful signals, identify which users care, decide which opportunities are worth acting on, and generate coherent experiences around them. That is not just content automation. It is part of the revenue operating layer.</p>
    </Section>
  );
}
