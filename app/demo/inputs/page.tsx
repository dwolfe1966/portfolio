import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";

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
      <Section title="Global lifecycle assumptions">
        <div className="grid grid-3">
          <div className="card"><h3>Open rate</h3><p>Default baseline: 30%</p></div>
          <div className="card"><h3>Click rate</h3><p>Default baseline: 8%</p></div>
          <div className="card"><h3>Engagement rate</h3><p>Default baseline: 4%</p></div>
          <div className="card"><h3>Purchase rate</h3><p>Default baseline: 1.2%</p></div>
          <div className="card"><h3>Average order value</h3><p>Default baseline: $89</p></div>
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
