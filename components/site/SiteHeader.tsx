"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";

const DEMO_PREFIXES = ["/lifecycle", "/acquisition", "/auction", "/pricing"];

export function SiteHeader() {
  const pathname = usePathname();
  const isDemoRoute = DEMO_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isDemoRoute) return null;

  return (
    <header className="siteHeader">
      <NavBar />
    </header>
  );
}
