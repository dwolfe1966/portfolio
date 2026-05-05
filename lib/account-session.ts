import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
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

const PASSWORD_KEY_LENGTH = 64;

export class AccountAuthError extends Error {
  code: "INVALID_PASSWORD" | "PASSWORD_REQUIRED" | "PASSWORD_TOO_SHORT";

  constructor(code: AccountAuthError["code"], message: string) {
    super(message);
    this.name = "AccountAuthError";
    this.code = code;
  }
}

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

export function normalizeAccountPassword(value: unknown) {
  return String(value ?? "");
}

export function validateAccountPassword(password: string) {
  if (!password) throw new AccountAuthError("PASSWORD_REQUIRED", "Password is required.");
  if (password.length < 8) throw new AccountAuthError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.");
}

export function hashAccountPassword(password: string) {
  validateAccountPassword(password);
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyAccountPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) return false;
  const [algorithm, salt, storedHash] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !storedHash) return false;
  const candidate = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const stored = Buffer.from(storedHash, "base64url");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
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

export async function upsertAccountUserWithDefaultWorkspace(input: { email: string; name?: string; password: string }) {
  const email = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(email)) throw new Error("A valid email address is required.");
  const name = normalizeAccountName(input.name, email);
  const password = normalizeAccountPassword(input.password);
  validateAccountPassword(password);
  const workspace = await getDefaultWorkspace();
  const existing = await db.accountUser.findUnique({ where: { email } });
  if (existing?.passwordHash && !verifyAccountPassword(password, existing.passwordHash)) {
    throw new AccountAuthError("INVALID_PASSWORD", "Password is incorrect.");
  }
  const passwordHash = existing?.passwordHash ?? hashAccountPassword(password);
  const accountUser = existing
    ? await db.accountUser.update({
        where: { id: existing.id },
        data: {
          name,
          passwordHash,
          passwordSetAt: existing.passwordSetAt ?? new Date()
        }
      })
    : await db.accountUser.create({
        data: {
          email,
          name,
          passwordHash,
          passwordSetAt: new Date()
        }
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
