import assert from "node:assert/strict";
import test from "node:test";
import { generateLifecycleCopy } from "@/lib/ai";
import { renderUserPrompt } from "@/lib/prompts";

test("generateLifecycleCopy returns personalized fallback copy without an API key", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const copy = await generateLifecycleCopy({
      recipientName: "Jordan Lee",
      recipientFirstName: "Jordan",
      segment: "TRIAL",
      entityName: "123 Main St",
      entityType: "property",
      entityLocation: "Austin, TX",
      deltaSummary: "A new address update was detected.",
      interestSource: "saved_search"
    });

    assert.equal(copy.modelName, "fallback-template");
    assert.match(copy.subjectLine, /Jordan/);
    assert.match(copy.emailBody, /123 Main St/);
    assert.match(copy.emailBody, /Austin, TX/);
    assert.match(copy.landingHeadline, /123 Main St/);
  } finally {
    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});

test("renderUserPrompt preserves candidate-specific lifecycle context", () => {
  const prompt = renderUserPrompt({
    recipientName: "Jordan Lee",
    segment: "LAPSED",
    subscriptionStatus: "EXPIRED",
    entityName: "Acme Holdings",
    entityType: "business",
    interestSource: "search_history",
    priorityBreakdown: "interest 0.45, recency 0.12",
    deltaSummary: "A new filing was added."
  });

  assert.match(prompt, /Jordan Lee/);
  assert.match(prompt, /LAPSED/);
  assert.match(prompt, /search_history/);
  assert.match(prompt, /interest 0.45/);
  assert.match(prompt, /A new filing was added/);
});
