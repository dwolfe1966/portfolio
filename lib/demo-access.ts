export const DEMO_ACCESS_COOKIE = "dw_demo_access";

const TOKEN_SALT = "davidwolfe-demo-workspace-v1";

export function isDemoAccessConfigured() {
  return Boolean(process.env.DEMO_PASSWORD?.trim());
}

export async function getDemoAccessToken() {
  const password = process.env.DEMO_PASSWORD?.trim();
  if (!password) return null;

  const bytes = new TextEncoder().encode(`${TOKEN_SALT}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidDemoAccessToken(value: string | undefined) {
  const expected = await getDemoAccessToken();
  return Boolean(expected && value && value === expected);
}
