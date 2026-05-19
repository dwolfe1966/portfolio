"use client";

import React from "react";
import { useEffect, useState } from "react";
import { DemoAppHeader } from "./DemoAppHeader";
import { DemoSideNav, type DemoApp } from "./DemoSideNav";
import type { StatusBand } from "./StatusDot";
import type { ActiveDataSourceSummary } from "@/lib/active-data-source-summary";

export type DemoTheme = "dark" | "light";

export function DemoAppShell({
  app,
  globalStatus,
  activeDataSource,
  children
}: {
  app: DemoApp;
  globalStatus?: { band: StatusBand; detail?: string };
  activeDataSource?: ActiveDataSourceSummary;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<DemoTheme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("demoTheme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("demoTheme", next);
      return next;
    });
  }

  return (
    <div className={`demoAppShell demoAppShell-${app} demoAppShell-${theme}`}>
      <DemoSideNav app={app} />
      <div className="demoAppShellMain">
        <DemoAppHeader app={app} globalStatus={globalStatus} activeDataSource={activeDataSource} theme={theme} onToggleTheme={toggleTheme} />
        <div className="demoAppShellContent">{children}</div>
      </div>
    </div>
  );
}
