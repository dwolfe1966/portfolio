import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { AudienceTemplateForm } from "@/components/acquisition/AudienceTemplateForm";

export const dynamic = "force-dynamic";

export default async function AudienceLibraryPage() {
  try {
    const templates = await db.audienceTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { segments: true } } }
    });

    return (
      <>
        <Section
          title="Audience library"
          eyebrow={`${templates.length.toLocaleString()} template${templates.length === 1 ? "" : "s"}`}
        >
          <p>
            First-class audience templates that campaigns can reuse. Each template captures
            targeting JSON plus predicted CPC/CAC so the same audience can be applied
            across multiple campaigns. Editing a template does not retroactively change
            audience segments already cloned into running campaigns.
          </p>
        </Section>

        <Section title="Existing templates">
          {templates.length === 0 ? (
            <div className="card">
              <p>No audience templates yet. Create the first one below.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Pred. CPC</th>
                  <th>Pred. CAC</th>
                  <th>Used by</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <Link href={`/acquisition/audiences/${template.id}`}>{template.name}</Link>
                    </td>
                    <td><code className="small">{template.audienceType}</code></td>
                    <td>${(template.predictedCpcCents / 100).toFixed(2)}</td>
                    <td>${(template.predictedCacCents / 100).toFixed(0)}</td>
                    <td>{template._count.segments} segment{template._count.segments === 1 ? "" : "s"}</td>
                    <td>{new Date(template.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/acquisition/audiences/${template.id}`} className="btn">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Create a new audience template">
          <AudienceTemplateForm mode="create" />
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <Section title="Audience library">
          <div className="card">
            <p>Audience template table is missing. Run database migrations before opening this page.</p>
            <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
