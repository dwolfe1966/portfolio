import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import {
  simulateRetentionPortfolio,
  type RetentionHealthTrend,
  type RetentionRiskDriver
} from "@/lib/retention-engine";

export async function POST() {
  const eventId = createEventId("retention_run");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Retention simulations are disabled.", { eventId });

  try {
    const [accounts, playbooks, policy] = await Promise.all([
      db.retentionAccount.findMany({ orderBy: [{ renewalDays: "asc" }, { mrrCents: "desc" }] }),
      db.retentionPlaybook.findMany({ orderBy: { createdAt: "asc" } }),
      db.retentionPolicy.findFirst({ orderBy: { createdAt: "desc" } })
    ]);
    if (!policy || accounts.length === 0 || playbooks.length === 0) {
      return apiError(400, "INCOMPLETE_RETENTION_DEMO", "Retention demo needs accounts, playbooks, and a policy.", { eventId });
    }

    const simulation = simulateRetentionPortfolio(
      accounts.map((account) => ({
        ...account,
        healthTrend: account.healthTrend as RetentionHealthTrend
      })),
      playbooks.map((playbook) => ({
        ...playbook,
        riskDriver: playbook.riskDriver as RetentionRiskDriver
      })),
      policy
    );

    const run = await db.$transaction(async (tx) => {
      const created = await tx.retentionRiskRun.create({
        data: {
          policyId: policy.id,
          averageRiskScore: simulation.averageRiskScore,
          highRiskAccounts: simulation.highRiskAccounts,
          preventableChurnCents: simulation.preventableChurnCents,
          expectedSavedRevenueCents: simulation.expectedSavedRevenueCents,
          saveRate: simulation.saveRate,
          paybackRatio: simulation.paybackRatio,
          recommendation: simulation.recommendation
        }
      });
      await tx.retentionRiskRunRow.createMany({
        data: simulation.rows.map((row) => ({
          runId: created.id,
          accountId: row.accountId,
          playbookId: row.playbookId,
          riskScore: row.riskScore,
          riskBand: row.riskBand,
          primaryDriver: row.primaryDriver,
          expectedSavedRevenueCents: row.expectedSavedRevenueCents,
          interventionCostCents: row.interventionCostCents,
          paybackRatio: row.paybackRatio,
          slaHours: row.slaHours
        }))
      });
      await tx.retentionAuditLog.create({
        data: {
          runId: created.id,
          actor: "demo-operator",
          action: "risk_run",
          detail: `Retention portfolio scored with recommendation ${simulation.recommendation}.`,
          metadata: { eventId, highRiskAccounts: simulation.highRiskAccounts, saveRate: simulation.saveRate }
        }
      });
      return created;
    });
    return apiOk({ run, simulation, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Retention tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
