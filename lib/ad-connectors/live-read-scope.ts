export const LIVE_PROVIDER_READS_ENV = "ACQUISITION_ALLOW_LIVE_PROVIDER_READS";

export function liveProviderReadsEnabled() {
  return process.env[LIVE_PROVIDER_READS_ENV]?.trim().toLowerCase() === "true";
}

export function liveProviderReadsBlockedMessage(providerLabel: string, externalAccountId: string) {
  return [
    `Refusing to fetch from live ${providerLabel} ${externalAccountId}.`,
    `Set ${LIVE_PROVIDER_READS_ENV}=true to enable read-only live provider inspection.`,
    "Provider writes remain dry-run/governed separately."
  ].join(" ");
}
