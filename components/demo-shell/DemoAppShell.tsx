import React from "react";
import { DemoAppHeader } from "./DemoAppHeader";
import { DemoSideNav, type DemoApp } from "./DemoSideNav";
import type { StatusBand } from "./StatusDot";

export function DemoAppShell({
  app,
  globalStatus,
  children
}: {
  app: DemoApp;
  globalStatus?: { band: StatusBand; detail?: string };
  children: React.ReactNode;
}) {
  return (
    <div className={`demoAppShell demoAppShell-${app}`}>
      <DemoSideNav app={app} />
      <div className="demoAppShellMain">
        <DemoAppHeader app={app} globalStatus={globalStatus} />
        <div className="demoAppShellContent">{children}</div>
      </div>
    </div>
  );
}
