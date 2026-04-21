import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const candidates = await db.campaignCandidate.findMany({
    include: { user: true, entity: true, entityDelta: true, generatedMessage: true },
    orderBy: { createdAt: "desc" },
    take: 40
  });

  return (
    <Section eyebrow="Demo" title="Campaign opportunities">
      <table className="table">
        <thead>
          <tr><th>User</th><th>Entity</th><th>Segment</th><th>Change</th><th>Score</th><th>Subject</th></tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/demo/users/${c.userId}`}>{c.user.fullName}</Link></td>
              <td>{c.entity.name}</td>
              <td>{c.segmentAtGeneration}</td>
              <td>{c.entityDelta.changeType}</td>
              <td>{c.priorityScore.toFixed(2)}</td>
              <td>{c.generatedMessage?.subjectLine ?? "Not generated yet"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
