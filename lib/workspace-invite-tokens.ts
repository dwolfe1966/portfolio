import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function createWorkspaceInviteToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function workspaceInviteTokenHash(token: string) {
  return createHash("sha256").update(String(token ?? "").trim(), "utf8").digest("hex");
}

export function isPlausibleWorkspaceInviteToken(token: string) {
  return /^[A-Za-z0-9_-]{32,}$/.test(String(token ?? "").trim());
}
