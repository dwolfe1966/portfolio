import { Metadata } from "next";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pricing Experiments Should Be Operating Systems | David Wolfe",
  description: "How pricing tests become safer and faster when hypotheses, cohorts, guardrails, and decisions live together.",
  path: "/writing/pricing-experiments-operating-system"
});

export default function PricingExperimentsOperatingSystemEssayPage() {
  return (
    <Section eyebrow="Writing" title="Pricing experiments should be operating systems">
      <p>
        Pricing tests are often treated as isolated projects: a spreadsheet, a cohort list, a dashboard, and a decision meeting.
        That makes learning slow and makes institutional memory fragile.
      </p>
      <p>
        A pricing operating system keeps the important pieces together: hypothesis, eligibility, exposure, holdout,
        margin guardrails, churn signals, decision criteria, and rollout history.
      </p>
      <p>
        The benefit is not just cleaner reporting. It is safer monetization. Teams can move faster because the conditions
        for promotion, rollback, and continued observation are explicit before the test starts.
      </p>
    </Section>
  );
}
