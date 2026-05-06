import { Section } from "@/components/site/Section";
import { AcquisitionAssumptionsCard } from "@/components/acquisition/AcquisitionAssumptionsCard";
import { AcquisitionCampaignBuilder } from "@/components/acquisition/AcquisitionCampaignBuilder";
import { AcquisitionWorkspaceDatasetPanel } from "@/components/acquisition/AcquisitionWorkspaceDatasetPanel";
import { ToolDataSourceNotice } from "@/components/site/ToolDataSourceNotice";

type PageProps = {
  searchParams?: Promise<{ datasetApplied?: string; datasetError?: string }>;
};

export default async function AcquisitionInputsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <>
      <Section title="Inputs: campaign brief and optimization guardrails">
        <p>
          Define what the agents are allowed to do before simulations begin. These inputs shape creative generation,
          audience selection, and budget movement decisions.
        </p>
        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <div className="card">
            <h3>Campaign brief</h3>
            <p>Goal, budget, run window, channels, approved claims, and required brand constraints.</p>
          </div>
          <div className="card">
            <h3>Audience & keyword constraints</h3>
            <p>Allowed targeting pools, exclusions, keyword sets, and negative-keyword definitions.</p>
          </div>
          <div className="card">
            <h3>Economic guardrails</h3>
            <p>Target CAC, target LTV, max budget shift percentage, and confidence threshold.</p>
          </div>
        </div>
      </Section>

      <Section title="Current app data">
        <ToolDataSourceNotice datasetApplied={params?.datasetApplied} datasetError={params?.datasetError} />
        <AcquisitionWorkspaceDatasetPanel compact />
      </Section>

      <Section title="Campaign bootstrap (also available in /acquisition/create)">
        <AcquisitionCampaignBuilder />
      </Section>

      <Section title="Assumptions behind scoring and reallocation">
        <AcquisitionAssumptionsCard />
      </Section>
    </>
  );
}
