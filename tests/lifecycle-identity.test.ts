import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateLifecycleIdentityConsent,
  type LifecycleIdentityConsentInput
} from "@/lib/lifecycle-identity";

const NOW = new Date("2026-05-07T12:00:00.000Z");

const BASE_ELIGIBLE: LifecycleIdentityConsentInput = {
  userId: "user_001",
  externalUserId: "ext_001",
  email: "Jordan@Example.com",
  channel: "email",
  channelEligible: true,
  allowedGeographies: ["US", "CA"],
  userGeography: "us",
  customerOptedOut: false,
  providerSuppressed: false,
  localSuppressed: false,
  relationshipResolved: true,
  eventDetectedAt: "2026-05-07T10:00:00.000Z",
  maxEventAgeHours: 24,
  duplicateWithinWindow: false,
  holdoutAssigned: true,
  holdoutTreatment: "treatment"
};

test("evaluateLifecycleIdentityConsent allows a resolved consented treatment recipient", () => {
  const decision = evaluateLifecycleIdentityConsent(BASE_ELIGIBLE, NOW);

  assert.equal(decision.allowed, true);
  assert.equal(decision.outcome, "eligible");
  assert.equal(decision.canonicalIdentityKey, "user_001");
  assert.equal(decision.channelAddress, "jordan@example.com");
  assert.deepEqual(decision.reasons, []);
  assert.deepEqual(decision.auditEvents, ["identity.resolved", "consent.checked"]);
});

test("evaluateLifecycleIdentityConsent fails closed for unresolved identity and missing address", () => {
  const decision = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    userId: "",
    externalUserId: "",
    customerId: "",
    accountId: "",
    hashedEmail: "",
    email: "",
    channelAddress: ""
  }, NOW);

  assert.equal(decision.allowed, false);
  assert.equal(decision.outcome, "blocked");
  assert.ok(decision.reasons.some((reason) => /identity/i.test(reason)));
  assert.ok(decision.reasons.some((reason) => /address/i.test(reason)));
});

test("evaluateLifecycleIdentityConsent rejects invalid email channel addresses", () => {
  const decision = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    channelAddress: "not-an-email"
  }, NOW);

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.some((reason) => /Email/.test(reason)));
});

test("evaluateLifecycleIdentityConsent applies the strictest suppression state", () => {
  const decision = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    providerSuppressed: true
  }, NOW);

  assert.equal(decision.allowed, false);
  assert.equal(decision.outcome, "suppressed");
  assert.ok(decision.reasons.some((reason) => /Provider suppression/.test(reason)));
  assert.ok(decision.auditEvents.includes("delivery.suppressed"));
});

test("evaluateLifecycleIdentityConsent blocks ineligible geography and channel", () => {
  const decision = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    channelEligible: false,
    userGeography: "GB"
  }, NOW);

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.some((reason) => /eligible for email/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /geography/.test(reason)));
});

test("evaluateLifecycleIdentityConsent blocks stale or unparseable source events", () => {
  const stale = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    eventDetectedAt: "2026-05-05T10:00:00.000Z",
    maxEventAgeHours: 24
  }, NOW);
  const invalid = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    eventDetectedAt: "not-a-date"
  }, NOW);

  assert.equal(stale.allowed, false);
  assert.ok(stale.reasons.some((reason) => /older than/.test(reason)));
  assert.equal(invalid.allowed, false);
  assert.ok(invalid.reasons.some((reason) => /timestamp/.test(reason)));
});

test("evaluateLifecycleIdentityConsent blocks unresolved relationships, duplicates, and missing holdout assignment", () => {
  const decision = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    relationshipResolved: false,
    duplicateWithinWindow: true,
    holdoutAssigned: false
  }, NOW);

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.some((reason) => /relationship/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /Duplicate/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /Holdout/.test(reason)));
});

test("evaluateLifecycleIdentityConsent suppresses control holdouts without treating consent as invalid", () => {
  const decision = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    holdoutTreatment: "control"
  }, NOW);

  assert.equal(decision.allowed, false);
  assert.equal(decision.outcome, "holdout");
  assert.deepEqual(decision.reasons, []);
  assert.ok(decision.auditEvents.includes("delivery.suppressed"));
});

test("evaluateLifecycleIdentityConsent supports non-email channels with explicit addresses", () => {
  const decision = evaluateLifecycleIdentityConsent({
    ...BASE_ELIGIBLE,
    email: null,
    hashedEmail: "sha256:abc",
    channel: "sms",
    channelAddress: "+15551234567"
  }, NOW);

  assert.equal(decision.allowed, true);
  assert.equal(decision.canonicalIdentityKey, "user_001");
  assert.equal(decision.channelAddress, "+15551234567");
});
