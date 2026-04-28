import { Metadata } from "next";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Generic Lifecycle Marketing Is Dying | David Wolfe",
  description: "Why event-driven lifecycle relevance is replacing static campaign schedules and broad segmentation.",
  path: "/writing/generic-lifecycle-marketing-is-dying"
});

export default function EssayPage() {
  return (
    <Section eyebrow="Writing" title="Generic lifecycle marketing is dying">
      <p>
        Lifecycle systems that run on fixed schedules and broad segments miss the moment when intent is highest.
        Event-driven lifecycle models connect real-world change signals to specific user context, then prioritize
        the best opportunity based on commercial value.
      </p>
      <p>
        The operating shift is straightforward: detect meaningful deltas, map them to an interest graph, score
        opportunities transparently, and generate channel-ready outreach with measurable downstream outcomes.
      </p>
    </Section>
  );
}
