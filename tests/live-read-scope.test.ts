import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_PROVIDER_READS_ENV,
  liveProviderReadsBlockedMessage,
  liveProviderReadsEnabled
} from "@/lib/ad-connectors/live-read-scope";
import { GoogleAdsDeveloperTokenAccessError } from "@/lib/ad-connectors/google-ads-connector";

test("liveProviderReadsEnabled is opt-in only", () => {
  const previous = process.env[LIVE_PROVIDER_READS_ENV];
  delete process.env[LIVE_PROVIDER_READS_ENV];
  assert.equal(liveProviderReadsEnabled(), false);

  process.env[LIVE_PROVIDER_READS_ENV] = "true";
  assert.equal(liveProviderReadsEnabled(), true);

  process.env[LIVE_PROVIDER_READS_ENV] = "false";
  assert.equal(liveProviderReadsEnabled(), false);

  if (previous === undefined) {
    delete process.env[LIVE_PROVIDER_READS_ENV];
  } else {
    process.env[LIVE_PROVIDER_READS_ENV] = previous;
  }
});

test("liveProviderReadsBlockedMessage tells operators how to enable read-only inspection", () => {
  const message = liveProviderReadsBlockedMessage("Google Ads customer", "123");
  assert.match(message, /Google Ads customer 123/);
  assert.match(message, new RegExp(`${LIVE_PROVIDER_READS_ENV}=true`));
  assert.match(message, /read-only live provider inspection/);
});

test("GoogleAdsDeveloperTokenAccessError separates local live reads from Google token approval", () => {
  const previous = process.env[LIVE_PROVIDER_READS_ENV];
  process.env[LIVE_PROVIDER_READS_ENV] = "true";

  const error = new GoogleAdsDeveloperTokenAccessError("123");
  assert.match(error.message, /developer token is not approved/);
  assert.match(error.message, /Basic or Standard access/);
  assert.doesNotMatch(error.message, new RegExp(`Set ${LIVE_PROVIDER_READS_ENV}=true`));

  if (previous === undefined) {
    delete process.env[LIVE_PROVIDER_READS_ENV];
  } else {
    process.env[LIVE_PROVIDER_READS_ENV] = previous;
  }
});
