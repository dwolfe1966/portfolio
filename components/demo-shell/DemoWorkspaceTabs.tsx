"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/workspace/dashboard", label: "Dashboard" },
  { href: "/workspace/activity", label: "Activity" },
  { href: "/workspace/connections", label: "Connections" },
  { href: "/workspace/datasets", label: "Datasets" },
  { href: "/workspace/settings", label: "Settings" }
];

export function DemoWorkspaceTabs() {
  const pathname = usePathname();

  return (
    <nav className="demoWorkspaceTabs" aria-label="Workspace navigation">
      {tabs.map((tab) => (
        <Link
          className={`demoWorkspaceTab ${pathname === tab.href || pathname.replace(/^\/demo/, "/workspace") === tab.href ? "active" : ""}`}
          href={tab.href}
          key={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
