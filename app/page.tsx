import { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";
import { RevenueLoopInfographic } from "@/components/site/RevenueLoopInfographic";
import { DemoAppLaunchCard, type DemoAppLaunchTarget } from "@/components/site/DemoAppLaunchCard";

export const metadata: Metadata = buildMetadata({
  title: "Home | David Wolfe",
  description: "AI-powered product, growth, and operations leadership with measurable revenue outcomes.",
  path: "/"
});

const differentiators = [
  {
    title: "Multi-disciplinary",
    detail: "Product, engineering, ML, growth, and operations integrated into one execution model."
  },
  {
    title: "AI-native revenue systems",
    detail: "Decision engines that connect change signals to campaign actions and commercial impact."
  },
  {
    title: "Strategy + execution",
    detail: "Roadmap framing through shipped workflows, instrumentation, and operating cadence."
  },
  {
    title: "Operator track record",
    detail: "Built repeatable growth systems across subscription and SaaS operating environments."
  }
];

type FeaturedProject = {
  title: string;
  detail: string;
  impact: string;
  href: string;
  appHref: string;
  demoApp: DemoAppLaunchTarget;
};

const featuredProjects: FeaturedProject[] = [
  {
    title: "Lifecycle Revenue Engine",
    detail: "Detects high-intent change events, matches users to entities, and generates outreach with economics-aware prioritization.",
    impact: "Turns lifecycle targeting from generic outreach into economically grounded prioritization.",
    href: "/projects/lifecycle-revenue-engine",
    appHref: "/lifecycle/overview",
    demoApp: "lifecycle"
  },
  {
    title: "Agent-Managed Acquisition",
    detail: "Campaign setup, test-cell scoring, budget reallocation, and policy-engine guardrails with full audit trail.",
    impact: "Lowers CAC volatility while improving speed and confidence of media decisions.",
    href: "/projects/agent-acquisition",
    appHref: "/acquisition/overview",
    demoApp: "acquisition"
  },
  {
    title: "Closed-Marketplace Auction",
    detail: "Quality-adjusted second-price auctions with reserve, pacing, behavior modes, and a live clearing ticker.",
    impact: "Transparent Vickrey clearing improves bidder trust and revenue stability vs. opaque max-charge auctions.",
    href: "/projects/vickrey-auction-closed-ads-ecosystem",
    appHref: "/auction/overview",
    demoApp: "auction"
  }
];

export default function HomePage() {
  return (
    <>
      <Section title="AI-powered product, growth, and operations leader">
        <div className="grid grid-2" style={{ alignItems: "center" }}>
          <div>
            <p>
              I build AI-native systems across product management, engineering, machine learning, growth marketing,
              operations, and executive leadership to drive measurable revenue outcomes.
            </p>
            <div className="signalStrip" aria-label="Revenue system operating model">
              <div className="signalStep">
                <strong>Signal</strong>
                <p className="small">Detect meaningful user, market, and campaign changes.</p>
              </div>
              <div className="signalStep">
                <strong>Decision</strong>
                <p className="small">Rank opportunities with economics-aware logic.</p>
              </div>
              <div className="signalStep">
                <strong>Revenue</strong>
                <p className="small">Generate actions, measure outcomes, and iterate.</p>
              </div>
            </div>
            <div className="ctaRow" style={{ marginTop: 12 }}>
              <Link className="btn primary" href="/projects">Explore my AI revenue systems</Link>
              <Link className="btn" href="/about">See leadership profile</Link>
            </div>
          </div>
          <div className="card" aria-hidden="true" style={{ minHeight: 200 }}>
            <div
              style={{
                height: 180,
                borderRadius: 14,
                background:
                  "radial-gradient(circle at 20% 20%, rgba(0, 180, 216, 0.22), transparent 45%), radial-gradient(circle at 80% 30%, rgba(52, 87, 213, 0.24), transparent 42%), linear-gradient(135deg, rgba(20, 25, 45, 0.82), rgba(10, 14, 28, 0.92))"
              }}
            />
          </div>
        </div>
      </Section>

      <Section title="Value proposition">
        <div className="grid grid-4">
          {differentiators.map((item) => (
            <div className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Featured projects">
        <p>
          Three runnable demo apps backing the case studies — every page below clicks through to
          live software, not screenshots.
        </p>
        <div className="grid grid-3">
          {featuredProjects.map((project) => (
            <div className="card accentCard" key={project.title}>
              <h3>{project.title}</h3>
              <p>{project.detail}</p>
              <p className="small"><em>{project.impact}</em></p>
              <div style={{ marginTop: 12 }}>
                <DemoAppLaunchCard app={project.demoApp} href={project.appHref} />
              </div>
              <div className="ctaRow">
                <Link className="btn" href={project.href}>Read case study</Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How the systems work">
        <RevenueLoopInfographic />
      </Section>

      <Section title="Continue exploring">
        <div className="ctaRow">
          <Link className="btn" href="/writing">Read essays</Link>
          <Link className="btn" href="/contact">Discuss collaboration</Link>
        </div>
      </Section>
    </>
  );
}
