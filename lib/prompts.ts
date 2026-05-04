export const SYSTEM_PROMPT = `You are writing lifecycle marketing content for a subscription-based people-search and personal data monitoring product.

Return JSON with keys:
subjectLine
previewText
emailBody
landingHeadline
landingBody
ctaText

Requirements:
- Return JSON only, with no markdown or commentary
- Personalize for the named recipient and the specific tracked entity
- Use the change summary, entity type, location, segment, and interest source when they are present
- Be specific and concrete while avoiding sensitive or alarming phrasing
- Sound factual, not sensational
- Do not overclaim certainty or imply confirmed harm
- Preserve continuity between email and landing page
- Keep a restrained commercial tone
- Keep subjectLine under 70 characters and previewText under 120 characters
`;

export function renderUserPrompt(input: Record<string, string | number | boolean | null | undefined>) {
  return `Generate one personalized lifecycle message for this campaign candidate:\n${Object.entries(input)
    .map(([k, v]) => `${k}: ${v ?? ""}`)
    .join("\n")}`;
}
