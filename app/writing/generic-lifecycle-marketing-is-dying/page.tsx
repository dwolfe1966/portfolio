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
        Generic lifecycle marketing is not dying because email stopped working. It is dying because customers
        can feel when a message was produced by a calendar instead of by context. The old lifecycle stack was
        organized around stages: welcome, nurture, winback, renewal. Those stages still matter, but they are too
        blunt to carry the full burden of relevance.
      </p>
      <p>
        The new constraint is not whether a team can create enough content. AI has made content cheaper. The
        constraint is whether the system knows what changed, why the change matters, and whether the customer has
        a real relationship to the topic. A lifecycle program that cannot answer those questions will simply send
        more polished irrelevance.
      </p>
      <p>
        The shift is from calendar logic to signal logic. Instead of asking, &quot;Which campaign should this
        segment receive this week?&quot; the system should ask, &quot;What changed, who does it matter to, what is
        the commercial value of acting, and what should we do now?&quot; That sounds subtle, but it changes the
        operating model. The campaign is no longer the unit of work. The opportunity is.
      </p>
      <p>
        Customer engagement research keeps pointing in this direction. Twilio&apos;s personalization research
        emphasizes that leaders see personalization as central to business success, but also that data accuracy
        is a serious obstacle for AI-driven personalization. Braze&apos;s 2025 customer engagement research similarly
        highlights AI use in customer data analysis, sentiment, experimentation, and optimization. The common thread
        is clear: personalization is becoming more dynamic, but only when the underlying signal layer is reliable.
      </p>
      <p>
        A strong lifecycle system needs an event model, an interest model, a value model, and an action model. The
        event model detects meaningful deltas. The interest model decides which customers have a reason to care.
        The value model prioritizes opportunities by expected outcome. The action model turns the decision into
        a message, offer, task, or suppression. Without those layers, AI mostly accelerates copy production.
      </p>
      <p>
        Generic lifecycle programs also fail because they treat every eligible customer as equally worth contacting.
        That is rarely true. Some signals are weak. Some users have no demonstrated interest. Some moments are real
        but commercially unimportant. Some contacts should be suppressed because the relationship cost is higher than
        the expected return. Relevance is not just personalization. It is restraint.
      </p>
      <p>
        The next lifecycle system will feel less like a campaign calendar and more like a decision engine. It will
        find moments, rank them, explain them, and generate the right action with a measurable outcome attached. That
        is the difference between sending more lifecycle marketing and building a lifecycle revenue system.
      </p>
      <p className="small">
        Research context:{" "}
        <a href="https://www.twilio.com/en-us/report/state-of-personalization-report" target="_blank" rel="noreferrer noopener">
          Twilio State of Personalization 2024
        </a>
        {" "}and{" "}
        <a href="https://www.braze.com/press-releases/braze-2025-customer-engagement-review" target="_blank" rel="noreferrer noopener">
          Braze 2025 Global Customer Engagement Review
        </a>
        .
      </p>
    </Section>
  );
}
