import { Prisma, UserSegment, SubscriptionStatus, DeltaChangeType } from "@prisma/client";
import { db } from "@/lib/db";

const names = ["Sarah Chen","John Smith","David Lewis","Maria Garcia","Emily Patel","Alex Rivera","Daniel Kim","Lauren Davis","Michael Brooks","Ava Turner"];
const cities = [["San Diego","CA"],["Austin","TX"],["Seattle","WA"],["Phoenix","AZ"],["Fullerton","CA"],["Miami","FL"],["Denver","CO"],["Chicago","IL"]];
const sources = ["search_history","profile_view","email_click","signup_intent"];

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

export async function reseed() {
  await db.generatedMessage.deleteMany();
  await db.campaignCandidate.deleteMany();
  await db.campaignRun.deleteMany();
  await db.interestEdge.deleteMany();
  await db.entityDelta.deleteMany();
  await db.user.deleteMany();
  await db.entity.deleteMany();

  const users = [];
  for (let i = 0; i < 80; i++) {
    const seg = i < 36 ? UserSegment.FREE : i < 48 ? UserSegment.TRIAL : i < 72 ? UserSegment.LAPSED : UserSegment.ACTIVE;
    const status = seg === UserSegment.ACTIVE ? SubscriptionStatus.ACTIVE : seg === UserSegment.TRIAL ? SubscriptionStatus.TRIALING : SubscriptionStatus.NONE;
    users.push(await db.user.create({ data: {
      fullName: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      segment: seg,
      subscriptionStatus: status
    }}));
  }

  const entities = [];
  for (let i = 0; i < 200; i++) {
    const [city, state] = pick(cities);
    entities.push(await db.entity.create({ data: {
      name: `${pick(names)} ${i + 1}`,
      entityType: "PERSON",
      city,
      state
    }}));
  }

  for (let i = 0; i < 400; i++) {
    const user = pick(users);
    const entity = pick(entities);
    try {
      await db.interestEdge.create({ data: {
        userId: user.id,
        entityId: entity.id,
        interestScore: Number((0.35 + Math.random() * 0.64).toFixed(2)),
        source: pick(sources)
      }});
    } catch {}
  }

  const changeTypes = Object.values(DeltaChangeType);
  for (let i = 0; i < 60; i++) {
    const entity = pick(entities);
    const changeType = pick(changeTypes);
    await db.entityDelta.create({ data: {
      entityId: entity.id,
      changeType,
      oldValue: "Old value",
      newValue: "New value",
      deltaSummary: `${entity.name} has a new ${changeType.toLowerCase().replaceAll("_"," ")}.`,
      detectedAt: new Date()
    }});
  }
}
