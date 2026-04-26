export type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  topic?: string;
  message: string;
  website?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactPayload(input: unknown): { ok: true; value: ContactPayload } | { ok: false; errors: string[] } {
  const body = (input ?? {}) as Partial<ContactPayload>;
  const value: ContactPayload = {
    name: String(body.name ?? "").trim(),
    email: String(body.email ?? "").trim().toLowerCase(),
    company: String(body.company ?? "").trim(),
    topic: String(body.topic ?? "").trim(),
    message: String(body.message ?? "").trim(),
    website: String(body.website ?? "").trim()
  };

  const errors: string[] = [];
  if (!value.name) errors.push("name is required");
  if (!value.email) errors.push("email is required");
  if (value.email && !EMAIL_REGEX.test(value.email)) errors.push("email must be valid");
  if (!value.message || value.message.length < 20) errors.push("message must be at least 20 characters");
  if (value.website) errors.push("spam detected");

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}
