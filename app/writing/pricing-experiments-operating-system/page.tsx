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
        Pricing tests are often treated as isolated projects: a spreadsheet, a cohort list, a dashboard, and a decision
        meeting. That is too fragile for one of the most consequential levers in a business. Pricing changes affect
        conversion, ARPU, margin, churn, sales behavior, customer trust, and competitive positioning at the same time.
      </p>
      <p>
        A good pricing experiment starts before the test is launched. The team needs a hypothesis, eligibility rules,
        control and treatment definitions, holdout logic, guardrail metrics, sample-size expectations, and a decision
        policy. If those pieces live in separate documents, the organization will eventually forget why the test was
        designed the way it was.
      </p>
      <p>
        Online experimentation research from Microsoft, Booking.com, and others has made the same broader point for
        product testing: trustworthy experimentation requires infrastructure, data quality, safeguards, and shared
        learning, not just statistical output. Pricing needs that discipline even more because the blast radius is
        larger and the organizational politics are sharper.
      </p>
      <p>
        The first operating requirement is explicit guardrails. Revenue lift is not enough. A price increase that lifts
        near-term ARPU but damages conversion, support burden, retention, or gross margin may not be a win. The test
        needs promotion rules and rollback rules before anyone sees the result. Otherwise the decision meeting becomes
        a negotiation about which metric matters.
      </p>
      <p>
        The second requirement is cohort memory. Which customers were eligible? Which segments were excluded? Was the
        holdout healthy? Did sales override the price? Were discounts or annual plans handled differently? Pricing
        experiments are full of operational exceptions. If the system cannot preserve those details, the readout will
        look cleaner than the reality.
      </p>
      <p>
        The third requirement is simulation. Teams should be able to model demand elasticity, churn sensitivity, margin
        floors, support-load risk, and sample-size requirements before a live rollout. Simulation does not replace an
        experiment, but it makes the decision policy sharper. It shows where the business is fragile before customers
        are exposed.
      </p>
      <p>
        The fourth requirement is decision history. Every promote, extend, pause, or rollback decision should carry
        the data snapshot, the rule that fired, and the human rationale. That history becomes institutional memory.
        It also makes the next pricing discussion less emotional because the organization can see how past hypotheses
        performed under comparable conditions.
      </p>
      <p>
        A pricing operating system therefore combines workflow and evidence: define the test, simulate risk, launch
        exposure, monitor guardrails, recommend action, record decisions, and feed learning back into the next test.
        The benefit is not cleaner reporting. It is safer monetization. Teams move faster because the conditions for
        action are explicit before the pressure starts.
      </p>
      <p className="small">
        Research context:{" "}
        <a href="https://www.microsoft.com/en-us/research/?p=696748" target="_blank" rel="noreferrer noopener">
          Microsoft research on online experimentation
        </a>
        {", "}
        <a href="https://trialsjournal.biomedcentral.com/articles/10.1186/s13063-020-4084-y" target="_blank" rel="noreferrer noopener">
          Kohavi et al. on online randomized experiments at scale
        </a>
        {", and "}
        <a href="https://papers.cool/arxiv/1710.08217" target="_blank" rel="noreferrer noopener">
          Booking.com experimentation infrastructure
        </a>
        .
      </p>
    </Section>
  );
}
