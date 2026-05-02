import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validateAudienceTemplateInput } from "@/lib/acquisition";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_audience_get");
  const { id } = await params;
  try {
    const template = await db.audienceTemplate.findUnique({
      where: { id },
      include: {
        segments: {
          select: {
            id: true,
            campaignId: true,
            campaign: { select: { id: true, name: true, state: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });
    if (!template) return apiError(404, "AUDIENCE_TEMPLATE_NOT_FOUND", "Audience template not found", { eventId });
    return apiOk({ template, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Audience template table is missing.", { eventId });
    }
    logApiEvent("error", eventId, "acquisition.audiences.get.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_audience_patch");
  const { id } = await params;

  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Audience template updates are disabled in this environment.", {
      eventId
    });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = validateAudienceTemplateInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Audience template validation failed", {
      errors: parsed.errors,
      eventId
    });
  }

  try {
    const existing = await db.audienceTemplate.findUnique({ where: { id } });
    if (!existing) return apiError(404, "AUDIENCE_TEMPLATE_NOT_FOUND", "Audience template not found", { eventId });

    const updated = await db.audienceTemplate.update({ where: { id }, data: parsed.value });
    logApiEvent("info", eventId, "acquisition.audiences.update.completed", { id });
    return apiOk({ template: updated, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Audience template table is missing.", { eventId });
    }
    logApiEvent("error", eventId, "acquisition.audiences.update.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_audience_delete");
  const { id } = await params;

  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Audience template deletion is disabled in this environment.", {
      eventId
    });
  }

  try {
    const segmentsUsingTemplate = await db.audienceSegment.count({ where: { templateId: id } });
    if (segmentsUsingTemplate > 0) {
      return apiError(
        422,
        "AUDIENCE_TEMPLATE_IN_USE",
        `Cannot delete: ${segmentsUsingTemplate} campaign segment(s) reference this template.`,
        { eventId, segmentsUsingTemplate }
      );
    }

    const existing = await db.audienceTemplate.findUnique({ where: { id } });
    if (!existing) return apiError(404, "AUDIENCE_TEMPLATE_NOT_FOUND", "Audience template not found", { eventId });

    await db.audienceTemplate.delete({ where: { id } });
    logApiEvent("info", eventId, "acquisition.audiences.delete.completed", { id });
    return apiOk({ deletedId: id, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Audience template table is missing.", { eventId });
    }
    logApiEvent("error", eventId, "acquisition.audiences.delete.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
