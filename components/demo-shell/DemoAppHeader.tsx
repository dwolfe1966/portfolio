import { EnvironmentChip } from "./EnvironmentChip";
import { StatusDot, type StatusBand } from "./StatusDot";
import { DemoAppBreadcrumbs } from "./DemoAppBreadcrumbs";
import type { DemoApp } from "./DemoSideNav";
import type { DemoTheme } from "./DemoAppShell";
import type { ActiveDataSourceSummary } from "@/lib/active-data-source-summary";

const BAND_TEXT: Record<StatusBand, string> = {
  healthy: "Healthy",
  watch: "Watch",
  unhealthy: "Unhealthy",
  neutral: "Neutral",
  insufficient: "No data"
};

export function DemoAppHeader({
  app,
  globalStatus,
  activeDataSource,
  theme,
  onToggleTheme
}: {
  app: DemoApp;
  globalStatus?: { band: StatusBand; detail?: string };
  activeDataSource?: ActiveDataSourceSummary;
  theme: DemoTheme;
  onToggleTheme: () => void;
}) {
  return (
    <header className="demoAppHeader" aria-label={`${app} demo header`}>
      <div className="demoAppHeaderLeft">
        <EnvironmentChip />
        <DemoAppBreadcrumbs app={app} />
      </div>
      <div className="demoAppHeaderRight">
        {activeDataSource ? (
          <a className={`demoDataSourceChip demoDataSourceChip-${activeDataSource.mode}`} href={activeDataSource.href}>
            <span className="demoDataSourceDot" aria-hidden />
            <span>
              <strong>{activeDataSource.mode === "imported" ? "Imported data" : "Sample data"}</strong>
              <small>{activeDataSource.label}</small>
              <small>{activeDataSource.detail}</small>
            </span>
          </a>
        ) : null}
        {globalStatus ? (
          <span className="demoAppHeaderStatus">
            <StatusDot band={globalStatus.band} />
            <span>{globalStatus.detail ?? BAND_TEXT[globalStatus.band]}</span>
          </span>
        ) : null}
        <button
          type="button"
          className="demoThemeToggle"
          aria-label={`Switch Tool to ${theme === "dark" ? "light" : "dark"} mode`}
          onClick={onToggleTheme}
        >
          <span>{theme === "dark" ? "Dark" : "Light"}</span>
          <i aria-hidden />
        </button>
      </div>
    </header>
  );
}
