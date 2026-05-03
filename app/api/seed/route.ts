import { reseed, reseedAcquisitionOnly, reseedAuctionOnly, reseedLifecycleOnly, reseedPricingOnly } from "@/lib/seed";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { resolveDemoResetRequest } from "@/lib/demo-reset";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function POST(request: Request) {
  const eventId = createEventId("seed");
  const body = await request.json().catch(() => ({}));
  const resolved = resolveDemoResetRequest(body);
  if (!resolved.ok) {
    logApiEvent("warn", eventId, "seed.invalid_request", { code: resolved.code });
    return apiError(400, resolved.code, resolved.message, { eventId });
  }

  if (!isDemoMutationAllowed()) {
    logApiEvent("warn", eventId, "seed.disabled", { scope: resolved.scope });
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Seed endpoint is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable.",
      { eventId }
    );
  }

  try {
    if (resolved.scope === "lifecycle") {
      await reseedLifecycleOnly();
    } else if (resolved.scope === "acquisition") {
      await reseedAcquisitionOnly();
    } else if (resolved.scope === "auction") {
      await reseedAuctionOnly();
    } else if (resolved.scope === "pricing") {
      await reseedPricingOnly();
    } else {
      await reseed();
    }

    logApiEvent("info", eventId, "seed.completed", { scope: resolved.scope });
    return apiOk({ scope: resolved.scope, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "seed.compatibility_mode", { scope: resolved.scope });
      return apiCompatibilityError("Demo database schema is not initialized.", { eventId });
    }

    logApiEvent("error", eventId, "seed.unhandled_error", { scope: resolved.scope });
    return apiUnhandledError(error, eventId);
  }
}
