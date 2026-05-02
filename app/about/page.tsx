import Link from "next/link";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = buildMetadata({
  title: "About | David Wolfe",
  description: "About David Wolfe: AI practitioner and product, growth, and operations leader.",
  path: "/about"
});

const competencies = [
  { title: "Product discovery & design", detail: "Translate ambiguous demand signals into concrete hypotheses and shipped product loops." },
  { title: "Machine learning & data science", detail: "Build practical scoring and simulation systems that improve decision quality, not just analytics dashboards." },
  { title: "Growth marketing & monetization", detail: "Optimize CAC, retention, and LTV with clear measurement and explicit budget discipline." },
  { title: "Engineering & operations", detail: "Turn strategy into reliable workflows, instrumentation, and repeatable team execution." },
  { title: "Executive leadership", detail: "Align product, data, marketing, and finance around shared commercial outcomes and operating cadence." }
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
    evidence: "Applies AI practitioner methods to build and run revenue systems end to end with measurable commercial impact."
  }
];

export default function AboutPage() {
  return (
    <>
      <Section eyebrow="About" title="AI practitioner building systems that turn decisions into revenue">
        <p>
          I build operating systems that connect product strategy, data science, and go-to-market
          execution. The work is direct — I write the schema, ship the app, and own the operating
          cadence around it. The portfolio you&apos;re browsing is itself an example: every case
          study points at running software, not screenshots.
        </p>
        <div className="signalStrip" aria-label="Operator profile summary">
          <div className="signalStep">
            <strong>Builder</strong>
            <p className="small">Hands-on implementation across app, data, and workflow layers.</p>
          </div>
          <div className="signalStep">
            <strong>Operator</strong>
            <p className="small">Commercial cadence, decision quality, and execution accountability.</p>
          </div>
          <div className="signalStep">
            <strong>Leader</strong>
            <p className="small">Cross-functional alignment around product, growth, and finance outcomes.</p>
          </div>
        </div>
        {process.env.NEXT_PUBLIC_LINKEDIN_URL ? (
          <p className="small" style={{ marginTop: 12 }}>
            More context on{" "}
            <a href={process.env.NEXT_PUBLIC_LINKEDIN_URL} target="_blank" rel="noreferrer noopener">
              LinkedIn
            </a>
            {process.env.NEXT_PUBLIC_LINKEDIN_HEADLINE
              ? ` — ${process.env.NEXT_PUBLIC_LINKEDIN_HEADLINE}.`
              : "."}
          </p>
        ) : null}
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

      <Section title="How I work">
        <div className="grid grid-2">
          <div className="card">
            <h3>Strategy and execution in one loop</h3>
            <p>
              I combine operating strategy with direct implementation so teams get both direction and
              delivery momentum. No handoffs that lose fidelity between the deck and the deploy.
            </p>
          </div>
          <div className="card">
            <h3>AI pragmatism, not AI theatre</h3>
            <p>
              AI should improve throughput, decision quality, and economics — not add complexity for
              its own sake. Every system I build can answer &quot;what changed because of this?&quot;
              with measured outcomes.
            </p>
          </div>
          <div className="card">
            <h3>Hands-on engineering still</h3>
            <p>
              I started as an engineer and still write the code. That depth is what lets me connect
              strategy to production systems — data contracts, APIs, and operator workflows — without
              translation loss.
            </p>
          </div>
          <div className="card">
            <h3>Operator instinct</h3>
            <p>
              Most of what I ship is the bit-of-software a small team didn&apos;t have time to build:
              the operator console, the audit feed, the policy engine. The boring infrastructure that
              makes the agent loop trustworthy.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Let’s collaborate">
        <p>
          I take on operator-builder engagements where strategy and code live close together —
          revenue systems, AI-native operating consoles, marketplace mechanics, lifecycle plumbing.
          If that maps to a problem you&apos;re solving, the contact form below is the fastest path.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/contact">Start a conversation</Link>
          <Link className="btn" href="/projects">Review case studies</Link>
        </div>
      </Section>
    </>
  );
}
