import test from "node:test";
import assert from "node:assert/strict";
import {
  FakeConversionConnector,
  FakeEspConnector,
  FakeSmtpConnector,
  FakeWarehouseConnector,
  FakeWebhookConnector,
  getLifecycleConnector,
  getLifecycleDeliveryConnector,
  getLifecycleObservationConnector,
  getLifecycleSourceConnector
} from "@/lib/lifecycle-connectors";

test("FakeWarehouseConnector exposes lifecycle source object coverage", async () => {
  const connector = new FakeWarehouseConnector();
  const health = await connector.health();
  const discovery = await connector.discover();

  assert.equal(health.ok, true);
  assert.deepEqual(
    health.capabilities,
    ["read_users", "read_entities", "read_interest_edges", "read_events", "read_consent"]
  );
  assert.deepEqual(
    discovery.objects.map((object) => object.objectKey),
    ["users", "entities", "interestEdges", "events", "consent"]
  );
});

test("FakeWarehouseConnector previews deterministic normalized rows", async () => {
  const connector = new FakeWarehouseConnector();
  const users = await connector.preview({ objectKey: "users", limit: 1 });
  const edges = await connector.preview({ objectKey: "interestEdges" });

  assert.equal(users.rows.length, 1);
  assert.equal(users.rows[0].email, "jordan@example.com");
  assert.equal(edges.rows.length, 2);
  assert.equal(edges.rejectedRows, 0);
});

test("FakeWarehouseConnector sync returns per-object counts and stable cursor", async () => {
  const connector = new FakeWarehouseConnector();
  const result = await connector.sync({
    objectKeys: ["users", "entities", "interestEdges", "events", "consent"],
    idempotencyKey: "sync-001"
  });

  assert.equal(result.cursor, "sync-001:users,entities,interestEdges,events,consent:synced");
  assert.deepEqual(result.normalizedCounts, {
    users: 2,
    entities: 2,
    interestEdges: 2,
    events: 2,
    consent: 2
  });
  assert.equal(result.auditEvents.length, 5);
  assert.ok(result.auditEvents.every((event) => event.eventType === "source.synced"));
});

test("FakeWebhookConnector limits sync to lifecycle events", async () => {
  const connector = new FakeWebhookConnector();
  const result = await connector.sync({
    objectKeys: ["users", "events"],
    idempotencyKey: "webhook-001"
  });

  assert.deepEqual(result.normalizedCounts, { events: 2 });
  assert.equal(result.auditEvents[0].provider, "fake_webhook");
});

test("FakeEspConnector sends idempotent delivery requests and observes engagement", async () => {
  const connector = new FakeEspConnector();
  const first = await connector.send(deliveryRequest("msg-001", "delivery-001", "operator@customer.com"));
  const second = await connector.send(deliveryRequest("msg-001", "delivery-001", "operator@customer.com"));
  const observed = await connector.observe({ since: "2026-05-07T12:00:00.000Z" });

  assert.deepEqual(first, second);
  assert.equal(first.status, "accepted");
  assert.equal(first.auditEvents[0].eventType, "delivery.accepted");
  assert.ok(observed.events.some((event) => event.eventType === "clicked"));
  assert.equal(observed.auditEvents[0].eventType, "outcome.observed");
  assert.ok(observed.events.every((event) => ["sent", "clicked"].includes(event.eventType)));
});

test("FakeSmtpConnector fails closed for example-domain production sends", async () => {
  const connector = new FakeSmtpConnector();
  const result = await connector.send(deliveryRequest("msg-002", "delivery-002", "jordan@example.com", "production"));
  const health = await connector.health();

  assert.equal(result.status, "suppressed");
  assert.ok(result.warnings[0].includes("suppressed"));
  assert.equal(result.auditEvents[0].eventType, "delivery.suppressed");
  assert.ok(health.permissionWarnings[0].includes("cannot read provider consent"));
});

test("FakeConversionConnector observes conversion and revenue events", async () => {
  const connector = new FakeConversionConnector();
  const observed = await connector.observe({ since: "2026-05-07T12:00:00.000Z" });

  assert.deepEqual(observed.events.map((event) => event.eventType), ["converted", "revenue"]);
  assert.equal(observed.events.find((event) => event.eventType === "revenue")?.amountCents, 12900);
});

test("lifecycle connector dispatch helpers resolve typed fake providers", () => {
  assert.equal(getLifecycleConnector("fake_warehouse").provider, "fake_warehouse");
  assert.equal(getLifecycleSourceConnector("fake_webhook").kind, "webhook");
  assert.equal(getLifecycleDeliveryConnector("fake_smtp").kind, "smtp");
  assert.equal(getLifecycleObservationConnector("fake_engagement").kind, "engagement");
});

function deliveryRequest(
  messageId: string,
  idempotencyKey: string,
  recipientEmail: string,
  mode: "test" | "production" = "test"
) {
  return {
    workspaceId: "workspace-001",
    messageId,
    recipientEmail,
    subject: "Lifecycle update",
    bodyText: "A relevant event happened.",
    idempotencyKey,
    mode
  };
}
