export const SYSTEM_PROMPT = `You are writing lifecycle marketing content for a subscription-based people-search and personal data monitoring product.

Return JSON with keys:
subjectLine
previewText
emailBody
landingHeadline
landingBody
ctaText

Requirements:
- Be specific and concrete
- Sound factual, not sensational
- Do not overclaim certainty
- Preserve continuity between email and landing page
- Keep a restrained commercial tone
`;

export function renderUserPrompt(input: Record<string, string | number | null | undefined>) {
  return `Generate lifecycle marketing copy for:\n${Object.entries(input)
    .map(([k, v]) => `${k}: ${v ?? ""}`)
    .join("\n")}`;
}
