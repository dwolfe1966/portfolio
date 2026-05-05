import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

export const ACCOUNT_SESSION_COOKIE = "dw_account_session";

const SESSION_VERSION = 1;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type AccountSessionPayload = {
  v: number;
  userId: string;
  email: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sessionSecret() {
  return process.env.ACCOUNT_SESSION_SECRET?.trim()
    || process.env.DEMO_PASSWORD?.trim()
    || "local-account-session-secret";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function normalizeAccountEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

export function normalizeAccountName(value: unknown, email: string) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return normalized || email.split("@")[0] || "Workspace User";
}

export function isValidAccountEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createAccountSessionToken(input: { userId: string; email: string }) {
  const payload: AccountSessionPayload = {
    v: SESSION_VERSION,
    userId: input.userId,
    email: input.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyAccountSessionToken(token: string | undefined) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(sign(body), signature)) return null;

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

export async function upsertAccountUserWithDefaultWorkspace(input: { email: string; name?: string }) {
  const email = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(email)) throw new Error("A valid email address is required.");
  const name = normalizeAccountName(input.name, email);
  const workspace = await getDefaultWorkspace();
  const accountUser = await db.accountUser.upsert({
    where: { email },
    update: { name },
    create: { email, name }
  });
  await db.workspaceMembership.upsert({
    where: {
      workspaceId_accountUserId: {
        workspaceId: workspace.id,
        accountUserId: accountUser.id
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      accountUserId: accountUser.id,
      role: "owner"
    }
  });
  return { accountUser, workspace };
}

export async function getAccountSessionUser(token: string | undefined) {
  const session = verifyAccountSessionToken(token);
  if (!session) return null;
  return db.accountUser.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: { workspace: true },
        orderBy: { updatedAt: "desc" }
      }
    }
  });
}
