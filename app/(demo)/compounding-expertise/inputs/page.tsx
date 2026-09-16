import { Section } from "@/components/site/Section";
import { IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import { COMPOUNDING_EXAMPLES } from "@/lib/compounding-expertise-lab";
import { loadSyntheticExampleAction, saveAnalysisAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

export default async function CompoundingExpertiseInputsPage({
  searchParams
}: {
  searchParams: Promise<{ example?: string }>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId);

  return (
    <>
      <LabWorkflowRail active="Inputs" />
      <Section eyebrow="Stage 1" title="Company + thesis">
        <p>
          Describe the company, workflow, principal decisions, and current investment thesis. The analysis should be usable even before
          any AI generation is available.
        </p>
        {params.example ? (
          <div className="card compoundingSyntheticBanner">
            <strong>Example loaded.</strong>
            <p>
              Bundled scorebook rows are synthetic illustrative data, not company data.
              Inspect the Scorebook page before treating any diagnostic as evidence.
            </p>
          </div>
        ) : null}
      </Section>

      <Section title="Analysis setup">
        <form action={saveAnalysisAction} className="compoundingFormGrid">
          <input type="hidden" name="analysisId" value={analysis?.id ?? ""} />
          <label>
            Company name
            <input name="companyName" defaultValue={analysis?.companyName ?? ""} placeholder="Company or product under review" />
          </label>
          <label>
            Target customer
            <input name="targetCustomer" defaultValue={analysis?.targetCustomer ?? ""} placeholder="Buyer/user/operator" />
          </label>
          <label className="span-2">
            Product description
            <textarea name="productDescription" rows={4} defaultValue={analysis?.productDescription ?? ""} />
          </label>
          <label className="span-2">
            Workflow
            <textarea name="workflow" rows={4} defaultValue={analysis?.workflow ?? ""} placeholder="Where cases, decisions, outcomes, and grades are captured" />
          </label>
          <label className="span-2">
            Principal decision(s)
            <textarea name="decisionDescription" rows={4} defaultValue={analysis?.decisionDescription ?? ""} placeholder="What decision does the product make or recommend?" />
          </label>
          <label className="span-2">
            Current investment thesis
            <textarea name="thesis" rows={5} defaultValue={analysis?.thesis ?? ""} placeholder="What would have to be true for accumulated graded experience to become Power?" />
          </label>
          <div className="ctaRow span-2">
            <button className="btn primary" type="submit">Save and continue</button>
          </div>
        </form>
      </Section>

      <Section title="Example library">
        <div className="card compoundingSyntheticBanner">
          <strong>Case-level fixtures are synthetic.</strong>
          <p>
            Casap, Listen Labs, Aaru, and Maybern are company-analysis archetypes here.
            Their bundled case rows are explicitly synthetic test fixtures and are never represented as actual company data.
          </p>
        </div>
        <div className="grid grid-2">
          {COMPOUNDING_EXAMPLES.map((example) => (
            <div className="card compoundingExampleCard" key={example.id}>
              <h3>{example.label}</h3>
              <p>{example.role}</p>
              <p className="small">{example.syntheticDatasetLabel}</p>
              <form action={loadSyntheticExampleAction}>
                <input type="hidden" name="exampleId" value={example.id} />
                <button className="btn" type="submit">Load example</button>
              </form>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Integrity note">
        <IntegrityNotice />
      </Section>
    </>
  );
}
