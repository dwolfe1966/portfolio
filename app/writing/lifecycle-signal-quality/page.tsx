import { Metadata } from "next";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Lifecycle Signal Quality Beats Message Volume | David Wolfe",
  description: "Why lifecycle performance depends on signal quality, interest relations, and timing more than message volume.",
  path: "/writing/lifecycle-signal-quality"
});

export default function LifecycleSignalQualityEssayPage() {
  return (
    <Section eyebrow="Writing" title="Lifecycle signal quality beats message volume">
      <p>
        Most lifecycle programs try to improve performance by increasing message volume, segment count, or content variants.
        Those can help, but they do not fix the underlying problem: many campaigns are triggered by weak signals.
      </p>
      <p>
        A stronger system starts with signal quality. What changed? Who has a demonstrated relationship to the entity that changed?
        Is the timing commercially meaningful? Does the user segment justify outreach?
      </p>
      <p>
        When those questions are answered explicitly, generation becomes more than copy production. It becomes the final step
        in an evidence chain from signal to opportunity to measurable outcome.
      </p>
    </Section>
  );
}
