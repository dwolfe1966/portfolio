import { NextRequest, NextResponse } from "next/server";
import { buildMetaAuthorizeUrl, isMetaOAuthConfigured } from "@/lib/ad-connectors/meta-oauth";
import { createOAuthState } from "@/lib/oauth-state";
import { isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { apiError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET(_: NextRequest) {
  const eventId = createEventId("conn_m_start");

  if (!isOAuthEncryptionAvailable()) {
    logApiEvent("warn", eventId, "connections.meta.start.no_encryption_key");
    return apiError(
      503,
      "OAUTH_ENCRYPTION_UNAVAILABLE",
      "OAUTH_ENCRYPTION_KEY is not configured. Set it in .env.local and restart.",
      { eventId }
    );
  }

  if (!isMetaOAuthConfigured()) {
    logApiEvent("warn", eventId, "connections.meta.start.not_configured");
    return apiError(
      503,
      "META_OAUTH_NOT_CONFIGURED",
      "Meta OAuth env vars are missing. See docs/ad-connector-setup.md.",
      { eventId }
    );
  }

  const state = createOAuthState("meta_ads");
  const authorizeUrl = buildMetaAuthorizeUrl(state);

  logApiEvent("info", eventId, "connections.meta.start.redirecting");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("oauth_state_meta", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  return response;
}
