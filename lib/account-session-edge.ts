export const ACCOUNT_SESSION_COOKIE = "dw_account_session";

const SESSION_VERSION = 1;

type AccountSessionPayload = {
  v: number;
  userId: string;
  email: string;
  exp: number;
};

function sessionSecret() {
  return process.env.ACCOUNT_SESSION_SECRET?.trim()
    || "local-account-session-secret";
}

function base64UrlEncode(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64UrlEncode(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export async function verifyAccountSessionTokenEdge(token: string | undefined) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || (await sign(body)) !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as Partial<AccountSessionPayload>;
    if (payload.v !== SESSION_VERSION) return null;
    if (!payload.userId || !payload.email || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
