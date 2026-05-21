# Meta Ads Provider Setup

This guide captures the exact Meta setup needed for the Acquisition provider connection flow in `davidwolfe.app`.

The app currently uses Meta OAuth for read-only Marketing API access. It discovers accessible ad accounts through `/me/adaccounts`, stores encrypted OAuth tokens, and can inspect campaigns, ad sets, ads, and performance data when live provider reads are enabled.

## What You Need From Meta

Collect these values before testing the provider:

- `META_APP_ID`: Meta app ID from the app dashboard.
- `META_APP_SECRET`: Meta app secret from the app dashboard.
- `META_OAUTH_REDIRECT_URI`: callback URL registered in the Meta app.
- Optional `META_GRAPH_API_VERSION`: Graph API version. The app defaults to `v25.0`.
- A Meta user account that has access to at least one ad account in Business Manager.
- At least one ad account with campaign data if you want campaign/ad set/ad/performance inspection to show real rows.

The app does not require a manually entered ad account ID. After OAuth, it lists every ad account the signed-in Meta user can access.

## 1. Create Or Open A Meta App

1. Go to Meta for Developers: `https://developers.facebook.com/apps/`.
2. Create a new app or open the app you want to use for this project.
3. Recommended app type: `Business`.
4. Keep the app in development mode while testing with your own Meta user and business assets.
5. Add the Marketing API product to the app.

## 2. Copy App Credentials

In the Meta app dashboard:

1. Open `Settings` -> `Basic`.
2. Copy the `App ID`.
3. Reveal and copy the `App Secret`.

These map to:

```bash
META_APP_ID=...
META_APP_SECRET=...
```

Do not commit these values.

## 3. Configure OAuth Redirect URIs

The app uses this callback route:

```text
/api/connections/meta/callback
```

For local testing, add this redirect URI in the Meta app's Facebook Login settings:

```text
http://localhost:3000/api/connections/meta/callback
```

For production, also add:

```text
https://davidwolfe.app/api/connections/meta/callback
```

Then set the matching local env var:

```bash
META_OAUTH_REDIRECT_URI=http://localhost:3000/api/connections/meta/callback
```

For production, set:

```bash
META_OAUTH_REDIRECT_URI=https://davidwolfe.app/api/connections/meta/callback
```

The redirect URI must match exactly, including protocol, host, path, and trailing slash behavior.

## 4. Confirm Marketing API Permission Scope

The current code requests this OAuth scope:

```text
ads_read
```

That scope is used for read-only access to ad accounts, campaigns, ad sets, ads, and insights.

For local development against your own Meta user and business assets, app review should not be needed. For broader production use with other users or businesses, Meta may require business verification and App Review for Marketing API permissions.

## 5. Confirm Business Manager And Ad Account Access

In Meta Business settings:

1. Open `Business settings`.
2. Confirm the signed-in Meta user is added to the business.
3. Confirm the user has access to the ad account you want to test.
4. Confirm the ad account has at least campaign-level access for that user.

If OAuth succeeds but the app says no accessible ad accounts were found, the usual cause is that the signed-in Meta user does not have access to any ad accounts visible to that Meta app.

## 6. Set Local Environment Variables

Add these to `.env.local`:

```bash
OAUTH_ENCRYPTION_KEY=...

META_APP_ID=...
META_APP_SECRET=...
META_OAUTH_REDIRECT_URI=http://localhost:3000/api/connections/meta/callback
META_GRAPH_API_VERSION=v25.0

ACQUISITION_ALLOW_LIVE_PROVIDER_READS=true
```

`OAUTH_ENCRYPTION_KEY` is required because the app encrypts OAuth tokens before storing them. Generate it with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`ACQUISITION_ALLOW_LIVE_PROVIDER_READS=true` is needed for local read-only inspection of live provider accounts. It does not enable live provider writes.

Restart localhost after changing `.env.local`.

## 7. Connect Meta In The App

1. Start the app locally.
2. Open `/acquisition/connections`.
3. In `Connect a Provider`, choose `Connect Meta Ads`.
4. Complete the Meta OAuth prompt.
5. Return to `/acquisition/connections`.
6. Confirm Meta accounts appear in the provider account table.

Expected success behavior:

- The page reports how many Meta accounts were connected.
- Each accessible Meta ad account appears as a provider row.
- Opening a Meta account should show the account detail page.
- If live reads are enabled and Meta permissions are valid, the detail page should inspect campaigns, ad sets, ads, and performance data.

## 8. Troubleshooting

### Meta OAuth is not configured

Check:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_OAUTH_REDIRECT_URI`
- `OAUTH_ENCRYPTION_KEY`

Restart localhost after changing env vars.

### Token exchange failed

Likely causes:

- The app secret is wrong.
- The redirect URI in `.env.local` does not exactly match the redirect URI configured in Meta.
- The Meta app was changed or deleted.

### No accessible ad accounts

Likely causes:

- The signed-in Meta user is not assigned to any ad account.
- The user is in the wrong Business Manager.
- The ad account is not available to the app while it is in development mode.

### Account connects, but campaign inspection is blocked

Check:

- `ACQUISITION_ALLOW_LIVE_PROVIDER_READS=true` is set locally.
- Localhost was restarted after setting the env var.
- The Meta user has permission to read campaigns/ad sets/ads for that account.
- The ad account actually has campaigns.

### Campaigns appear, but performance is empty

Likely causes:

- The campaign has no spend or delivery in the last 14 days.
- The campaign is too new for insights rows to accrue.
- The selected campaign has objects but no available insight metrics for the current date range.

## 9. Production Checklist

Before relying on Meta in production:

- Add `https://davidwolfe.app/api/connections/meta/callback` to the Meta app redirect URIs.
- Add Meta env vars to the production host.
- Use a production-specific `OAUTH_ENCRYPTION_KEY`.
- Confirm the app is using the intended Graph API version.
- Decide whether the Meta app needs business verification or App Review for the intended user population.
- Keep provider writes dry-run/governed until the production write-safety workflow is complete.

## Current App Env Reference

The app reads these Meta env vars in `lib/ad-connectors/meta-oauth.ts`:

```bash
META_APP_ID
META_APP_SECRET
META_OAUTH_REDIRECT_URI
META_GRAPH_API_VERSION
```

The app also relies on shared OAuth/provider controls:

```bash
OAUTH_ENCRYPTION_KEY
ACQUISITION_ALLOW_LIVE_PROVIDER_READS
```
