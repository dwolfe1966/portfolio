import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";
import { AssumptionEditorCard } from "@/components/demo/AssumptionEditorCard";
import { LifecycleScoringSettings } from "@/components/demo/LifecycleScoringSettings";
import { VariableDefinitions } from "@/components/demo/VariableDefinitions";

export const dynamic = "force-dynamic";

export default async function DemoInputsPage() {
  const [users, entities] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.entity.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  ]);

  return (
    <>
      <DemoWorkspaceNav />
      <Section title="Inputs: audience, entities, and assumptions">
        <p>
          This section defines the &quot;starting state&quot; for simulations: who your users are, which entities they track,
          and what conversion assumptions drive outcome projections.
        </p>
      </Section>
      <Section title="Input guide: what each control affects">
        <div className="grid grid-3">
          <div className="card">
            <h3>Assumption sets</h3>
            <p>
              Save named parameter sets to make runs reproducible.
              The active set is attached to new campaign runs and stored as a run snapshot.
            </p>
          </div>
          <div className="card">
            <h3>Scoring thresholds</h3>
            <p>
              <code>minPriorityScore</code> filters low-fit candidates, while
              <code>highPriorityThreshold</code> controls what counts as high-value opportunity.
            </p>
          </div>
          <div className="card">
            <h3>Funnel assumptions</h3>
            <p>
              Open/click/engage/purchase rates and AOV drive modeled outcomes downstream.
              Tune these to test conservative vs aggressive commercial scenarios.
            </p>
          </div>
        </div>
      </Section>
      <Section title="Scoring controls">
        <LifecycleScoringSettings />
      </Section>
      <Section title="Variable context">
        <VariableDefinitions />
      </Section>
      <Section title="Global lifecycle assumptions">
        <AssumptionEditorCard />
      </Section>
      <Section title="Assumption mapping (events → candidates → messages)">
        <div className="grid grid-3">
          <div className="card">
            <h3>Events → Candidates</h3>
            <p>
              Entity deltas are matched to interest edges and scored with recency + segment signals.
              Records under <code>minPriorityScore</code> are filtered out.
            </p>
          </div>
          <div className="card">
            <h3>Candidates → Messages</h3>
            <p>
              Highest scored candidates are sorted and top N are generated into message assets.
              Run-level controls determine how many messages are produced per run.
            </p>
          </div>
          <div className="card">
            <h3>Messages → Outcomes</h3>
            <p>
              Global funnel assumptions (open/click/engage/purchase rates and AOV) model downstream business outcomes.
            </p>
          </div>
        </div>
      </Section>
      <Section title="Sample users">
        <table className="table">
          <thead><tr><th>User</th><th>Segment</th><th>Status</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.segment}</td>
                <td>{user.subscriptionStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Sample entities">
        <table className="table">
          <thead><tr><th>Entity</th><th>Type</th><th>Location</th></tr></thead>
          <tbody>
            {entities.map((entity) => (
              <tr key={entity.id}>
                <td>{entity.name}</td>
                <td>{entity.entityType}</td>
                <td>{[entity.city, entity.state].filter(Boolean).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}
