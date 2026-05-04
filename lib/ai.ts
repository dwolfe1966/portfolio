import OpenAI from "openai";
import { SYSTEM_PROMPT, renderUserPrompt } from "@/lib/prompts";

type CopyPayload = {
  subjectLine: string;
  previewText: string;
  emailBody: string;
  landingHeadline: string;
  landingBody: string;
  ctaText: string;
};

type LifecycleCopyInput = Record<string, string | number | boolean | null | undefined>;

export type LifecycleCopyResult = CopyPayload & {
  modelName: string;
};

export class LifecycleCopyGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LifecycleCopyGenerationError";
  }
}

const COPY_FIELDS: (keyof CopyPayload)[] = [
  "subjectLine",
  "previewText",
  "emailBody",
  "landingHeadline",
  "landingBody",
  "ctaText"
];

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeCopyPayload(value: unknown): CopyPayload {
  if (!value || typeof value !== "object") {
    throw new LifecycleCopyGenerationError("OpenAI lifecycle copy response was not valid JSON.");
  }

  const source = value as Record<string, unknown>;
  const payload = Object.fromEntries(
    COPY_FIELDS.map((field) => {
      const raw = source[field];
      const text = typeof raw === "string" ? raw.trim() : "";
      return [field, text || ""];
    })
  ) as CopyPayload;

  const missingFields = COPY_FIELDS.filter((field) => !payload[field]);
  if (missingFields.length > 0) {
    throw new LifecycleCopyGenerationError(`OpenAI lifecycle copy response missed fields: ${missingFields.join(", ")}.`);
  }

  if (payload.subjectLine.length > 120 || payload.previewText.length > 180) {
    return {
      ...payload,
      subjectLine: payload.subjectLine.slice(0, 120),
      previewText: payload.previewText.slice(0, 180)
    };
  }

  return payload;
}

function parseCopyPayload(text: string): CopyPayload {
  try {
    return normalizeCopyPayload(JSON.parse(stripJsonFence(text)));
  } catch (error) {
    if (error instanceof LifecycleCopyGenerationError) throw error;
    throw new LifecycleCopyGenerationError("OpenAI lifecycle copy response could not be parsed as JSON.");
  }
}

export async function generateLifecycleCopy(input: LifecycleCopyInput): Promise<LifecycleCopyResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new LifecycleCopyGenerationError("OPENAI_API_KEY is required for lifecycle message generation.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const modelName = process.env.OPENAI_LIFECYCLE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  try {
    const response = await client.responses.create({
      model: modelName,
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        { role: "user", content: [{ type: "input_text", text: renderUserPrompt(input) }] }
      ]
    });
    return { ...parseCopyPayload(response.output_text), modelName };
  } catch (error) {
    if (error instanceof LifecycleCopyGenerationError) throw error;
    const message = error instanceof Error ? error.message : "Unknown OpenAI error.";
    throw new LifecycleCopyGenerationError(`OpenAI lifecycle copy generation failed: ${message}`);
  }
}
