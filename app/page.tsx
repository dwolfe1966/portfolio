import { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";
import { RevenueLoopInfographic } from "@/components/site/RevenueLoopInfographic";

export const metadata: Metadata = buildMetadata({
  title: "Home | David Wolfe",
  description: "AI-powered product, growth, and operations leadership with measurable revenue outcomes.",
  path: "/"
});

const differentiators = [
  {
    title: "Multi-disciplinary expertise",
    detail: "Product, engineering, ML, growth, and operations integrated into one execution model."
  },
  {
    title: "AI-driven revenue systems",
    detail: "Decision engines that connect signals to campaign actions and commercial impact."
  },
  {
    title: "Operator across strategy + execution",
    detail: "From roadmap framing to shipped workflows, instrumentation, and iteration cadence."
  },
  {
    title: "Leadership track record",
    detail: "Built repeatable growth systems across subscription and SaaS operating environments."
  }
];

const featuredProjects = [
  {
    title: "Lifecycle Revenue Engine",
    detail: "Detects high-intent change events, matches users/entities, and generates message flows to improve retention and conversion.",
    impact: "Why it matters: turns lifecycle targeting from generic outreach into economically grounded prioritization.",
    href: "/projects/lifecycle-revenue-engine",
    appHref: "/lifecycle"
  },
  {
    title: "Agent-Managed Acquisition System",
    detail: "Runs campaign setup, test-cell scoring, budget reallocation, and audit-trail logging with explicit guardrails.",
    impact: "Why it matters: lowers CAC volatility while improving speed and confidence of media decisions.",
    href: "/projects/agent-acquisition",
    appHref: "/acquisition"
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
        <div className="grid grid-2">
          {featuredProjects.map((project) => (
            <div className="card" key={project.title}>
              <h3>{project.title}</h3>
              <p>{project.detail}</p>
              <p className="small">{project.impact}</p>
              <div className="ctaRow">
                <Link className="btn primary" href={project.href}>View project</Link>
                <Link className="btn" href={project.appHref}>Open demo</Link>
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
