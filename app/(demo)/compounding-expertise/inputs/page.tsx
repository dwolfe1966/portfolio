import Link from "next/link";
import { Section } from "@/components/site/Section";
import { EpistemicBadge, IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import { COMPETITIVE_INPUTS, ENDOGENOUS_INPUTS, EXOGENOUS_INPUTS, canonicalExampleForCompany, type CompanyThesisInput, type StructuredInputDefinition } from "@/lib/compounding-expertise-lab";
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
  const canonicalExample = canonicalExampleForCompany(analysis?.companyName);

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
        {canonicalExample ? (
          <div className="card compoundingCanonicalPanel">
            <p className="small">Why this is a canonical test</p>
            <h3>{canonicalExample.testLabel}: {canonicalExample.label}</h3>
            <p><strong>Canonical question:</strong> {canonicalExample.canonicalQuestion}</p>
            <p><strong>Why selected:</strong> {canonicalExample.whyCanonical}</p>
            <p><strong>Expected theoretical behavior:</strong> {canonicalExample.expectedTheoreticalBehavior}</p>
            <p><strong>Lab failure condition:</strong> {canonicalExample.labFailureCondition}</p>
            <p><strong>Primary Power hypothesis:</strong> {canonicalExample.primaryPowerHypothesis}</p>
            <p><strong>Competing Power hypothesis:</strong> {canonicalExample.competingPowerHypothesis}</p>
            <p className="small">This is explanatory metadata, not evidence about the company.</p>
          </div>
        ) : null}
      </Section>

      <Section title="Analysis setup">
        <form action={saveAnalysisAction} className="compoundingSystemForm">
          <input type="hidden" name="analysisId" value={analysis?.id ?? ""} />

          <details className="card compoundingDisclosure" open>
            <summary>Company identity - What is this business/system?</summary>
            <p className="small">
              These fields are descriptive. For canonical tests, distinguish public/company description from archetype assumptions and synthetic case data.
            </p>
            <div className="compoundingFormGrid">
              <label>
                Company name
                <input name="companyName" defaultValue={analysis?.companyName ?? ""} placeholder="Company or product under review" />
              </label>
              <label>
                Website / company URL
                <input name="companyUrl" defaultValue={analysis?.companyUrl ?? ""} placeholder="https://..." />
              </label>
              <label>
                Product category
                <input name="productCategory" defaultValue={analysis?.productCategory ?? ""} placeholder="Disputes, research, pricing, etc." />
              </label>
              <label>
                Target customer
                <input name="targetCustomer" defaultValue={analysis?.targetCustomer ?? ""} placeholder="Buyer/user/operator" />
              </label>
              <label>
                Business model
                <input name="businessModel" defaultValue={analysis?.businessModel ?? ""} placeholder="Unknown allowed" />
              </label>
              <label>
                Company stage
                <input name="companyStage" defaultValue={analysis?.companyStage ?? ""} placeholder="Optional / unknown allowed" />
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
                Action space / possible actions
                <textarea name="actionSpace" rows={3} defaultValue={analysis?.actionSpace ?? ""} placeholder="What actions can be recommended or executed?" />
              </label>
              <label className="span-2">
                Current investment thesis
                <textarea name="thesis" rows={4} defaultValue={analysis?.thesis ?? ""} placeholder="What would have to be true for accumulated graded experience to become Power?" />
              </label>
            </div>
          </details>

          <details className="card compoundingDisclosure" open>
            <summary>Compounding Opportunity - External / exogenous environment</summary>
            <p>
              Properties of the problem and market that largely determine whether valuable expertise can accumulate.
              A workflow producing 12 meaningful cases per year compounds differently from one producing millions.
            </p>
            <div className="compoundingStructuredGrid">
              {EXOGENOUS_INPUTS.map((definition) => (
                <StructuredControl analysis={analysis} definition={definition} key={definition.key} />
              ))}
            </div>
          </details>

          <details className="card compoundingDisclosure" open>
            <summary>Compounding Capability - Learning architecture</summary>
            <p>
              Properties the company can design or improve to turn experience into better future decisions.
              Recommendation is not the same thing as executed action.
            </p>
            <div className="compoundingStructuredGrid">
              {ENDOGENOUS_INPUTS.map((definition) => (
                <StructuredControl analysis={analysis} definition={definition} key={definition.key} />
              ))}
            </div>
          </details>

          <details className="card compoundingDisclosure" open>
            <summary>Competitive architecture - Why can&apos;t others reproduce it?</summary>
            <p>
              Valuable learning is not the same as defensible learning. These assumptions support the Helmer analysis
              without replacing it.
            </p>
            <div className="compoundingStructuredGrid">
              {COMPETITIVE_INPUTS.map((definition) => (
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
