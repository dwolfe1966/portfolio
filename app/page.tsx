import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { Section } from "@/components/site/Section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Section title="Proof">
        <div className="grid grid-4">
          <div className="card"><div className="kpi">20+</div><p>Years across product, growth, and software systems.</p></div>
          <div className="card"><div className="kpi">CAC/LTV</div><p>Deep focus on retention, reactivation, and subscription economics.</p></div>
          <div className="card"><div className="kpi">AI-native</div><p>Using modern AI tools to build real systems, not just strategy decks.</p></div>
          <div className="card"><div className="kpi">Working proofs</div><p>Portfolio centered on live demos, architectures, and commercial use cases.</p></div>
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
          <Link className="btn" href="/demo">Open the demo</Link>
        </div>
      </Section>
      <Section title="What I build">
        <div className="grid grid-2">
          <div className="card"><h3>AI-driven lifecycle systems</h3><p>Retention, winback, and reactivation systems tied to real-world signals rather than generic campaign schedules.</p></div>
          <div className="card"><h3>Growth and monetization loops</h3><p>Acquisition, conversion, and lifecycle optimization grounded in commercial metrics.</p></div>
          <div className="card"><h3>AI-native operating models</h3><p>Practical uses of LLMs, agents, and automation to compress execution cycles and increase leverage.</p></div>
          <div className="card"><h3>Product systems with economic logic</h3><p>Product design that begins with revenue mechanics, user behavior, and business constraints.</p></div>
        </div>
      </Section>
      <Section title="Point of view">
        <div className="card">
          <h3>Generic lifecycle marketing is dying</h3>
          <p>AI is not just a content layer. It is becoming part of the revenue operating layer.</p>
          <Link className="btn" href="/writing/ai-revenue-systems">Read the essay</Link>
        </div>
      </Section>
    </>
  );
}
