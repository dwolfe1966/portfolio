import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { Section } from "@/components/site/Section";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CandidateDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const cookieStore = await cookies();
    const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    const candidate = await db.campaignCandidate.findFirst({
      where: {
        id,
        campaignRun: {
          OR: session
            ? [{ accountUserId: session.userId }, { accountUserId: null }]
            : [{ accountUserId: null }]
        }
      },
      include: { user: true, entity: true, entityDelta: true, campaignRun: true, generatedMessage: true }
    });

    if (!candidate) {
      return (
        <Section title="Candidate not found">
          <p>No candidate exists for this id.</p>
        </Section>
      );
    }

    const contributions = [
      { label: "Interest", value: candidate.interestContribution, className: "stack interest" },
      { label: "Recency", value: candidate.recencyContribution, className: "stack recency" },
      { label: "Segment value", value: candidate.segmentContribution, className: "stack segment" },
      { label: "Change type", value: candidate.changeTypeContribution, className: "stack change" }
    ];

    const total = contributions.reduce((sum, item) => sum + item.value, 0) || 1;

    return (
      <>
        <Section eyebrow="Candidate" title={`${candidate.user.fullName} × ${candidate.entity.name}`}>
          <p>{candidate.entityDelta.deltaSummary}</p>
          <div className="grid grid-2">
            <div className="card"><div className="kpi">{candidate.priorityScore.toFixed(2)}</div><p>Priority score</p></div>
            <div className="card"><div className="kpi">{candidate.segmentAtGeneration}</div><p>Segment at generation</p></div>
          </div>
        </Section>

        <Section title="Scoring transparency">
          <p>The score is decomposed into weighted contributions for explainability and tuning.</p>
          <div className="card">
            <div className="scoreStack" aria-label="Priority score stacked bar">
              {contributions.map((item) => (
                <div key={item.label} className={item.className} style={{ width: `${(item.value / total) * 100}%` }} />
              ))}
            </div>
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              {contributions.map((item) => (
                <div key={item.label} className="card">
                  <h3>{item.label}</h3>
                  <p>{item.value.toFixed(3)}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Run context">
          <p>Run: {candidate.campaignRun?.runName ?? "N/A"}</p>
          <p>Status: {candidate.status}</p>
          <p>Generated subject: {candidate.generatedMessage?.subjectLine ?? "Not generated"}</p>
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) return <DemoSetupNotice />;
    throw error;
  }
}
