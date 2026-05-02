"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DemoApp = "lifecycle" | "acquisition";

type NavLink = {
  href: string;
  label: string;
  group?: "primary" | "operations";
};

const LIFECYCLE_LINKS: NavLink[] = [
  { href: "/lifecycle/overview", label: "Overview", group: "primary" },
  { href: "/lifecycle/inputs", label: "Inputs", group: "primary" },
  { href: "/lifecycle/simulations", label: "Simulations", group: "primary" },
  { href: "/lifecycle/outputs", label: "Outputs", group: "primary" },
  { href: "/lifecycle/campaigns", label: "Campaigns", group: "primary" },
  { href: "/lifecycle/dashboard", label: "Dashboard", group: "operations" },
  { href: "/lifecycle/documentation", label: "Docs", group: "operations" }
];

const ACQUISITION_LINKS: NavLink[] = [
  { href: "/acquisition/overview", label: "Overview", group: "primary" },
  { href: "/acquisition/inputs", label: "Inputs", group: "primary" },
  { href: "/acquisition/create", label: "Create", group: "primary" },
  { href: "/acquisition/campaigns", label: "Campaigns", group: "primary" },
  { href: "/acquisition/simulations", label: "Simulations", group: "primary" },
  { href: "/acquisition/outputs", label: "Outputs", group: "primary" },
  { href: "/acquisition/audit", label: "Audit", group: "operations" }
];

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function DemoSideNav({ app }: { app: DemoApp }) {
  const pathname = usePathname();
  const links = app === "lifecycle" ? LIFECYCLE_LINKS : ACQUISITION_LINKS;
  const primary = links.filter((link) => link.group !== "operations");
  const operations = links.filter((link) => link.group === "operations");

  return (
    <nav className="demoSideNav" aria-label={`${app} demo navigation`}>
      <div className="demoSideNavBrand">
        <span className="demoSideNavEnv">DEMO</span>
        <span className="demoSideNavApp">
          {app === "lifecycle" ? "Lifecycle Engine" : "Acquisition Agent"}
        </span>
      </div>

      <div className="demoSideNavSwitcher">
        <Link
          href="/lifecycle/overview"
          className={`demoSideNavSwitchItem ${app === "lifecycle" ? "active" : ""}`}
        >
          Lifecycle
        </Link>
        <Link
          href="/acquisition/overview"
          className={`demoSideNavSwitchItem ${app === "acquisition" ? "active" : ""}`}
        >
          Acquisition
        </Link>
      </div>

      <ul className="demoSideNavList">
        {primary.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`demoSideNavLink ${isActive(pathname, link.href) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      {operations.length > 0 ? (
        <>
          <div className="demoSideNavGroupLabel">Operations</div>
          <ul className="demoSideNavList">
            {operations.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`demoSideNavLink ${isActive(pathname, link.href) ? "active" : ""}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="demoSideNavFooter">
        <Link href="/" className="demoSideNavReturn">
          ← Return to portfolio
        </Link>
      </div>
    </nav>
  );
}
