import Link from "next/link";

const links = [
  { href: "/demo/overview", label: "Overview" },
  { href: "/demo/inputs", label: "Inputs" },
  { href: "/demo/simulations", label: "Simulations" },
  { href: "/demo/outputs", label: "Outputs" },
  { href: "/demo/documentation", label: "Documentation" }
];

export function DemoWorkspaceNav() {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Lifecycle app workspace</h3>
      <p style={{ marginBottom: 10 }}>Navigate the lifecycle operating workflow by stage.</p>
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
