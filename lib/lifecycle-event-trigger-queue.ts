import { persistAgentExecutionPlan } from "@/lib/agent-execution-plan";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildLifecycleChangeEventTriggerPlan } from "@/lib/lifecycle-event-trigger-plan";

export type LifecycleTriggerQueueEvent = {
  id: string;
  entityId: string;
  entityName?: string | null;
  changeType: string;
  detectedAt: Date;
};

export type PersistLifecycleTriggerQueueInput = {
  workspaceId: string;
  accountUserId?: string | null;
  events: LifecycleTriggerQueueEvent[];
  minPriorityScore: number;
  recencyScore: number;
  agentFanout?: number;
};

export type PersistLifecycleTriggerQueueResult = {
  queuedAgentJobs: number;
  queuedAgentApprovals: number;
  agentQueueSkipped: boolean;
};

function normalizeFanout(value: number | null | undefined) {
  return Math.max(1, Math.min(10, Math.round(Number(value ?? 3))));
}

export async function persistLifecycleTriggerQueue(
  input: PersistLifecycleTriggerQueueInput
): Promise<PersistLifecycleTriggerQueueResult> {
  const agentFanout = normalizeFanout(input.agentFanout);
  let queuedAgentJobs = 0;
  let queuedAgentApprovals = 0;

  for (const event of input.events) {
    const edges = await db.interestEdge.findMany({
      where: { entityId: event.entityId },
      include: { user: true },
      orderBy: { interestScore: "desc" },
      take: agentFanout
    });

    for (const edge of edges) {
      const triggerPlan = buildLifecycleChangeEventTriggerPlan({
        workspaceId: input.workspaceId,
        accountUserId: input.accountUserId,
        eventId: event.id,
        entityId: event.entityId,
        entityName: event.entityName,
        changeType: event.changeType,
        detectedAt: event.detectedAt,
        user: {
          id: edge.user.id,
          email: edge.user.email,
          segment: edge.user.segment
        },
        interestScore: Number(edge.interestScore),
        relationshipResolved: true,
        minPriorityScore: input.minPriorityScore,
        recencyScore: input.recencyScore,
        holdoutAssigned: true,
        holdoutTreatment: "treatment",
        deliveryHealthy: true
      });

      if (triggerPlan.executionPlan.jobs.length === 0 && triggerPlan.executionPlan.approvals.length === 0) continue;

      try {
        const persistedPlan = await persistAgentExecutionPlan(triggerPlan.executionPlan);
        queuedAgentJobs += persistedPlan.jobsCreated;
        queuedAgentApprovals += persistedPlan.approvalsCreated;
      } catch (error) {
        if (!isMissingDemoTableError(error)) throw error;
        return { queuedAgentJobs, queuedAgentApprovals, agentQueueSkipped: true };
      }
    }
  }

  return { queuedAgentJobs, queuedAgentApprovals, agentQueueSkipped: false };
}
