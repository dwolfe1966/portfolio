"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type DemoApp = "lifecycle" | "acquisition" | "auction" | "pricing" | "retention" | "expansion";

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
  { href: "/lifecycle/docs", label: "Docs", group: "operations" },
  { href: "/lifecycle/audit", label: "Audit", group: "operations" }
];

const AUCTION_LINKS: NavLink[] = [
  { href: "/auction/overview", label: "Overview", group: "primary" },
  { href: "/auction/inputs", label: "Inputs", group: "primary" },
  { href: "/auction/simulations", label: "Simulations", group: "primary" },
  { href: "/auction/outputs", label: "Outputs", group: "primary" },
  { href: "/auction/health", label: "Health", group: "primary" },
  { href: "/auction/docs", label: "Docs", group: "operations" },
  { href: "/auction/audit", label: "Audit", group: "operations" }
];

const PRICING_LINKS: NavLink[] = [
  { href: "/pricing/overview", label: "Overview", group: "primary" },
  { href: "/pricing/inputs", label: "Inputs", group: "primary" },
  { href: "/pricing/segments", label: "Segments", group: "primary" },
  { href: "/pricing/simulations", label: "Simulations", group: "primary" },
  { href: "/pricing/outputs", label: "Outputs", group: "primary" },
  { href: "/pricing/decisions", label: "Decisions", group: "operations" },
  { href: "/pricing/docs", label: "Docs", group: "operations" },
  { href: "/pricing/audit", label: "Audit", group: "operations" }
];

const RETENTION_LINKS: NavLink[] = [
  { href: "/retention/overview", label: "Overview", group: "primary" },
  { href: "/retention/inputs", label: "Inputs", group: "primary" },
  { href: "/retention/accounts", label: "Accounts", group: "primary" },
  { href: "/retention/simulations", label: "Simulations", group: "primary" },
  { href: "/retention/outputs", label: "Outputs", group: "primary" },
  { href: "/retention/interventions", label: "Interventions", group: "operations" },
  { href: "/retention/docs", label: "Docs", group: "operations" },
  { href: "/retention/audit", label: "Audit", group: "operations" }
];

const EXPANSION_LINKS: NavLink[] = [
  { href: "/expansion/overview", label: "Overview", group: "primary" },
  { href: "/expansion/inputs", label: "Inputs", group: "primary" },
  { href: "/expansion/accounts", label: "Accounts", group: "primary" },
  { href: "/expansion/simulations", label: "Simulations", group: "primary" },
  { href: "/expansion/outputs", label: "Outputs", group: "primary" },
  { href: "/expansion/docs", label: "Docs", group: "operations" },
  { href: "/expansion/audit", label: "Audit", group: "operations" }
];

const ACQUISITION_LINKS: NavLink[] = [
  { href: "/acquisition/overview", label: "Overview", group: "primary" },
  { href: "/acquisition/inputs", label: "Inputs", group: "primary" },
  { href: "/acquisition/audiences", label: "Audiences", group: "primary" },
  { href: "/acquisition/create", label: "Create", group: "primary" },
  { href: "/acquisition/campaigns", label: "Campaigns", group: "primary" },
  { href: "/acquisition/simulations", label: "Simulations", group: "primary" },
  { href: "/acquisition/outputs", label: "Outputs", group: "primary" },
  { href: "/acquisition/connections", label: "Connections", group: "operations" },
  { href: "/acquisition/docs", label: "Docs", group: "operations" },
  { href: "/acquisition/audit", label: "Audit", group: "operations" }
];

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function DemoSideNav({ app }: { app: DemoApp }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links =
    app === "lifecycle"
      ? LIFECYCLE_LINKS
      : app === "acquisition"
        ? ACQUISITION_LINKS
        : app === "auction"
          ? AUCTION_LINKS
          : app === "pricing"
            ? PRICING_LINKS
            : app === "retention"
              ? RETENTION_LINKS
              : EXPANSION_LINKS;
  const primary = links.filter((link) => link.group !== "operations");
  const operations = links.filter((link) => link.group === "operations");
  const navBodyId = `${app}-demo-navigation-links`;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav className="demoSideNav" aria-label={`${app} demo navigation`}>
      <div className="demoSideNavBrand">
        <div className="demoSideNavBrandText">
          <span className="demoSideNavEnv">DEMO</span>
          <span className="demoSideNavApp">
            {app === "lifecycle"
              ? "Lifecycle Engine"
              : app === "acquisition"
                ? "Acquisition Agent"
                : app === "auction"
                  ? "Auction Desk"
                  : app === "pricing"
                    ? "Pricing Control Tower"
                    : app === "retention"
                      ? "Retention Command Center"
                      : "Expansion Command Center"}
          </span>
        </div>
        <button
          type="button"
          className="demoSideNavToggle"
          aria-expanded={open}
          aria-controls={navBodyId}
          aria-label="Toggle demo navigation menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div id={navBodyId} className={`demoSideNavBody ${open ? "open" : ""}`}>
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
      </div>
    </nav>
  );
}
