import { buildAgentExecutionPlan, type AgentExecutionPlan } from "@/lib/agent-execution-plan";
import {
  getLifecycleAgentRoleForRunbookStep,
  type LifecycleAgentRole
} from "@/lib/lifecycle-agent-roles";
import { evaluateLifecycleIdentityConsent, type LifecycleIdentityConsentDecision } from "@/lib/lifecycle-identity";
import { buildLifecycleAgentRunbook, type LifecycleAgentRunbook } from "@/lib/lifecycle-runbook";
import { calculatePriorityBreakdown, type ChangeType, type Segment } from "@/lib/scoring";

const SEGMENTS: Segment[] = ["FREE", "TRIAL", "LAPSED", "ACTIVE"];
const CHANGE_TYPES: ChangeType[] = [
  "ADDRESS_CHANGE",
  "PHONE_ADDED",
  "PHONE_CHANGED",
  "EMAIL_ADDED",
  "ASSOCIATE_ADDED",
  "EMPLOYEE_RECORD_ADDED",
  "LEGAL_RECORD_ADDED",
  "OTHER_RECORD_ADDED"
];

export type LifecycleChangeEventTriggerInput = {
  workspaceId: string;
  accountUserId?: string | null;
  eventId: string;
  entityId?: string | null;
  entityName?: string | null;
  changeType: string;
  detectedAt: string | Date;
  user: {
    id?: string | null;
    externalUserId?: string | null;
    email?: string | null;
    segment?: string | null;
    geography?: string | null;
  };
  interestScore: number;
  relationshipResolved?: boolean | null;
  minPriorityScore: number;
  recencyScore?: number | null;
  maxEventAgeHours?: number;
  allowedGeographies?: string[];
  customerOptedOut?: boolean | null;
  providerSuppressed?: boolean | null;
  localSuppressed?: boolean | null;
  duplicateWithinWindow?: boolean | null;
  holdoutAssigned?: boolean | null;
  holdoutTreatment?: "treatment" | "control" | null;
  messageDrafted?: boolean | null;
  approvalRequired?: boolean | null;
  approvalCompleted?: boolean | null;
  deliveryHealthy?: boolean | null;
  deliveryTriggered?: boolean | null;
  resultObserved?: boolean | null;
  revenueAttributed?: boolean | null;
  now?: Date;
};

export type LifecycleChangeEventTriggerPlan = {
  identityDecision: LifecycleIdentityConsentDecision;
  runbook: LifecycleAgentRunbook;
  executionPlan: AgentExecutionPlan;
  currentRole: LifecycleAgentRole | null;
  priorityBreakdown: ReturnType<typeof calculatePriorityBreakdown>;
};

function normalizeSegment(value: string | null | undefined): Segment {
  const normalized = String(value ?? "FREE").trim().toUpperCase() as Segment;
  return SEGMENTS.includes(normalized) ? normalized : "FREE";
}

function normalizeChangeType(value: string): ChangeType {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_") as ChangeType;
  return CHANGE_TYPES.includes(normalized) ? normalized : "OTHER_RECORD_ADDED";
}

function clamp01(value: number | null | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

export function buildLifecycleChangeEventTriggerPlan(
  input: LifecycleChangeEventTriggerInput
): LifecycleChangeEventTriggerPlan {
  const now = input.now ?? new Date();
  const changeType = normalizeChangeType(input.changeType);
  const segment = normalizeSegment(input.user.segment);
  const priorityBreakdown = calculatePriorityBreakdown({
    interestScore: clamp01(input.interestScore, 0),
    segment,
    changeType,
    recencyScore: clamp01(input.recencyScore, 1)
  });
  const identityDecision = evaluateLifecycleIdentityConsent(
    {
      userId: input.user.id,
      externalUserId: input.user.externalUserId,
      email: input.user.email,
      channel: "email",
      channelEligible: true,
      allowedGeographies: input.allowedGeographies,
      userGeography: input.user.geography,
      customerOptedOut: input.customerOptedOut,
      providerSuppressed: input.providerSuppressed,
      localSuppressed: input.localSuppressed,
      relationshipResolved: input.relationshipResolved,
      eventDetectedAt: input.detectedAt,
      maxEventAgeHours: input.maxEventAgeHours ?? 24,
      duplicateWithinWindow: input.duplicateWithinWindow,
      holdoutAssigned: input.holdoutAssigned,
      holdoutTreatment: input.holdoutTreatment
    },
    now
  );
  const runbook = buildLifecycleAgentRunbook({
    eventDetected: true,
    identityDecision,
    opportunityScored: identityDecision.allowed,
    priorityScore: priorityBreakdown.totalScore,
    minPriorityScore: input.minPriorityScore,
    messageDrafted: input.messageDrafted === true,
    approvalRequired: input.approvalRequired,
    approvalCompleted: input.approvalCompleted,
    deliveryHealthy: input.deliveryHealthy,
    deliveryTriggered: input.deliveryTriggered,
    resultObserved: input.resultObserved,
    revenueAttributed: input.revenueAttributed
  });
  const currentRole = getLifecycleAgentRoleForRunbookStep(runbook.currentStep);
  const recipientKey = identityDecision.canonicalIdentityKey ?? identityDecision.channelAddress ?? "unknown_recipient";
  const runbookId = `lifecycle-event:${input.eventId}:${recipientKey}`;
  const executionPlan = buildAgentExecutionPlan({
    workspaceId: input.workspaceId,
    accountUserId: input.accountUserId,
    app: "lifecycle",
    runbookId,
    currentStep: runbook.currentStep,
    steps: runbook.steps,
    payload: {
      eventId: input.eventId,
      entityId: input.entityId ?? null,
      entityName: input.entityName ?? null,
      changeType,
      detectedAt: input.detectedAt instanceof Date ? input.detectedAt.toISOString() : input.detectedAt,
      userId: input.user.id ?? null,
      recipientEmail: identityDecision.channelAddress,
      priorityBreakdown,
      currentRoleKey: currentRole?.key ?? null
    },
    now
  });

  return { identityDecision, runbook, executionPlan, currentRole, priorityBreakdown };
}
