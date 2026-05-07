import type { LifecycleIdentityConsentDecision } from "@/lib/lifecycle-identity";

export type LifecycleAgentRunbookStepKey =
  | "detect_event"
  | "resolve_identity_consent"
  | "score_opportunity"
  | "draft_message"
  | "request_approval"
  | "trigger_delivery"
  | "observe_result"
  | "update_audit";

export type LifecycleAgentRunbookStepStatus =
  | "ready"
  | "blocked"
  | "approval_required"
  | "waiting"
  | "completed"
  | "suppressed";

export type LifecycleAgentRunbookStep = {
  key: LifecycleAgentRunbookStepKey;
  status: LifecycleAgentRunbookStepStatus;
  auditEvent: string;
  summary: string;
  reasons: string[];
};

export type LifecycleAgentRunbookInput = {
  eventDetected: boolean;
  identityDecision?: LifecycleIdentityConsentDecision | null;
  opportunityScored: boolean;
  priorityScore?: number | null;
  minPriorityScore: number;
  messageDrafted: boolean;
  approvalRequired?: boolean | null;
  approvalCompleted?: boolean | null;
  deliveryTriggered?: boolean | null;
  deliveryHealthy?: boolean | null;
  resultObserved?: boolean | null;
  revenueAttributed?: boolean | null;
};

export type LifecycleAgentRunbook = {
  currentStep: LifecycleAgentRunbookStepKey;
  readyToDeliver: boolean;
  suppressed: boolean;
  steps: LifecycleAgentRunbookStep[];
};

function numeric(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) ? Number(value) : null;
}

export function buildLifecycleAgentRunbook(input: LifecycleAgentRunbookInput): LifecycleAgentRunbook {
  const identityDecision = input.identityDecision ?? null;
  const identityChecked = Boolean(identityDecision);
  const suppressed = Boolean(identityDecision && identityDecision.outcome !== "eligible");
  const score = numeric(input.priorityScore);
  const scorePasses = score !== null && score >= input.minPriorityScore;
  const approvalRequired = Boolean(input.approvalRequired);
  const approvalComplete = !approvalRequired || input.approvalCompleted === true;
  const deliveryHealthy = input.deliveryHealthy === true;
  const readyToDeliver = Boolean(
    input.eventDetected &&
    identityDecision?.allowed &&
    input.opportunityScored &&
    scorePasses &&
    input.messageDrafted &&
    approvalComplete &&
    deliveryHealthy
  );

  const steps: LifecycleAgentRunbookStep[] = [
    {
      key: "detect_event",
      status: input.eventDetected ? "completed" : "ready",
      auditEvent: "source.ingested",
      summary: "Detect or ingest a lifecycle event from a source connector.",
      reasons: []
    },
    {
      key: "resolve_identity_consent",
      status: input.eventDetected ? identityChecked ? identityDecision?.allowed ? "completed" : "suppressed" : "ready" : "blocked",
      auditEvent: identityDecision?.auditEvents.includes("delivery.suppressed") ? "delivery.suppressed" : "consent.checked",
      summary: "Resolve canonical identity, channel address, consent, suppression, dedupe, event freshness, and holdout state.",
      reasons: input.eventDetected ? identityDecision?.reasons ?? [] : ["Lifecycle event must be detected before identity resolution."]
    },
    {
      key: "score_opportunity",
      status: identityDecision?.allowed ? input.opportunityScored ? scorePasses ? "completed" : "blocked" : "ready" : "blocked",
      auditEvent: "candidate.scored",
      summary: "Score the opportunity using current lifecycle policy and threshold.",
      reasons: identityDecision?.allowed ? scorePasses || !input.opportunityScored ? [] : [`Priority score is below minimum ${input.minPriorityScore}.`] : ["Identity and consent must pass before scoring."]
    },
    {
      key: "draft_message",
      status: scorePasses ? input.messageDrafted ? "completed" : "ready" : "blocked",
      auditEvent: "message.generated",
      summary: "Draft message copy and rationale with source evidence.",
      reasons: scorePasses ? [] : ["Opportunity must meet score threshold before drafting."]
    },
    {
      key: "request_approval",
      status: approvalRequired ? input.approvalCompleted ? "completed" : "approval_required" : input.messageDrafted ? "completed" : "blocked",
      auditEvent: approvalRequired ? "approval.requested" : "approval.completed",
      summary: "Request human approval when policy requires it before delivery.",
      reasons: approvalRequired && !input.approvalCompleted ? ["Approval is required before delivery."] : []
    },
    {
      key: "trigger_delivery",
      status: readyToDeliver ? input.deliveryTriggered ? "completed" : "ready" : "blocked",
      auditEvent: input.deliveryTriggered ? "delivery.sent" : "delivery.test_sent",
      summary: "Trigger send or journey through the approved delivery connector with idempotency.",
      reasons: readyToDeliver ? [] : ["Event, consent, score, draft, approval, and connector health must pass before delivery."]
    },
    {
      key: "observe_result",
      status: input.deliveryTriggered ? input.resultObserved ? "completed" : "waiting" : "blocked",
      auditEvent: "outcome.observed",
      summary: "Observe delivery, engagement, conversion, unsubscribe, complaint, and revenue events.",
      reasons: input.deliveryTriggered ? [] : ["Delivery must be triggered before results can be observed."]
    },
    {
      key: "update_audit",
      status: input.resultObserved ? input.revenueAttributed ? "completed" : "ready" : "blocked",
      auditEvent: "revenue.attributed",
      summary: "Attribute revenue and update customer-visible audit/performance reporting.",
      reasons: input.resultObserved ? [] : ["Observed outcomes are required before revenue attribution."]
    }
  ];

  return {
    currentStep: steps.find((step) => ["ready", "approval_required", "waiting", "suppressed", "blocked"].includes(step.status))?.key ?? "update_audit",
    readyToDeliver,
    suppressed,
    steps
  };
}
