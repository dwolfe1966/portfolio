import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { simulateExpansionPortfolio, type ExpansionMotion, type ExpansionSignalTrend } from "@/lib/expansion-engine";

export async function POST() {
  const eventId = createEventId("expansion_run");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Expansion simulations are disabled.", { eventId });

  try {
    const [accounts, offers, policy] = await Promise.all([
      db.expansionAccount.findMany({ orderBy: [{ currentArrCents: "desc" }] }),
      db.expansionOffer.findMany({ orderBy: { createdAt: "asc" } }),
      db.expansionPolicy.findFirst({ orderBy: { createdAt: "desc" } })
    ]);
    if (!policy || accounts.length === 0 || offers.length === 0) {
      return apiError(400, "INCOMPLETE_EXPANSION_DEMO", "Expansion demo needs accounts, offers, and a policy.", { eventId });
    }

    const simulation = simulateExpansionPortfolio(
      accounts.map((account) => ({ ...account, trend: account.trend as ExpansionSignalTrend })),
      offers.map((offer) => ({ ...offer, motion: offer.motion as ExpansionMotion })),
      policy
    );

    const run = await db.$transaction(async (tx) => {
      const created = await tx.expansionRun.create({
        data: {
          policyId: policy.id,
          averageReadinessScore: simulation.averageReadinessScore,
          highReadinessAccounts: simulation.highReadinessAccounts,
          pipelineArrCents: simulation.pipelineArrCents,
          expectedExpansionArrCents: simulation.expectedExpansionArrCents,
          averageMarginPercent: simulation.averageMarginPercent,
          paybackRatio: simulation.paybackRatio,
          recommendation: simulation.recommendation
        }
      });
      await tx.expansionRunRow.createMany({
        data: simulation.rows.map((row) => ({
          runId: created.id,
          accountId: row.accountId,
          offerId: row.offerId,
          readinessScore: row.readinessScore,
          readinessBand: row.readinessBand,
          primaryMotion: row.primaryMotion,
          expectedExpansionArrCents: row.expectedExpansionArrCents,
          pursuitCostCents: row.pursuitCostCents,
          paybackRatio: row.paybackRatio,
          marginPercent: row.marginPercent,
          slaDays: row.slaDays,
          decision: row.decision
        }))
      });
      await tx.expansionAuditLog.create({
        data: {
          runId: created.id,
          actor: "demo-operator",
          action: "expansion_run",
          detail: `Expansion portfolio scored with recommendation ${simulation.recommendation}.`,
          metadata: { eventId, highReadinessAccounts: simulation.highReadinessAccounts, paybackRatio: simulation.paybackRatio }
        }
      });
      return created;
    });

    return apiOk({ run, simulation, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Expansion tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
