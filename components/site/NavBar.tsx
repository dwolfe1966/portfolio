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
            <Link
              key={link.href}
              href={link.href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
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
