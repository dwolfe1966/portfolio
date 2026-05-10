import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type ProviderCredentialGrantInput = {
  workspaceId: string;
  accountUserId?: string | null;
  provider: string;
  externalAccountId: string;
  displayName: string;
  isTestAccount?: boolean;
  scopes?: string[];
  tokenExpiresAt?: Date | null;
  now?: Date;
  metadata?: unknown;
};

function clean(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanList(values: string[] | undefined, max = 160) {
  return [...new Set((values ?? []).map((value) => clean(value, max)).filter(Boolean))].sort();
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export function providerGrantEnvironment(isTestAccount = true) {
  return isTestAccount ? "test" : "live";
}

export function providerTokenHealthStatus(expiresAt: Date | null | undefined, now = new Date()) {
  if (!expiresAt) return "valid";
  return expiresAt.getTime() > now.getTime() ? "valid" : "expired";
}

export function providerGrantCapabilities(provider: string, scopes: string[] = []) {
  const normalizedProvider = clean(provider, 80);
  const normalizedScopes = cleanList(scopes, 240);
  const capabilities = new Set<string>(["provider.account.read", "provider.object.read", "provider.performance.read"]);

  if (normalizedProvider === "google_ads") {
    capabilities.add("google_ads.customer.read");
    capabilities.add("google_ads.campaign.read");
    capabilities.add("google_ads.performance.read");
  }

  if (normalizedProvider === "meta_ads") {
    capabilities.add("meta_ads.account.read");
    capabilities.add("meta_ads.campaign.read");
    capabilities.add("meta_ads.performance.read");
  }

  if (normalizedScopes.length > 0) capabilities.add("oauth.scoped");
  capabilities.add("provider_write.dry_run");

  return [...capabilities].sort();
}

export async function upsertProviderCredentialGrant(input: ProviderCredentialGrantInput) {
  const now = input.now ?? new Date();
  const provider = clean(input.provider, 80);
  const externalAccountId = clean(input.externalAccountId, 220);
  const scopes = cleanList(input.scopes, 240);
  const tokenExpiresAt = input.tokenExpiresAt ?? null;
  const rotationDueAt = tokenExpiresAt ?? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const existing = await db.providerCredentialGrant.findFirst({
    where: {
      workspaceId: input.workspaceId,
      accountUserId: input.accountUserId ?? null,
      provider,
      externalAccountId
    },
    select: { id: true }
  });

  const data = {
    workspaceId: input.workspaceId,
    accountUserId: input.accountUserId ?? null,
    provider,
    externalAccountId,
    displayName: clean(input.displayName || `${provider} ${externalAccountId}`, 180),
    status: "active",
    environment: providerGrantEnvironment(input.isTestAccount ?? true),
    capabilities: providerGrantCapabilities(provider, scopes),
    scopes,
    tokenHealthStatus: providerTokenHealthStatus(tokenExpiresAt, now),
    tokenExpiresAt,
    lastValidatedAt: now,
    rotationDueAt,
    ownerApprovedAt: input.accountUserId ? now : null,
    revokedAt: null,
    metadata: jsonInput(input.metadata)
  };

  return existing
    ? db.providerCredentialGrant.update({
        where: { id: existing.id },
        data
      })
    : db.providerCredentialGrant.create({
        data
      });
}
