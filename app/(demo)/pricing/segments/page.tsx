import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

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
            <div className="card" key={segment.id}>
              <p className="small">{segment.riskBand} risk · {segment.monthlyVolume.toLocaleString()} monthly volume</p>
              <h3>{segment.name}</h3>
              <p><code className="small">{segment.eligibilityRule}</code></p>
              <p className="small">Conversion {(segment.baselineConversionRate * 100).toFixed(1)}% · churn {(segment.baselineChurnRate * 100).toFixed(1)}% · ARPU ${(segment.baselineArpuCents / 100).toFixed(0)} · margin {(segment.grossMarginPercent * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
