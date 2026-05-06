import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  exchangeGoogleAuthCode,
  isGoogleOAuthConfigured,
  listAccessibleCustomers
} from "@/lib/ad-connectors/google-oauth";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { verifyOAuthState } from "@/lib/oauth-state";
import { encryptOAuthToken, isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { createEventId, logApiEvent } from "@/lib/logging";

const CONNECTIONS_PAGE = "/acquisition/connections";

function redirectWithError(reason: string, eventId: string): NextResponse {
  const url = new URL(CONNECTIONS_PAGE, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  url.searchParams.set("error", reason);
  url.searchParams.set("event", eventId);
  const response = NextResponse.redirect(url);
  response.cookies.delete("oauth_state_google");
  return response;
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

  let customerIds: string[];
  try {
    customerIds = await listAccessibleCustomers(tokens.accessToken);
  } catch (err) {
    logApiEvent("error", eventId, "connections.google.callback.list_customers_failed", {
      message: err instanceof Error ? err.message : String(err)
    });
    return redirectWithError("list_customers_failed", eventId);
  }

  if (customerIds.length === 0) {
    logApiEvent("warn", eventId, "connections.google.callback.no_customers");
    return redirectWithError("no_accessible_customers", eventId);
  }

  const encryptedAccessToken = encryptOAuthToken(tokens.accessToken);
  const encryptedRefreshToken = tokens.refreshToken ? encryptOAuthToken(tokens.refreshToken) : null;
  const scopes = tokens.scope ? tokens.scope.split(/\s+/).filter(Boolean) : [];

  // Store one connection row per accessible customer. The isTestAccount
  // flag stays true at this stage because our scope is test-tier; a Phase 3
  // verification step before any data fetch confirms test_account=true.
  const upserts = customerIds.map(async (customerId) => {
    const existing = await db.adAccountConnection.findFirst({
      where: { accountUserId, provider: "google_ads", externalAccountId: customerId },
      select: { id: true }
    });

    return existing
      ? db.adAccountConnection.update({
          where: { id: existing.id },
          data: {
            scopes,
            encryptedAccessToken,
            encryptedRefreshToken: encryptedRefreshToken ?? undefined,
            expiresAt: tokens.expiresAt
          }
        })
      : db.adAccountConnection.create({
          data: {
            accountUserId,
            provider: "google_ads",
            externalAccountId: customerId,
            accountName: `Google Ads ${customerId}`,
            isTestAccount: true,
            scopes,
            encryptedAccessToken,
            encryptedRefreshToken,
            expiresAt: tokens.expiresAt
          }
        });
  });

  await Promise.all(upserts);
  logApiEvent("info", eventId, "connections.google.callback.completed", {
    customers: customerIds.length
  });

  return redirectWithSuccess(customerIds.length);
}
