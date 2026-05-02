import Link from "next/link";

export type DemoAppLaunchTarget = "lifecycle" | "acquisition";

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
    <Link href={href} className="demoLaunchCard" aria-label={`Open ${copy.name} demo app`}>
      <div className="demoLaunchCard__head">
        <span className="demoLaunchCard__chip">DEMO</span>
        <span className="demoLaunchCard__name">{copy.name}</span>
        <span className="demoLaunchCard__arrow" aria-hidden>→</span>
      </div>
      <p className="demoLaunchCard__tagline">{copy.tagline}</p>
      <p className="demoLaunchCard__surface">{copy.surface}</p>
    </Link>
  );
}
