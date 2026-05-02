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
        Acquisition automation becomes useful when it can make budget and creative decisions faster than a human team.
        But speed without policy is not leverage. It is just a faster way to spend money.
      </p>
      <p>
        The first layer should be economic: target CAC, target LTV, maximum budget shift, confidence threshold,
        and cooldown windows. These constraints make the agent&apos;s decision space explicit.
      </p>
      <p>
        The second layer is auditability. Every automated pause, shift, and override should create a record that explains
        what changed, why it changed, and which operator controls were active at the time.
      </p>
    </Section>
  );
}
