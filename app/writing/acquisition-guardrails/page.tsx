import { Metadata } from "next";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Acquisition Agents Need Guardrails Before Autonomy | David Wolfe",
  description: "Why acquisition automation needs CAC/LTV policy, budget controls, cooldowns, and audit logs before scaling.",
  path: "/writing/acquisition-guardrails"
});

export default function AcquisitionGuardrailsEssayPage() {
  return (
    <Section eyebrow="Writing" title="Acquisition agents need guardrails before autonomy">
      <p>
        Acquisition is one of the most tempting places to deploy agents because the loop looks so automatable:
        generate audiences, write creative, launch tests, read performance, shift budget, repeat. But paid
        growth has a structural problem that makes autonomy dangerous. The system can spend money immediately,
        while the truth about customer value arrives slowly.
      </p>
      <p>
        That lag is why acquisition agents need guardrails before autonomy. A model can see early clicks,
        conversion rates, and cost movement, but it may not yet know refund behavior, retention quality, payback,
        margin, or long-term LTV. If the agent is allowed to optimize only the fastest metric, it will often move
        budget toward the most measurable signal rather than the best business outcome.
      </p>
      <p>
        The advertising platforms already show the direction of travel. Google&apos;s automated bidding products
        optimize toward goals like target CPA, target ROAS, conversion volume, and conversion value while operating
        within budgets and targets. That is the right pattern: autonomy is bounded by an explicit objective and an
        economic constraint. A company&apos;s internal acquisition agent should be no looser than the platforms it manages.
      </p>
      <p>
        The first guardrail is unit economics. Target CAC, target LTV, payback period, gross margin, and allowable
        budget movement should be policy objects, not slide-deck assumptions. If the agent wants to increase spend,
        it should know whether observed CAC is below target, whether the conversion sample is large enough, whether
        the LTV assumption is measured or estimated, and whether the payback window still fits the business.
      </p>
      <p>
        The second guardrail is decision velocity. Agents should not be able to thrash campaigns because a short
        window looked good or bad. Cooldowns, minimum sample sizes, confidence thresholds, and maximum daily budget
        shifts keep the system from mistaking noise for learning. This is especially important in channels where
        platform learning phases and auction dynamics can punish constant changes.
      </p>
      <p>
        The third guardrail is creative and audience policy. An agent should not be allowed to generate unlimited
        claims, target sensitive segments casually, or mutate brand positioning just because a short-term metric
        improves. The action space needs boundaries: approved claims, excluded audiences, compliance checks,
        landing-page rules, and escalation paths for high-risk changes.
      </p>
      <p>
        The fourth guardrail is auditability. Every automated pause, launch, budget shift, bid change, and override
        should produce a record: what changed, what evidence triggered it, which policy allowed it, and what metric
        will be reviewed later. Without that record, the organization cannot learn. It can only react to a black box.
      </p>
      <p>
        The right goal is not fully autonomous acquisition on day one. The right goal is bounded autonomy: let the
        agent operate inside a defined economic envelope, escalate ambiguous decisions, and leave a clean trail of
        reasoning. That is how acquisition automation becomes leverage instead of a faster way to lose money.
      </p>
      <p className="small">
        Research context:{" "}
        <a href="https://support.google.com/google-ads/answer/2979071?hl=en" target="_blank" rel="noreferrer noopener">
          Google Ads automated bidding documentation
        </a>
        {" "}and{" "}
        <a href="https://www.gartner.com/en/newsroom/press-releases/2025-10-29-gartner-survey-finds-45-percent-of-martech-leaders-say-existing-vendor-offered-ai-agents-fail-to-meet-their-expectations-of-promised-business-performance" target="_blank" rel="noreferrer noopener">
          Gartner martech agent survey
        </a>
        .
      </p>
    </Section>
  );
}
