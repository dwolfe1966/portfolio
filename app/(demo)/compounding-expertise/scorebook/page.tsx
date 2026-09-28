import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  SCOREBOOK_CASE_FIELD_CLASSIFICATION,
  applyExperienceSlice,
  buildCaseDetailSequence,
  buildCasapPublicSimulationCases,
  calculateScorebookMetrics,
  casapPublicSimulationCaseSet,
  casesForCaseSet,
  deriveCaseFeedbackLatencyDays,
  deriveCaseInspectionReasons,
  deriveCaseResolvedStatus,
  deriveActionDistribution,
  deriveExperienceCanCannot,
  deriveExperienceCoverage,
  deriveExperienceInsights,
  deriveExperienceSnapshot,
  deriveFeedbackLatencyDistribution,
  deriveGradeDistribution,
  deriveInformationStructure,
  deriveInformationStructureDiligenceQuestions,
  deriveInterestingSlices,
  resolveBestAvailableAnalyticalCaseSet,
  scorebookDerivedSimulatorValues,
  scorebookRowsAreSynthetic,
  scorebookRowsAreSyntheticSimulation,
  sourceRouteIsSafe,
  CASAP_PUBLIC_SIMULATION_CASESET_KEY,
  CASAP_PUBLIC_EVIDENCE_ANALYSIS,
  type AnalyticalDatasetOption,
  type AnalyticalDatasetKind,
  type CompoundingCaseGrade,
  type ScorebookCaseInput
} from "@/lib/compounding-expertise-lab";
import { saveCaseSetAction, saveScorebookAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

const GRADES: CompoundingCaseGrade[] = ["CORRECT", "PARTIALLY_CORRECT", "INCORRECT", "UNRESOLVED"];

type ExperienceDatasetDisplay = {
  id?: string | null;
  name: string;
  description?: string | null;
  sourceType?: string | null;
  sourceSystemLabel?: string | null;
  sourceRoute?: string | null;
  modelVersion?: string | null;
  policyVersion?: string | null;
  experimentId?: string | null;
  sourceRunLabel?: string | null;
  timeWindowStart?: Date | string | null;
  timeWindowEnd?: Date | string | null;
  generatedAt?: Date | string | null;
  importedAt?: Date | string | null;
  isSynthetic?: boolean | null;
  provenanceLabel?: string | null;
  caseCount?: number | null;
};

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

function uniq(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function pct(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value * 100)}%`;
}

function money(value: number | null) {
  return value === null ? "Unavailable" : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function dateValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function displayDate(value: Date | string | null | undefined) {
  const date = dateValue(value);
  return date || "Unavailable";
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function latencyLabel(row: ScorebookCaseInput) {
  const latency = deriveCaseFeedbackLatencyDays(row);
  return latency === null ? "Unavailable" : `${latency} days`;
}

function rowFlags(row: ScorebookCaseInput) {
  return [
    row.humanOverride ? "override" : null,
    row.grade === "INCORRECT" ? "incorrect" : null,
    row.grade === "PARTIALLY_CORRECT" ? "partial" : null,
    row.isEdgeCase ? "edge" : null,
    deriveCaseResolvedStatus(row) === "unresolved" ? "unresolved" : null,
    row.isSynthetic ? "synthetic" : null
  ].filter((item): item is string => Boolean(item));
}

function matches(row: ScorebookCaseInput, filters: Record<string, string>) {
  if (filters.q) {
    const haystack = [
      row.externalCaseId,
      row.customerSegment,
      row.caseType,
      row.context,
      row.agentDecision,
      row.humanDecision,
      row.actionTaken,
      row.outcome,
      row.grade,
      row.sourceLabel
    ].join(" ").toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  if (filters.segment && row.customerSegment !== filters.segment) return false;
  if (filters.caseType && row.caseType !== filters.caseType) return false;
  if (filters.grade && row.grade !== filters.grade) return false;
  if (filters.override === "yes" && !row.humanOverride) return false;
  if (filters.override === "no" && row.humanOverride) return false;
  if (filters.edge === "yes" && !row.isEdgeCase) return false;
  if (filters.edge === "no" && row.isEdgeCase) return false;
  if (filters.resolved === "resolved" && row.grade === "UNRESOLVED" && !row.outcome && !row.outcomeAt) return false;
  if (filters.resolved === "unresolved" && (row.grade !== "UNRESOLVED" || row.outcome || row.outcomeAt)) return false;
  if (filters.synthetic === "synthetic" && !row.isSynthetic) return false;
  if (filters.synthetic === "non-synthetic" && row.isSynthetic) return false;
  return true;
}

function metricCard(label: string, value: string, sample: string) {
  return (
    <div className="card compact">
      <p className="small">{label}</p>
      <h3>{value}</h3>
      <p className="small">{sample}</p>
    </div>
  );
}

function barWidth(share: number | null) {
  return `${Math.max(3, Math.round((share ?? 0) * 100))}%`;
}

function bits(value: number | null) {
  return value === null ? "Unavailable" : `${value.toFixed(2)} bits`;
}

function normalized(value: number | null) {
  return value === null ? "Unavailable" : value.toFixed(2);
}

function datasetKindLabel(kind: AnalyticalDatasetKind) {
  switch (kind) {
    case "OBSERVED_PRODUCTION":
      return "PRODUCTION DATA";
    case "RECONSTRUCTED_SOURCED":
      return "RECONSTRUCTED DATA";
    case "SYNTHETIC_SIMULATION":
      return "SIMULATED";
    case "CANONICAL_SYNTHETIC":
      return "CANONICAL SYNTHETIC";
    case "NONE":
      return "PUBLIC EVIDENCE ONLY";
  }
}

function datasetHref(analysisId: string, dataset: AnalyticalDatasetOption) {
  const params = new URLSearchParams({ analysisId });
  if (dataset.caseSetId) params.set("caseSetId", dataset.caseSetId);
  else params.set("dataset", dataset.datasetKey);
  return `/compounding-expertise/scorebook?${params.toString()}`;
}

function datasetQuerySuffix(dataset: AnalyticalDatasetOption) {
  if (dataset.caseSetId) return `&caseSetId=${dataset.caseSetId}`;
  if (dataset.datasetKey) return `&dataset=${dataset.datasetKey}`;
  return "";
}

function datasetConsequences(kind: AnalyticalDatasetKind) {
  switch (kind) {
    case "OBSERVED_PRODUCTION":
      return "Enables scorebook metrics, Information Structure, case inspection, and evidence-bearing downstream analysis when provenance supports it.";
    case "RECONSTRUCTED_SOURCED":
      return "Enables case-level analysis subject to reconstruction limits. Downstream evidence must retain reconstructed provenance.";
    case "SYNTHETIC_SIMULATION":
      return "Enables Experience UX, Information Structure demonstration, and diligence design. Does not establish actual company scorebook properties, learning causality, transfer, or Power.";
    case "CANONICAL_SYNTHETIC":
      return "Enables canonical theory-test analysis. Useful for framework validation, not empirical company evidence.";
    case "NONE":
      return "Uses public/company evidence only. Case-level diagnostics and Information Structure are unavailable.";
  }
}

function InformationNoveltyChart({
  cohorts
}: {
  cohorts: ReturnType<typeof deriveInformationStructure>["marginalNovelty"]["cohorts"];
}) {
  if (!cohorts.length) return null;
  const width = 560;
  const height = 180;
  const cumulativeCaseCounts = cohorts.reduce<number[]>((counts, cohort) => {
    counts.push((counts.at(-1) ?? 0) + cohort.cases);
    return counts;
  }, []);
  const maxCases = Math.max(cumulativeCaseCounts.at(-1) ?? 0, 1);
  const maxPatterns = Math.max(...cohorts.map((cohort) => cohort.cumulativeUniquePatterns), 1);
  const points = cohorts.map((cohort, index) => {
    const accumulatedCases = cumulativeCaseCounts[index];
    const x = 32 + (accumulatedCases / maxCases) * (width - 64);
    const y = height - 28 - (cohort.cumulativeUniquePatterns / maxPatterns) * (height - 56);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="compoundingInfoChart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cumulative unique case patterns by accumulated cases">
      <line x1="32" y1={height - 28} x2={width - 24} y2={height - 28} stroke="currentColor" strokeOpacity="0.25" />
      <line x1="32" y1="20" x2="32" y2={height - 28} stroke="currentColor" strokeOpacity="0.25" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {cohorts.map((cohort, index) => {
        const [x, y] = points.split(" ")[index].split(",").map(Number);
        return <circle key={cohort.index} cx={x} cy={y} r="4" fill="currentColor" />;
      })}
      <text x="34" y="18" fontSize="11" fill="currentColor">Observed pattern space</text>
      <text x={width - 190} y={height - 8} fontSize="11" fill="currentColor">Accumulated cases</text>
    </svg>
  );
}

function sliceHref({
  analysisId,
  caseSetId,
  datasetKey,
  query
}: {
  analysisId: string;
  caseSetId?: string | null;
  datasetKey?: string | null;
  query: Record<string, string>;
}) {
  const params = new URLSearchParams({ analysisId });
  if (caseSetId) params.set("caseSetId", caseSetId);
  else if (datasetKey) params.set("dataset", datasetKey);
  Object.entries(query).forEach(([key, value]) => params.set(key, value));
  return `/compounding-expertise/scorebook?${params.toString()}#case-explorer`;
}

function CaseDetail({
  row,
  decisionClassName,
  caseSet
}: {
  row: ScorebookCaseInput;
  decisionClassName: string;
  caseSet: ExperienceDatasetDisplay | null;
}) {
  const sequence = buildCaseDetailSequence(row);
  const reasons = deriveCaseInspectionReasons(row);
  return (
    <div className="compoundingCaseDetail">
      <div className="compoundingCaseSequence">
        {sequence.map((step) => (
          <span key={step.label}>
            <strong>{step.label}</strong>
            <small>{displayValue(step.value)}</small>
            <em>{step.fieldType}</em>
          </span>
        ))}
      </div>
      <div className="grid grid-3">
        <div className="card compact">
          <p className="small">Why this case may matter</p>
          {reasons.length ? (
            <div className="compoundingActionPills">{reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
          ) : (
            <p>No deterministic inspection flag was found.</p>
          )}
        </div>
        <div className="card compact">
          <p className="small">CE-derived fields</p>
          <p><strong>Feedback latency:</strong> {latencyLabel(row)}</p>
          <p><strong>Resolved status:</strong> {deriveCaseResolvedStatus(row)}</p>
          <p><strong>Decision class label:</strong> {decisionClassName}</p>
          <p><strong>Flags:</strong> {rowFlags(row).join(", ") || "none"}</p>
        </div>
        <div className="card compact">
          <p className="small">Source / raw attributes</p>
          <p><strong>Human override:</strong> {displayValue(row.humanOverride)}</p>
          <p><strong>Edge case:</strong> {displayValue(row.isEdgeCase)}</p>
          <p><strong>Economic value:</strong> {money(row.outcomeValue ?? null)}</p>
          <p><strong>Grade confidence:</strong> {displayValue(row.gradeConfidence)}</p>
        </div>
        <div className="card compact">
          <p className="small">Provenance</p>
          <p><strong>CaseSet:</strong> {caseSet?.name ?? "All scorebook rows"}</p>
          <p><strong>Source type/system:</strong> {caseSet ? `${caseSet.sourceType} / ${caseSet.sourceSystemLabel ?? "Unspecified system"}` : row.sourceRecordType ?? "Manual / mixed"}</p>
          <p><strong>Record:</strong> {displayValue(row.sourceRecordId)}</p>
          <p><strong>Route:</strong> {displayValue(row.sourceRecordRoute ?? caseSet?.sourceRoute)}</p>
          <p><strong>Model / policy:</strong> {caseSet ? `${caseSet.modelVersion ?? "No model"} / ${caseSet.policyVersion ?? "No policy"}` : "Unavailable"}</p>
          <p><strong>Experiment / run:</strong> {caseSet ? `${caseSet.experimentId ?? caseSet.sourceRunLabel ?? "Unavailable"}` : "Unavailable"}</p>
          <p><strong>Status:</strong> {row.isSynthetic ? "Synthetic illustrative data" : "Company / sourced / user-entered"}</p>
        </div>
      </div>
      <details className="compoundingInlineEditor">
        <summary>Raw field inventory</summary>
        <div className="grid grid-2">
          <div className="card compact">
            <h3>Source / raw fields</h3>
            <p>{SCOREBOOK_CASE_FIELD_CLASSIFICATION.sourceRawFields.join(", ")}</p>
          </div>
          <div className="card compact">
            <h3>CE-derived fields</h3>
            <p>{SCOREBOOK_CASE_FIELD_CLASSIFICATION.ceDerivedFields.join(", ")}</p>
          </div>
        </div>
      </details>
    </div>
  );
}

function ScorebookRow({ row, blank = false }: { row: Partial<ScorebookCaseInput>; blank?: boolean }) {
  const suffix = row.id ?? `blank-${row.externalCaseId ?? "new"}`;
  return (
    <tr>
      <td>
        <input type="hidden" name="caseId" value={row.id ?? ""} />
        <input type="hidden" name="caseSetId" value={row.caseSetId ?? ""} />
        <select name="deleteCase" defaultValue="0" aria-label={`Delete ${suffix}`}>
          <option value="0">{blank ? "Add" : "Keep"}</option>
          {!blank ? <option value="1">Delete</option> : null}
        </select>
      </td>
      <td><input name="externalCaseId" defaultValue={row.externalCaseId ?? ""} placeholder="case id" /></td>
      <td><input name="customerSegment" defaultValue={row.customerSegment ?? ""} /></td>
      <td><input name="caseType" defaultValue={row.caseType ?? ""} /></td>
      <td><textarea name="context" rows={3} defaultValue={row.context ?? ""} /></td>
      <td><input name="agentDecision" defaultValue={row.agentDecision ?? ""} /></td>
      <td><input name="agentConfidence" type="number" min="0" max="1" step="0.01" defaultValue={row.agentConfidence ?? ""} /></td>
      <td><input name="humanDecision" defaultValue={row.humanDecision ?? ""} /></td>
      <td>
        <select name="humanOverride" defaultValue={row.humanOverride ? "1" : "0"}>
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </td>
      <td><input name="actionTaken" defaultValue={row.actionTaken ?? ""} /></td>
      <td><textarea name="outcome" rows={3} defaultValue={row.outcome ?? ""} /></td>
      <td><input name="outcomeValue" type="number" step="1" defaultValue={row.outcomeValue ?? ""} /></td>
      <td><input name="decisionAt" type="date" defaultValue={dateValue(row.decisionAt)} /></td>
      <td><input name="actionAt" type="date" defaultValue={dateValue(row.actionAt)} /></td>
      <td><input name="outcomeAt" type="date" defaultValue={dateValue(row.outcomeAt)} /></td>
      <td>
        <select name="grade" defaultValue={row.grade ?? "UNRESOLVED"}>
          {GRADES.map((grade) => <option key={grade} value={grade}>{grade.replaceAll("_", " ")}</option>)}
        </select>
      </td>
      <td><input name="gradeConfidence" type="number" min="0" max="1" step="0.01" defaultValue={row.gradeConfidence ?? ""} /></td>
      <td>
        <select name="isEdgeCase" defaultValue={row.isEdgeCase ? "1" : "0"}>
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </td>
      <td>
        <select name="isSynthetic" defaultValue={row.isSynthetic === false ? "0" : "1"}>
          <option value="1">Synthetic</option>
          <option value="0">User / sourced</option>
        </select>
      </td>
      <td><textarea name="sourceLabel" rows={3} defaultValue={row.sourceLabel ?? "User-entered scorebook row"} /></td>
      <td><input name="sourceRecordId" defaultValue={row.sourceRecordId ?? ""} /></td>
      <td><input name="sourceRecordType" defaultValue={row.sourceRecordType ?? ""} /></td>
      <td><input name="sourceRecordRoute" defaultValue={row.sourceRecordRoute ?? ""} /></td>
      <td><textarea name="notes" rows={3} defaultValue={row.notes ?? ""} /></td>
    </tr>
  );
}

export default async function CompoundingExpertiseScorebookPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId, params.analysisId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Experience" analysisId={params.analysisId} />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before inspecting the scorebook.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to Company Model</Link>
        </Section>
      </>
    );
  }

  const rows = analysis.scorebookCases.map(caseInput);
  const isCasapPublicAnalysis = analysis.companyName === CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis.companyName;
  const hasPersistedSimulation = analysis.caseSets.some((caseSet) => caseSet.sourceSystemKey === CASAP_PUBLIC_SIMULATION_CASESET_KEY);
  const virtualSimulationCaseSet = isCasapPublicAnalysis && !hasPersistedSimulation ? casapPublicSimulationCaseSet() : null;
  const datasetResolution = resolveBestAvailableAnalyticalCaseSet({
    caseSets: analysis.caseSets,
    requestedCaseSetId: params.caseSetId,
    requestedDatasetKey: params.dataset,
    virtualCaseSets: virtualSimulationCaseSet ? [virtualSimulationCaseSet] : [],
    includeNoCaseSet: true
  });
  const selectedDataset = datasetResolution.selected;
  const selectedCaseSet = selectedDataset.caseSetId
    ? analysis.caseSets.find((caseSet) => caseSet.id === selectedDataset.caseSetId) ?? null
    : null;
  const selectedDatasetDisplay: ExperienceDatasetDisplay | null = selectedCaseSet ?? selectedDataset.caseSet ?? null;
  const virtualSimulationRows = selectedDataset.isVirtual && selectedDataset.datasetKey === CASAP_PUBLIC_SIMULATION_CASESET_KEY
    ? buildCasapPublicSimulationCases().map((row) => ({ ...row, caseSetId: CASAP_PUBLIC_SIMULATION_CASESET_KEY }))
    : [];
  const activeRows = selectedCaseSet
    ? casesForCaseSet(rows, selectedCaseSet.id)
    : selectedDataset.kind === "SYNTHETIC_SIMULATION"
      ? virtualSimulationRows
      : selectedDataset.kind === "NONE"
        ? []
        : casesForCaseSet(rows, null);
  const filtered = applyExperienceSlice(activeRows.filter((row) => matches(row, params as Record<string, string>)), params.slice);
  const metrics = calculateScorebookMetrics(activeRows);
  const derived = scorebookDerivedSimulatorValues(activeRows);
  const snapshot = deriveExperienceSnapshot(activeRows);
  const gradeDistribution = deriveGradeDistribution(activeRows);
  const actionDistribution = deriveActionDistribution(activeRows);
  const feedbackLatencyDistribution = deriveFeedbackLatencyDistribution(activeRows);
  const experienceInsights = deriveExperienceInsights(activeRows);
  const interestingSlices = deriveInterestingSlices(activeRows);
  const experienceQuality = deriveExperienceCoverage(activeRows, snapshot.provenance);
  const canCannot = deriveExperienceCanCannot(activeRows);
  const informationStructure = deriveInformationStructure(activeRows);
  const informationQuestions = deriveInformationStructureDiligenceQuestions(informationStructure);
  const segments = uniq(activeRows.map((row) => row.customerSegment));
  const caseTypes = uniq(activeRows.map((row) => row.caseType));
  const allSynthetic = scorebookRowsAreSynthetic(activeRows);
  const simulationMode = selectedDataset.kind === "SYNTHETIC_SIMULATION";
  const canonicalSyntheticMode = selectedDataset.kind === "CANONICAL_SYNTHETIC";
  const publicEvidenceOnlyMode = selectedDataset.kind === "NONE";
  const analyticalDatasetIsSynthetic = simulationMode || canonicalSyntheticMode || scorebookRowsAreSyntheticSimulation(activeRows);
  const safeSourceRoute = selectedDatasetDisplay && sourceRouteIsSafe(selectedDatasetDisplay.sourceRoute) ? selectedDatasetDisplay.sourceRoute : null;
  const selectedDatasetSuffix = datasetQuerySuffix(selectedDataset);
  const hasObservedProductionCaseSet = datasetResolution.options.some((option) => option.kind === "OBSERVED_PRODUCTION");
  const hasProductionCaseDataAvailable = hasObservedProductionCaseSet || selectedDataset.kind === "OBSERVED_PRODUCTION";
  const decisionClassNames = new Map(
    analysis.workflows.flatMap((workflow) => workflow.decisionClasses.map((decisionClass) => [decisionClass.id, decisionClass.name] as const))
  );

  return (
    <>
      <LabWorkflowRail
        active="Experience"
        analysisId={analysis?.id}
        activeAnalysisLabel={analysis?.companyName}
        activeAnalysisDetail={selectedDataset.name}
      />
      <Section eyebrow="Experience · CaseSets / Scorebook" title="What operating experience is available?">
        <div className="card compoundingStageOrientation">
          <div>
            <p className="small">What am I seeing?</p>
            <p>The operating experience available to the company.</p>
          </div>
          <div>
            <p className="small">Why does it matter?</p>
            <p>Compounding Expertise requires more than data volume; decisions must connect to actions, outcomes, and meaningful grades.</p>
          </div>
          <div>
            <p className="small">What should I do?</p>
            <p>Inspect summary statistics, then examine overrides, failures, edge cases, and unresolved cases to understand what the dataset actually teaches.</p>
          </div>
        </div>
        <div className="card compoundingCaseSetPanel">
          <div className="compoundingCardHeader">
            <div>
              <p className="small">Experience dataset</p>
              <h3>{selectedDataset.name}</h3>
              <p>{selectedDataset.description ?? (publicEvidenceOnlyMode ? "No case-level analytical dataset is selected." : "Current analytical dataset for scorebook and Information Structure analysis.")}</p>
            </div>
            <span className="miniTag">{datasetResolution.selectionMode === "AUTO_SELECTED" ? "AUTO-SELECTED" : "USER-SELECTED"}</span>
          </div>
          <div className="compoundingCaseSetFacts">
            <span><strong>Type</strong>{datasetKindLabel(selectedDataset.kind)}{analyticalDatasetIsSynthetic ? " · NOT COMPANY DATA" : ""}</span>
            <span><strong>Cases</strong>{activeRows.length} active rows{selectedDataset.caseCount ? ` / ${selectedDataset.caseCount} declared` : ""}</span>
            <span><strong>Why selected</strong>{datasetResolution.reason}</span>
            <span><strong>Source</strong>{selectedDataset.sourceSystemLabel ?? selectedDatasetDisplay?.sourceSystemLabel ?? "Public evidence / manual"}</span>
            <span><strong>Provenance</strong>{selectedDataset.provenanceLabel}</span>
            <span><strong>Time window</strong>{selectedDatasetDisplay ? `${displayDate(selectedDatasetDisplay.timeWindowStart)} -> ${displayDate(selectedDatasetDisplay.timeWindowEnd)}` : "Unavailable"}</span>
            <span><strong>Model / policy</strong>{selectedDatasetDisplay ? `${selectedDatasetDisplay.modelVersion ?? "No model"} / ${selectedDatasetDisplay.policyVersion ?? "No policy"}` : "Unavailable"}</span>
            <span><strong>Experiment / run</strong>{selectedDatasetDisplay ? `${selectedDatasetDisplay.experimentId ?? selectedDatasetDisplay.sourceRunLabel ?? "Unavailable"}` : "Unavailable"}</span>
          </div>
          <div className="grid grid-2">
            <div className="card compact">
              <p className="small">Company evidence</p>
              <h3>{isCasapPublicAnalysis ? "PUBLIC SOURCES AVAILABLE" : hasProductionCaseDataAvailable ? "PRODUCTION CASE DATA AVAILABLE" : "COMPANY EVIDENCE STATE"}</h3>
              <p className="small">
                {hasProductionCaseDataAvailable
                  ? "Production case-level records are available for this analysis."
                  : "Public sources can inform the company model and diligence analysis. They do not provide production decision → action → outcome → grade records for scorebook or Information Structure measurement."}
              </p>
              {!hasProductionCaseDataAvailable ? <p className="miniTag">PRODUCTION CASE DATA NOT AVAILABLE</p> : null}
            </div>
            <div className="card compact">
              <p className="small">Epistemic context</p>
              <div className="compoundingExperienceFunnel" aria-label="Company evidence and analytical dataset ladder">
                <span><strong>Public evidence</strong><small>available</small></span>
                <span><strong>{simulationMode ? "Simulated cases" : datasetKindLabel(selectedDataset.kind)}</strong><small>{simulationMode ? "current dataset" : selectedDataset.kind === "NONE" ? "not selected" : "current dataset"}</small></span>
                <span><strong>Production cases</strong><small>{hasProductionCaseDataAvailable ? "available" : "not available"}</small></span>
              </div>
            </div>
          </div>
          {simulationMode ? (
            <details className="compoundingDisclosure">
              <summary>Why am I seeing simulated data?</summary>
              <p>
                The Lab selected this evidence-grounded simulation automatically because no production CaseSet is available.
                It maximizes analytical usefulness subject to epistemic integrity: the simulation shows what the CE machinery would measure,
                but it does not become evidence about Casap.
              </p>
            </details>
          ) : null}
          <details className="compoundingDisclosure" id="case-set-selector">
            <summary>Change dataset</summary>
            <div className="grid grid-2">
              {datasetResolution.options.map((option) => (
                <div className="card compact" key={option.datasetKey}>
                  <p className="small">{datasetKindLabel(option.kind)}{option.isVirtual ? " · virtual" : ""}</p>
                  <h3>{option.name}</h3>
                  <p>{option.caseCount} cases · {option.provenanceLabel}</p>
                  <p className="small">{datasetConsequences(option.kind)}</p>
                  {option.datasetKey === selectedDataset.datasetKey ? (
                    <span className="miniTag">Currently selected</span>
                  ) : (
                    <Link className="btn" href={datasetHref(analysis.id, option)}>Open dataset</Link>
                  )}
                </div>
              ))}
              <div className="card compact">
                <p className="small">Production / observed</p>
                <h3>{hasObservedProductionCaseSet ? "Available above" : "Not connected"}</h3>
                <p className="small">Import or connect anonymized production/data-room cases when available. This remains future infrastructure in this Lab pass.</p>
                <button className="btn" type="button" disabled>Import / connect</button>
              </div>
            </div>
          </details>
          {selectedCaseSet ? (
            <details className="compoundingInlineEditor">
              <summary>About this case set</summary>
              <form action={saveCaseSetAction} className="compoundingFormGrid">
                <input type="hidden" name="analysisId" value={analysis.id} />
                <input type="hidden" name="caseSetId" value={selectedCaseSet.id} />
                <label>Name<input name="name" defaultValue={selectedCaseSet.name} /></label>
                <label>Source type<input name="sourceType" defaultValue={selectedCaseSet.sourceType} /></label>
                <label className="span-2">Description<textarea name="description" rows={3} defaultValue={selectedCaseSet.description ?? ""} /></label>
                <label>Source system key<input name="sourceSystemKey" defaultValue={selectedCaseSet.sourceSystemKey ?? ""} /></label>
                <label>Source system label<input name="sourceSystemLabel" defaultValue={selectedCaseSet.sourceSystemLabel ?? ""} /></label>
                <label>Source run id<input name="sourceRunId" defaultValue={selectedCaseSet.sourceRunId ?? ""} /></label>
                <label>Source run label<input name="sourceRunLabel" defaultValue={selectedCaseSet.sourceRunLabel ?? ""} /></label>
                <label>Source run type<input name="sourceRunType" defaultValue={selectedCaseSet.sourceRunType ?? ""} /></label>
                <label>Experiment id<input name="experimentId" defaultValue={selectedCaseSet.experimentId ?? ""} /></label>
                <label>Model version<input name="modelVersion" defaultValue={selectedCaseSet.modelVersion ?? ""} /></label>
                <label>Policy version<input name="policyVersion" defaultValue={selectedCaseSet.policyVersion ?? ""} /></label>
                <label>Time window start<input name="timeWindowStart" type="date" defaultValue={dateValue(selectedCaseSet.timeWindowStart)} /></label>
                <label>Time window end<input name="timeWindowEnd" type="date" defaultValue={dateValue(selectedCaseSet.timeWindowEnd)} /></label>
                <label>Source route<input name="sourceRoute" defaultValue={selectedCaseSet.sourceRoute ?? ""} /></label>
                <label>External URL<input name="sourceExternalUrl" defaultValue={selectedCaseSet.sourceExternalUrl ?? ""} /></label>
                <label>Parent CaseSet id<input name="parentCaseSetId" defaultValue={selectedCaseSet.parentCaseSetId ?? ""} /></label>
                <label>Synthetic status<select name="isSynthetic" defaultValue={selectedCaseSet.isSynthetic ? "1" : "0"}><option value="0">Observed / user-entered</option><option value="1">Synthetic</option></select></label>
                <label className="span-2">Provenance<textarea name="provenanceLabel" rows={2} defaultValue={selectedCaseSet.provenanceLabel} /></label>
                <label className="span-2">Derivation<textarea name="derivationDescription" rows={3} defaultValue={selectedCaseSet.derivationDescription ?? ""} /></label>
                <button className="btn" type="submit">Save CaseSet metadata</button>
              </form>
            </details>
          ) : null}
          {safeSourceRoute ? <Link className="btn" href={safeSourceRoute}>Open source system</Link> : null}
        </div>
        <div className="compoundingDatasetActions">
          <Link className="btn" href={`/compounding-expertise/overview?analysisId=${analysis.id}`}>Use / load canonical sample</Link>
          <button className="btn" type="button" disabled title="External import is planned for a later pass">Upload / import dataset</button>
          <a className="btn" href="#case-set-selector">Choose existing CaseSet</a>
        </div>
        {publicEvidenceOnlyMode ? (
          <div className="card compoundingSyntheticBanner">
            <strong>No case-level analytical dataset selected</strong>
            <p>Public evidence can establish workflow structure and company claims, but scorebook and Information Structure analysis require decision → action → outcome → grade records.</p>
          </div>
        ) : null}
        {simulationMode ? (
          <div className="card compoundingSyntheticBanner">
            <strong>SIMULATION MODE — SYNTHETIC — PUBLIC-EVIDENCE-GROUNDED — NOT COMPANY DATA</strong>
            <p>
              These cases illustrate what the publicly documented dispute/fraud workflow might look like as a scorebook.
              They are not Casap production records and must not be used as empirical evidence about Casap.
            </p>
          </div>
        ) : allSynthetic ? (
          <div className="card compoundingSyntheticBanner">
            <strong>SYNTHETIC ILLUSTRATIVE DATA — NOT COMPANY DATA</strong>
            <p>
              Every current row in this CaseSet is marked synthetic. Use this fixture to test the theory,
              not to describe real company operations.
            </p>
          </div>
        ) : null}
      </Section>

      <Section title="Scorebook Structure + Information Structure">
        <div className="grid grid-2">
          <div className="card">
            <p className="small">Scorebook Structure</p>
            <h3>What experience has accumulated?</h3>
            <div className="compoundingCaseSetFacts">
              <span><strong>Cases</strong>{snapshot.totalCases}</span>
              <span><strong>Outcomes</strong>{snapshot.outcomesObserved}/{snapshot.totalCases}</span>
              <span><strong>Grades</strong>{snapshot.gradedCases}/{snapshot.totalCases}</span>
              <span><strong>Feedback</strong>{snapshot.medianFeedbackLatencyDays === null ? "Unavailable" : `${snapshot.medianFeedbackLatencyDays}d median`}</span>
            </div>
            <p className="miniTag">{snapshot.provenance}</p>
          </div>
          <div className="card" id="information-structure-summary">
            <p className="small">Information Structure · Shannon diagnostics</p>
            <h3>How much distinct information does that experience contain?</h3>
            <div className="compoundingCaseSetFacts">
              <span><strong>Diversity</strong>{informationStructure.summary.diversity}</span>
              <span><strong>Repetition</strong>{informationStructure.summary.patternRepetition}</span>
              <span><strong>Novelty</strong>{informationStructure.summary.marginalNovelty}</span>
              <span><strong>Outcome information</strong>{informationStructure.summary.outcomeInformation}</span>
            </div>
            <div className="ctaRow">
              {informationStructure.available ? (
                <a className="btn" href="#information-structure">Explore information structure ↓</a>
              ) : isCasapPublicAnalysis && !simulationMode ? (
                <Link className="btn primary" href={`/compounding-expertise/scorebook?analysisId=${analysis.id}&dataset=${CASAP_PUBLIC_SIMULATION_CASESET_KEY}#information-structure`}>Explore synthetic simulation</Link>
              ) : (
                <a className="btn" href="#information-structure">View evidence needed</a>
              )}
            </div>
            <p className="small">Case volume is not the same thing as information volume. These diagnostics are descriptive, not proof of learning or Power.</p>
          </div>
        </div>
      </Section>

      <Section title="Experience Snapshot">
        <div className="card compoundingExperienceSnapshot">
          <div>
            <p className="small">Experience funnel</p>
            <div className="compoundingExperienceFunnel" aria-label="Outcome and grade funnel">
              <span>
                <strong>{snapshot.totalCases}</strong>
                <small>Total cases</small>
              </span>
              <span>
                <strong>{snapshot.outcomesObserved}</strong>
                <small>Outcomes observed</small>
              </span>
              <span>
                <strong>{snapshot.gradedCases}</strong>
                <small>Cases graded</small>
              </span>
            </div>
          </div>
          <div className="compoundingSnapshotStats">
            {metricCard("Outcome completion", pct(snapshot.outcomeCompletionRate), `n=${snapshot.outcomesObserved}/${snapshot.totalCases}`)}
            {metricCard("Grade coverage", pct(snapshot.gradeCoverage), `n=${snapshot.gradedCases}/${snapshot.totalCases}`)}
            {metricCard("Median feedback latency", snapshot.medianFeedbackLatencyDays === null ? "Unavailable" : `${snapshot.medianFeedbackLatencyDays} days`, `n=${snapshot.feedbackLatencySampleSize}`)}
            {metricCard("Human override rate", pct(snapshot.humanOverrideRate), `n=${snapshot.humanOverrideCount}/${snapshot.totalCases}`)}
            {metricCard("Edge-case rate", pct(snapshot.edgeCaseRate), `n=${snapshot.edgeCaseCount}/${snapshot.totalCases}`)}
          </div>
          <p className="miniTag">{snapshot.provenance}</p>
        </div>
        <div className="grid grid-3 compoundingDiagnosticsGrid">
          <div className="card">
            <h3>Grade distribution</h3>
            <div className="compoundingBarList">
              {gradeDistribution.map((item) => (
                <span key={item.label}>
                  <strong>{item.label.replaceAll("_", " ")}</strong>
                  <small>{item.count} · {pct(item.share)}</small>
                  <i style={{ width: barWidth(item.share) }} />
                </span>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Action / decision distribution</h3>
            <div className="compoundingBarList">
              {actionDistribution.length ? actionDistribution.map((item) => (
                <span key={item.label}>
                  <strong>{item.label}</strong>
                  <small>{item.count} · {pct(item.share)}</small>
                  <i style={{ width: barWidth(item.share) }} />
                </span>
              )) : <p className="small">No actions or agent decisions are represented.</p>}
            </div>
          </div>
          <div className="card">
            <h3>Feedback latency</h3>
            <p className="small">Median: {snapshot.medianFeedbackLatencyDays === null ? "Unavailable" : `${snapshot.medianFeedbackLatencyDays} days`}</p>
            <div className="compoundingBarList">
              {feedbackLatencyDistribution.map((item) => (
                <span key={item.key}>
                  <strong>{item.label}</strong>
                  <small>{item.count} · {pct(item.share)}</small>
                  <i style={{ width: barWidth(item.share) }} />
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="card compoundingExperienceInsights">
          <h3>What stands out</h3>
          <div className="compoundingInsightList">
            {experienceInsights.map((insight) => (
              <span className={`compoundingInsight-${insight.tone}`} key={`${insight.statement}-${insight.support}`}>
                <strong>{insight.statement}</strong>
                <small>{insight.support}</small>
              </span>
            ))}
          </div>
        </div>
        <div className="card compoundingExperienceQuality">
          <h3>Experience quality</h3>
          <p className="small">This is descriptive dataset quality, not a Compounding Expertise score.</p>
          <div className="compoundingCaseSetFacts">
            {experienceQuality.map((item) => (
              <span key={item.label}>
                <strong>{item.label}</strong>
                {item.value}
                <small>{item.sample}</small>
                <small>{item.provenance}</small>
              </span>
            ))}
          </div>
          <p className="small">
            A complete scorebook can still fail to create Compounding Expertise if grades do not improve future behavior or if the resulting expertise is easily reproduced.
          </p>
        </div>
        <details className="card compoundingDisclosure">
          <summary>Secondary statistics</summary>
          <div className="grid grid-3">
            {metricCard("Agent correctness", pct(metrics.agentCorrectnessRate), `n=${metrics.gradedCases} resolvable grades`)}
            {metricCard("Economic outcome", money(metrics.totalOutcomeValue), `avg ${money(metrics.averageOutcomeValue)}; n=${metrics.outcomeValueSampleSize}`)}
            {metricCard("Synthetic rows", String(metrics.syntheticCaseCount), `n=${metrics.syntheticCaseCount}/${metrics.totalCases}`)}
          </div>
        </details>
        <div className="card compact">
          <p>
            A large dataset is not necessarily expertise. We are looking for cases that reduce uncertainty about future decisions.
          </p>
        </div>
        <details className="card compoundingDisclosure">
          <summary>Future layers not implemented here</summary>
          <p className="small">
            Information Structure now describes diversity, repetition, structural novelty, and descriptive outcome information.
            Future layers still require separate experiments or stronger data.
          </p>
          <div className="compoundingActionPills">
            <span>compressibility / reconstruction</span>
            <span>cross-customer transfer experiment</span>
            <span>nonstationarity / regime change</span>
            <span>Autonomy Frontier</span>
          </div>
        </details>
        <details className="card compoundingDisclosure">
          <summary>Human override value</summary>
          <p>
            Overrides where the human final decision differs from the agent decision:
            <strong> {metrics.humanOverrideValue.count}</strong> ({pct(metrics.humanOverrideValue.shareOfCases)} of cases).
          </p>
          <p>
            Resolvable override grades: {metrics.humanOverrideValue.resolvableCount}.
            Correct/partially correct: {metrics.humanOverrideValue.correctCount} ({pct(metrics.humanOverrideValue.correctRate)}).
            Incorrect: {metrics.humanOverrideValue.incorrectCount} ({pct(metrics.humanOverrideValue.incorrectRate)}).
          </p>
          <p>
            Override economic outcome where available: {money(metrics.humanOverrideValue.totalOutcomeValue)}
            {" "}across n={metrics.humanOverrideValue.outcomeValueSampleSize}. This is observational, not causal proof of human value.
          </p>
        </details>
      </Section>

      <Section title="Investigate">
        <p>Use these deterministic slices to jump into the same Case Explorer below. Counts are calculated from the active CaseSet only.</p>
        <div className="compoundingSliceGrid">
          {interestingSlices.map((slice) => {
            const href = sliceHref({ analysisId: analysis.id, caseSetId: selectedCaseSet?.id, datasetKey: selectedCaseSet ? null : selectedDataset.datasetKey, query: slice.query });
            return slice.enabled ? (
              <Link className="card compoundingSliceCard" href={href} key={slice.key}>
                <strong>{slice.label}</strong>
                <span>{slice.count} cases</span>
                <small>{slice.description}</small>
              </Link>
            ) : (
              <span className="card compoundingSliceCard isDisabled" key={slice.key}>
                <strong>{slice.label}</strong>
                <span>0 cases</span>
                <small>{slice.description}</small>
              </span>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Information Structure · Shannon diagnostics" title="How much distinct information does accumulated experience contain?">
        <div id="information-structure" />
        <div className="card compoundingStageOrientation">
          <div>
            <p className="small">Question</p>
            <p>A large scorebook is not necessarily an informative scorebook.</p>
          </div>
          <div>
            <p className="small">What this examines</p>
            <p>Whether additional experience continues expanding observed information structure, or mostly repeats already represented case patterns.</p>
          </div>
          <div>
            <p className="small">Limit</p>
            <p>These diagnostics do not establish learning causality, model improvement, cross-customer transfer, or durable Power.</p>
          </div>
        </div>
        <div className="card">
          <h3>Why Shannon matters here</h3>
          <p>
            Case count measures experience volume. Shannon-style information measures help distinguish a large scorebook from a diverse one,
            and repeated observations from newly observed structural states.
          </p>
          <p className="small">
            The CE strategic question is whether additional experience continues contributing useful information that competitors cannot easily reconstruct.
            Entropy, repetition, novelty, and mutual information do not prove that by themselves.
          </p>
        </div>

        {!informationStructure.available ? (
          <div className="card compoundingSyntheticBanner">
            <strong>Information Structure unavailable</strong>
            <p>{informationStructure.unavailableReason}</p>
            <p className="small">
              Public customer outcomes and external evidence can describe workflow or economic value, but they cannot substitute for case-level data when estimating information structure.
            </p>
            <h3>Evidence needed</h3>
            <ul>
              {informationStructure.evidenceNeeded.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : (
          <>
            {informationStructure.rowsAreSynthetic ? (
              <div className="card compoundingSyntheticBanner">
                <strong>{simulationMode ? "DERIVED — SYNTHETIC SIMULATION" : "DERIVED — SYNTHETIC FIXTURE"}</strong>
                <p>{simulationMode ? "Simulation diagnostic calculated from public-evidence-grounded synthetic rows. This demonstrates what to measure in production data; it is not evidence about Casap." : "Illustrative diagnostic calculated from synthetic fixture cases. Not evidence about the actual company."}</p>
              </div>
            ) : null}
            <div className="card">
              <h3>Experience → information</h3>
              <div className="compoundingExperienceFunnel" aria-label="Experience to information structure">
                <span>
                  <strong>{informationStructure.totalCases}</strong>
                  <small>Cases</small>
                </span>
                <span>
                  <strong>{informationStructure.patternRepetition.uniquePatternCount}</strong>
                  <small>Structural patterns</small>
                </span>
                <span>
                  <strong>{pct(informationStructure.patternRepetition.repetitionShare)}</strong>
                  <small>Repeated-pattern cases</small>
                </span>
                <span>
                  <strong>{informationStructure.marginalNovelty.status}</strong>
                  <small>Structural novelty</small>
                </span>
                <span>
                  <strong>{informationStructure.outcomeInformation.status}</strong>
                  <small>Outcome information</small>
                </span>
              </div>
              <p className="small">This is not an effective case count or an information score. It keeps separate volume, pattern structure, novelty, and outcome association.</p>
            </div>
            <div className="grid grid-4 compoundingDiagnosticsGrid">
              <div className="card">
                <p className="small">Most diverse measured dimension</p>
                <h3>{informationStructure.summary.diversity}</h3>
                {informationStructure.diversitySummary ? (
                  <>
                    <p>{informationStructure.diversitySummary.interpretation}</p>
                    <p className="small">
                      Entropy {bits(informationStructure.diversitySummary.entropyBits)} · max {bits(informationStructure.diversitySummary.maxEntropyBits)} · normalized {normalized(informationStructure.diversitySummary.normalizedEntropy)} · n={informationStructure.diversitySummary.usableCount}
                    </p>
                    <p className="miniTag">{informationStructure.diversitySummary.provenance}</p>
                  </>
                ) : <p>No populated categorical diversity dimension is available.</p>}
              </div>
              <div className="card">
                <p className="small">Pattern repetition</p>
                <h3>{informationStructure.patternRepetition.status}</h3>
                <p>{informationStructure.patternRepetition.interpretation}</p>
                <p className="small">
                  {informationStructure.patternRepetition.uniquePatternCount} unique patterns · {informationStructure.patternRepetition.singletonPatterns} singleton patterns · repeated-pattern share {pct(informationStructure.patternRepetition.repetitionShare)}
                </p>
                <p className="miniTag">{informationStructure.patternRepetition.provenance}</p>
              </div>
              <div className="card">
                <p className="small">Structural novelty</p>
                <h3>{informationStructure.marginalNovelty.status}</h3>
                <p>{informationStructure.marginalNovelty.interpretation}</p>
                <p className="small">
                  First cohort {pct(informationStructure.marginalNovelty.firstCohortNoveltyRate)} · latest cohort {pct(informationStructure.marginalNovelty.latestCohortNoveltyRate)} · chronology n={informationStructure.marginalNovelty.usableChronologyCount}/{informationStructure.totalCases}
                </p>
                <p className="miniTag">{informationStructure.marginalNovelty.provenance}</p>
              </div>
              <div className="card">
                <p className="small">Outcome information</p>
                <h3>{informationStructure.outcomeInformation.status}</h3>
                <p>{informationStructure.outcomeInformation.interpretation}</p>
                {informationStructure.outcomeInformation.topAssociations[0] ? (
                  <p className="small">
                    Top association: {informationStructure.outcomeInformation.topAssociations[0].xLabel} → Grade · {bits(informationStructure.outcomeInformation.topAssociations[0].mutualInformationBits)} · {pct(informationStructure.outcomeInformation.topAssociations[0].normalizedInformation)} observed uncertainty reduction
                  </p>
                ) : <p className="small">Insufficient data for reliable comparison.</p>}
                <p className="miniTag">DESCRIPTIVE ASSOCIATION — NOT CAUSAL EVIDENCE</p>
              </div>
            </div>

            {informationStructure.marginalNovelty.cohorts.length ? (
              <div className="card">
                <h3>Structural novelty: accumulated experience → observed pattern space</h3>
                <p>
                  A scorebook can grow rapidly while the amount of newly observed structure grows slowly. Marginal novelty asks whether additional cases continue exposing states the existing scorebook has not already represented.
                </p>
                <div className="compoundingCaseSetFacts">
                  <span><strong>First cohort novelty</strong>{pct(informationStructure.marginalNovelty.firstCohortNoveltyRate)}</span>
                  <span><strong>Latest cohort novelty</strong>{pct(informationStructure.marginalNovelty.latestCohortNoveltyRate)}</span>
                  <span><strong>Cumulative unique patterns</strong>{informationStructure.marginalNovelty.cohorts[informationStructure.marginalNovelty.cohorts.length - 1]?.cumulativeUniquePatterns ?? informationStructure.patternRepetition.uniquePatternCount}</span>
                  <span><strong>Newest-cohort contribution</strong>{pct(informationStructure.marginalNovelty.newestCohortUniqueShare)}</span>
                </div>
                <p className="small">New structural patterns are not automatically valuable information, and repeated patterns can still improve probability estimates.</p>
                <InformationNoveltyChart cohorts={informationStructure.marginalNovelty.cohorts} />
                <div className="compoundingBarList">
                  {informationStructure.marginalNovelty.cohorts.map((cohort) => (
                    <span key={cohort.index}>
                      <strong>Cohort {cohort.index}</strong>
                      <small>{cohort.cases} cases · {cohort.newPatternSignatures} new patterns · novelty {pct(cohort.noveltyRate)}</small>
                      <i style={{ width: barWidth(cohort.noveltyRate) }} />
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-2">
              <div className="card">
                <h3>Most outcome-informative recorded dimensions</h3>
                {informationStructure.outcomeInformation.topAssociations.length ? (
                  <div className="compoundingBarList">
                    {informationStructure.outcomeInformation.topAssociations.map((item) => (
                      <span key={item.xField}>
                        <strong>{item.xLabel} → Grade</strong>
                        <small>{pct(item.normalizedInformation)} observed grade-uncertainty reduction · {bits(item.mutualInformationBits)} · n={item.usableCount}</small>
                        <i style={{ width: barWidth(item.normalizedInformation) }} />
                      </span>
                    ))}
                  </div>
                ) : <p>Insufficient data for reliable comparison.</p>}
              </div>
              <div className="card">
                <h3>What this means for CE</h3>
                <ul>
                  {informationStructure.ceInterpretation.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
            <div className="card">
              <h3>{simulationMode ? "Questions this simulation suggests asking" : "What would we want to know next?"}</h3>
              <ul>
                {informationQuestions.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className="small">
                {simulationMode
                  ? "These are diligence questions suggested by simulated structure, not conclusions about Casap. They route toward Marginal Information Value, Cross-Customer Transfer, Learning Causality, and Rebuildability / Compression."
                  : "These questions route toward Marginal Information Value, Cross-Customer Transfer, Learning Causality, and Rebuildability / Compression. Information Structure alone does not answer them."}
              </p>
            </div>

            <details className="card compoundingDisclosure">
              <summary>How Information Structure works</summary>
              <p><strong>Shannon entropy:</strong> H(X) = -sum p(x) log2 p(x). Normalized entropy divides by log2(K) when at least two categories are represented.</p>
              <p><strong>Case-pattern signature:</strong> V0.1 uses populated categorical fields from decision class, case type, customer segment, and action taken. Grade remains an outcome/target variable, not part of the structural pattern signature. Missing values are reported separately and are not treated as substantive categories by default.</p>
              <p><strong>Pattern repetition:</strong> Repeated pattern means identical under the declared V0.1 signature. It does not mean semantic duplication or zero information.</p>
              <p><strong>Structural novelty:</strong> Cases are ordered by decision date, then action date, then outcome date. Each cohort only compares against patterns observed in earlier cohorts, avoiding future leakage.</p>
              <p><strong>Mutual information:</strong> I(X;Y) describes how much knowing a recorded categorical attribute reduces uncertainty about grade in this CaseSet. V0.1 reports empirical mutual information without finite-sample bias correction, so small or sparse samples are descriptive only. It does not imply causality, feature usefulness, model learning, economic value, generalization, or Power.</p>
              <p><strong>Sample-size conventions:</strong> n &lt; 20 is insufficient for interpretation; 20-49 is small-sample/descriptive only; n ≥ 50 permits descriptive interpretation. Fields with less than 70% coverage are marked limited coverage.</p>
              <p><strong>Next analytical layer: Compressibility / Reconstruction:</strong> Information Structure asks what information the scorebook contains. A future reconstruction test will ask how cheaply a capable challenger can reproduce the useful decision policy from public information, synthetic data, and limited calibration cases.</p>
              <p><strong>Future cross-customer information transfer:</strong> Customer diversity creates an opportunity to test transfer; it does not demonstrate transfer. Transfer requires held-out cross-customer performance evidence.</p>
              <p><strong>Future nonstationarity:</strong> Chronology and cohorts can later support distribution-shift, emerging-case-type, and regime-change diagnostics. V0.1 does not attempt drift detection.</p>
              <p>Information Structure describes statistical structure in the available CaseSet. It does not establish that the system learned from the data, that the information is economically valuable, that it is proprietary, or that competitors cannot reproduce it.</p>
            </details>
          </>
        )}
      </Section>

      <Section title="Create CaseSet">
        <details className="card compoundingDisclosure">
          <summary>Create a new CaseSet</summary>
          <form action={saveCaseSetAction} className="compoundingFormGrid">
            <input type="hidden" name="analysisId" value={analysis.id} />
            <label>Name<input name="name" placeholder="Q1 production decisions, treatment run, synthetic benchmark..." /></label>
            <label>Source type<input name="sourceType" defaultValue="MANUAL" /></label>
            <label className="span-2">Description<textarea name="description" rows={3} placeholder="What body of experience does this CaseSet represent?" /></label>
            <label>Source system label<input name="sourceSystemLabel" placeholder="Manual, Pricing, CSV, etc." /></label>
            <label>Synthetic status<select name="isSynthetic" defaultValue="0"><option value="0">Observed / user-entered</option><option value="1">Synthetic</option></select></label>
            <label className="span-2">Provenance<textarea name="provenanceLabel" rows={2} defaultValue="User-entered CaseSet" /></label>
            <button className="btn" type="submit">Create CaseSet</button>
          </form>
        </details>
      </Section>

      <div id="case-explorer" />
      <Section title="Case Explorer filters">
        <form className="grid grid-4">
          <input type="hidden" name="analysisId" value={analysis.id} />
          {selectedCaseSet ? <input type="hidden" name="caseSetId" value={selectedCaseSet.id} /> : null}
          {!selectedCaseSet && selectedDataset.datasetKey ? <input type="hidden" name="dataset" value={selectedDataset.datasetKey} /> : null}
          <label>Search<input name="q" defaultValue={params.q ?? ""} placeholder="case id, decision, outcome..." /></label>
          <label>Customer segment<select name="segment" defaultValue={params.segment ?? ""}><option value="">All</option>{segments.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Case type<select name="caseType" defaultValue={params.caseType ?? ""}><option value="">All</option>{caseTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Grade<select name="grade" defaultValue={params.grade ?? ""}><option value="">All</option>{GRADES.map((grade) => <option key={grade} value={grade}>{grade.replaceAll("_", " ")}</option>)}</select></label>
          <label>Human override<select name="override" defaultValue={params.override ?? ""}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label>Edge case<select name="edge" defaultValue={params.edge ?? ""}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label>Resolution<select name="resolved" defaultValue={params.resolved ?? ""}><option value="">All</option><option value="resolved">Resolved</option><option value="unresolved">Unresolved</option></select></label>
          <label>Source status<select name="synthetic" defaultValue={params.synthetic ?? ""}><option value="">All</option><option value="synthetic">Synthetic</option><option value="non-synthetic">User / sourced</option></select></label>
          <div className="ctaRow" style={{ alignItems: "end" }}>
            <button className="btn" type="submit">Apply filters</button>
            <Link className="btn" href={`/compounding-expertise/scorebook?analysisId=${analysis.id}${selectedDatasetSuffix}`}>Clear</Link>
          </div>
        </form>
      </Section>

      <Section title="Inspect individual cases">
        <p>
          This is the atomic object of Compounding Expertise: Context → Agent → Human → Action → Outcome → Grade.
          {params.slice ? ` Current slice: ${params.slice.replaceAll("-", " ")}.` : ""}
        </p>
        <div className="tableScroll compoundingExperienceTable">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Decision class</th>
                <th>Agent decision</th>
                <th>Human decision</th>
                <th>Action taken</th>
                <th>Outcome</th>
                <th>Grade</th>
                <th>Feedback latency</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const decisionClassName = row.decisionClassId ? decisionClassNames.get(row.decisionClassId) ?? "Unmapped decision class" : "Unmapped decision class";
                return (
                  <tr key={row.id ?? row.externalCaseId}>
                    <td>
                      <details className="compoundingCaseDetailDisclosure">
                        <summary>{row.externalCaseId}</summary>
                        <CaseDetail row={row} decisionClassName={decisionClassName} caseSet={selectedDatasetDisplay} />
                      </details>
                    </td>
                    <td>{decisionClassName}</td>
                    <td>{displayValue(row.agentDecision)}</td>
                    <td>{displayValue(row.humanDecision)}</td>
                    <td>{displayValue(row.actionTaken)}</td>
                    <td>{displayValue(row.outcome)}</td>
                    <td>{row.grade.replaceAll("_", " ")}</td>
                    <td>{latencyLabel(row)}</td>
                    <td>{rowFlags(row).map((flag) => <span className="miniTag" key={flag}>{flag}</span>)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card compact">
          <h3>What should I inspect next?</h3>
          <p>Start with human overrides, incorrect or partially correct grades, edge cases, and unresolved cases. Those rows reveal what the dataset actually teaches.</p>
        </div>
        <details className="card compoundingDisclosure">
          <summary>Edit dataset mode</summary>
          {selectedCaseSet ? (
            <form action={saveScorebookAction}>
              <input type="hidden" name="analysisId" value={analysis.id} />
              <div className="tableScroll compoundingScorebookTable">
                <table className="dataTable compoundingGroupedTable">
                <thead>
                  <tr>
                    <th rowSpan={2}>Row</th>
                    <th colSpan={4}>Case</th>
                    <th colSpan={2}>Agent</th>
                    <th colSpan={2}>Human</th>
                    <th colSpan={2}>Action</th>
                    <th colSpan={4}>Reality</th>
                    <th colSpan={9}>Learning / provenance</th>
                  </tr>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Context</th>
                    <th>Decision</th>
                    <th>Confidence</th>
                    <th>Final decision</th>
                    <th>Override</th>
                    <th>Action taken</th>
                    <th>Action date</th>
                    <th>Outcome</th>
                    <th>Economic value</th>
                    <th>Decision date</th>
                    <th>Outcome date</th>
                    <th>Grade</th>
                    <th>Grade confidence</th>
                    <th>Edge case</th>
                    <th>Provenance</th>
                    <th>Source label</th>
                    <th>Source record id</th>
                    <th>Source record type</th>
                    <th>Source record route</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => <ScorebookRow key={row.id} row={row} />)}
                  <ScorebookRow row={{ caseSetId: selectedCaseSet?.id ?? null, externalCaseId: "", sourceLabel: "User-entered scorebook row", grade: "UNRESOLVED", isSynthetic: false, humanOverride: false, isEdgeCase: false }} blank />
                </tbody>
                </table>
              </div>
              <div className="ctaRow">
                <button className="btn primary" type="submit">Save dataset edits</button>
              </div>
            </form>
          ) : (
            <p className="small">
              This analytical dataset is virtual or public-evidence-only, so row editing is disabled here.
              Import production data or open a persisted CaseSet to edit rows.
            </p>
          )}
        </details>
        <div className="grid grid-2">
          <div className="card">
            <h3>What this CaseSet tells us</h3>
            <ul>{canCannot.canTellUs.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="card">
            <h3>What this CaseSet cannot tell us</h3>
            <ul>{canCannot.cannotTellUs.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
        {allSynthetic && !simulationMode ? (
          <div className="card compoundingSyntheticBanner">
            <strong>This CaseSet tests the analytical framework. It is not evidence about the actual company.</strong>
          </div>
        ) : null}
        <div className="ctaRow">
          <div>
            <h3>Next: What would change the thesis?</h3>
            <p className="small">
              Experience describes what the available cases contain. Debates asks which unresolved propositions determine whether that experience becomes durable Compounding Expertise.
            </p>
          </div>
          <Link className="btn primary" href={`/compounding-expertise/debates?analysisId=${analysis.id}${selectedDatasetSuffix}`}>Continue to Key Debates →</Link>
        </div>
      </Section>

      <Section title="Simulator bridge">
        <div className="card">
          <h3>Scorebook-derived values available</h3>
          <p>
            Starting graded cases: {derived.startingGradedCases}. Median feedback delay:
            {" "}{derived.feedbackDelayDays === null ? "unavailable" : `${derived.feedbackDelayDays} days`} (n={derived.feedbackDelaySampleSize}).
            Information value, transferability, and learning efficiency remain theoretical assumptions in this pass.
          </p>
        </div>
      </Section>
    </>
  );
}
