import Link from "next/link";
import { Section } from "@/components/site/Section";
import { OperatorProfileInfographic } from "@/components/site/OperatorProfileInfographic";

const expertise = [
  "Revenue strategy and growth leadership",
  "Product discovery and opportunity shaping",
  "Data science and applied AI systems",
  "Social ecosystems and community-led growth",
  "High-performance org design and execution",
  "Subscription economics, monetization, and lifecycle optimization"
];

const timeline = [
  {
    period: "Today",
    title: "Independent operator-builder",
    detail:
      "Designing applied AI systems for acquisition, lifecycle, and revenue operations with measurable commercial outcomes."
  },
  {
    period: "2018–2024",
    title: "Product and growth leadership",
    detail:
      "Led roadmap, pricing, and growth loops for subscription and SaaS products; partnered deeply with engineering, marketing, and finance."
  },
  {
    period: "2010–2018",
    title: "Data and platform focus",
    detail:
      "Built data-enriched product surfaces and operational analytics to improve activation, retention, and monetization decisions."
  },
  {
    period: "Early career",
    title: "Commercial operations foundation",
    detail:
      "Developed a strong economics-first lens across product delivery, customer outcomes, and go-to-market execution."
  }
];

const principles = [
  {
    title: "System thinking",
    detail: "Model the full loop from signal to decision to commercial outcome, not isolated features."
  },
  {
    title: "Economic orientation",
    detail: "Use CAC, payback, retention, and LTV as design constraints from day one."
  },
  {
    title: "AI pragmatism",
    detail: "Use AI where it changes throughput or quality; avoid complexity that does not improve outcomes."
  },
  {
    title: "Operator-grade clarity",
    detail: "Ship transparent assumptions, audit trails, and controls so teams trust and adopt the system."
  }
];

export default function AboutPage() {
  return (
    <>
      <Section eyebrow="About" title="Revenue-minded growth leader building AI-enabled growth systems">
        <p>
          I am primarily a revenue-minded growth leader who builds practical AI products to improve acquisition efficiency, lifecycle conversion, and revenue quality.
          The focus is operational leverage: faster learning loops, better decision quality, and clear economic impact.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/projects">Explore projects</Link>
          <Link className="btn" href="/contact">Work with me</Link>
        </div>
      </Section>

      <Section title="Operator infographic">
        <OperatorProfileInfographic />
      </Section>

      <Section title="Expertise">
        <div className="grid grid-2">
          {expertise.map((item) => (
            <div className="card" key={item}>
              <h3>{item}</h3>
              <p>
                Applied through hands-on product architecture, data modeling, and iterative operating workflows.
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Professional timeline">
        <div className="grid">
          {timeline.map((item) => (
            <div className="card" key={item.title}>
              <p className="small" style={{ marginBottom: 6 }}>{item.period}</p>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Values and working style">
        <div className="grid grid-2">
          {principles.map((item) => (
            <div className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Current build focus">
        <div className="grid grid-2">
          <div className="card">
            <h3>Lifecycle app cleanup</h3>
            <p>Strengthening reliability, explainability, and UX polish across the lifecycle workspace.</p>
            <Link className="btn" href="/lifecycle">Open lifecycle app</Link>
          </div>
          <div className="card">
            <h3>Acquisition system design</h3>
            <p>Building a closed-loop acquisition architecture with creative testing, budget reallocation, and decision auditability.</p>
            <Link className="btn" href="/projects/agent-acquisition">View acquisition case study</Link>
          </div>
        </div>
      </Section>

      <Section title="Work with me">
        <p>
          If you are building an AI-native growth, lifecycle, or monetization system and want an operator who can
          bridge strategy and execution, I would love to collaborate.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/contact">Start a conversation</Link>
          <Link className="btn" href="/writing">Read POV essays</Link>
        </div>
      </Section>
    </>
  );
}
