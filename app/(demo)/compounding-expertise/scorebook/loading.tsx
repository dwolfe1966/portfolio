import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import { Section } from "@/components/site/Section";

function SkeletonCard({ title, lines = 2 }: { title: string; lines?: number }) {
  return (
    <div className="card compoundingSkeletonCard">
      <p className="small">{title}</p>
      {Array.from({ length: lines }, (_, index) => (
        <span className="compoundingSkeletonLine" key={index} />
      ))}
    </div>
  );
}

export default function CompoundingExpertiseScorebookLoading() {
  return (
    <>
      <LabWorkflowRail active="Experience" />
      <Section eyebrow="Experience · CaseSets / Scorebook" title="Analyzing experience">
        <div className="card compoundingPendingPanel" role="status" aria-live="polite">
          <span className="badge">Analyzing experience</span>
          <h3>Loading the analytical dataset and calculating Scorebook Structure and Information Structure...</h3>
          <div className="compoundingIndeterminateBar" aria-hidden="true"><span /></div>
          <div className="compoundingActionPills">
            <span>Experience dataset</span>
            <span>Scorebook structure</span>
            <span>Information structure</span>
            <span>Case explorer</span>
          </div>
        </div>
        <div className="grid grid-2">
          <SkeletonCard title="Company evidence / Experience dataset" lines={4} />
          <SkeletonCard title="Dataset context" lines={4} />
        </div>
      </Section>

      <Section title="Scorebook Structure + Information Structure">
        <div className="grid grid-2">
          <SkeletonCard title="Scorebook Structure" lines={5} />
          <SkeletonCard title="Information Structure · Shannon diagnostics" lines={5} />
        </div>
      </Section>

      <Section title="Experience Snapshot">
        <div className="grid grid-3">
          <SkeletonCard title="Outcome / grade funnel" lines={4} />
          <SkeletonCard title="Grade distribution" lines={4} />
          <SkeletonCard title="Feedback latency" lines={4} />
        </div>
      </Section>
    </>
  );
}
