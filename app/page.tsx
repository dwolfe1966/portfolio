import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { Section } from "@/components/site/Section";
import { RevenueLoopInfographic } from "@/components/site/RevenueLoopInfographic";

export const metadata: Metadata = buildMetadata({
  title: "Home | David Wolfe",
  description: "Operator portfolio: lifecycle and acquisition systems, decision tooling, and measurable revenue outcomes.",
  path: "/"
});


export default function HomePage() {
  return (
    <>
      <Hero />

      <Section title="Positioning">
        <div className="grid grid-2">
          <div className="card">
            <h3>Commercial operator lens</h3>
            <p>
              I focus on systems that lift activation, improve retention quality, and make growth decisions financially legible.
            </p>
          </div>
          <div className="card">
            <h3>End-to-end delivery partner</h3>
            <p>
              I work from problem framing to shipped workflows: hypothesis design, model choices, instrumentation, and iteration cadence.
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
          <div className="card"><h3>Applied modeling</h3><p>Use scoring, simulation, and AI assistance to support faster and clearer operating choices.</p></div>
          <div className="card"><h3>Social ecosystems</h3><p>Design growth loops that leverage network effects, creator channels, and community behavior.</p></div>
          <div className="card"><h3>Execution systems</h3><p>Design cross-functional rituals and tooling that improve ownership, speed, and accountability.</p></div>
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
              Tightening observability, assumptions discipline, and workflow clarity so simulations translate to practical team operations.
            </p>
            <div className="ctaRow">
              <Link className="btn primary" href="/lifecycle">Open lifecycle app</Link>
              <Link className="btn" href="/projects/lifecycle-revenue-engine">View lifecycle case study</Link>
            </div>
          </div>
          <div className="card">
            <h3>Product and growth systems roadmap</h3>
            <p>
              Expanding case studies and field notes around acquisition mechanics, lifecycle monetization, and operating design.
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
The strongest AI products are embedded in decision loops and unit economics, not treated as standalone content tools.
          </p>
          <Link className="btn" href="/writing/ai-revenue-systems">Read the essay</Link>
        </div>
      </Section>
    </>
  );
}
