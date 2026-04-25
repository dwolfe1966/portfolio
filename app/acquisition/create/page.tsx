import Link from "next/link";
import { Section } from "@/components/site/Section";
import { AcquisitionCampaignBuilder } from "@/components/acquisition/AcquisitionCampaignBuilder";
import { AcquisitionAssumptionsCard } from "@/components/acquisition/AcquisitionAssumptionsCard";

export default function AcquisitionCreatePage() {
  return (
    <>
      <Section title="Create campaign">
        <p>Launch a new acquisition campaign with objective, budget, channels, and economic guardrails.</p>
        <div className="ctaRow">
          <Link href="/acquisition/campaigns" className="btn">Back to campaigns</Link>
        </div>
      </Section>

      <Section title="Campaign bootstrap">
        <AcquisitionCampaignBuilder />
      </Section>

      <Section title="Assumptions and constraints">
        <AcquisitionAssumptionsCard />
      </Section>
    </>
  );
}
