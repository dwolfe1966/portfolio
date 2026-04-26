import Link from "next/link";
import { Section } from "@/components/site/Section";

export default function AcquisitionPage() {
  return (
    <>
      <Section eyebrow="Acquisition" title="Agent-Managed Paid Acquisition Workspace">
        <p>
          A hands-on prototype for automated paid acquisition. Build a campaign, run orchestrator iterations,
          and inspect exactly how creative, audience, and budget decisions impact CAC and ROAS.
        </p>
        <div className="grid grid-3" style={{ marginTop: 12 }}>
          <div className="card"><h3>1. Configure inputs</h3><p>Set objective, budget, channels, and economic guardrails.</p></div>
          <div className="card"><h3>2. Run simulations</h3><p>Trigger agent iterations to score cells and reallocate spend.</p></div>
          <div className="card"><h3>3. Review outputs</h3><p>Inspect top performers, economics, and budget activity history.</p></div>
        </div>
        <div className="ctaRow">
          <Link className="btn primary" href="/acquisition/campaigns">Open campaigns</Link>
          <Link className="btn" href="/acquisition/create">Create campaign</Link>
          <Link className="btn" href="/projects/agent-acquisition">View case study</Link>
        </div>
      </Section>
    </>
  );
}
