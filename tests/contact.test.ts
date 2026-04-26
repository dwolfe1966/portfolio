import test from "node:test";
import assert from "node:assert/strict";
import { validateContactPayload } from "@/lib/contact";

test("validateContactPayload accepts valid form", () => {
  const parsed = validateContactPayload({
    name: "Alex Operator",
    email: "alex@example.com",
    company: "ExampleCo",
    topic: "Consulting",
    message: "We are exploring lifecycle and acquisition system design support."
  });

  assert.equal(parsed.ok, true);
});

test("validateContactPayload blocks spam honeypot", () => {
  const parsed = validateContactPayload({
    name: "Bot",
    email: "bot@example.com",
    message: "This is definitely longer than twenty chars.",
    website: "https://spam.example"
  });

  assert.equal(parsed.ok, false);
});
