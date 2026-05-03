import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

const TRENDS = new Set(["accelerating", "steady", "softening"]);

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("expansion_account_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Expansion account editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const trend = typeof body.trend === "string" && TRENDS.has(body.trend) ? body.trend : "steady";

  try {
    const account = await db.expansionAccount.update({
      where: { id },
      data: {
        name: String(body.name ?? "").trim().slice(0, 100),
        segment: String(body.segment ?? "").trim().slice(0, 60),
        currentArrCents: Math.max(0, Math.round(num(body.currentArrCents))),
        seatsPurchased: Math.max(1, Math.round(num(body.seatsPurchased, 1))),
        seatsActive: Math.max(0, Math.round(num(body.seatsActive))),
        usageGrowthRate: clamp(num(body.usageGrowthRate), -1, 1),
        productQualifiedScore: clamp(num(body.productQualifiedScore), 0, 1),
        supportHealthScore: clamp(num(body.supportHealthScore), 0, 1),
        renewalDays: Math.max(0, Math.round(num(body.renewalDays))),
        executiveSponsor: Boolean(body.executiveSponsor),
        openExpansionSignals: Math.max(0, Math.round(num(body.openExpansionSignals))),
        trend
      }
    });
    await db.expansionAuditLog.create({
      data: {
        actor: "demo-operator",
        action: "account_updated",
        detail: `Updated expansion account ${account.name}.`,
        metadata: { eventId, accountId: account.id }
      }
    });
    return apiOk({ account, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Expansion tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
