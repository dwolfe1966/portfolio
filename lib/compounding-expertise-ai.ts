import OpenAI from "openai";
import type { CompanyThesisInput, KeyDebateInput } from "@/lib/compounding-expertise-lab";
import { INITIAL_DEBATES } from "@/lib/compounding-expertise-lab";

export type DebateGenerationResult =
  | { ok: true; debates: KeyDebateInput[]; modelName: string; provenance: "AI" }
  | { ok: false; debates: KeyDebateInput[]; reason: string; provenance: "fallback" };

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeDebate(value: unknown): KeyDebateInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const probability = Math.max(0, Math.min(100, Math.round(Number(source.probability ?? 50))));
  const debate = {
    question: String(source.question ?? "").trim(),
    bullCase: String(source.bullCase ?? "").trim(),
    bearCase: String(source.bearCase ?? "").trim(),
    evidenceNeeded: String(source.evidenceNeeded ?? "").trim(),
    increaseBelief: String(source.increaseBelief ?? "").trim(),
    decreaseBelief: String(source.decreaseBelief ?? "").trim(),
    probability,
    source: "AI" as const
  };
  return debate.question && debate.bullCase && debate.bearCase && debate.evidenceNeeded
    ? debate
    : null;
}

function parseDebates(text: string): KeyDebateInput[] {
  const parsed = JSON.parse(stripJsonFence(text)) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { debates?: unknown }).debates)
      ? (parsed as { debates: unknown[] }).debates
      : [];
  return rows.map(normalizeDebate).filter((item): item is KeyDebateInput => Boolean(item)).slice(0, 4);
}

export async function generateCompoundingExpertiseDebates(input: CompanyThesisInput): Promise<DebateGenerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      debates: INITIAL_DEBATES.map((debate) => ({ ...debate, source: "USER" })),
      reason: "OPENAI_API_KEY is not configured; manual debate editing remains available.",
      provenance: "fallback"
    };
  }

  const modelName = process.env.OPENAI_COMPOUNDING_EXPERTISE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = [
    "Generate 2-4 load-bearing debates for evaluating whether accumulated graded experience could become durable competitive Power in an AI application.",
    "Return JSON only as an array of objects with fields: question, bullCase, bearCase, evidenceNeeded, increaseBelief, decreaseBelief, probability.",
    "Probabilities must be 0-100 and reflect uncertainty. Do not invent factual evidence. Treat content as hypotheses and analysis suggestions, not evidence.",
    `Company: ${input.companyName}`,
    `Product: ${input.productDescription}`,
    `Target customer: ${input.targetCustomer}`,
    `Workflow: ${input.workflow}`,
    `Principal decisions: ${input.decisionDescription}`,
    `Current thesis: ${input.thesis}`
  ].join("\n\n");

  try {
    const response = await client.responses.create({
      model: modelName,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: "You are a skeptical strategy analyst. Preserve uncertainty and never present AI suggestions as observed evidence." }]
        },
        { role: "user", content: [{ type: "input_text", text: prompt }] }
      ]
    });
    const debates = parseDebates(response.output_text);
    if (debates.length === 0) {
      return { ok: false, debates: INITIAL_DEBATES, reason: "OpenAI returned no usable debates.", provenance: "fallback" };
    }
    return { ok: true, debates, modelName, provenance: "AI" };
  } catch (error) {
    return {
      ok: false,
      debates: INITIAL_DEBATES,
      reason: error instanceof Error ? error.message : "OpenAI debate generation failed.",
      provenance: "fallback"
    };
  }
}
