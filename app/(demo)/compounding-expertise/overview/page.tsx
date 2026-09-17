import Link from "next/link";
import { Section } from "@/components/site/Section";
import { IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  canonicalExampleForCompany,
  COMPOUNDING_EXAMPLES,
  type CompoundingExampleId
} from "@/lib/compounding-expertise-lab";
import { loadSyntheticExampleAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

const LAB_FLOW = [
  {
    title: "Define the system",
    detail: "What decisions does the product make and in what environment?"
  },
  {
    title: "Inspect the experience",
    detail: "Examine cases, decisions, human overrides, outcomes, and grades."
  },
  {
    title: "Identify what must be true",
    detail: "Surface the 2-4 uncertainties that determine whether learning really compounds."
  },
  {
    title: "Stress-test the moat",
    detail: "Compare accumulated experience against stronger models, faster learners, feedback delay, staleness, and other competitive forces."
  },
  {
    title: "Decide what you believe",
    detail: "Identify where Power may reside, what remains uncertain, and what evidence to collect next."
  }
];

const TEST_IDENTITIES: Record<CompoundingExampleId, { testType: string; isolates: string; companyBasis: string }> = {
  casap: {
    testType: "POSITIVE TEST",
    isolates: "Does CE work under favorable conditions?",
    companyBasis: "Public-company archetype; source verification pending."
  },
  "listen-labs": {
    testType: "BOUNDARY TEST",
    isolates: "When is accumulated knowledge not graded expertise?",
    companyBasis: "Public-company archetype; source verification pending."
  },
  aaru: {
    testType: "SUBSTITUTION / COMPRESSION TEST",
    isolates: "Can model/simulation capability substitute for accumulated experience?",
    companyBasis: "Public-company archetype; source verification pending."
  },
  maybern: {
    testType: "ALTERNATIVE POWER TEST",
    isolates: "Can durable Power reside somewhere other than CE?",
    companyBasis: "Public-company archetype; source verification pending."
  },
  "creative-agent": {
    testType: "NEGATIVE CONTROL",
    isolates: "Can huge volumes of apparently graded data still fail to create durable expertise?",
    companyBasis: "Entirely synthetic archetype."
  }
};

export const dynamic = "force-dynamic";

export default async function CompoundingExpertiseOverviewPage() {
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId);
  const activeExample = canonicalExampleForCompany(analysis?.companyName);
  const activeCaseSet = analysis?.caseSets[0] ?? null;

  return (
    <>
      <LabWorkflowRail active="Overview" />
      <Section eyebrow="Compounding Expertise Lab" title="Does experience become a moat?">
        <p>
          Compounding Expertise Lab tests whether an AI company can turn repeated real-world decisions and outcomes
          into expertise that competitors cannot easily reproduce.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/compounding-expertise/inputs">Start new company analysis</Link>
          <Link className="btn" href="/compounding-expertise/docs">Read methodology</Link>
        </div>
        <div className="card compoundingOverviewStatePanel">
          <div>
            <p className="small">Current analysis</p>
            <h3>{analysis?.companyName || "No active company selected"}</h3>
          </div>
          <div className="compoundingOverviewStateFacts">
            <span>
              <strong>Company/test</strong>
              {analysis?.companyName || "Not selected"}
            </span>
            <span>
              <strong>Test type</strong>
              {analysis ? activeExample ? TEST_IDENTITIES[activeExample.id].testType : "Custom company analysis" : "No canonical test selected"}
            </span>
            <span>
              <strong>Active CaseSet</strong>
              {activeCaseSet?.name || "No CaseSet selected"}
            </span>
            <span>
              <strong>Provenance</strong>
              {activeCaseSet?.provenanceLabel || "No case provenance available"}
            </span>
          </div>
          <div className="ctaRow">
            {analysis ? <Link className="btn primary" href="/compounding-expertise/inputs">Continue analysis</Link> : null}
            <Link className="btn" href="/compounding-expertise/inputs">Start new company analysis</Link>
          </div>
        </div>
      </Section>

      <Section eyebrow="Understand -> Observe -> Hypothesize -> Test -> Decide" title="How the Lab works">
        <div className="compoundingProcessFlow compoundingProcessFlowCompact">
          {LAB_FLOW.map((item, index) => (
            <div className="card compoundingProcessCard" key={item.title}>
              <span className="compoundingProcessIndex">{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Choose a Canonical Test">
        <p>
          Each test isolates a different claim about Compounding Expertise. Together they are designed to show where
          the theory works, where it breaks, and where other forms of Power may dominate.
        </p>
        <div className="card compoundingSyntheticBanner">
          <strong>Bundled case-level records are SYNTHETIC ILLUSTRATIVE DATA - NOT COMPANY DATA.</strong>
          <p>
            The real-company examples are theory test fixtures. Their scorebook rows are designed to stress-test the framework,
            not to describe actual company operations.
          </p>
        </div>
        <div className="compoundingCanonicalGrid compoundingCanonicalGridPrimary">
          {COMPOUNDING_EXAMPLES.map((example) => (
            <article className="card compoundingCanonicalCard" key={example.id}>
              <div className="compoundingCardHeader">
                <div>
                  <p className="small">{TEST_IDENTITIES[example.id].testType}</p>
                  <h3>{example.label}</h3>
                </div>
              </div>
              <p><strong>Canonical question:</strong> {example.canonicalQuestion}</p>
              <p><strong>What this test isolates:</strong> {TEST_IDENTITIES[example.id].isolates}</p>
              <div className="compoundingCanonicalFacts">
                <span><strong>Principal decision</strong>{example.principalDecision}</span>
                <span><strong>Grade objectivity</strong>{example.gradeObjectivity}</span>
                <span><strong>Feedback speed</strong>{example.typicalFeedbackSpeed}</span>
                <span><strong>Case frequency</strong>{example.caseFrequency}</span>
                <span><strong>Primary Power hypothesis</strong>{example.primaryPowerHypothesis}</span>
                <span><strong>Synthetic case count</strong>{example.cases.length} rows</span>
              </div>
              <div className="compoundingEpistemicLayers">
                <span><strong>Company basis</strong>{TEST_IDENTITIES[example.id].companyBasis}</span>
                <span><strong>Archetype assumptions</strong>Canonical metadata is analytical test-fixture metadata, not verified company measurement.</span>
                <span><strong>Case data</strong>{example.syntheticDatasetLabel}</span>
              </div>
              <details className="compoundingInlineEditor">
                <summary>Secondary detail</summary>
                <p><strong>Economic stakes:</strong> {example.economicCostOfError}</p>
                <p><strong>Transfer potential:</strong> {example.crossCustomerTransferPotential}</p>
                <p><strong>Historical dependence:</strong> {example.historicalCaseDependence}</p>
                <p><strong>Expected behavior:</strong> {example.expectedTheoreticalBehavior}</p>
                <p><strong>Lab failure condition:</strong> {example.labFailureCondition}</p>
                <p><strong>Competing Power hypothesis:</strong> {example.competingPowerHypothesis}</p>
              </details>
              <form action={loadSyntheticExampleAction}>
                <input type="hidden" name="exampleId" value={example.id} />
                <button className="btn primary" type="submit">Explore test</button>
              </form>
            </article>
          ))}
        </div>
        <details className="card compoundingCompareTests">
          <summary>Compare all canonical tests</summary>
          <div className="tableScroll compoundingCanonicalCompareTable">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Canonical question</th>
                  <th>Grade objectivity</th>
                  <th>Feedback</th>
                  <th>Case frequency</th>
                  <th>Historical dependence</th>
                  <th>Primary Power hypothesis</th>
                </tr>
              </thead>
              <tbody>
                {COMPOUNDING_EXAMPLES.map((example) => (
                  <tr key={example.id}>
                    <td><strong>{TEST_IDENTITIES[example.id].testType}</strong><br />{example.label}</td>
                    <td>{example.canonicalQuestion}</td>
                    <td>{example.gradeObjectivity}</td>
                    <td>{example.typicalFeedbackSpeed}</td>
                    <td>{example.caseFrequency}</td>
                    <td>{example.historicalCaseDependence}</td>
                    <td>{example.primaryPowerHypothesis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>

      <Section title="Research integrity">
        <IntegrityNotice />
      </Section>
    </>
  );
}
