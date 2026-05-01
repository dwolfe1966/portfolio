"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const lifecycleLinks = [
  { href: "/lifecycle/overview", label: "Overview" },
  { href: "/lifecycle/inputs", label: "Inputs" },
  { href: "/lifecycle/simulations", label: "Simulations" },
  { href: "/lifecycle/outputs", label: "Outputs" },
  { href: "/lifecycle/campaigns", label: "Campaigns" },
  { href: "/lifecycle/dashboard", label: "Dashboard" },
  { href: "/lifecycle/documentation", label: "Docs" }
];

const acquisitionLinks = [
  { href: "/acquisition/overview", label: "Overview" },
  { href: "/acquisition/inputs", label: "Inputs" },
  { href: "/acquisition/create", label: "Create" },
  { href: "/acquisition/campaigns", label: "Campaigns" },
  { href: "/acquisition/simulations", label: "Simulations" },
  { href: "/acquisition/outputs", label: "Outputs" }
];

export function AppWorkspaceShellNav({ app }: { app: "lifecycle" | "acquisition" }) {
  const pathname = usePathname();
  const appLinks = app === "lifecycle" ? lifecycleLinks : acquisitionLinks;

  return (
    <nav className="appWorkspaceNav card" aria-label={`${app} workspace navigation`}>
      <p className="eyebrow">App workspace</p>
      <h3>{app === "lifecycle" ? "Lifecycle operations app" : "Acquisition operations app"}</h3>
      <p className="small">Jump to any stage within this app workflow.</p>

      <div className="appWorkspaceLinks">
        {appLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} className={`appPill ${active ? "active" : ""}`}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
