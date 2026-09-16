import { Section } from "@/components/site/Section";
import { IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
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
        {params.example === "synthetic" ? (
          <div className="card compoundingSyntheticBanner">
            <strong>Synthetic example loaded.</strong>
            <p>This claims/disputes AI company is fictional and should not be treated as factual information about any real company.</p>
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

      <Section title="Example">
        <div className="card">
          <h3>Load synthetic claims/disputes AI company</h3>
          <p>
            This creates a clearly labeled fictional example for exercising the Lab. It does not describe a real company.
          </p>
          <form action={loadSyntheticExampleAction}>
            <button className="btn" type="submit">Load synthetic example</button>
          </form>
        </div>
      </Section>

      <Section title="Integrity note">
        <IntegrityNotice />
      </Section>
    </>
  );
}
