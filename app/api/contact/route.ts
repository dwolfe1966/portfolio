import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-contract";
import { validateContactPayload } from "@/lib/contact";

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
  const now = Date.now();
  const key = getClientKey(req);
  if (isRateLimited(key, now)) {
    return apiError(429, "RATE_LIMITED", "Too many contact requests. Please try again later.");
  }

  const body = await req.json().catch(() => ({}));
  const parsed = validateContactPayload(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Contact form validation failed.", { errors: parsed.errors });
  }

  if (process.env.CONTACT_WEBHOOK_URL) {
    const response = await fetch(process.env.CONTACT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.value,
        submittedAt: new Date(now).toISOString(),
        source: "portfolio-contact-form"
      })
    }).catch(() => null);

    if (!response || !response.ok) {
      return apiError(502, "DELIVERY_FAILED", "Contact delivery failed. Please email directly.");
    }
  }

  return apiOk({ received: true });
}
