import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LandingPage({ params }: PageProps) {
  const { id } = await params;

  const message = await db.generatedMessage.findUnique({
    where: { id },
    include: { campaignCandidate: { include: { entity: true, entityDelta: true } } }
  });
  if (!message) return <Section title="Landing page not found"><p>No generated landing page found.</p></Section>;

  return (
    <>
      <Section eyebrow="Demo" title={message.landingHeadline}>
        <p>{message.landingBody}</p>
      </Section>
      <Section title="Preview data">
        <div className="grid grid-3">
          <div className="card"><h3>Change type</h3><p>{message.campaignCandidate.entityDelta.changeType}</p></div>
          <div className="card"><h3>Entity</h3><p>{message.campaignCandidate.entity.name}</p></div>
          <div className="card"><h3>CTA</h3><p>{message.ctaText}</p></div>
        </div>
      </Section>
    </>
  );
}
