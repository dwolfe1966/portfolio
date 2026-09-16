import Link from "next/link";
import { Section } from "@/components/site/Section";
import { EpistemicBadge, IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import { ENDOGENOUS_INPUTS, EXOGENOUS_INPUTS, type CompanyThesisInput, type StructuredInputDefinition } from "@/lib/compounding-expertise-lab";
import { saveAnalysisAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

function StructuredControl({
  analysis,
  definition
}: {
  analysis: Partial<CompanyThesisInput> | null;
  definition: StructuredInputDefinition;
}) {
  const value = analysis?.[definition.key] ?? "";
  return (
    <label className="compoundingStructuredControl">
      <span>
        <strong>{definition.label}</strong>
        <EpistemicBadge kind={definition.epistemicKind} />
      </span>
      <small>{definition.description}</small>
      <select name={definition.key} defaultValue={value}>
        <option value="">Unknown / not assessed</option>
        {definition.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

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
      <LabWorkflowRail active="System & Environment" />
      <Section eyebrow="Stage 1" title="System & Environment">
        <p>
          Compounding Expertise depends on both the opportunity the environment creates and the company&apos;s ability to capture it.
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
        <form action={saveAnalysisAction} className="compoundingSystemForm">
          <input type="hidden" name="analysisId" value={analysis?.id ?? ""} />

          <details className="card compoundingDisclosure" open>
            <summary>Company / workflow context</summary>
            <p className="small">
              Describe the company, product, workflow, principal decisions, and current thesis. This context frames the evidence inspection.
            </p>
            <div className="compoundingFormGrid">
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
                <textarea name="productDescription" rows={3} defaultValue={analysis?.productDescription ?? ""} />
              </label>
              <label className="span-2">
                Workflow
                <textarea name="workflow" rows={3} defaultValue={analysis?.workflow ?? ""} placeholder="Where cases, decisions, outcomes, and grades are captured" />
              </label>
              <label className="span-2">
                Principal decision(s)
                <textarea name="decisionDescription" rows={3} defaultValue={analysis?.decisionDescription ?? ""} placeholder="What decision does the product make or recommend?" />
              </label>
              <label className="span-2">
                Current investment thesis
                <textarea name="thesis" rows={4} defaultValue={analysis?.thesis ?? ""} placeholder="What would have to be true for accumulated graded experience to become Power?" />
              </label>
            </div>
          </details>

          <details className="card compoundingDisclosure" open>
            <summary>External / exogenous - Compounding Opportunity</summary>
            <p>
              Properties of the market/problem the company largely does not control. These are exogenous assumptions unless observed or sourced.
            </p>
            <div className="compoundingStructuredGrid">
              {EXOGENOUS_INPUTS.map((definition) => (
                <StructuredControl analysis={analysis} definition={definition} key={definition.key} />
              ))}
            </div>
          </details>

          <details className="card compoundingDisclosure" open>
            <summary>Internal / endogenous - Compounding Capability</summary>
            <p>
              Properties the company can design, control, or improve. These indicate whether management can capture the opportunity.
            </p>
            <div className="compoundingStructuredGrid">
              {ENDOGENOUS_INPUTS.map((definition) => (
                <StructuredControl analysis={analysis} definition={definition} key={definition.key} />
              ))}
            </div>
          </details>

          <div className="ctaRow">
            <button className="btn primary" type="submit">Save and inspect scorebook</button>
            <Link className="btn" href="/compounding-expertise/overview">Back to overview</Link>
          </div>
        </form>
      </Section>

      <Section title="Integrity note">
        <IntegrityNotice />
      </Section>
    </>
  );
}
