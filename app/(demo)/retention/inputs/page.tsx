import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { RetentionPlaybookEditor } from "@/components/retention/RetentionPlaybookEditor";
import { RetentionPolicyEditor } from "@/components/retention/RetentionPolicyEditor";
import { RetentionWorkspaceDatasetPanel } from "@/components/retention/RetentionWorkspaceDatasetPanel";

export const dynamic = "force-dynamic";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function RetentionInputsPage() {
  let playbooks: Awaited<ReturnType<typeof db.retentionPlaybook.findMany>> = [];
  let policy: Awaited<ReturnType<typeof db.retentionPolicy.findFirst>> = null;
  try {
    [playbooks, policy] = await Promise.all([
      db.retentionPlaybook.findMany({ orderBy: { riskDriver: "asc" } }),
      db.retentionPolicy.findFirst({ orderBy: { createdAt: "desc" } })
    ]);
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Inputs" title="Risk policy and intervention playbooks">
        <p>Inputs are editable so the operator can tune risk thresholds, save economics, discount exposure, and SLA expectations before running the simulation.</p>
      </Section>

      <Section title="Current app data">
        <RetentionWorkspaceDatasetPanel compact />
      </Section>

      <Section title="Editable policy">
        {policy ? (
          <RetentionPolicyEditor policy={policy} />
        ) : (
          <div className="card"><p>No retention policy found. Reset workspace data from Overview.</p></div>
        )}
      </Section>

      <Section title="Editable playbooks">
        <div className="grid grid-3">
          {playbooks.map((playbook) => (
            <RetentionPlaybookEditor key={playbook.id} playbook={playbook} />
          ))}
        </div>
        <p className="small">Current ranges: save-rate lift {playbooks.map((p) => pct(p.saveRateLift)).join(", ")}.</p>
      </Section>
    </>
  );
}
