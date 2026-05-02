import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthorizeUrl, isGoogleOAuthConfigured } from "@/lib/ad-connectors/google-oauth";
import { createOAuthState } from "@/lib/oauth-state";
import { isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { apiError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET(_: NextRequest) {
  const eventId = createEventId("conn_g_start");

  if (!isOAuthEncryptionAvailable()) {
    logApiEvent("warn", eventId, "connections.google.start.no_encryption_key");
    return apiError(
      503,
      "OAUTH_ENCRYPTION_UNAVAILABLE",
      "OAUTH_ENCRYPTION_KEY is not configured. Set it in .env.local and restart.",
      { eventId }
    );
  }

  if (!isGoogleOAuthConfigured()) {
    logApiEvent("warn", eventId, "connections.google.start.not_configured");
    return apiError(
      503,
      "GOOGLE_OAUTH_NOT_CONFIGURED",
      "Google OAuth env vars are missing. See docs/ad-connector-setup.md.",
      { eventId }
    );
  }

  const state = createOAuthState("google_ads");
  const authorizeUrl = buildGoogleAuthorizeUrl(state);

  logApiEvent("info", eventId, "connections.google.start.redirecting");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("oauth_state_google", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  return response;
}
