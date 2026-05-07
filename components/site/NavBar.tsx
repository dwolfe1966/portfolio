"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteLogo } from "@/components/site/SiteLogo";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Products" },
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

type AccountSessionStatus = {
  authenticated: boolean;
  account: { email: string; userId: string } | null;
};

function AccountIcon({ label = "Workspace account" }: { label?: string }) {
  return (
    <span className="accountIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 12.25a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0" />
      </svg>
      <span className="accountIconStatus" />
      <span className="srOnly">{label}</span>
    </span>
  );
}

export function NavBar() {
  const [open, setOpen] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountSessionStatus | null>(null);
  const pathname = usePathname();
  const isAuthenticated = accountStatus?.authenticated === true;
  const accountLabel = accountStatus?.account?.email
    ? `Workspace account: ${accountStatus.account.email}`
    : "Workspace account";

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account/session", {
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload && typeof payload.authenticated === "boolean") {
          setAccountStatus({
            authenticated: payload.authenticated,
            account: payload.account && typeof payload.account.email === "string" && typeof payload.account.userId === "string"
              ? { email: payload.account.email, userId: payload.account.userId }
              : null
          });
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          setAccountStatus({ authenticated: false, account: null });
        }
      });
    return () => controller.abort();
  }, [pathname]);

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
        {isAuthenticated ? (
          <Link
            href="/workspace/account"
            className="mobileAccountLink"
            aria-label={accountLabel}
            title={accountLabel}
            onClick={() => setOpen(false)}
          >
            <AccountIcon label={accountLabel} />
            <span>Account</span>
          </Link>
        ) : null}
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
        {isAuthenticated ? (
          <Link
            className="accountIconLink"
            href="/workspace/account"
            aria-label={accountLabel}
            title={accountLabel}
            onClick={() => setOpen(false)}
          >
            <AccountIcon label={accountLabel} />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
