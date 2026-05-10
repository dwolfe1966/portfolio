import { EnvironmentChip } from "./EnvironmentChip";
import { StatusDot, type StatusBand } from "./StatusDot";
import { DemoAppBreadcrumbs } from "./DemoAppBreadcrumbs";
import type { DemoApp } from "./DemoSideNav";
import type { DemoTheme } from "./DemoAppShell";

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
  theme,
  onToggleTheme
}: {
  app: DemoApp;
  globalStatus?: { band: StatusBand; detail?: string };
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
