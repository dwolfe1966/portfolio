export type LifecycleAgentRoleKey =
  | "event_watcher"
  | "identity_consent_resolver"
  | "opportunity_scorer"
  | "message_strategist"
  | "approval_coordinator"
  | "delivery_operator"
  | "outcome_observer"
  | "revenue_attributor";

export type LifecycleAgentAutomationMode = "observe" | "recommend" | "human_approved" | "agent_managed";

export type LifecycleAgentRole = {
  key: LifecycleAgentRoleKey;
  name: string;
  queueName: string;
  automationMode: LifecycleAgentAutomationMode;
  ownsRunbookSteps: string[];
  triggerEvents: string[];
  produces: string[];
  requiresApproval: boolean;
  summary: string;
};

export const LIFECYCLE_AGENT_ROLES: LifecycleAgentRole[] = [
  {
    key: "event_watcher",
    name: "Event watcher",
    queueName: "lifecycle:ingestion",
    automationMode: "observe",
    ownsRunbookSteps: ["detect_event"],
    triggerEvents: ["source.ingested", "webhook.received", "connector.sync_completed"],
    produces: ["normalized change event", "source provenance", "event idempotency key"],
    requiresApproval: false,
    summary: "Watches connected sources for new entity, account, product, billing, or behavioral changes that may trigger lifecycle action."
  },
  {
    key: "identity_consent_resolver",
    name: "Identity and consent resolver",
    queueName: "lifecycle:audit",
    automationMode: "observe",
    ownsRunbookSteps: ["resolve_identity_consent"],
    triggerEvents: ["source.ingested", "consent.checked"],
    produces: ["canonical recipient", "channel eligibility", "suppression decision", "dedupe decision"],
    requiresApproval: false,
    summary: "Resolves whether the event belongs to a reachable person or account and fails closed on consent, suppression, geography, dedupe, or holdout gaps."
  },
  {
    key: "opportunity_scorer",
    name: "Opportunity scorer",
    queueName: "lifecycle:scoring",
    automationMode: "recommend",
    ownsRunbookSteps: ["score_opportunity"],
    triggerEvents: ["identity.resolved", "consent.checked"],
    produces: ["priority score", "score breakdown", "recommended action class"],
    requiresApproval: false,
    summary: "Ranks eligible lifecycle moments by commercial value, evidence quality, event freshness, and action readiness."
  },
  {
    key: "message_strategist",
    name: "Message strategist",
    queueName: "lifecycle:generation",
    automationMode: "recommend",
    ownsRunbookSteps: ["draft_message"],
    triggerEvents: ["candidate.scored"],
    produces: ["message draft", "offer framing", "rationale", "source evidence"],
    requiresApproval: false,
    summary: "Turns a qualified lifecycle moment into message copy, offer framing, and explainable source evidence."
  },
  {
    key: "approval_coordinator",
    name: "Approval coordinator",
    queueName: "lifecycle:audit",
    automationMode: "human_approved",
    ownsRunbookSteps: ["request_approval"],
    triggerEvents: ["message.generated", "policy.approval_required"],
    produces: ["approval request", "approval expiry", "approver role requirement"],
    requiresApproval: false,
    summary: "Routes high-risk or customer-facing actions to human approval and blocks execution until a durable decision exists."
  },
  {
    key: "delivery_operator",
    name: "Delivery operator",
    queueName: "lifecycle:provider_write",
    automationMode: "human_approved",
    ownsRunbookSteps: ["trigger_delivery"],
    triggerEvents: ["approval.completed", "policy.auto_send_allowed"],
    produces: ["provider send request", "delivery id", "send audit event"],
    requiresApproval: true,
    summary: "Executes approved or policy-allowed sends through ESP, SMTP, journey, or profile-write connectors with idempotency."
  },
  {
    key: "outcome_observer",
    name: "Outcome observer",
    queueName: "lifecycle:observation",
    automationMode: "observe",
    ownsRunbookSteps: ["observe_result"],
    triggerEvents: ["delivery.sent", "delivery.event_received", "conversion.event_received"],
    produces: ["delivery status", "engagement events", "conversion events", "suppression feedback"],
    requiresApproval: false,
    summary: "Observes delivery, engagement, conversion, unsubscribe, complaint, and revenue signals after execution."
  },
  {
    key: "revenue_attributor",
    name: "Revenue attributor",
    queueName: "lifecycle:measurement",
    automationMode: "observe",
    ownsRunbookSteps: ["update_audit"],
    triggerEvents: ["outcome.observed", "revenue.event_received"],
    produces: ["attribution record", "holdout comparison", "performance evidence"],
    requiresApproval: false,
    summary: "Connects observed outcomes to holdouts, attribution windows, and performance reporting for revenue proof."
  }
];

export function getLifecycleAgentRoleForRunbookStep(stepKey: string): LifecycleAgentRole | null {
  return LIFECYCLE_AGENT_ROLES.find((role) => role.ownsRunbookSteps.includes(stepKey)) ?? null;
}

export function lifecycleAgentRolesByAutomationMode(mode: LifecycleAgentAutomationMode): LifecycleAgentRole[] {
  return LIFECYCLE_AGENT_ROLES.filter((role) => role.automationMode === mode);
}

export function lifecycleAgentRoleReadiness(input: {
  connectedSources: boolean;
  identityPolicyReady: boolean;
  scoringPolicyReady: boolean;
  generationReady: boolean;
  approvalQueueReady: boolean;
  deliveryConnectorReady: boolean;
  observationReady: boolean;
  measurementReady: boolean;
}): Record<LifecycleAgentRoleKey, "ready" | "blocked"> {
  return {
    event_watcher: input.connectedSources ? "ready" : "blocked",
    identity_consent_resolver: input.connectedSources && input.identityPolicyReady ? "ready" : "blocked",
    opportunity_scorer: input.identityPolicyReady && input.scoringPolicyReady ? "ready" : "blocked",
    message_strategist: input.scoringPolicyReady && input.generationReady ? "ready" : "blocked",
    approval_coordinator: input.approvalQueueReady ? "ready" : "blocked",
    delivery_operator: input.approvalQueueReady && input.deliveryConnectorReady ? "ready" : "blocked",
    outcome_observer: input.deliveryConnectorReady && input.observationReady ? "ready" : "blocked",
    revenue_attributor: input.observationReady && input.measurementReady ? "ready" : "blocked"
  };
}
