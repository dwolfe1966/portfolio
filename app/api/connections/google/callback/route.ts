import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  discoverAccessibleGoogleAdsCustomers,
  exchangeGoogleAuthCode,
  isGoogleOAuthConfigured
} from "@/lib/ad-connectors/google-oauth";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { verifyOAuthState } from "@/lib/oauth-state";
import { encryptOAuthToken, isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { createEventId, logApiEvent } from "@/lib/logging";
import { upsertProviderCredentialGrant } from "@/lib/provider-credential-grants";
import { getDefaultWorkspace } from "@/lib/workspace";

const CONNECTIONS_PAGE = "/acquisition/connections";

function redirectWithError(reason: string, eventId: string): NextResponse {
  const url = new URL(CONNECTIONS_PAGE, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  url.searchParams.set("error", reason);
  url.searchParams.set("event", eventId);
  const response = NextResponse.redirect(url);
  response.cookies.delete("oauth_state_google");
  return response;
}

function googleListCustomersErrorReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('"reason": "SERVICE_DISABLED"') || message.includes("Google Ads API has not been used")) {
    return "google_ads_api_disabled";
  }
  if (message.includes('"status": "PERMISSION_DENIED"') || message.includes("PERMISSION_DENIED")) {
    return "google_ads_permission_denied";
  }
  return "list_customers_failed";
}

function redirectWithSuccess(connectedCount: number): NextResponse {
  const url = new URL(CONNECTIONS_PAGE, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  url.searchParams.set("connected", String(connectedCount));
  const response = NextResponse.redirect(url);
  response.cookies.delete("oauth_state_google");
  return response;
}

export async function GET(req: NextRequest) {
  const eventId = createEventId("conn_g_cb");
  const accountUserId = verifyAccountSessionToken(req.cookies.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;

  if (!isOAuthEncryptionAvailable() || !isGoogleOAuthConfigured()) {
    logApiEvent("warn", eventId, "connections.google.callback.not_configured");
    return redirectWithError("not_configured", eventId);
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    logApiEvent("warn", eventId, "connections.google.callback.provider_error", { errorParam });
    return redirectWithError(`provider:${errorParam}`, eventId);
  }
  if (!code || !state) {
    logApiEvent("warn", eventId, "connections.google.callback.missing_params");
    return redirectWithError("missing_params", eventId);
  }

  const cookieState = req.cookies.get("oauth_state_google")?.value;
  if (!cookieState || cookieState !== state) {
    logApiEvent("warn", eventId, "connections.google.callback.state_cookie_mismatch");
    return redirectWithError("state_cookie_mismatch", eventId);
  }

  const stateCheck = verifyOAuthState(state, "google_ads");
  if (!stateCheck.ok) {
    logApiEvent("warn", eventId, "connections.google.callback.state_invalid", {
      reason: stateCheck.reason
    });
    return redirectWithError(`state_${stateCheck.reason}`, eventId);
  }

  let tokens;
  try {
    tokens = await exchangeGoogleAuthCode(code);
  } catch (err) {
    logApiEvent("error", eventId, "connections.google.callback.exchange_failed", {
      message: err instanceof Error ? err.message : String(err)
    });
    return redirectWithError("token_exchange_failed", eventId);
  }

  let customers;
  try {
    customers = await discoverAccessibleGoogleAdsCustomers(tokens.accessToken);
  } catch (err) {
    const reason = googleListCustomersErrorReason(err);
    logApiEvent("error", eventId, "connections.google.callback.list_customers_failed", {
      reason,
      message: err instanceof Error ? err.message : String(err)
    });
    return redirectWithError(reason, eventId);
  }

  if (customers.length === 0) {
    logApiEvent("warn", eventId, "connections.google.callback.no_customers");
    return redirectWithError("no_accessible_customers", eventId);
  }

  const encryptedAccessToken = encryptOAuthToken(tokens.accessToken);
  const encryptedRefreshToken = tokens.refreshToken ? encryptOAuthToken(tokens.refreshToken) : null;
  const scopes = tokens.scope ? tokens.scope.split(/\s+/).filter(Boolean) : [];
  const workspace = await getDefaultWorkspace();

  // Store one connection row per accessible customer and discovered child customer.
  // Live/test truth is refreshed again when the account is read.
  const upserts = customers.map(async (customer) => {
    const isTestAccount = customer.testAccount ?? true;
    const accountName = customer.descriptiveName
      ? `${customer.descriptiveName} (${customer.customerId})`
      : `Google Ads ${customer.customerId}`;
    const credentialGrant = await upsertProviderCredentialGrant({
      workspaceId: workspace.id,
      accountUserId,
      provider: "google_ads",
      externalAccountId: customer.customerId,
      displayName: accountName,
      isTestAccount,
      scopes,
      tokenExpiresAt: tokens.expiresAt,
      metadata: {
        source: "oauth_callback",
        connectionMode: "read_only",
        providerAccountKind: customer.manager ? "manager" : "customer",
        parentCustomerId: customer.parentCustomerId,
        hierarchyLevel: customer.level
      }
    });
    const existing = await db.adAccountConnection.findFirst({
      where: { accountUserId, provider: "google_ads", externalAccountId: customer.customerId },
      select: { id: true }
    });

    return existing
      ? db.adAccountConnection.update({
          where: { id: existing.id },
          data: {
            scopes,
            credentialGrantId: credentialGrant.id,
            accountName,
            isTestAccount,
            encryptedAccessToken,
            encryptedRefreshToken: encryptedRefreshToken ?? undefined,
            expiresAt: tokens.expiresAt
          }
        })
      : db.adAccountConnection.create({
          data: {
            accountUserId,
            provider: "google_ads",
            externalAccountId: customer.customerId,
            accountName,
            isTestAccount,
            scopes,
            credentialGrantId: credentialGrant.id,
            encryptedAccessToken,
            encryptedRefreshToken,
            expiresAt: tokens.expiresAt
          }
        });
  });

  await Promise.all(upserts);
  logApiEvent("info", eventId, "connections.google.callback.completed", {
    customers: customers.length,
    managerRoots: customers.filter((customer) => !customer.parentCustomerId).length,
    discoveredChildren: customers.filter((customer) => customer.parentCustomerId).length
  });

  return redirectWithSuccess(customers.length);
}
