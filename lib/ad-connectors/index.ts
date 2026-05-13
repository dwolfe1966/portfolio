import { SimulatedConnector } from "./simulated";
import { GoogleAdsConnector } from "./google-ads-connector";
import { MetaAdsConnector } from "./meta-ads-connector";
import type { AdConnector, AdProvider } from "./types";

export type { AdConnector, AdProvider } from "./types";
export type {
  DateRange,
  RemoteAdAccount,
  RemoteAdGroup,
  RemoteAdUnit,
  RemoteCampaign,
  RemotePerformance,
  RemotePerformancePoint
} from "./types";
export type {
  AttributionWindow,
  NormalizedAdChannel,
  NormalizedCampaign,
  NormalizedCampaignState,
  NormalizedPerformance,
  NormalizedPerformancePoint
} from "./normalization";
export { SimulatedConnector } from "./simulated";
export {
  GoogleAdsConnector,
  GoogleAdsConnectorError,
  GoogleAdsDeveloperTokenAccessError,
  GoogleAdsNotTestAccountError
} from "./google-ads-connector";
export { MetaAdsConnector, MetaAdsConnectorError, MetaAdsNotTestAccountError } from "./meta-ads-connector";
export {
  GoogleAdsProviderWriteDryRunAdapter,
  MetaAdsProviderWriteDryRunAdapter,
  SimulatedAdProviderWriteDryRunAdapter,
  getAdProviderWriteDryRunAdapter,
  hasAdProviderWriteDryRunAdapter,
  normalizeAdProviderWriteDryRunInput,
  type AdProviderWriteDryRunAdapter,
  type AdProviderWriteDryRunInput,
  type AdProviderWriteDryRunResult
} from "./write-dry-run";
export {
  canonicalCampaignName,
  inferAdChannel,
  normalizeAttributionWindow,
  normalizeCampaignState,
  normalizeRemoteCampaign,
  normalizeRemotePerformance
} from "./normalization";

/**
 * Resolve a connector for a given provider.
 * - "simulated" returns the deterministic mock connector
 * - "google_ads" returns the real GoogleAdsConnector (read-only against
 *   stored OAuth connections, refuses non-test accounts)
 * - "meta_ads" returns the real MetaAdsConnector (read-only against
 *   stored OAuth connections, refuses non-test accounts)
 */
export function getConnector(provider: AdProvider): AdConnector {
  switch (provider) {
    case "simulated":
      return new SimulatedConnector();
    case "google_ads":
      return new GoogleAdsConnector();
    case "meta_ads":
      return new MetaAdsConnector();
    default:
      return new SimulatedConnector();
  }
}
