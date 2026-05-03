"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import type { DemoApp } from "./DemoSideNav";

const APP_LABEL: Record<DemoApp, string> = {
  lifecycle: "Lifecycle",
  acquisition: "Acquisition",
  auction: "Auction",
  pricing: "Pricing",
  retention: "Retention",
  expansion: "Expansion"
};

const SEGMENT_LABEL: Record<string, string> = {
  overview: "Overview",
  inputs: "Inputs",
  simulations: "Simulations",
  outputs: "Outputs",
  campaigns: "Campaigns",
  create: "Create",
  audit: "Audit",
  audiences: "Audiences",
  connections: "Connections",
  health: "Health",
  runs: "Runs",
  dashboard: "Dashboard",
  documentation: "Docs",
  candidates: "Candidates",
  users: "Users",
  segments: "Segments",
  decisions: "Decisions",
  experiments: "Experiments",
  accounts: "Accounts",
  interventions: "Interventions"
};

function humanize(segment: string): string {
  if (SEGMENT_LABEL[segment]) return SEGMENT_LABEL[segment];
  // For dynamic IDs (cuids etc.), show a shortened form to avoid long opaque strings.
  if (segment.length > 16) return `${segment.slice(0, 6)}…`;
  return segment;
}

export function DemoAppBreadcrumbs({ app }: { app: DemoApp }) {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the app slug; we replace it with the friendly app label.
  if (segments.length === 0) return null;

  const trail: Crumb[] = [
    { label: "Portfolio", href: "/" },
    { label: APP_LABEL[app], href: `/${app}/overview` }
  ];

  let acc = `/${app}`;
  for (let i = 1; i < segments.length; i++) {
    acc = `${acc}/${segments[i]}`;
    trail.push({
      label: humanize(segments[i]),
      href: i < segments.length - 1 ? acc : undefined
    });
  }

  return <Breadcrumbs trail={trail} />;
}
