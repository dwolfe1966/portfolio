import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeMetaAuthCode, isMetaOAuthConfigured, listMetaAdAccounts } from "@/lib/ad-connectors/meta-oauth";
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
  response.cookies.delete("oauth_state_meta");
  return response;
}

function redirectWithSuccess(connectedCount: number): NextResponse {
  const url = new URL(CONNECTIONS_PAGE, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  url.searchParams.set("connected", String(connectedCount));
  const response = NextResponse.redirect(url);
  response.cookies.delete("oauth_state_meta");
  return response;
}

export async function GET(req: NextRequest) {
  const eventId = createEventId("conn_m_cb");
  const accountUserId = verifyAccountSessionToken(req.cookies.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;

  if (!isOAuthEncryptionAvailable() || !isMetaOAuthConfigured()) {
    logApiEvent("warn", eventId, "connections.meta.callback.not_configured");
    return redirectWithError("not_configured", eventId);
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    logApiEvent("warn", eventId, "connections.meta.callback.provider_error", { errorParam });
    return redirectWithError(`provider:${errorParam}`, eventId);
  }
  if (!code || !state) {
    logApiEvent("warn", eventId, "connections.meta.callback.missing_params");
    return redirectWithError("missing_params", eventId);
  }

  const cookieState = req.cookies.get("oauth_state_meta")?.value;
  if (!cookieState || cookieState !== state) {
    logApiEvent("warn", eventId, "connections.meta.callback.state_cookie_mismatch");
    return redirectWithError("state_cookie_mismatch", eventId);
  }

  const stateCheck = verifyOAuthState(state, "meta_ads");
  if (!stateCheck.ok) {
    logApiEvent("warn", eventId, "connections.meta.callback.state_invalid", { reason: stateCheck.reason });
    return redirectWithError(`state_${stateCheck.reason}`, eventId);
  }

  let tokens;
  try {
    tokens = await exchangeMetaAuthCode(code);
  } catch (err) {
    logApiEvent("error", eventId, "connections.meta.callback.exchange_failed", {
      message: err instanceof Error ? err.message : String(err)
    });
    return redirectWithError("token_exchange_failed", eventId);
  }

  let accounts;
  try {
    accounts = await listMetaAdAccounts(tokens.accessToken);
  } catch (err) {
    logApiEvent("error", eventId, "connections.meta.callback.list_accounts_failed", {
      message: err instanceof Error ? err.message : String(err)
    });
    return redirectWithError("list_accounts_failed", eventId);
  }

  if (accounts.length === 0) {
    logApiEvent("warn", eventId, "connections.meta.callback.no_accounts");
    return redirectWithError("no_accessible_accounts", eventId);
  }

  const encryptedAccessToken = encryptOAuthToken(tokens.accessToken);
  const scopes = tokens.scope ? tokens.scope.split(/\s+/).filter(Boolean) : [];

  const upserts = accounts.map(async (account) => {
    const existing = await db.adAccountConnection.findFirst({
      where: { accountUserId, provider: "meta_ads", externalAccountId: account.id },
      select: { id: true }
    });

    return existing
      ? db.adAccountConnection.update({
          where: { id: existing.id },
          data: {
            accountName: account.name,
            scopes,
            encryptedAccessToken,
            expiresAt: tokens.expiresAt
          }
        })
      : db.adAccountConnection.create({
          data: {
            accountUserId,
            provider: "meta_ads",
            externalAccountId: account.id,
            accountName: account.name,
            isTestAccount: true,
            scopes,
            encryptedAccessToken,
            encryptedRefreshToken: null,
            expiresAt: tokens.expiresAt
          }
        });
  });

  await Promise.all(upserts);
  logApiEvent("info", eventId, "connections.meta.callback.completed", { accounts: accounts.length });
  return redirectWithSuccess(accounts.length);
}
