import { CASAP_PUBLIC_EVIDENCE_ANALYSIS, CASAP_PUBLIC_SIMULATION_CASESET_KEY, buildCasapPublicSimulationCases, casapPublicSimulationCaseSet, resolveBestAvailableAnalyticalCaseSet, type AnalyticalCaseSetLike, type ScorebookCaseInput } from "./compounding-expertise-lab";

/** One dataset boundary for every analytical module and server action. */
export function resolveExperienceContext<T extends AnalyticalCaseSetLike>(analysis: { companyName: string; caseSets: T[] }, rows: ScorebookCaseInput[], selection: { caseSetId?: string | null; dataset?: string | null } = {}) {
  const resolution = resolveBestAvailableAnalyticalCaseSet({
    caseSets: analysis.caseSets,
    requestedCaseSetId: selection.caseSetId,
    requestedDatasetKey: selection.dataset,
    virtualCaseSets: analysis.companyName === CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis.companyName ? [casapPublicSimulationCaseSet()] : []
  });
  // Never silently substitute another dataset for a stale or foreign selection.
  if ((selection.caseSetId || selection.dataset) && resolution.selectionMode !== "USER_SELECTED") throw new Error("Selected Experience dataset is unavailable for this analysis. Choose a dataset in Experience.");
  const selected = resolution.selected;
  const selectedCaseSet = analysis.caseSets.find(item => item.id === selected.caseSetId) ?? null;
  const activeRows = selected.kind === "NONE" ? [] : selected.isVirtual && selected.datasetKey === CASAP_PUBLIC_SIMULATION_CASESET_KEY
    ? buildCasapPublicSimulationCases().map(row => ({ ...row, caseSetId: CASAP_PUBLIC_SIMULATION_CASESET_KEY }))
    : rows.filter(row => row.caseSetId === selected.caseSetId);
  const query = new URLSearchParams(selected.caseSetId ? { caseSetId: selected.caseSetId } : { dataset: selected.datasetKey });
  return { resolution, selected, selectedCaseSet, activeRows, dataset: selected.caseSetId ? undefined : selected.datasetKey, datasetSuffix: `&${query}` };
}
