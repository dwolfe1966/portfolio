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

const COPY_FIELDS: (keyof CopyPayload)[] = [
  "subjectLine",
  "previewText",
  "emailBody",
  "landingHeadline",
  "landingBody",
  "ctaText"
];

function fallbackTemplate(input: LifecycleCopyInput): CopyPayload {
  const recipientName = String(input.recipientFirstName ?? input.recipientName ?? "there");
  const entityName = String(input.entityName ?? "this record");
  const entityType = String(input.entityType ?? "record").replace(/_/g, " ").toLowerCase();
  const entityLocation = input.entityLocation ? ` in ${input.entityLocation}` : "";
  const deltaSummary = String(input.deltaSummary ?? "A new update was detected.");
  const segment = input.segment ? String(input.segment).toLowerCase() : "member";

  return {
    subjectLine: `${recipientName}, new update for ${entityName}`,
    previewText: `${deltaSummary} Review the latest details for this ${entityType}.`,
    emailBody: `${recipientName}, we found an update connected to ${entityName}${entityLocation}. ${deltaSummary} Because this ${entityType} matched your ${segment} monitoring activity, you can review the latest details and decide whether to unlock the full record.`,
    landingHeadline: `Review the latest update for ${entityName}`,
    landingBody: `${deltaSummary} Continue to see the latest details associated with ${entityName}${entityLocation}.`,
    ctaText: "Unlock full details"
  };
}

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeCopyPayload(value: unknown, input: LifecycleCopyInput): CopyPayload {
  const fallback = fallbackTemplate(input);
  if (!value || typeof value !== "object") return fallback;

  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    COPY_FIELDS.map((field) => {
      const raw = source[field];
      const text = typeof raw === "string" ? raw.trim() : "";
      return [field, text || fallback[field]];
    })
  ) as CopyPayload;
}

function parseCopyPayload(text: string, input: LifecycleCopyInput): CopyPayload {
  try {
    return normalizeCopyPayload(JSON.parse(stripJsonFence(text)), input);
  } catch {
    return fallbackTemplate(input);
  }
}

export async function generateLifecycleCopy(input: LifecycleCopyInput): Promise<LifecycleCopyResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { ...fallbackTemplate(input), modelName: "fallback-template" };
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
    return { ...parseCopyPayload(response.output_text, input), modelName };
  } catch {
    return { ...fallbackTemplate(input), modelName: "fallback-template" };
  }
}
