import Link from "next/link";

export type DemoAppLaunchTarget = "lifecycle" | "acquisition" | "auction" | "pricing" | "retention" | "expansion";

const APP_COPY: Record<DemoAppLaunchTarget, {
  name: string;
  tagline: string;
  surface: string;
}> = {
  lifecycle: {
    name: "Lifecycle Engine",
    tagline: "Detect change, score interest, generate outreach — operator-in-the-loop.",
    surface: "Inputs · Simulations · Outputs · Audit"
  },
  acquisition: {
    name: "Acquisition Agent",
    tagline: "Run paid campaigns under explicit policy with auto-pause and approval gates.",
    surface: "Campaigns · Policy engine · Cell matrix · Audit feed"
  },
  auction: {
    name: "Auction Desk",
    tagline: "Quality-adjusted second-price auctions with reserve, pacing, and a live clearing ticker.",
    surface: "Inputs · Simulations · Live ticker · Outputs · Health"
  },
  pricing: {
    name: "Pricing Control Tower",
    tagline: "Run segmented price and packaging tests with margin, churn, and holdout guardrails.",
    surface: "Segments · Variants · Simulations · Decisions · Audit"
  },
  retention: {
    name: "Retention Command Center",
    tagline: "Score account risk, recommend save motions, and track payback on intervention work.",
    surface: "Accounts · Playbooks · Simulations · Interventions · Audit"
  },
  expansion: {
    name: "Expansion Command Center",
    tagline: "Score expansion readiness, recommend upsell motions, and track expected ARR.",
    surface: "Accounts · Offers · Simulations · Outputs · Audit"
  }
};

export function DemoAppLaunchCard({
  app,
  href
}: {
  app: DemoAppLaunchTarget;
  href: string;
}) {
  const copy = APP_COPY[app];
  return (
    <Link href={href} className="demoLaunchCard" aria-label={`Open ${copy.name} Wolfe App`}>
      <div className="demoLaunchCard__head">
        <span className="demoLaunchCard__chip">WOLFE APP</span>
        <span className="demoLaunchCard__name">{copy.name}</span>
        <span className="demoLaunchCard__arrow" aria-hidden>→</span>
      </div>
      <p className="demoLaunchCard__tagline">{copy.tagline}</p>
      <p className="demoLaunchCard__surface">{copy.surface}</p>
    </Link>
  );
}
