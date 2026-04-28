import Link from "next/link";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = buildMetadata({
  title: "About | David Wolfe",
  description: "About David Wolfe: AI-powered product, growth, and operations leader.",
  path: "/about"
});

const competencies = [
  { title: "Product discovery & design", detail: "Translate ambiguous demand signals into concrete hypotheses and shipped product loops." },
  { title: "Machine learning & data science", detail: "Build practical scoring and simulation systems that improve decision quality." },
  { title: "Growth marketing & monetization", detail: "Optimize CAC, retention, and LTV with clear measurement and budget discipline." },
  { title: "Engineering & operations", detail: "Turn strategy into reliable workflows, instrumentation, and repeatable team execution." },
  { title: "Executive leadership", detail: "Align product, data, marketing, and finance around common commercial outcomes." }
];

const milestones = [
  {
    period: "Today",
    role: "Independent operator-builder",
    impact: "Specify, design, implement, and evolve AI-powered lifecycle and acquisition systems with direct ownership of product, data, and delivery quality."
  },
  {
    period: "2018–2024",
    role: "Product + growth leadership",
    impact: "Owned growth and monetization roadmaps across subscription/SaaS contexts, pairing experimentation discipline with cross-functional execution."
  },
  {
    period: "2010–2018",
    role: "Software engineer + data platform product roles",
    impact: "Built analytics-backed product capabilities and production workflows as a hands-on engineer before moving into broader product leadership."
  }
];

const competencyTimeline = [
  {
    period: "2010–2014",
    focus: "Engineering foundation",
    competencies: "Software engineering, data modeling, production instrumentation",
    evidence: "Shipped data-platform and workflow systems that improved activation and reporting reliability."
  },
  {
    period: "2014–2018",
    focus: "Product + data integration",
    competencies: "Product discovery, analytics, experimentation, ML collaboration",
    evidence: "Connected user behavior signals to product decisions and repeatable optimization loops."
  },
  {
    period: "2018–2024",
    focus: "Growth and monetization leadership",
    competencies: "Lifecycle strategy, CAC/LTV economics, operating cadence",
    evidence: "Led pricing, retention, and growth execution while aligning product/marketing/data teams."
  },
  {
    period: "Today",
    focus: "Operator-builder",
    competencies: "AI systems implementation, cross-functional execution, executive decision support",
    evidence: "Builds and runs AI-native revenue systems end to end with measurable commercial impact."
  }
];

export default function AboutPage() {
  return (
    <>
      <Section eyebrow="About" title="Building AI systems that turn decisions into revenue">
        <p>
          I build operating systems that connect product strategy, data science, and go-to-market execution.
          My focus is helping teams move faster with clearer decisions and stronger commercial outcomes.
        </p>
      </Section>

      <Section title="Core competencies">
        <div className="grid grid-2">
          {competencies.map((item) => (
            <div className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Experience and milestones">
        <div className="grid">
          {milestones.map((item) => (
            <div className="card" key={item.period}>
              <p className="small" style={{ marginBottom: 6 }}>{item.period}</p>
              <h3>{item.role}</h3>
              <p>{item.impact}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Competencies mapped to experience timeline">
        <div className="grid">
          {competencyTimeline.map((item) => (
            <div className="card" key={item.period}>
              <p className="small" style={{ marginBottom: 6 }}>{item.period} · {item.focus}</p>
              <p><strong>Competencies:</strong> {item.competencies}</p>
              <p className="small">{item.evidence}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Engineering experience">
        <div className="card">
          <h3>Hands-on engineering foundation</h3>
          <p>
            I started as an engineer and still work directly in implementation. That engineering depth is what lets me
            connect strategy to production systems, from data contracts and APIs to operator-facing workflows.
          </p>
        </div>
      </Section>

      <Section title="Approach and philosophy">
        <div className="grid grid-2">
          <div className="card">
            <h3>Strategy + execution in one loop</h3>
            <p>
              I combine high-level operating strategy with direct implementation so teams get both direction and delivery momentum.
            </p>
          </div>
          <div className="card">
            <h3>AI pragmatism and operating leverage</h3>
            <p>
              AI should improve throughput, decision quality, and economics—not add complexity without measurable gains.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Personal note">
        <p>
          I enjoy translating complex systems into clear operator workflows that teams can trust and iterate.
        </p>
      </Section>

      <Section title="Let’s collaborate">
        <div className="ctaRow">
          <Link className="btn primary" href="/contact">Start a conversation</Link>
          <Link className="btn" href="/projects">Review case studies</Link>
        </div>
      </Section>
    </>
  );
}
