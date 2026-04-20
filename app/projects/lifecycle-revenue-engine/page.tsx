import Link from "next/link";
import { Section } from "@/components/site/Section";

export default function ProjectPage() {
  return (
    <>
      <Section eyebrow="Flagship project" title="Lifecycle Revenue Engine">
        <p>A working AI-enabled lifecycle system that converts meaningful entity-level change into targeted user outreach, landing experiences, and modeled revenue opportunity.</p>
        <div className="ctaRow">
          <Link className="btn primary" href="/demo/dashboard">View demo</Link>
        </div>
      </Section>
      <Section title="The problem">
        <p>Most lifecycle marketing systems are still structured around static schedules, broad segmentation, and generic messaging. When outreach is untethered from meaningful change, open rates decline, click intent weakens, and monetization opportunities are missed.</p>
      </Section>
      <Section title="The thesis">
        <p>When meaningful external changes are detected, mapped to users who have demonstrated interest, and translated into specific outreach and landing experiences, lifecycle marketing becomes a revenue engine.</p>
      </Section>
      <Section title="System architecture">
        <div className="grid grid-2">
          <div className="card"><h3>1. Entity Deltas</h3><p>Detect changes such as address updates, phone additions, or legal record changes.</p></div>
          <div className="card"><h3>2. Interest Graph</h3><p>Map users to entities they have searched for, viewed, or otherwise shown interest in.</p></div>
          <div className="card"><h3>3. Audience Layer</h3><p>Filter users by free, trial, lapsed, or active status.</p></div>
          <div className="card"><h3>4. Prioritization Engine</h3><p>Rank opportunities using interest strength, change type, segment, and recency.</p></div>
          <div className="card"><h3>5. AI Generator</h3><p>Generate subject lines, email copy, landing copy, and CTAs tied to the opportunity.</p></div>
        </div>
      </Section>
      <Section title="Commercial framing">
        <p>The purpose of the system is not just personalization. It is commercial relevance: reactivation, retention, conversion, and incremental revenue per run.</p>
      </Section>
      <Section title="What I built">
        <p>A data model, simulation layer, prioritization logic, AI generation layer, working dashboard, and public portfolio presentation designed to communicate both the thesis and the implementation.</p>
      </Section>
    </>
  );
}
