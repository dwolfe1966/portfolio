import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await db.user.findUnique({
    where: { id: params.id },
    include: { interestEdges: { include: { entity: true }, take: 20 } }
  });
  if (!user) return <Section title="User not found"><p>No user found.</p></Section>;
  return (
    <>
      <Section eyebrow="Demo" title={user.fullName}>
        <p>Segment: {user.segment}</p>
        <p>Subscription status: {user.subscriptionStatus}</p>
      </Section>
      <Section title="Tracked entities">
        <div className="grid grid-2">
          {user.interestEdges.map((edge) => (
            <div key={edge.id} className="card">
              <h3>{edge.entity.name}</h3>
              <p>Interest score: {edge.interestScore.toFixed(2)}</p>
              <p>Source: {edge.source}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
