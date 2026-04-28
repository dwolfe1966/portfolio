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
    impact: "Designing AI-powered lifecycle and acquisition systems with hands-on implementation and measurable revenue impact."
  },
  {
    period: "2018–2024",
    role: "Product + growth leadership",
    impact: "Led growth-roadmap execution across subscription/SaaS contexts with focus on pricing, retention quality, and operating leverage."
  },
  {
    period: "2010–2018",
    role: "Data + platform product roles",
    impact: "Built analytics-backed product experiences to improve activation, expansion, and cross-functional planning cadence."
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
