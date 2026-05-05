"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SiteLogo } from "@/components/site/SiteLogo";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/workspace/dashboard", label: "Workspace" },
  { href: "/writing", label: "Writing" },
  { href: "/contact", label: "Contact" }
];

const workspaceLinks = [
  { href: "/workspace/dashboard", label: "Dashboard" },
  { href: "/workspace/datasets", label: "Datasets" },
  { href: "/workspace/connections", label: "Connections" },
  { href: "/workspace/account", label: "Account" },
  { href: "/workspace/settings", label: "Settings" },
  { href: "/workspace/activity", label: "Activity" }
];

export function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/workspace/dashboard") return pathname.startsWith("/workspace") || pathname.startsWith("/demo");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="siteNav" aria-label="Main navigation">
      <Link href="/" className="siteBrand" onClick={() => setOpen(false)}>
        <SiteLogo />
      </Link>

      <button
        type="button"
        className="menuToggle"
        aria-expanded={open}
        aria-controls="primary-links"
        aria-label="Toggle navigation menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      <div id="primary-links" className={`links ${open ? "open" : ""}`}>
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <div className="siteNavLinkGroup" key={link.href}>
              <Link
                href={link.href}
                className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
              {link.href === "/workspace/dashboard" ? (
                <div className="mobileWorkspaceLinks" aria-label="Workspace navigation">
                  {workspaceLinks.map((workspaceLink) => {
                    const workspaceActive = isActive(workspaceLink.href);
                    return (
                      <Link
                        href={workspaceLink.href}
                        className={workspaceActive ? "active" : undefined}
                        aria-current={workspaceActive ? "page" : undefined}
                        key={workspaceLink.href}
                        onClick={() => setOpen(false)}
                      >
                        {workspaceLink.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="navCta">
        <Link className="btn primary" href="/contact" onClick={() => setOpen(false)}>
          Get in touch
        </Link>
      </div>
    </nav>
  );
}
