import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoHowItWorks } from "@/components/demo/DemoHowItWorks";
import { KpiTrendBars } from "@/components/demo/KpiTrendBars";
import { DataFlowMap } from "@/components/demo/DataFlowMap";
import { LifecyclePipelineDiagram } from "@/components/demo/LifecyclePipelineDiagram";
import { LifecycleOutcomeInfographic } from "@/components/demo/LifecycleOutcomeInfographic";
import { OperatorDecisionCanvas } from "@/components/site/OperatorDecisionCanvas";
import { GraphInfluencePaths } from "@/components/demo/GraphInfluencePaths";
import { ResetDemoDataCard } from "@/components/site/ResetDemoDataCard";
import { InfoTooltip } from "@/components/site/InfoTooltip";
import { DemoSystemGraph } from "@/components/demo-shell/DemoSystemGraph";
import { LifecycleWorkspaceDatasetPanel } from "@/components/demo/LifecycleWorkspaceDatasetPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildMetadata({
  title: "Lifecycle App Overview | David Wolfe",
  description: "Lifecycle overview: signal-to-message workflow, scoring funnel, and operator data flow.",
  path: "/lifecycle/overview"
});

export default async function DemoOverviewPage() {
  const [deltas, candidates, generated, users, entities, edges, activeAssumptions] = await Promise.all([
    db.entityDelta.count(),
    db.campaignCandidate.count(),
    db.generatedMessage.count(),
    db.user.count(),
    db.entity.count(),
    db.interestEdge.count(),
    db.assumptionSet.findFirst({
      where: { isActive: true },
      select: { recencyScore: true, highPriorityThreshold: true, minPriorityScore: true }
    })
  ]);

  return (
    <>
      <DemoHowItWorks />
      <Section title="Live lifecycle flow">
        <DemoSystemGraph title="Signal-to-message loop" nodes={["Entity delta", "Interest graph", "Priority score", "Generated copy"]} />
      </Section>
      <Section title="Current data mode">
        <LifecycleWorkspaceDatasetPanel compact />
      </Section>
      <Section
        title={
          <>
            Volume and conversion snapshot
            <InfoTooltip label="Volume and conversion snapshot context">
              These counts show whether the graph has enough events, matches, and messages to support a useful demo run.
            </InfoTooltip>
          </>
        }
      >
        <KpiTrendBars deltas={deltas} candidates={candidates} generated={generated} />
      </Section>
      <Section
        title={
          <>
            Event-to-message pipeline
            <InfoTooltip label="Event-to-message pipeline context">
              The pipeline shows where commercial opportunity narrows from raw change events to usable message assets.
            </InfoTooltip>
          </>
        }
      >
        <LifecyclePipelineDiagram
          deltas={deltas}
          candidates={candidates}
          messages={generated}
          outcomes={Math.round(generated * 0.2)}
        />
      </Section>
      <Section title="Outcome mix">
        <LifecycleOutcomeInfographic deltas={deltas} candidates={candidates} messages={generated} />
      </Section>


      <Section title="Operator decision canvas">
        <p className="small">A shared frame for how inputs become governed actions and measurable learning.</p>
        <OperatorDecisionCanvas />
      </Section>


      <Section title="Workspace data operations">
        <ResetDemoDataCard appLabel="Lifecycle" scope="lifecycle" />
      </Section>

      <Section title="Underlying graph topology">
        <DataFlowMap
          users={users}
          entities={entities}
          edges={edges}
          events={deltas}
          candidates={candidates}
          messages={generated}
        />
        <GraphInfluencePaths
          users={users}
          entities={entities}
          edges={edges}
          events={deltas}
          assumptions={activeAssumptions ?? undefined}
        />
      </Section>
    </>
  );
}
