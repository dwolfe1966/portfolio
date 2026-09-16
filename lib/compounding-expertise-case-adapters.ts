import {
  sourceRouteIsSafe,
  type CaseSetInput,
  type CaseSetSourceType,
  type CompoundingCaseGrade,
  type ScorebookCaseInput
} from "@/lib/compounding-expertise-lab";

export type CECaseSetRunSummary = {
  id: string;
  label: string;
  type?: string | null;
  sourceRoute?: string | null;
  createdAt?: Date | string | null;
};

export type NormalizedCECase = {
  externalCaseId: string;
  customerSegment: string;
  caseType: string;
  context: string;
  agentDecision: string;
  agentConfidence?: number | null;
  humanDecision?: string | null;
  humanOverride?: boolean | null;
  actionTaken?: string | null;
  outcome?: string | null;
  outcomeValue?: number | null;
  grade?: CompoundingCaseGrade | null;
  gradeConfidence?: number | null;
  decisionAt?: Date | string | null;
  outcomeAt?: Date | string | null;
  isEdgeCase?: boolean | null;
  sourceRecordId?: string | null;
  sourceRecordRoute?: string | null;
  notes?: string | null;
};

export type CECaseSetAdapter = {
  sourceSystemKey: string;
  sourceSystemLabel: string;
  listAvailableRuns: () => Promise<CECaseSetRunSummary[]>;
  describeRun: (runId: string) => Promise<CECaseSetRunSummary | null>;
  buildCaseSet: (runId: string) => Promise<{ caseSet: CaseSetInput; cases: NormalizedCECase[] } | null>;
};

export function normalizeCECase(input: NormalizedCECase, sourceLabel: string): ScorebookCaseInput {
  return {
    externalCaseId: input.externalCaseId,
    customerSegment: input.customerSegment || "Unknown",
    caseType: input.caseType || "Unknown",
    context: input.context,
    agentDecision: input.agentDecision,
    agentConfidence: input.agentConfidence ?? null,
    humanDecision: input.humanDecision ?? null,
    humanOverride: Boolean(input.humanOverride),
    actionTaken: input.actionTaken ?? null,
    outcome: input.outcome ?? null,
    outcomeValue: input.outcomeValue ?? null,
    grade: input.grade ?? "UNRESOLVED",
    gradeConfidence: input.gradeConfidence ?? null,
    decisionAt: input.decisionAt ?? null,
    outcomeAt: input.outcomeAt ?? null,
    isEdgeCase: Boolean(input.isEdgeCase),
    isSynthetic: false,
    sourceLabel,
    notes: input.notes ?? null
  };
}

export function buildPricingCaseSetDescriptor(input: {
  runId: string;
  runLabel: string;
  runType?: string | null;
  caseCount: number;
  generatedAt?: Date | string | null;
  modelVersion?: string | null;
  policyVersion?: string | null;
  experimentId?: string | null;
}): CaseSetInput {
  const sourceRoute = `/pricing/outputs?returnTo=compounding-expertise&sourceRunId=${encodeURIComponent(input.runId)}`;
  return {
    name: input.runLabel,
    description: "CE-compatible CaseSet descriptor for a Pricing source-system run. A future adapter will normalize run records into decision/outcome/grade rows.",
    sourceType: "DAVIDWOLFE_APP" satisfies CaseSetSourceType,
    sourceSystemKey: "pricing",
    sourceSystemLabel: "Pricing",
    sourceRunId: input.runId,
    sourceRunLabel: input.runLabel,
    sourceRunType: input.runType ?? "simulation_run",
    sourceRoute: sourceRouteIsSafe(sourceRoute) ? sourceRoute : "/pricing/outputs",
    generatedAt: input.generatedAt ?? null,
    modelVersion: input.modelVersion ?? null,
    policyVersion: input.policyVersion ?? null,
    experimentId: input.experimentId ?? null,
    isSynthetic: false,
    provenanceLabel: "DAVIDWOLFE.APP PRICING SOURCE SYSTEM - generated run descriptor",
    caseCount: input.caseCount,
    derivationDescription: "Pricing run exported through the CE adapter boundary."
  };
}

export const PRICING_CE_CASE_SET_ADAPTER: CECaseSetAdapter = {
  sourceSystemKey: "pricing",
  sourceSystemLabel: "Pricing",
  async listAvailableRuns() {
    return [];
  },
  async describeRun() {
    return null;
  },
  async buildCaseSet() {
    return null;
  }
};

export const CE_CASE_SET_ADAPTERS = [PRICING_CE_CASE_SET_ADAPTER];
