import { SimulatedConnector } from "./simulated";
import type { AdConnector, AdProvider } from "./types";

export type { AdConnector, AdProvider } from "./types";
export type {
  DateRange,
  RemoteAdAccount,
  RemoteCampaign,
  RemotePerformance,
  RemotePerformancePoint
} from "./types";
export { SimulatedConnector } from "./simulated";

/**
 * Resolve a connector for a given provider. Real provider connectors
 * (google_ads, meta_ads) will be wired in Phase 3 once OAuth credentials
 * and developer tokens are in place. Until then, all providers fall back
 * to the SimulatedConnector so the UI works end-to-end.
 */
export function getConnector(provider: AdProvider): AdConnector {
  switch (provider) {
    case "simulated":
      return new SimulatedConnector();
    case "google_ads":
    case "meta_ads":
      // Phase 3: replace with GoogleAdsConnector / MetaAdsConnector.
      return new SimulatedConnector();
    default:
      return new SimulatedConnector();
  }
}
