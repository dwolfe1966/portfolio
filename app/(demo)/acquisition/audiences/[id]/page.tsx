import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { AudienceTemplateForm } from "@/components/acquisition/AudienceTemplateForm";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AudienceTemplateDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const template = await db.audienceTemplate.findUnique({
      where: { id },
      include: {
        segments: {
          include: { campaign: { select: { id: true, name: true, state: true } } },
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    if (!template) notFound();

    const targetingString = JSON.stringify(template.targetingJson, null, 2);

    return (
      <>
        <Section
          eyebrow="Audience template"
          title={template.name}
        >
          <p>
            <code className="small">{template.audienceType}</code>
            {template.description ? ` · ${template.description}` : null}
          </p>
          <div className="ctaRow">
            <Link href="/acquisition/audiences" className="btn">Back to library</Link>
          </div>
        </Section>

        <Section title="Edit template">
          <AudienceTemplateForm
            mode="edit"
            initial={{
              id: template.id,
              name: template.name,
              audienceType: template.audienceType,
              description: template.description ?? "",
              predictedCpcCents: template.predictedCpcCents,
              predictedCacCents: template.predictedCacCents,
              targetingJsonString: targetingString
            }}
          />
        </Section>

        <Section title={`Used by ${template.segments.length} campaign segment${template.segments.length === 1 ? "" : "s"}`}>
          {template.segments.length === 0 ? (
            <div className="card">
              <p>This template is not in use by any campaign yet. Templates are referenced when a campaign is created with the template selected.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {template.segments.map((segment) => (
                  <tr key={segment.id}>
                    <td>
                      <Link href={`/acquisition/campaigns/${segment.campaign.id}`}>
                        {segment.campaign.name}
                      </Link>
                    </td>
                    <td><code className="small">{segment.campaign.state}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <Section title="Audience template">
          <div className="card">
            <p>Audience template table is missing. Run database migrations.</p>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
