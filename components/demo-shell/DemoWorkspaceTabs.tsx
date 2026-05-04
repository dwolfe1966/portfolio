"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/demo/dashboard", label: "Dashboard" },
  { href: "/demo/activity", label: "Activity" },
  { href: "/demo/connections", label: "Connections" },
  { href: "/demo/datasets", label: "Datasets" },
  { href: "/demo/settings", label: "Settings" }
];

export function DemoWorkspaceTabs() {
  const pathname = usePathname();

  return (
    <nav className="demoWorkspaceTabs" aria-label="Workspace navigation">
      {tabs.map((tab) => (
        <Link
          className={`demoWorkspaceTab ${pathname === tab.href ? "active" : ""}`}
          href={tab.href}
          key={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
