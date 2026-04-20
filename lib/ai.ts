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

function fallbackTemplate(input: Record<string, string | number | null | undefined>): CopyPayload {
  const entityName = String(input.entityName ?? "this person");
  const deltaSummary = String(input.deltaSummary ?? "A new update was detected.");
  return {
    subjectLine: `New update found for ${entityName}`,
    previewText: `${deltaSummary} Review the latest details now.`,
    emailBody: `We detected a new update connected to ${entityName}. ${deltaSummary} Visit the detail page to review the latest information and unlock the full record.`,
    landingHeadline: `A new update may matter to you`,
    landingBody: `${deltaSummary} Continue to review the latest details associated with ${entityName}.`,
    ctaText: "Unlock full details"
  };
}

export async function generateLifecycleCopy(input: Record<string, string | number | null | undefined>): Promise<CopyPayload> {
  if (!process.env.OPENAI_API_KEY) return fallbackTemplate(input);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        { role: "user", content: [{ type: "input_text", text: renderUserPrompt(input) }] }
      ]
    });
    const text = response.output_text;
    const parsed = JSON.parse(text) as CopyPayload;
    return parsed;
  } catch {
    return fallbackTemplate(input);
  }
}
