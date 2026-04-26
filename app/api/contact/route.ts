import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-contract";
import { validateContactPayload } from "@/lib/contact";
import { createEventId, logApiEvent } from "@/lib/logging";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map<string, number[]>();

function getClientKey(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "anonymous";
}

function isRateLimited(key: string, now: number) {
  const existing = rateLimitStore.get(key) ?? [];
  const active = existing.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  active.push(now);
  rateLimitStore.set(key, active);
  return active.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("contact");
  const now = Date.now();
  const key = getClientKey(req);

  logApiEvent("info", eventId, "contact.request.received", { key });

  if (isRateLimited(key, now)) {
    logApiEvent("warn", eventId, "contact.request.rate_limited", { key });
    return apiError(429, "RATE_LIMITED", "Too many contact requests. Please try again later.", { eventId });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = validateContactPayload(body);
  if (!parsed.ok) {
    logApiEvent("warn", eventId, "contact.request.invalid", { key, errors: parsed.errors });
    return apiError(400, "INVALID_INPUT", "Contact form validation failed.", { errors: parsed.errors, eventId });
  }

  if (process.env.CONTACT_WEBHOOK_URL) {
    const response = await fetch(process.env.CONTACT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.value,
        submittedAt: new Date(now).toISOString(),
        source: "portfolio-contact-form",
        eventId
      })
    }).catch(() => null);

    if (!response || !response.ok) {
      logApiEvent("error", eventId, "contact.request.delivery_failed", { key, status: response?.status ?? null });
      return apiError(502, "DELIVERY_FAILED", "Contact delivery failed. Please email directly.", { eventId });
    }
  }

  logApiEvent("info", eventId, "contact.request.accepted", { key });
  return apiOk({ received: true, eventId });
}
