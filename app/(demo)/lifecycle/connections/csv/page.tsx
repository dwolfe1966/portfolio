import Link from "next/link";
import { LifecycleCsvUploadScaffold } from "@/components/demo/LifecycleCsvUploadScaffold";
import { Section } from "@/components/site/Section";

export const dynamic = "force-dynamic";

const schemaGroups = [
  {
    object: "Users",
    fields: "fullName, email, segment, subscriptionStatus, lastActiveAt",
    purpose: "Defines who can receive lifecycle messages and which commercial posture applies."
  },
  {
    object: "Entities",
    fields: "name, entityType, city, state",
    purpose: "Defines the people, properties, companies, or records users are tracking."
  },
  {
    object: "Interest edges",
    fields: "userEmail, entityName or entityId, interestScore, source",
    purpose: "Connects users to entities and provides the signal strength used in scoring."
  },
  {
    object: "Change events",
    fields: "entityName or entityId, changeType, oldValue, newValue, deltaSummary, detectedAt",
    purpose: "Creates the trigger events that become candidates for OpenAI-generated outreach."
  }
];

export default function LifecycleCsvConnectionPage() {
  return (
    <>
      <Section eyebrow="CSV connector" title="Upload lifecycle data from CSV">
        <p>
          Use this WIP connector to map CSV rows into the lifecycle model. Once imported, the same data feeds inputs,
          simulations, OpenAI message generation, outputs, and audit views.
        </p>
        <div className="ctaRow">
          <Link className="btn" href="/lifecycle/connections">Back to connections</Link>
          <Link className="btn" href="/lifecycle/inputs">Open current inputs</Link>
        </div>
      </Section>

      <Section title="CSV schema requirements">
        <p>
          Every CSV import maps external data into the same lifecycle objects. Keep these fields stable so the engine can
          score opportunities and generate campaigns consistently.
        </p>
        <div className="tableScroll">
          <table className="table">
            <thead>
              <tr><th>Object</th><th>Required fields</th><th>Why it matters</th></tr>
            </thead>
            <tbody>
              {schemaGroups.map((group) => (
                <tr key={group.object}>
                  <td>{group.object}</td>
                  <td><code className="small">{group.fields}</code></td>
                  <td>{group.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="CSV upload">
        <LifecycleCsvUploadScaffold />
      </Section>
    </>
  );
}
