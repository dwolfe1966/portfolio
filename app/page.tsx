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

const proofStats = [
  { label: "Operating range", value: "Product · Data · Growth · Engineering" },
  { label: "Public + venture-backed contexts", value: "Napster · Interactive One · Goldbelly · MyLife" },
  { label: "Portfolio proof", value: "7 AI revenue tools" }
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
    title: "Pricing Experimentation Control Tower",
    detail: "Plans segmented pricing tests, simulates ARPU/churn/margin impact, and records promote/extend/pause/rollback decisions.",
    impact: "Turns pricing tests into controlled operating loops with explicit guardrails and decision history.",
    href: "/projects/pricing-experimentation-control-tower",
    appHref: "/pricing/overview",
    demoApp: "pricing"
  },
  {
    title: "Retention Risk Command Center",
    detail: "Scores account health, recommends risk-driver playbooks, and tracks save-rate economics with SLA-aware ownership.",
    impact: "Turns retention from reactive triage into proactive revenue protection with measurable intervention payback.",
    href: "/projects/retention-risk-command-center",
    appHref: "/retention/overview",
    demoApp: "retention"
  },
  {
    title: "Expansion Revenue Intelligence",
    detail: "Scores expansion readiness, recommends upsell motions, and tracks expected ARR, margin, and payback by account.",
    impact: "Turns account-base growth into an explicit operating loop for pursue, nurture, and defer decisions.",
    href: "/projects/expansion-revenue-intelligence",
    appHref: "/expansion/overview",
    demoApp: "expansion"
  },
  {
    title: "Email Engine ESP",
    detail: "Provider-backed email platform with templates, audiences, campaigns, journeys, delivery, tracking, suppressions, and analytics.",
    impact: "Turns owned email into auditable infrastructure instead of brittle one-off send logic.",
    href: "/projects/email-engine-esp",
    appHref: "https://email-engine.app/esp",
    demoApp: "email-engine"
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
      <section className="homeHero">
        <div className="homeHeroCopy">
          <p className="eyebrow">AI revenue systems · Product leadership · Operator-builder</p>
          <h1>AI systems.</h1>
          <p className="heroLead">
            I build AI-native operating systems that turn product, growth, and customer signals into measurable revenue actions.
          </p>
          <div className="ctaRow">
            <Link className="btn primary" href="/projects">Explore products</Link>
            <Link className="btn" href="/about">See leadership profile</Link>
          </div>
        </div>

        <div className="heroSystemVisual" aria-label="Preview of lifecycle, acquisition, and auction Tools">
          <div className="heroSystemTopbar">
            <span />
            <span />
            <span />
            <strong>Revenue Systems Console</strong>
          </div>
          <div className="heroSystemGrid">
            <div className="heroPanel heroPanelLarge">
              <div className="heroPanelHeader">
                <span>Lifecycle Engine</span>
                <strong>+28%</strong>
              </div>
              <div className="heroFlow">
                <span>Signal</span>
                <span>Score</span>
                <span>Generate</span>
                <span>Revenue</span>
              </div>
              <div className="heroBars" aria-hidden="true">
                <i style={{ height: "46%" }} />
                <i style={{ height: "72%" }} />
                <i style={{ height: "58%" }} />
                <i style={{ height: "88%" }} />
                <i style={{ height: "64%" }} />
              </div>
            </div>
            <div className="heroPanel">
              <div className="heroPanelHeader">
                <span>Acquisition Agent</span>
                <strong>CAC</strong>
              </div>
              <div className="heroMetricRows">
                <span><b />Audience cells</span>
                <span><b />Budget policy</span>
                <span><b />Audit trail</span>
              </div>
            </div>
            <div className="heroPanel dark">
              <div className="heroPanelHeader">
                <span>Auction Desk</span>
                <strong>LIVE</strong>
              </div>
              <div className="heroTicker">
                <span>bid accepted</span>
                <span>reserve tuned</span>
                <span>winner cleared</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="homeProofBand" aria-label="Experience and portfolio proof">
        <div className="proofStrip">
          {proofStats.map((item) => (
            <div className="proofItem" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <Section title="Featured products">
        <p>
          Seven products backing the case studies — every page below clicks through to
          live software, not screenshots.
        </p>
        <div className="grid grid-3">
          {featuredProjects.map((project) => (
            <div className="card accentCard featuredProjectCard" key={project.title}>
              <div className="featuredProjectCopy">
                <h3>{project.title}</h3>
                <p>{project.detail}</p>
              </div>
              <p className="small featuredProjectImpact"><em>{project.impact}</em></p>
              <div className="featuredProjectDemo">
                <DemoAppLaunchCard app={project.demoApp} href={project.appHref} />
              </div>
              <div className="ctaRow">
                <Link className="btn" href={project.href}>Read case study</Link>
              </div>
            </div>
          ))}
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
