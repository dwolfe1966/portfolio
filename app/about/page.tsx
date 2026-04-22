import Link from "next/link";
import { Section } from "@/components/site/Section";

export default function AboutPage() {
  return (
    <>
      <Section eyebrow="About" title="Operator-builder focused on AI-native revenue systems">
        <p>
          I have spent 20+ years building and scaling products across subscription, SaaS, and data businesses.
          My current focus is designing practical AI operating systems that move commercial metrics—not just output volume.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/projects">See projects</Link>
          <Link className="btn" href="/contact">Work together</Link>
        </div>
      </Section>

      <Section title="What I build">
        <div className="grid grid-3">
          <div className="card">
            <h3>Lifecycle engine systems</h3>
            <p>Signal-driven retention/reactivation systems connected to measurable revenue outcomes.</p>
          </div>
          <div className="card">
            <h3>Acquisition operating loops</h3>
            <p>Agent-assisted creative + budget orchestration tied to CAC, payback, and LTV quality.</p>
          </div>
          <div className="card">
            <h3>Execution architecture</h3>
            <p>Cross-functional workflows that let smaller teams run faster with better decision quality.</p>
          </div>
        </div>
      </Section>

      <Section title="How I work">
        <div className="grid grid-2">
          <div className="card">
            <h3>Economics first</h3>
            <p>Every system starts with business constraints and unit-economics targets.</p>
          </div>
          <div className="card">
            <h3>Signals over schedules</h3>
            <p>I prefer event-triggered systems over static campaign calendars.</p>
          </div>
          <div className="card">
            <h3>Working proofs</h3>
            <p>I ship operable demos and instrumentation, not just strategy narratives.</p>
          </div>
          <div className="card">
            <h3>Tight loops</h3>
            <p>Design for rapid iteration: hypothesis, run, read outcomes, and reallocate quickly.</p>
          </div>
        </div>
      </Section>

      <Section title="Current build focus">
        <div className="grid grid-2">
          <div className="card">
            <h3>Lifecycle app cleanup</h3>
            <p>Improving reliability, schema compatibility, and clarity inside the lifecycle workspace.</p>
            <Link className="btn" href="/demo">Open lifecycle app</Link>
          </div>
          <div className="card">
            <h3>Acquisition app build-out</h3>
            <p>Building the paid acquisition companion app that closes the CAC-to-LTV operating loop.</p>
            <Link className="btn" href="/acquisition">Open acquisition app</Link>
          </div>
        </div>
      </Section>
    </>
  );
}
