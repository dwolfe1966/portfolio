import Link from "next/link";
import { Section } from "@/components/site/Section";
import { AcquisitionWorkspaceNav } from "@/components/acquisition/AcquisitionWorkspaceNav";

export default function AcquisitionPage() {
  return (
    <>
      <AcquisitionWorkspaceNav />
      <Section eyebrow="Acquisition" title="Agent-Managed Paid Acquisition Workspace">
        <p>
          This app is the companion to the lifecycle system: it focuses on acquisition efficiency, creative velocity,
          budget orchestration, and CAC-to-LTV guardrails.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/acquisition/overview">Open overview</Link>
          <Link className="btn" href="/projects/agent-acquisition">View case study</Link>
        </div>
      </Section>
    </>
  );
}
