import assert from "node:assert/strict";
import test from "node:test";
import { generateLifecycleCopy, LifecycleCopyGenerationError } from "@/lib/ai";
import { renderUserPrompt, SYSTEM_PROMPT } from "@/lib/prompts";

test("generateLifecycleCopy requires an OpenAI key", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    await assert.rejects(
      generateLifecycleCopy({
        recipientName: "Jordan Lee",
        recipientFirstName: "Jordan",
        segment: "TRIAL",
        entityName: "123 Main St",
        entityType: "property",
        entityLocation: "Austin, TX",
        deltaSummary: "A new address update was detected.",
        interestSource: "saved_search"
      }),
      LifecycleCopyGenerationError
    );
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

test("SYSTEM_PROMPT requires OpenAI to generate the subject line", () => {
  assert.match(SYSTEM_PROMPT, /subjectLine/);
  assert.match(SYSTEM_PROMPT, /Keep subjectLine under 70 characters/);
});
