import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validateAudienceTemplateInput } from "@/lib/acquisition";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("acq_audiences_get");
  try {
    const templates = await db.audienceTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { segments: true } } }
    });
    logApiEvent("info", eventId, "acquisition.audiences.list.completed", { count: templates.length });
    return apiOk({ templates, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "acquisition.audiences.list.compatibility_mode");
      return apiOk({ compatibilityMode: true, templates: [], eventId });
    }
    logApiEvent("error", eventId, "acquisition.audiences.list.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("acq_audiences_post");

  if (!isDemoMutationAllowed()) {
    logApiEvent("warn", eventId, "acquisition.audiences.create.disabled");
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Audience template creation is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable.",
      { eventId }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = validateAudienceTemplateInput(body);

  if (!parsed.ok) {
    logApiEvent("warn", eventId, "acquisition.audiences.create.invalid", { errors: parsed.errors });
    return apiError(400, "INVALID_INPUT", "Audience template validation failed", {
      errors: parsed.errors,
      eventId
    });
  }

  try {
    const created = await db.audienceTemplate.create({ data: parsed.value });
    logApiEvent("info", eventId, "acquisition.audiences.create.completed", { id: created.id });
    return apiOk({ template: created, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "acquisition.audiences.create.compatibility_mode");
      return apiCompatibilityError("Audience template table is missing.", { eventId });
    }
    logApiEvent("error", eventId, "acquisition.audiences.create.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
