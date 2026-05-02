import React from "react";
import { DemoAppHeader } from "./DemoAppHeader";
import { DemoSideNav, type DemoApp } from "./DemoSideNav";

export function DemoAppShell({
  app,
  children
}: {
  app: DemoApp;
  children: React.ReactNode;
}) {
  return (
    <div className={`demoAppShell demoAppShell-${app}`}>
      <DemoSideNav app={app} />
      <div className="demoAppShellMain">
        <DemoAppHeader app={app} />
        <div className="demoAppShellContent">{children}</div>
      </div>
    </div>
  );
}
