import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  DEFAULT_SCENARIOS,
  applyStressTestTemplate,
  casesForCaseSet,
  classifyStressTestResult,
  deriveDebateCandidates,
  deriveExperienceSnapshot,
  deriveHighestValueDiligenceQueue,
  deriveInvestmentSynthesis,
  derivePowerMap,
  deriveStressTestPowerImplication,
  detectCrossover,
  getStressTestTemplate,
  sanitizeScenario,
  simulateComparison,
  summarizeStressTestPrimaryChange,
  type CompoundingFramework,
  type DebateEvidenceItem,
  type DimensionAssessmentInput,
  type KeyDebateInput,
  type ScorebookCaseInput,
  type SimulationScenarioInput
} from "@/lib/compounding-expertise-lab";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

type ConclusionSearchParams = Record<string, string | string[] | undefined>;

function values(params: ConclusionSearchParams, key: string) {
  const raw = params[key];
  if (Array.isArray(raw)) return raw;
  return raw === undefined ? [] : [raw];
}

function value(params: ConclusionSearchParams, key: string) {
  return values(params, key)[0] ?? "";
}

function numeric(raw: string | undefined, fallback: number) {
  const parsed = Number(raw ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function caseInput(row: NonNullable<Awaited<ReturnType<typeof loadCompoundingAnalysis>>>["scorebookCases"][number]): ScorebookCaseInput {
  return {
    id: row.id,
    caseSetId: row.caseSetId,
    decisionClassId: row.decisionClassId,
    agentDecisionActionId: row.agentDecisionActionId,
    humanDecisionActionId: row.humanDecisionActionId,
    actionTakenActionId: row.actionTakenActionId,
    externalCaseId: row.externalCaseId,
    customerSegment: row.customerSegment,
    caseType: row.caseType,
    context: row.context,
    agentDecision: row.agentDecision,
    agentConfidence: row.agentConfidence,
    humanDecision: row.humanDecision,
    humanOverride: row.humanOverride,
    actionTaken: row.actionTaken,
    outcome: row.outcome,
    outcomeValue: row.outcomeValue,
    grade: row.grade,
    gradeConfidence: row.gradeConfidence,
    decisionAt: row.decisionAt,
    actionAt: row.actionAt,
    outcomeAt: row.outcomeAt,
    isEdgeCase: row.isEdgeCase,
    isSynthetic: row.isSynthetic,
    sourceLabel: row.sourceLabel,
    sourceRecordId: row.sourceRecordId,
    sourceRecordType: row.sourceRecordType,
    sourceRecordRoute: row.sourceRecordRoute,
    notes: row.notes
  };
}

function scenarioFromQuery(params: ConclusionSearchParams, base: SimulationScenarioInput, index: number): SimulationScenarioInput {
  return sanitizeScenario({
    id: values(params, "scenarioId")[index] || base.id,
    name: values(params, "name")[index] || base.name,
    startingCases: numeric(values(params, "startingCases")[index], base.startingCases),
    casesPerMonth: numeric(values(params, "casesPerMonth")[index], base.casesPerMonth),
    feedbackDelayDays: numeric(values(params, "feedbackDelayDays")[index], base.feedbackDelayDays),
    transferability: numeric(values(params, "transferability")[index], base.transferability),
    informationValue: numeric(values(params, "informationValue")[index], base.informationValue),
    learningEfficiency: numeric(values(params, "learningEfficiency")[index], base.learningEfficiency),
    stalenessRate: numeric(values(params, "stalenessRate")[index], base.stalenessRate),
    baseCapability: numeric(values(params, "baseCapability")[index], base.baseCapability)
  });
}

function pct(input: number | null) {
  return input === null ? "Unavailable" : `${Math.round(input * 100)}%`;
}

function stateCard(label: string, detail: string) {
  return (
    <div className="card compact compoundingSynthesisStateCard">
      <p className="small">{label}</p>
      <strong>{detail}</strong>
    </div>
  );
}

function evidenceCard(item: DebateEvidenceItem) {
  return (
    <div className="card compact compoundingSynthesisEvidenceItem" key={`${item.direction}-${item.source}-${item.value}`}>
      <div className="compoundingCardHeader">
        <strong>{item.direction === "CONTEXT-DESCRIPTIVE" ? "CONTEXT" : item.direction}</strong>
        <span className="miniTag">{item.provenance}</span>
      </div>
      <p>{item.value}</p>
      <p className="small">{item.interpretation}</p>
      <p className="small"><strong>Source:</strong> {item.source}</p>
      {item.href ? <Link className="btn" href={item.href}>View evidence →</Link> : null}
    </div>
  );
}

export default async function CompoundingExpertiseMemoPage({
  searchParams
}: {
  searchParams: Promise<ConclusionSearchParams>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysisId = value(params, "analysisId");
  const analysis = await loadCompoundingAnalysis(accountUserId, analysisId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Conclusion" analysisId={analysisId} />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before generating a conclusion.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to Company Model</Link>
        </Section>
      </>
    );
  }

  const selectedCaseSet = value(params, "caseSetId")
    ? analysis.caseSets.find((caseSet) => caseSet.id === value(params, "caseSetId")) ?? null
    : analysis.caseSets[0] ?? null;
  const rows = analysis.scorebookCases.map(caseInput);
  const activeRows = casesForCaseSet(rows, selectedCaseSet?.id);
  const experience = deriveExperienceSnapshot(activeRows);
  const debates: KeyDebateInput[] = analysis.keyDebates.map((debate) => ({
    id: debate.id,
    question: debate.question,
    bullCase: debate.bullCase,
    bearCase: debate.bearCase,
    evidenceNeeded: debate.evidenceNeeded,
    increaseBelief: debate.increaseBelief,
    decreaseBelief: debate.decreaseBelief,
    probability: debate.probability,
    source: debate.source
  }));
  const candidates = deriveDebateCandidates({
    analysis,
    debates,
    rows: activeRows,
    analysisId: analysis.id,
    caseSetId: selectedCaseSet?.id,
    learningArchitecture: analysis.learningArchitecture,
    competitiveArchitecture: analysis.competitiveArchitecture,
    evidenceRecords: analysis.evidenceRecords
  });
  const diligenceQueue = deriveHighestValueDiligenceQueue(candidates, 5);
  const assessments: DimensionAssessmentInput[] = analysis.dimensionAssessments.map((item) => ({
    id: item.id,
    framework: item.framework as CompoundingFramework,
    dimension: item.dimension,
    score: item.score,
    confidence: item.confidence,
    rationale: item.rationale,
    evidenceStatus: item.evidenceStatus,
    source: item.source
  }));
  const powerMap = derivePowerMap({
    analysis,
    debates,
    rows: activeRows,
    analysisId: analysis.id,
    caseSetId: selectedCaseSet?.id,
    learningArchitecture: analysis.learningArchitecture,
    competitiveArchitecture: analysis.competitiveArchitecture,
    evidenceRecords: analysis.evidenceRecords,
    assessments
  });

  const persistedScenarios = analysis.simulationScenarios.length >= 2
    ? analysis.simulationScenarios.slice(0, 2)
    : DEFAULT_SCENARIOS.map((scenario, index) => ({
      id: "",
      analysisId: analysis.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...scenario,
      name: index === 0 ? "Incumbent / Company" : "Challenger / Alternative"
    }));
  const template = getStressTestTemplate(value(params, "template"));
  const templatedScenarios = applyStressTestTemplate(persistedScenarios, template.id);
  const hasRunContext = value(params, "run") === "1" && value(params, "template").length > 0;
  const scenarioRows = values(params, "startingCases").length >= 2
    ? [scenarioFromQuery(params, templatedScenarios[0], 0), scenarioFromQuery(params, templatedScenarios[1], 1)]
    : templatedScenarios;
  const stressTest = hasRunContext
    ? (() => {
      const series = simulateComparison(scenarioRows, 36);
      const result = classifyStressTestResult(series, detectCrossover(series[0], series[1]));
      const change = summarizeStressTestPrimaryChange(template.id, scenarioRows, persistedScenarios);
      return {
        templateName: template.name,
        primaryChange: change.summary,
        result,
        implication: deriveStressTestPowerImplication(template.id, result)
      };
    })()
    : null;
  const synthesis = deriveInvestmentSynthesis({ analysis, experience, debates: candidates, powerMap, stressTest });
  const caseSetQuery = selectedCaseSet ? `&caseSetId=${selectedCaseSet.id}` : "";

  return (
    <>
      <LabWorkflowRail
        active="Conclusion"
        analysisId={analysis.id}
        activeAnalysisLabel={analysis.companyName}
        activeAnalysisDetail={selectedCaseSet?.name ?? "Selected company analysis"}
      />

      <Section eyebrow="Investment Synthesis" title="Conclusion">
        <div className="card compoundingSynthesisHero">
          <p className="small">Current thesis</p>
          <h3>{synthesis.currentThesis}</h3>
          {experience.provenance === "DERIVED — SYNTHETIC FIXTURE" ? <span className="badge">FRAMEWORK TEST — SYNTHETIC EVIDENCE</span> : null}
        </div>
        <div className="compoundingSynthesisStateGrid">
          {stateCard("CE Thesis", synthesis.ceThesis)}
          {stateCard("Evidence Quality", synthesis.evidenceQuality)}
          {stateCard("Primary Power Hypothesis", synthesis.primaryPowerHypothesis)}
          {stateCard("Critical Unresolved Dependency", synthesis.criticalUnresolvedDependency)}
        </div>
      </Section>

      <Section title="Where Power may reside">
        <div className="grid grid-2">
          {synthesis.powerHighlights.length ? synthesis.powerHighlights.map((power) => (
            <div className="card compact" key={power.label}>
              <div className="compoundingCardHeader">
                <strong>{power.label}</strong>
                <span className="miniTag">{power.thesisStrength} thesis · {power.evidenceStrength} evidence</span>
              </div>
              <p>{power.why}</p>
            </div>
          )) : <div className="card"><p>No durable Power is currently demonstrated by available evidence.</p></div>}
        </div>
        <div className="ctaRow">
          <Link className="btn" href={`/compounding-expertise/diagnostic?analysisId=${analysis.id}${caseSetQuery}`}>View full Power Map →</Link>
        </div>
      </Section>

      <Section title="Evidence that matters">
        <div className="compoundingEvidenceQuadrants">
          <div><h3>Supports</h3>{synthesis.evidenceBuckets.supports.length ? synthesis.evidenceBuckets.supports.map(evidenceCard) : <p className="small">No direct supporting evidence has been established yet.</p>}</div>
          <div><h3>Contradicts</h3>{synthesis.evidenceBuckets.contradicts.length ? synthesis.evidenceBuckets.contradicts.map(evidenceCard) : <p className="small">No direct contradicting evidence is attached yet.</p>}</div>
          <div><h3>Context</h3>{synthesis.evidenceBuckets.context.length ? synthesis.evidenceBuckets.context.map(evidenceCard) : <p className="small">No context evidence is available.</p>}</div>
          <div><h3>Limitations</h3>{synthesis.evidenceBuckets.limitations.length ? synthesis.evidenceBuckets.limitations.map(evidenceCard) : <p className="small">No explicit limitations have been generated.</p>}</div>
        </div>
      </Section>

      <Section title="Experience">
        <div className="card compoundingExperienceMiniSummary">
          <strong>{experience.totalCases} cases · {pct(experience.gradeCoverage)} graded · {experience.medianFeedbackLatencyDays === null ? "feedback unavailable" : `${experience.medianFeedbackLatencyDays}d median feedback`} · {pct(experience.humanOverrideRate)} human override</strong>
          <span className="miniTag">{experience.provenance}</span>
          <p>A complete scorebook can still fail to create Compounding Expertise if grades do not improve future behavior or if resulting expertise is easy to reproduce.</p>
          <Link className="btn" href={`/compounding-expertise/scorebook?analysisId=${analysis.id}${caseSetQuery}`}>Inspect Experience →</Link>
        </div>
      </Section>

      <Section title="What could break the thesis?">
        <div className="grid grid-2">
          {candidates.slice(0, 4).map((candidate) => (
            <div className="card compact" key={candidate.family}>
              <div className="compoundingCardHeader">
                <strong>{candidate.title}</strong>
                <span className="miniTag">{candidate.assessment} · {candidate.confidence} · {candidate.thesisImpact}</span>
              </div>
              <p>{candidate.assessmentReason}</p>
              <p className="small"><strong>Best next evidence:</strong> {candidate.bestNextTest}</p>
              <Link className="btn" href={`/compounding-expertise/debates?analysisId=${analysis.id}${caseSetQuery}#debate-${candidate.family}`}>Inspect debate →</Link>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What should we diligence next?">
        <div className="grid grid-2">
          {diligenceQueue.map((item) => (
            <div className="card compact compoundingDiligenceItem" key={item.family}>
              <div className="compoundingCardHeader">
                <strong>{item.title}</strong>
                <span className="miniTag">{item.thesisImpact} impact</span>
              </div>
              <p>{item.test}</p>
              <p className="small">{item.reason}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Stress-test finding">
        <div className="card compoundingScenarioImplication">
          {stressTest ? (
            <>
              <div className="compoundingCardHeader">
                <strong>{stressTest.templateName}</strong>
                <span className="miniTag">{stressTest.result.label}</span>
              </div>
              <p>{stressTest.implication}</p>
              <p className="small">Primary change: {stressTest.primaryChange}. 36-month gap: {stressTest.result.month36Gap.toFixed(2)}. Crossover: {stressTest.result.crossoverMonth === null ? "none within 36 months" : `month ${stressTest.result.crossoverMonth}`}.</p>
              <span className="badge">SCENARIO IMPLICATION — NOT EMPIRICAL EVIDENCE</span>
            </>
          ) : <p>No stress test has been run for this analysis yet.</p>}
          <Link className="btn" href={`/compounding-expertise/simulator?analysisId=${analysis.id}${caseSetQuery}`}>Inspect Stress Test →</Link>
        </div>
      </Section>

      <Section title="Investor view">
        <div className="card">
          <p>{synthesis.investorView.summary}</p>
          {synthesis.investorView.hasInvestorBelief ? <span className="badge">ANALYST BELIEF — NOT CE EVIDENCE</span> : null}
        </div>
      </Section>

      <Section title="View / copy investment synthesis">
        <details className="card compoundingDisclosure">
          <summary>Investment synthesis memo</summary>
          <textarea className="compoundingMemoText" readOnly rows={18} value={synthesis.memo} />
        </details>
      </Section>

      <Section title="Next">
        <div className="ctaRow">
          <Link className="btn" href={`/compounding-expertise/scorebook?analysisId=${analysis.id}${caseSetQuery}`}>Inspect Experience</Link>
          <Link className="btn" href={`/compounding-expertise/debates?analysisId=${analysis.id}${caseSetQuery}`}>Inspect Debates</Link>
          <Link className="btn" href={`/compounding-expertise/diagnostic?analysisId=${analysis.id}${caseSetQuery}`}>Inspect Power</Link>
          <Link className="btn" href={`/compounding-expertise/simulator?analysisId=${analysis.id}${caseSetQuery}`}>Inspect Stress Test</Link>
          <Link className="btn primary" href={`/compounding-expertise/inputs?analysisId=${analysis.id}`}>Revise analysis</Link>
        </div>
      </Section>
    </>
  );
}
