import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";
import { DemoHowItWorks } from "@/components/demo/DemoHowItWorks";
import { KpiTrendBars } from "@/components/demo/KpiTrendBars";
import { DataFlowMap } from "@/components/demo/DataFlowMap";

export const dynamic = "force-dynamic";

export default async function DemoOverviewPage() {
  const [deltas, candidates, generated, users, entities, edges] = await Promise.all([
    db.entityDelta.count(),
    db.campaignCandidate.count(),
    db.generatedMessage.count(),
    db.user.count(),
    db.entity.count(),
    db.interestEdge.count()
  ]);

  return (
    <>
      <DemoWorkspaceNav />
      <DemoHowItWorks />
      <Section title="Funnel visual">
        <KpiTrendBars deltas={deltas} candidates={candidates} generated={generated} />
      </Section>
      <Section title="Graphical flow">
        <DataFlowMap
          users={users}
          entities={entities}
          edges={edges}
          events={deltas}
          candidates={candidates}
          messages={generated}
        />
      </Section>
    </>
  );
}
