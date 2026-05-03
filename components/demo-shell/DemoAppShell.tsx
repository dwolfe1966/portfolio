"use client";

import React from "react";
import { useEffect, useState } from "react";
import { DemoAppHeader } from "./DemoAppHeader";
import { DemoSideNav, type DemoApp } from "./DemoSideNav";
import type { StatusBand } from "./StatusDot";

export type DemoTheme = "dark" | "light";

export function DemoAppShell({
  app,
  globalStatus,
  children
}: {
  app: DemoApp;
  globalStatus?: { band: StatusBand; detail?: string };
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
        <DemoAppHeader app={app} globalStatus={globalStatus} theme={theme} onToggleTheme={toggleTheme} />
        <div className="demoAppShellContent">{children}</div>
      </div>
    </div>
  );
}
