import Link from "next/link";
import { cookies } from "next/headers";
import { DeltaChangeType, Prisma, UserSegment } from "@prisma/client";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { LifecycleMessageMetricsStrip } from "@/components/demo/LifecycleMessageMetricsStrip";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PageProps = {
  searchParams: SearchParams;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CampaignsPage({ searchParams }: PageProps) {
  try {
    const query = await searchParams;
    const segment = firstValue(query.segment) as UserSegment | undefined;
    const changeType = firstValue(query.changeType) as DeltaChangeType | undefined;
    const minScore = Number(firstValue(query.minScore) ?? 0);
    const maxScore = Number(firstValue(query.maxScore) ?? 1);
    const sortBy = firstValue(query.sortBy) ?? "createdAt";
    const sortDir = firstValue(query.sortDir) === "asc" ? "asc" : "desc";
    const cookieStore = await cookies();
    const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);

    const where: Prisma.CampaignCandidateWhereInput = {
      campaignRun: {
        OR: session
          ? [{ accountUserId: session.userId }, { accountUserId: null }]
          : [{ accountUserId: null }]
      },
      ...(segment ? { segmentAtGeneration: segment } : {}),
      ...(changeType ? { entityDelta: { changeType } } : {}),
      priorityScore: {
        gte: Number.isFinite(minScore) ? minScore : 0,
        lte: Number.isFinite(maxScore) ? maxScore : 1
      }
    };

    const orderBy: Prisma.CampaignCandidateOrderByWithRelationInput =
      sortBy === "priorityScore"
        ? { priorityScore: sortDir }
        : sortBy === "segment"
          ? { segmentAtGeneration: sortDir }
          : sortBy === "changeType"
            ? { entityDelta: { changeType: sortDir } }
            : { createdAt: sortDir };

    const [candidates, activeAssumptions] = await Promise.all([
      db.campaignCandidate.findMany({
        include: { user: true, entity: true, entityDelta: true, generatedMessage: true, campaignRun: true },
        orderBy,
        where,
        take: 80
      }),
      db.assumptionSet.findFirst({
        where: { isActive: true },
        select: { openRate: true, clickRate: true, engageRate: true, purchaseRate: true, avgOrderValue: true }
      })
    ]);

    return (
      <Section eyebrow="Tools" title="Campaign opportunities">
        <LifecycleMessageMetricsStrip
          assumptions={activeAssumptions}
          caption="Keep core funnel metrics prominent while filtering and prioritizing campaign opportunities."
        />
        <form method="GET" className="card" style={{ marginBottom: 16 }}>
          <div className="grid grid-3" style={{ gap: 10 }}>
            <label>
              Segment
              <select name="segment" defaultValue={segment ?? ""}>
                <option value="">All</option>
                {Object.values(UserSegment).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              Change type
              <select name="changeType" defaultValue={changeType ?? ""}>
                <option value="">All</option>
                {Object.values(DeltaChangeType).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              Sort by
              <select name="sortBy" defaultValue={sortBy}>
                <option value="createdAt">Created time</option>
                <option value="priorityScore">Priority score</option>
                <option value="segment">Segment</option>
                <option value="changeType">Change type</option>
              </select>
            </label>
            <label>Min score<input type="number" step="0.01" min={0} max={1} name="minScore" defaultValue={Number.isFinite(minScore) ? minScore : 0} /></label>
            <label>Max score<input type="number" step="0.01" min={0} max={1} name="maxScore" defaultValue={Number.isFinite(maxScore) ? maxScore : 1} /></label>
            <label>
              Sort direction
              <select name="sortDir" defaultValue={sortDir}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button type="submit">Apply filters</button>
            <Link className="btn" href="/lifecycle/campaigns">Reset</Link>
          </div>
        </form>

        {candidates.length === 0 ? (
          <div className="card">
            <h3>No opportunities yet</h3>
            <p>Generate a campaign run from the dashboard to create candidate opportunities.</p>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Entity</th><th>Segment</th><th>Change</th><th>Score</th><th>Run</th><th>Subject</th></tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/lifecycle/candidates/${c.id}`}>{c.user.fullName}</Link></td>
                    <td>{c.entity.name}</td>
                    <td>{c.segmentAtGeneration}</td>
                    <td>{c.entityDelta.changeType}</td>
                    <td>{c.priorityScore.toFixed(2)}</td>
                    <td>{c.campaignRun ? <Link href={`/lifecycle/campaigns/${c.campaignRun.id}`}>{c.campaignRun.runName}</Link> : "—"}</td>
                    <td>{c.generatedMessage?.subjectLine ?? "Not generated yet"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) return <DemoSetupNotice />;
    throw error;
  }
}
