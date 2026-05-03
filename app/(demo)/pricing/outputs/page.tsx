import Link from "next/link";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function PricingOutputsPage() {
  let runs: Prisma.PricingExperimentRunGetPayload<{
    include: { experiment: true; segmentResults: { include: { segment: true; variant: true } } };
  }>[] = [];
  try {
    runs = await db.pricingExperimentRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { experiment: true, segmentResults: { include: { segment: true, variant: true } } }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  const latest = runs[0];
  return (
    <>
      <Section eyebrow="Outputs" title="Pricing experiment results and guardrails">
        <p>Outputs show whether pricing lift is worth the churn, margin, support, and holdout risk.</p>
      </Section>
      {latest ? (
        <>
          <Section title="Latest run">
            <div className="grid grid-4">
              <div className="card"><p className="small">ARPU lift</p><div className="kpi">{latest.arpuLiftPercent.toFixed(1)}%</div></div>
              <div className="card"><p className="small">Churn delta</p><div className="kpi">{latest.churnDeltaPercent.toFixed(2)}%</div></div>
              <div className="card"><p className="small">Margin</p><div className="kpi">{(latest.grossMarginPercent * 100).toFixed(0)}%</div></div>
              <div className="card"><p className="small">Recommendation</p><div className="kpi">{latest.recommendation}</div></div>
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <h3>Decision posture</h3>
              <p>
                Net revenue lift is ${(latest.netRevenueLiftCents / 100).toLocaleString()} with
                confidence {(latest.confidence * 100).toFixed(0)}%, support-load delta {latest.supportLoadDelta.toFixed(2)},
                and holdout health <strong>{latest.holdoutHealth}</strong>.
              </p>
            </div>
          </Section>
          <Section title="Segment results">
            <table className="table">
              <thead><tr><th>Segment</th><th>Variant</th><th>Sample</th><th>Conversion</th><th>Churn</th><th>Lift</th><th>Band</th></tr></thead>
              <tbody>
                {latest.segmentResults.map((row) => (
                  <tr key={row.id}>
                    <td>{row.segment.name}</td>
                    <td>{row.variant.name}</td>
                    <td>{row.sampleSize}</td>
                    <td>{(row.conversionRate * 100).toFixed(1)}%</td>
                    <td>{(row.churnRate * 100).toFixed(1)}%</td>
                    <td>${(row.netRevenueLiftCents / 100).toLocaleString()}</td>
                    <td>{row.guardrailBand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      ) : (
        <Section title="No runs yet">
          <div className="card"><p>No pricing simulations have been run yet.</p><Link className="btn" href="/pricing/simulations">Run simulation</Link></div>
        </Section>
      )}
    </>
  );
}
