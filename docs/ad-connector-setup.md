# Ad-Connector Setup Guide

Setup checklist for connecting real ad platforms (Google Ads + Meta Ads) to the demo. Scope is **test-tier credentials, read-only API calls against your own test accounts**. No real campaigns are read or written; no production OAuth review is required.

This guide is what you need to configure Google Ads and Meta Ads OAuth for the read-only provider workflows. Until you complete the steps in [Section 1](#1-google-ads-setup) and [Section 2](#2-meta-ads-setup) and provide env vars per [Section 3](#3-environment-variables), connected-provider pages will remain unavailable and the demo continues to run on sample/simulated data.

## Prerequisites

- A Google account that owns or can create a Google Ads test Manager account
- A Meta (Facebook) account that owns a Business Manager and an ad account
- Approximately 30–60 minutes for Google setup (the developer-token application takes 1–3 business days to be approved)
- Approximately 20–30 minutes for Meta setup

## 1. Google Ads setup

### 1a. Create a Google Cloud Project + OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project, e.g. `portfolio-ad-connector`.
3. Enable the **Google Ads API** for the project: **APIs & Services → Library → search "Google Ads API" → Enable**.
4. Configure the OAuth consent screen: **APIs & Services → OAuth consent screen**.
   - User type: **External**
   - App name: `Portfolio Demo`
   - User support email: your email
   - Scopes: leave blank for now; we'll add `https://www.googleapis.com/auth/adwords` programmatically in Phase 2
   - Test users: add your Google account email (required while the app is in "Testing" mode)
   - Save without publishing — keeping it in **Testing** mode is fine for test-tier scope.
5. Create OAuth credentials: **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**
   - Name: `Portfolio Demo Web Client`
   - Authorized redirect URIs (add both):
     - `http://localhost:3000/api/connections/google/callback`
     - `https://YOUR-VERCEL-DOMAIN/api/connections/google/callback`
6. Copy the **Client ID** and **Client secret**. You'll paste these into env vars in Section 3.

### 1b. Apply for a Google Ads developer token (test tier)

1. Open [Google Ads](https://ads.google.com/) and either use an existing Manager (MCC) account or create a new one (manager accounts are free).
2. Go to **Tools & Settings → API Center**.
3. Apply for a developer token. Suggested application copy:

   > **Application use case:** I am a software engineer building a portfolio demo that integrates with the Google Ads API to demonstrate a programmatic-buying agent architecture. The integration is read-only and connects only to my own test Manager account. No production campaigns are read or modified. The token will be used in **test-tier** mode only.
   >
   > **Tools and platforms:** Custom Node.js application (Next.js + TypeScript) using the Google Ads API REST endpoints.
   >
   > **Data handling:** OAuth tokens are encrypted at rest with AES-256-GCM. Only campaign metadata and aggregate performance metrics are read. No PII is stored.

4. While the token is in pending state, you can use it in **test mode only**. Test mode is sufficient for this project.
5. Once issued (1–3 business days), copy the developer token. You'll paste it into env vars in Section 3.

### 1c. Create or designate a test customer

1. Inside your Manager account, **Tools & Settings → Setup → Sub-account settings**.
2. Either select an existing test customer or create one: **Create account → Test account**. (Test accounts cannot run real ads — that's the point.)
3. Note the customer ID (format `XXX-XXX-XXXX`). You'll be prompted for it on first connect in Phase 2.

## 2. Meta Ads setup

### 2a. Create a Meta App in development mode

1. Open [Meta for Developers](https://developers.facebook.com/apps/).
2. **Create App → Type: Business → Continue**.
3. App name: `Portfolio Demo`. Email: your email.
4. After creation, the app will be in **Development mode** by default. Leave it there — production App Review is **not** needed for read-only access against your own dev/test ad accounts.
5. Add the **Marketing API** product: app dashboard → **Add Product → Marketing API → Set up**.

### 2b. Configure OAuth redirect URIs

1. In the app dashboard: **Facebook Login → Settings → Valid OAuth Redirect URIs**.
2. Add both:
   - `http://localhost:3000/api/connections/meta/callback`
   - `https://YOUR-VERCEL-DOMAIN/api/connections/meta/callback`

### 2c. Note App ID + App Secret

App dashboard → **Settings → Basic**. Copy:
- **App ID**
- **App Secret** (click "Show" — this requires re-entering your password)

### 2d. Connect a test ad account

1. Open [Meta Business Manager](https://business.facebook.com/).
2. **Business settings → Accounts → Ad Accounts → Add → Create a new ad account**.
3. Pick any small currency / time zone. Mark as a **dev** account if the option is offered.
4. Note the ad account ID (format `act_XXXXXXXXXX`). Phase 2 will fetch the list automatically; you don't need to wire it manually.

## 3. Environment variables

After the steps above, set these in `.env.local` (for local dev) and in **Vercel project settings** (for production). Never commit secrets to the repo.

```bash
# OAuth encryption — one-time generation (see below)
OAUTH_ENCRYPTION_KEY=...

# Google Ads
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/connections/google/callback  # or production URL

# Meta Ads
META_APP_ID=...
META_APP_SECRET=...
META_OAUTH_REDIRECT_URI=http://localhost:3000/api/connections/meta/callback
```

### Generating the OAuth encryption key

Run this once and paste the output into `OAUTH_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This key is used to encrypt OAuth refresh tokens at rest in the `AdAccountConnection` table. **Use the same key in local and production** if you want connections made locally to be readable in production (typically not what you want — generate a fresh key per environment).

## 4. What I'll build in Phase 2

Once Section 1 and 2 are done and the env vars are set, Phase 2 delivers:

- `/api/connections/google/start`, `/api/connections/google/callback`, `/api/connections/meta/start`, and `/api/connections/meta/callback` — OAuth code exchange, token storage in `AdAccountConnection`, encrypted at rest.
- `/acquisition/connections` page — list of connected accounts, "Connect Google" / "Connect Meta" buttons, disconnect action, last-fetched timestamps.
- Side-nav entry for Connections.
- Token refresh helpers (Google access tokens last ~1 hour; refresh tokens last until revoked).
- Tests for the OAuth state-token CSRF guard and the encrypt/decrypt helper.

## 5. Phase 3 (after dev tokens approved)

- `GoogleAdsConnector` and `MetaAdsConnector` implementing the `AdConnector` interface (`fetchAccounts`, `fetchCampaigns`, `fetchAdGroups`, `fetchAds`, `fetchPerformance`).
- Hard guard: any account marked non-test is rejected at the connector layer before any API call.
- Connections page renders live remote campaign + performance data alongside the simulation.
- Dispatch in `lib/ad-connectors/index.ts` swaps the SimulatedConnector fallback for the real implementation per provider.

## Status checklist

Hand this back when each item is done:

- [ ] Google Cloud Project created
- [ ] Google OAuth client ID + secret obtained
- [ ] Google Ads developer token requested (test tier)
- [ ] Google Ads developer token approved
- [ ] Test Manager + test customer ID noted
- [ ] Meta App created in development mode
- [ ] Meta App ID + secret obtained
- [ ] Meta test ad account created
- [ ] `OAUTH_ENCRYPTION_KEY` generated
- [ ] All env vars set in `.env.local`
- [ ] All env vars set in Vercel project settings
- [ ] Production redirect URIs added in both Google and Meta consoles
