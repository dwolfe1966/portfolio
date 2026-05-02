import { EnvironmentChip } from "./EnvironmentChip";
import type { DemoApp } from "./DemoSideNav";

const APP_LABEL: Record<DemoApp, string> = {
  lifecycle: "Lifecycle Engine",
  acquisition: "Acquisition Agent"
};

export function DemoAppHeader({ app }: { app: DemoApp }) {
  return (
    <header className="demoAppHeader" aria-label={`${app} demo header`}>
      <div className="demoAppHeaderLeft">
        <EnvironmentChip />
        <span className="demoAppHeaderAppName">{APP_LABEL[app]}</span>
      </div>
    </header>
  );
}
