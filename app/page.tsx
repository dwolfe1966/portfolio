import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { Section } from "@/components/site/Section";
import { RevenueLoopInfographic } from "@/components/site/RevenueLoopInfographic";

export const metadata: Metadata = buildMetadata({
  title: "Home | David Wolfe",
  description: "Revenue-minded growth leadership, AI-native product systems, and lifecycle/acquisition operating workflows.",
  path: "/"
});


export default function HomePage() {
  return (
    <>
      <Hero />

      <Section title="Positioning">
        <div className="grid grid-2">
          <div className="card">
            <h3>Revenue-minded growth leader</h3>
            <p>
              I build products and operating systems that improve CAC efficiency, lifecycle conversion,
              retention quality, and LTV durability.
            </p>
          </div>
          <div className="card">
            <h3>Operator across strategy + execution</h3>
            <p>
              I work from discovery through delivery: problem framing, model design, productization,
              instrumentation, and iteration loops.
            </p>
          </div>
        </div>
      </Section>

      <Section title="System infographic">
        <RevenueLoopInfographic />
      </Section>

      <Section title="Core capabilities">
        <div className="grid grid-4">
          <div className="card"><h3>Product discovery</h3><p>Translate ambiguous market signals into concrete product bets and test plans.</p></div>
          <div className="card"><h3>Data science + AI</h3><p>Apply scoring, simulation, and LLM workflows to produce operator-grade decisions.</p></div>
          <div className="card"><h3>Social ecosystems</h3><p>Design growth loops that leverage network effects, creator channels, and community behavior.</p></div>
          <div className="card"><h3>High-performance orgs</h3><p>Build cross-functional systems that improve velocity, ownership clarity, and decision quality.</p></div>
        </div>
      </Section>

      <Section eyebrow="Flagship project" title="Lifecycle Revenue Engine">
        <p>
          A working AI-enabled system that detects meaningful external changes, maps them to users
          with demonstrated interest, and generates targeted outreach and landing experiences
          designed to improve reactivation and conversion.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/projects/lifecycle-revenue-engine">Explore the project</Link>
          <Link className="btn" href="/lifecycle">Open the lifecycle app</Link>
        </div>
      </Section>

      <Section title="Now building">
        <div className="grid grid-2">
          <div className="card">
            <h3>Lifecycle app cleanup</h3>
            <p>
              Improving transparency, assumptions governance, and operator UX so the demo maps directly
              to production-grade operating patterns.
            </p>
            <div className="ctaRow">
              <Link className="btn primary" href="/lifecycle">Open lifecycle app</Link>
              <Link className="btn" href="/projects/lifecycle-revenue-engine">View lifecycle case study</Link>
            </div>
          </div>
          <div className="card">
            <h3>Product and growth systems roadmap</h3>
            <p>
              Expanding case studies, operating models, and thought leadership around acquisition,
              lifecycle monetization, and AI-enabled execution systems.
            </p>
            <div className="ctaRow">
              <Link className="btn" href="/projects">Browse projects</Link>
              <Link className="btn" href="/writing">Read writing</Link>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Point of view">
        <div className="card">
          <h3>AI as an operating layer, not a content add-on</h3>
          <p>
            The strongest AI products are tightly coupled to decision loops and economics, not just generation quality.
          </p>
          <Link className="btn" href="/writing/ai-revenue-systems">Read the essay</Link>
        </div>
      </Section>
    </>
  );
}
