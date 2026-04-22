import Link from "next/link";

const links = [
  { href: "/acquisition/overview", label: "Overview" },
  { href: "/acquisition/inputs", label: "Inputs" },
  { href: "/acquisition/simulations", label: "Simulations" },
  { href: "/acquisition/outputs", label: "Outputs" }
];

export function AcquisitionWorkspaceNav() {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Acquisition app workspace</h3>
      <p style={{ marginBottom: 10 }}>Navigate the paid acquisition workflow by stage.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              background: "#111827",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
