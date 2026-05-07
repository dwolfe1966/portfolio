export type LifecycleChannel = "email" | "sms" | "push";

export type LifecycleIdentityConsentInput = {
  userId?: string | null;
  externalUserId?: string | null;
  customerId?: string | null;
  accountId?: string | null;
  email?: string | null;
  hashedEmail?: string | null;
  channel: LifecycleChannel;
  channelAddress?: string | null;
  channelEligible?: boolean | null;
  allowedGeographies?: string[];
  userGeography?: string | null;
  customerOptedOut?: boolean | null;
  providerSuppressed?: boolean | null;
  localSuppressed?: boolean | null;
  relationshipResolved?: boolean | null;
  eventDetectedAt?: string | Date | null;
  maxEventAgeHours: number;
  duplicateWithinWindow?: boolean | null;
  holdoutAssigned?: boolean | null;
  holdoutTreatment?: "treatment" | "control" | null;
};

export type LifecycleIdentityConsentDecision = {
  allowed: boolean;
  outcome: "eligible" | "blocked" | "suppressed" | "holdout";
  canonicalIdentityKey: string | null;
  channelAddress: string | null;
  reasons: string[];
  auditEvents: Array<"identity.resolved" | "consent.checked" | "delivery.suppressed">;
};

function clean(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: string | null | undefined) {
  return clean(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveIdentityKey(input: LifecycleIdentityConsentInput) {
  const candidates = [
    clean(input.userId),
    clean(input.externalUserId),
    clean(input.customerId),
    clean(input.accountId),
    clean(input.hashedEmail),
    normalizeEmail(input.email)
  ].filter(Boolean);
  return candidates[0] ?? null;
}

function resolveChannelAddress(input: LifecycleIdentityConsentInput) {
  if (input.channel === "email") return normalizeEmail(input.channelAddress || input.email);
  return clean(input.channelAddress);
}

export function evaluateLifecycleIdentityConsent(
  input: LifecycleIdentityConsentInput,
  now: Date = new Date()
): LifecycleIdentityConsentDecision {
  const reasons: string[] = [];
  const canonicalIdentityKey = resolveIdentityKey(input);
  const channelAddress = resolveChannelAddress(input);

  if (!canonicalIdentityKey) reasons.push("Canonical person/account identity is unresolved.");
  if (!channelAddress) reasons.push("Channel address is missing.");
  if (input.channel === "email" && channelAddress && !isValidEmail(channelAddress)) {
    reasons.push("Email channel address is invalid.");
  }
  if (input.channelEligible !== true) reasons.push(`User is not eligible for ${input.channel}.`);

  const allowedGeographies = input.allowedGeographies ?? [];
  if (allowedGeographies.length > 0 && !allowedGeographies.includes(clean(input.userGeography).toUpperCase())) {
    reasons.push("User geography is not eligible for this lifecycle action.");
  }

  if (input.customerOptedOut) reasons.push("Customer opt-out is active.");
  if (input.providerSuppressed) reasons.push("Provider suppression is active.");
  if (input.localSuppressed) reasons.push("Local suppression is active.");
  if (input.relationshipResolved !== true) reasons.push("User/entity relationship is unresolved.");

  const eventDetectedAt = parseDate(input.eventDetectedAt);
  if (!eventDetectedAt) {
    reasons.push("Source event timestamp is missing or invalid.");
  } else {
    const ageHours = Math.max(0, (now.getTime() - eventDetectedAt.getTime()) / (60 * 60 * 1000));
    if (ageHours > input.maxEventAgeHours) {
      reasons.push(`Source event is older than ${input.maxEventAgeHours} hours.`);
    }
  }

  if (input.duplicateWithinWindow) reasons.push("Duplicate send detected inside dedupe window.");
  if (input.holdoutAssigned !== true) reasons.push("Holdout/control assignment is unresolved.");

  const suppressed = Boolean(input.customerOptedOut || input.providerSuppressed || input.localSuppressed);
  const blocked = reasons.length > 0;
  const holdout = !blocked && input.holdoutTreatment === "control";
  const outcome = suppressed ? "suppressed" : holdout ? "holdout" : blocked ? "blocked" : "eligible";
  const auditEvents: LifecycleIdentityConsentDecision["auditEvents"] = ["identity.resolved", "consent.checked"];
  if (outcome === "suppressed" || outcome === "holdout") auditEvents.push("delivery.suppressed");

  return {
    allowed: outcome === "eligible",
    outcome,
    canonicalIdentityKey,
    channelAddress,
    reasons,
    auditEvents
  };
}
