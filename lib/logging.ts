export function createEventId(prefix = "evt") {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}_${rand}`;
}

export function logApiEvent(level: "info" | "warn" | "error", eventId: string, message: string, context?: Record<string, unknown>) {
  const payload = {
    level,
    eventId,
    message,
    context: context ?? {},
    at: new Date().toISOString()
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
}
