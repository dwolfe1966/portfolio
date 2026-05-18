"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabGroups = [
  {
    label: "Operate",
    tabs: [
      { href: "/workspace/dashboard", label: "Dashboard" },
      { href: "/workspace/agents", label: "Agents" },
      { href: "/workspace/report", label: "Report" }
    ]
  },
  {
    label: "Data",
    tabs: [
      { href: "/workspace/datasets", label: "Datasets" },
      { href: "/workspace/connections", label: "Connections" }
    ]
  },
  {
    label: "Admin",
    tabs: [
      { href: "/workspace/account", label: "Account" },
      { href: "/workspace/settings", label: "Settings" },
      { href: "/workspace/activity", label: "Activity" }
    ]
  }
];

export function DemoWorkspaceTabs() {
  const pathname = usePathname();
  const workspacePathname = pathname.replace(/^\/demo/, "/workspace");

  return (
    <nav className="demoWorkspaceTabs" aria-label="Workspace navigation">
      {tabGroups.map((group) => (
        <div className="demoWorkspaceTabGroup" key={group.label}>
          <span className="demoWorkspaceTabGroupLabel">{group.label}</span>
          <div className="demoWorkspaceTabGroupLinks">
            {group.tabs.map((tab) => (
              <Link
                className={`demoWorkspaceTab ${workspacePathname === tab.href || workspacePathname.startsWith(`${tab.href}/`) ? "active" : ""}`}
                href={tab.href}
                key={tab.href}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
