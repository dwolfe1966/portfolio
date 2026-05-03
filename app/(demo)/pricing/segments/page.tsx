import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { PricingSegmentEditor } from "@/components/pricing/PricingSegmentEditor";

export const dynamic = "force-dynamic";

export default async function PricingSegmentsPage() {
  let segments: Awaited<ReturnType<typeof db.pricingSegment.findMany>> = [];
  try {
    segments = await db.pricingSegment.findMany({ orderBy: { monthlyVolume: "desc" } });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Segments" title="Pricing segment library">
        <p>Each segment carries baseline economics, volume, eligibility logic, and a risk band.</p>
      </Section>
      <Section title="Segments">
        <div className="grid grid-2">
          {segments.map((segment) => (
            <PricingSegmentEditor key={segment.id} segment={segment} />
          ))}
        </div>
      </Section>
    </>
  );
}
