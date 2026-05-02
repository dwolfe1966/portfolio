import { NextResponse } from "next/server";

export type ApiErrorPayload = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } } satisfies ApiErrorPayload,
    { status }
  );
}

export function apiCompatibilityError(message: string, details?: unknown) {
  return apiError(
    503,
    "COMPATIBILITY_MODE",
    message,
    {
      compatibilityMode: true,
      fix: ["npm run db:generate", "npm run db:migrate:deploy", "npm run db:seed"],
      ...(details && typeof details === "object" ? details : details !== undefined ? { details } : {})
    }
  );
}

export function apiUnhandledError(error: unknown, eventId: string) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return apiError(500, "INTERNAL_ERROR", "Unexpected API error.", { eventId, message });
}

export function apiOk<T extends Record<string, unknown>>(payload: T) {
  return NextResponse.json({ ok: true, ...payload });
}

export function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { error?: unknown };
  if (typeof candidate.error === "string") return candidate.error;
  if (candidate.error && typeof candidate.error === "object") {
    const nested = candidate.error as { message?: unknown };
    if (typeof nested.message === "string") return nested.message;
  }
  return fallback;
}
