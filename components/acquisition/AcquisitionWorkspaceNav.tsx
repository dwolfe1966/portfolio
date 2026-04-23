"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/acquisition/overview", label: "Overview" },
  { href: "/acquisition/inputs", label: "Inputs" },
  { href: "/acquisition/simulations", label: "Simulations" },
  { href: "/acquisition/outputs", label: "Outputs" }
];

export function AcquisitionWorkspaceNav() {
  const pathname = usePathname();

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Acquisition app workspace</h3>
      <p style={{ marginBottom: 10 }}>Navigate and operate the paid-acquisition agent loop.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                background: active ? "#111827" : "#fff",
                color: active ? "#fff" : "#111827",
                padding: "8px 12px",
                borderRadius: 999,
                textDecoration: "none",
                fontWeight: 600,
                border: "1px solid #111827"
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
