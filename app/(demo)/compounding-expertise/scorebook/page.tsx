import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  calculateScorebookMetrics,
  casesForCaseSet,
  scorebookDerivedSimulatorValues,
  scorebookRowsAreSynthetic,
  sourceRouteIsSafe,
  type CompoundingCaseGrade,
  type ScorebookCaseInput
} from "@/lib/compounding-expertise-lab";
import { saveCaseSetAction, saveScorebookAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

const GRADES: CompoundingCaseGrade[] = ["CORRECT", "PARTIALLY_CORRECT", "INCORRECT", "UNRESOLVED"];

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

function matches(row: ScorebookCaseInput, filters: Record<string, string>) {
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
  const selectedCaseSet = params.caseSetId
    ? analysis.caseSets.find((caseSet) => caseSet.id === params.caseSetId) ?? null
    : analysis.caseSets[0] ?? null;
  const activeRows = casesForCaseSet(rows, selectedCaseSet?.id);
  const filtered = activeRows.filter((row) => matches(row, params as Record<string, string>));
  const metrics = calculateScorebookMetrics(activeRows);
  const derived = scorebookDerivedSimulatorValues(activeRows);
  const segments = uniq(activeRows.map((row) => row.customerSegment));
  const caseTypes = uniq(activeRows.map((row) => row.caseType));
  const allSynthetic = scorebookRowsAreSynthetic(activeRows);
  const safeSourceRoute = selectedCaseSet && sourceRouteIsSafe(selectedCaseSet.sourceRoute) ? selectedCaseSet.sourceRoute : null;

  return (
    <>
      <LabWorkflowRail active="Experience" analysisId={analysis?.id} />
      <Section eyebrow="Experience · CaseSets / Scorebook" title="Show me the experience">
        <p>
          Compounding Expertise is evaluated over bodies of experience. A Case Set is a defined collection of cases
          generated by a model, policy, experiment, customer cohort, time window, simulation, or imported dataset.
          A Case Set becomes scorebook-like only when it contains decisions, actions, outcomes, grades, and provenance.
        </p>
        <div className="card compoundingCaseSetPanel">
          <div className="compoundingCardHeader">
            <div>
              <p className="small">Active Case Set</p>
              <h3>{selectedCaseSet?.name ?? "All scorebook rows"}</h3>
              <p>{selectedCaseSet?.description ?? "Rows are not yet assigned to a specific CaseSet."}</p>
            </div>
            {analysis.caseSets.length > 1 ? (
              <form className="compoundingCaseSetSelector">
                <input type="hidden" name="analysisId" value={analysis.id} />
                <label>
                  Case Set
                  <select name="caseSetId" defaultValue={selectedCaseSet?.id ?? ""}>
                    {analysis.caseSets.map((caseSet) => (
                      <option key={caseSet.id} value={caseSet.id}>{caseSet.name}</option>
                    ))}
                  </select>
                </label>
                <button className="btn" type="submit">Open case set</button>
              </form>
            ) : null}
          </div>
          <div className="compoundingCaseSetFacts">
            <span><strong>Source</strong>{selectedCaseSet?.sourceSystemLabel ?? "Manual / mixed"}</span>
            <span><strong>Cases</strong>{activeRows.length} active rows{selectedCaseSet ? ` / ${selectedCaseSet.caseCount} declared` : ""}</span>
            <span><strong>Generated</strong>{displayDate(selectedCaseSet?.generatedAt ?? selectedCaseSet?.importedAt)}</span>
            <span><strong>Provenance</strong>{selectedCaseSet?.provenanceLabel ?? "No CaseSet provenance recorded"}</span>
            <span><strong>Time window</strong>{selectedCaseSet ? `${displayDate(selectedCaseSet.timeWindowStart)} -> ${displayDate(selectedCaseSet.timeWindowEnd)}` : "Unavailable"}</span>
            <span><strong>Model / policy</strong>{selectedCaseSet ? `${selectedCaseSet.modelVersion ?? "No model"} / ${selectedCaseSet.policyVersion ?? "No policy"}` : "Unavailable"}</span>
          </div>
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
        {allSynthetic ? (
          <div className="card compoundingSyntheticBanner">
            <strong>SYNTHETIC ILLUSTRATIVE DATA - NOT COMPANY DATA</strong>
            <p>
              Every current row in this CaseSet is marked synthetic. Use this fixture to test the theory,
              not to describe real company operations.
            </p>
          </div>
        ) : null}
      </Section>

      <Section title="Create CaseSet">
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
      </Section>

      <Section title="Derived scorebook evidence">
        <div className="grid grid-4">
          {metricCard("Total cases", String(metrics.totalCases), selectedCaseSet ? selectedCaseSet.name : "All rows")}
          {metricCard("Graded cases", pct(metrics.gradeCoverage), `n=${metrics.gradedCases}/${metrics.totalCases}`)}
          {metricCard("Human override rate", pct(metrics.humanOverrideRate), `n=${metrics.humanOverrideValue.count}/${metrics.totalCases}`)}
          {metricCard("Median feedback latency", metrics.medianFeedbackLatencyDays === null ? "Unavailable" : `${metrics.medianFeedbackLatencyDays} days`, `n=${metrics.feedbackLatencySampleSize}`)}
          {metricCard("Edge-case share", pct(metrics.edgeCaseShare), `n=${activeRows.filter((row) => row.isEdgeCase).length}/${metrics.totalCases}`)}
          {metricCard("Outcome completion", pct(metrics.outcomeCompletionRate), `n=${metrics.resolvedCases}/${metrics.totalCases}`)}
          {metricCard("Agent correctness", pct(metrics.agentCorrectnessRate), `n=${metrics.gradedCases} resolvable grades`)}
          {metricCard("Economic outcome", money(metrics.totalOutcomeValue), `avg ${money(metrics.averageOutcomeValue)}; n=${metrics.outcomeValueSampleSize}`)}
        </div>
      </Section>

      <Section title="Why this matters">
        <div className="card">
          <p>
            A large dataset is not necessarily expertise. We are looking for cases that reduce uncertainty about future decisions.
          </p>
        </div>
      </Section>

      <Section title="Human override value">
        <div className="card">
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
        </div>
      </Section>

      <Section title="Filters">
        <form className="grid grid-4">
          <input type="hidden" name="analysisId" value={analysis.id} />
          {selectedCaseSet ? <input type="hidden" name="caseSetId" value={selectedCaseSet.id} /> : null}
          <label>Customer segment<select name="segment" defaultValue={params.segment ?? ""}><option value="">All</option>{segments.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Case type<select name="caseType" defaultValue={params.caseType ?? ""}><option value="">All</option>{caseTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Grade<select name="grade" defaultValue={params.grade ?? ""}><option value="">All</option>{GRADES.map((grade) => <option key={grade} value={grade}>{grade.replaceAll("_", " ")}</option>)}</select></label>
          <label>Human override<select name="override" defaultValue={params.override ?? ""}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label>Edge case<select name="edge" defaultValue={params.edge ?? ""}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label>Resolution<select name="resolved" defaultValue={params.resolved ?? ""}><option value="">All</option><option value="resolved">Resolved</option><option value="unresolved">Unresolved</option></select></label>
          <label>Source status<select name="synthetic" defaultValue={params.synthetic ?? ""}><option value="">All</option><option value="synthetic">Synthetic</option><option value="non-synthetic">User / sourced</option></select></label>
          <div className="ctaRow" style={{ alignItems: "end" }}>
            <button className="btn" type="submit">Apply filters</button>
            <Link className="btn" href={`/compounding-expertise/scorebook?analysisId=${analysis.id}${selectedCaseSet ? `&caseSetId=${selectedCaseSet.id}` : ""}`}>Clear</Link>
          </div>
        </form>
      </Section>

      <Section title="Editable cases">
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
            <button className="btn primary" type="submit">Save scorebook</button>
            <Link className="btn" href={`/compounding-expertise/debates?analysisId=${analysis.id}${selectedCaseSet ? `&caseSetId=${selectedCaseSet.id}` : ""}`}>Continue to key debates</Link>
          </div>
        </form>
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
