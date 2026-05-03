import { EnvironmentChip } from "./EnvironmentChip";
import { StatusDot, type StatusBand } from "./StatusDot";
import { DemoAppBreadcrumbs } from "./DemoAppBreadcrumbs";
import type { DemoApp } from "./DemoSideNav";

const APP_LABEL: Record<DemoApp, string> = {
  lifecycle: "Lifecycle Engine",
  acquisition: "Acquisition Agent",
  auction: "Auction Desk",
  pricing: "Pricing Control Tower",
  retention: "Retention Command Center"
};

const BAND_TEXT: Record<StatusBand, string> = {
  healthy: "Healthy",
  watch: "Watch",
  unhealthy: "Unhealthy",
  neutral: "Neutral",
  insufficient: "No data"
};

export function DemoAppHeader({
  app,
  globalStatus
}: {
  app: DemoApp;
  globalStatus?: { band: StatusBand; detail?: string };
}) {
  return (
    <header className="demoAppHeader" aria-label={`${app} demo header`}>
      <div className="demoAppHeaderLeft">
        <EnvironmentChip />
        <span className="demoAppHeaderAppName">{APP_LABEL[app]}</span>
        <DemoAppBreadcrumbs app={app} />
      </div>
      {globalStatus ? (
        <div className="demoAppHeaderRight">
          <StatusDot band={globalStatus.band} />
          <span>{globalStatus.detail ?? BAND_TEXT[globalStatus.band]}</span>
        </div>
      ) : null}
    </header>
  );
}
