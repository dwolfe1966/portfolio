import { db } from "@/lib/db";
import Link from "next/link";
import { Section } from "@/components/site/Section";
import { AssumptionEditorCard } from "@/components/demo/AssumptionEditorCard";
import { LifecycleScoringSettings } from "@/components/demo/LifecycleScoringSettings";
import { VariableDefinitions } from "@/components/demo/VariableDefinitions";
import { InfoTooltip } from "@/components/site/InfoTooltip";
import {
  LifecycleEntityEditor,
  LifecycleInterestEdgeEditor,
  LifecycleUserEditor
} from "@/components/demo/LifecycleTableEditors";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ imported?: string }>;
};

export default async function DemoInputsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const imported = query.imported === "1";
  const [users, entities, interestEdges, interestEdgeCount] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.entity.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.interestEdge.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true, entity: true }
    }),
    db.interestEdge.count()
  ]);

  return (
    <>
      <Section title="Inputs: audience, entities, and assumptions">
        <p>
          This section defines the &quot;starting state&quot; for simulations: who your users are, which entities they track,
          and what conversion assumptions drive outcome projections.
        </p>
      </Section>
      {imported ? (
        <Section title="Imported data is active">
          <div className="card lifecycleImportBanner">
            <div>
              <p className="editorKicker">CSV import complete</p>
              <h3>Your imported rows are now part of the lifecycle model.</h3>
              <p>
                Review the newest users, entities, and interest relations below, then run a simulation against the current data.
              </p>
            </div>
            <Link className="btn primary" href="/lifecycle/simulations?imported=1">Run simulation</Link>
          </div>
        </Section>
      ) : null}
      <Section title="Input guide: what each control affects">
        <div className="grid grid-3">
          <div className="card">
            <h3>
              Assumption sets
              <InfoTooltip label="Assumption sets context">
                Saved assumptions make simulation runs repeatable and easier to compare.
              </InfoTooltip>
            </h3>
            <p>
              Save named parameter sets to make runs reproducible.
              The active set is attached to new campaign runs and stored as a run snapshot.
            </p>
          </div>
          <div className="card">
            <h3>
              Scoring thresholds
              <InfoTooltip label="Scoring thresholds context">
                Thresholds control which opportunities are worth generating messages for.
              </InfoTooltip>
            </h3>
            <p>
              <code>minPriorityScore</code> filters low-fit candidates, while
              <code>highPriorityThreshold</code> controls what counts as high-value opportunity.
            </p>
          </div>
          <div className="card">
            <h3>
              Funnel assumptions
              <InfoTooltip label="Funnel assumptions context">
                Funnel rates translate generated messages into modeled commercial outcomes.
              </InfoTooltip>
            </h3>
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
        <div className="tableScroll">
          <table className="table editableTable">
            <thead><tr><th>User</th><th>Email</th><th>Segment</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {users.map((user) => <LifecycleUserEditor user={user} key={user.id} />)}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Sample entities">
        <div className="tableScroll">
          <table className="table editableTable">
            <thead><tr><th>Entity</th><th>Type</th><th>City</th><th>State</th><th>Action</th></tr></thead>
            <tbody>
              {entities.map((entity) => <LifecycleEntityEditor entity={entity} key={entity.id} />)}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title="Sample interest relations"
        eyebrow={`${interestEdgeCount.toLocaleString()} total user → entity edges`}
      >
        <p>
          Interest edges connect users to the entities they care about, scored by{" "}
          <code>interestScore</code> and tagged with the <code>source</code> that captured the
          relationship (signup form, behavioral inference, manual import). Edges feed the{" "}
          <code>interestContribution</code> channel of priority scoring.
        </p>
        {interestEdges.length === 0 ? (
          <p className="small">No interest edges yet — seed the workspace data to populate this view.</p>
        ) : (
          <div className="tableScroll">
          <table className="table editableTable">
            <thead>
              <tr>
                <th>User</th>
                <th>Entity</th>
                <th>Interest score</th>
                <th>Source</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {interestEdges.map((edge) => <LifecycleInterestEdgeEditor edge={edge} key={edge.id} />)}
            </tbody>
          </table>
          </div>
        )}
      </Section>
    </>
  );
}
