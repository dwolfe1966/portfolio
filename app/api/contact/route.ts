import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-contract";
import { validateContactPayload } from "@/lib/contact";
import { createEventId, logApiEvent } from "@/lib/logging";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const DEFAULT_CONTACT_TO_EMAIL = "dwolfe66@gmail.com";
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

function contactToEmail() {
  return process.env.CONTACT_TO_EMAIL?.trim() || DEFAULT_CONTACT_TO_EMAIL;
}

function contactFromEmail() {
  return process.env.CONTACT_FROM_EMAIL?.trim() || "Portfolio Contact <onboarding@resend.dev>";
}

function hasContactDelivery() {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.CONTACT_WEBHOOK_URL?.trim());
}

function contactSubject(topic: string, name: string) {
  const safeTopic = topic || "General";
  return `Portfolio contact: ${safeTopic} from ${name}`;
}

function contactTextBody(input: {
  name: string;
  email: string;
  company?: string;
  topic?: string;
  message: string;
  submittedAt: string;
  eventId: string;
}) {
  return [
    "New portfolio contact form submission",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Company: ${input.company || "Not provided"}`,
    `Topic: ${input.topic || "General"}`,
    `Submitted: ${input.submittedAt}`,
    `Event ID: ${input.eventId}`,
    "",
    "Message:",
    input.message
  ].join("\n");
}

async function deliverContactEmail(input: {
  name: string;
  email: string;
  company?: string;
  topic?: string;
  message: string;
  submittedAt: string;
  eventId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { skipped: true, status: null };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: contactFromEmail(),
      to: contactToEmail(),
      reply_to: input.email,
      subject: contactSubject(input.topic || "General", input.name),
      text: contactTextBody(input)
    })
  }).catch(() => null);

  return { skipped: false, status: response?.status ?? null, ok: Boolean(response?.ok) };
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

  if (!hasContactDelivery() && process.env.NODE_ENV === "production") {
    logApiEvent("error", eventId, "contact.request.delivery_not_configured", { key });
    return apiError(503, "DELIVERY_NOT_CONFIGURED", `Contact delivery is not configured. Please email ${DEFAULT_CONTACT_TO_EMAIL} directly.`, { eventId });
  }

  const submittedAt = new Date(now).toISOString();
  const emailDelivery = await deliverContactEmail({ ...parsed.value, submittedAt, eventId });
  if (!emailDelivery.skipped && !emailDelivery.ok) {
    logApiEvent("error", eventId, "contact.request.email_delivery_failed", { key, status: emailDelivery.status });
    return apiError(502, "DELIVERY_FAILED", `Contact delivery failed. Please email ${DEFAULT_CONTACT_TO_EMAIL} directly.`, { eventId });
  }

  if (process.env.CONTACT_WEBHOOK_URL) {
    const response = await fetch(process.env.CONTACT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.value,
        submittedAt,
        source: "portfolio-contact-form",
        eventId
      })
    }).catch(() => null);

    if (!response || !response.ok) {
      logApiEvent("error", eventId, "contact.request.delivery_failed", { key, status: response?.status ?? null });
      return apiError(502, "DELIVERY_FAILED", `Contact delivery failed. Please email ${DEFAULT_CONTACT_TO_EMAIL} directly.`, { eventId });
    }
  }

  logApiEvent("info", eventId, "contact.request.accepted", {
    key,
    emailDelivery: emailDelivery.skipped ? "skipped" : "sent",
    contactTo: contactToEmail()
  });
  return apiOk({ received: true, eventId });
}
