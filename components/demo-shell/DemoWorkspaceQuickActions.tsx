import Link from "next/link";

const actions = [
  {
    href: "/lifecycle/workspace",
    label: "Launch lifecycle",
    detail: "Run the most complete workspace-enabled tool."
  },
  {
    href: "/workspace/connections",
    label: "Connect data",
    detail: "Start CSV, OAuth, spreadsheet, or datasource setup."
  },
  {
    href: "/workspace/datasets",
    label: "Review datasets",
    detail: "Inspect imports, saved mappings, and recent runs."
  },
  {
    href: "/workspace/activity",
    label: "Inspect activity",
    detail: "See recent imports, connector events, and audit logs."
  }
];

export function DemoWorkspaceQuickActions() {
  return (
    <div className="demoWorkspaceQuickActions" aria-label="Workspace quick actions">
      {actions.map((action) => (
        <Link className="demoWorkspaceQuickAction" href={action.href} key={action.href}>
          <strong>{action.label}</strong>
          <span>{action.detail}</span>
        </Link>
      ))}
    </div>
  );
}
