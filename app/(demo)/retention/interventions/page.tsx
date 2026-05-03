import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { RetentionInterventionForm } from "@/components/retention/RetentionInterventionForm";
import { RetentionInterventionEditor } from "@/components/retention/RetentionInterventionEditor";

export const dynamic = "force-dynamic";

function money(cents: number | null) {
  return cents == null ? "Pending" : `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function RetentionInterventionsPage() {
  let accounts: Awaited<ReturnType<typeof db.retentionAccount.findMany>> = [];
  let playbooks: Awaited<ReturnType<typeof db.retentionPlaybook.findMany>> = [];
  let interventions: Prisma.RetentionInterventionGetPayload<{ include: { account: true; playbook: true } }>[] = [];
  try {
    [accounts, playbooks, interventions] = await Promise.all([
      db.retentionAccount.findMany({ orderBy: { name: "asc" } }),
      db.retentionPlaybook.findMany({ orderBy: { name: "asc" } }),
      db.retentionIntervention.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { account: true, playbook: true }
      })
    ]);
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Interventions" title="Operator-owned save motions">
        <p>Create accountable retention work from the risk queue, with owner, SLA, rationale, and audit history.</p>
      </Section>
      <Section title="Create intervention">
        {accounts.length && playbooks.length ? (
          <RetentionInterventionForm
            accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
            playbooks={playbooks.map((playbook) => ({ id: playbook.id, name: playbook.name }))}
          />
        ) : (
          <div className="card"><p>No account or playbook data found. Reset demo data from Overview.</p></div>
        )}
      </Section>
      <Section title="Intervention queue">
        {interventions.length ? (
          <div className="grid grid-2">
            {interventions.map((intervention) => (
              <RetentionInterventionEditor
                key={intervention.id}
                intervention={intervention}
                accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
                playbooks={playbooks.map((playbook) => ({ id: playbook.id, name: playbook.name }))}
              />
            ))}
          </div>
        ) : (
          <div className="card"><p>No interventions queued yet.</p></div>
        )}
      </Section>
    </>
  );
}
