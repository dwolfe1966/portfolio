import Link from "next/link";
import { Section } from "@/components/site/Section";
import { IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import { ExampleSelectionTable } from "@/components/compounding-expertise/ExampleSelectionTable";
import { COMPOUNDING_EXAMPLES } from "@/lib/compounding-expertise-lab";
import { loadSyntheticExampleAction } from "../actions";

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

export default function CompoundingExpertiseOverviewPage() {
  return (
    <>
      <LabWorkflowRail active="Overview" />
      <Section eyebrow="Compounding Expertise Lab" title="Does experience become a moat?">
        <p>
          Compounding Expertise Lab tests whether an AI company can turn repeated real-world decisions and outcomes
          into expertise that competitors cannot easily reproduce.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/compounding-expertise/inputs">Start a new analysis</Link>
          <Link className="btn" href="/compounding-expertise/docs">Read methodology</Link>
        </div>
      </Section>

      <Section eyebrow="Understand -> Observe -> Hypothesize -> Test -> Decide" title="How the Lab works">
        <div className="compoundingProcessFlow">
          {LAB_FLOW.map((item, index) => (
            <div className="card compoundingProcessCard" key={item.title}>
              <span className="compoundingProcessIndex">{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Choose test">
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
        <ExampleSelectionTable
          loadAction={loadSyntheticExampleAction}
          examples={COMPOUNDING_EXAMPLES.map((example) => ({
            id: example.id,
            label: example.label,
            testLabel: example.testLabel,
            canonicalQuestion: example.canonicalQuestion,
            principalDecision: example.principalDecision,
            gradeObjectivity: example.gradeObjectivity,
            typicalFeedbackSpeed: example.typicalFeedbackSpeed,
            economicCostOfError: example.economicCostOfError,
            primaryPowerHypothesis: example.primaryPowerHypothesis,
            whyCanonical: example.whyCanonical,
            status: example.id !== "creative-agent"
              ? "Company analysis + synthetic illustrative scorebook. Case rows are NOT company data."
              : "Entirely synthetic negative control.",
            syntheticDatasetLabel: example.syntheticDatasetLabel,
            caseCount: example.cases.length
          }))}
        />
      </Section>

      <Section title="Canonical Tests">
        <div className="compoundingCanonicalGrid">
          {COMPOUNDING_EXAMPLES.map((example) => (
            <article className="card compoundingCanonicalCard" key={example.id}>
              <div className="compoundingCardHeader">
                <div>
                  <p className="small">{example.testLabel}</p>
                  <h3>{example.label}</h3>
                </div>
              </div>
              <p><strong>Question:</strong> {example.canonicalQuestion}</p>
              <p><strong>Principal decision:</strong> {example.principalDecision}</p>
              <p><strong>Primary Power hypothesis:</strong> {example.primaryPowerHypothesis}</p>
              <details className="compoundingInlineEditor">
                <summary>Why this test exists</summary>
                <p>{example.whyCanonical}</p>
                <p><strong>Expected behavior:</strong> {example.expectedTheoreticalBehavior}</p>
                <p><strong>Lab failure condition:</strong> {example.labFailureCondition}</p>
                <p className="small">{example.syntheticDatasetLabel}</p>
              </details>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Research integrity">
        <IntegrityNotice />
      </Section>
    </>
  );
}
