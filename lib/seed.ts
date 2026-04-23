import { Prisma, UserSegment, SubscriptionStatus, DeltaChangeType } from "@prisma/client";
import { db } from "@/lib/db";

const firstNames = [
  "Ava", "Liam", "Olivia", "Noah", "Emma", "Elijah", "Sophia", "Mateo", "Isabella", "Lucas",
  "Mia", "Mason", "Amelia", "Ethan", "Harper", "Logan", "Evelyn", "James", "Abigail", "Benjamin",
  "Ella", "Daniel", "Scarlett", "Jackson", "Aria", "Sebastian", "Grace", "Henry", "Chloe", "Jack"
];

const lastNames = [
  "Nguyen", "Rivera", "Kim", "Patel", "Garcia", "Davis", "Lee", "Martinez", "Young", "Hernandez",
  "Wright", "Turner", "Moore", "Adams", "Flores", "Brooks", "Cooper", "Ramirez", "Bennett", "Diaz"
];

const cityWeights = [
  { city: "New York", state: "NY", weight: 16 },
  { city: "Los Angeles", state: "CA", weight: 14 },
  { city: "Chicago", state: "IL", weight: 10 },
  { city: "Houston", state: "TX", weight: 9 },
  { city: "Phoenix", state: "AZ", weight: 8 },
  { city: "Seattle", state: "WA", weight: 7 },
  { city: "Miami", state: "FL", weight: 7 },
  { city: "Denver", state: "CO", weight: 6 },
  { city: "Austin", state: "TX", weight: 6 },
  { city: "San Diego", state: "CA", weight: 6 },
  { city: "Atlanta", state: "GA", weight: 5 },
  { city: "Philadelphia", state: "PA", weight: 5 },
  { city: "Charlotte", state: "NC", weight: 4 },
  { city: "Nashville", state: "TN", weight: 4 },
  { city: "Portland", state: "OR", weight: 3 }
];

const sources = ["search_history","profile_view","email_click","signup_intent"];

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function weightedCityPick() {
  const total = cityWeights.reduce((acc, item) => acc + item.weight, 0);
  let cursor = randomInt(1, total);
  for (const item of cityWeights) {
    cursor -= item.weight;
    if (cursor <= 0) return [item.city, item.state] as const;
  }
  return ["Austin", "TX"] as const;
}

function makePersonName() {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

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
    const fullName = makePersonName();
    const emailHandle = fullName.toLowerCase().replace(/[^a-z\\s]/g, "").trim().replace(/\\s+/g, ".");
    users.push(await db.user.create({ data: {
      fullName,
      email: `${emailHandle}${i + 1}@example.com`,
      segment: seg,
      subscriptionStatus: status
    }}));
  }

  const entities = [];
  for (let i = 0; i < 200; i++) {
    const [city, state] = weightedCityPick();
    entities.push(await db.entity.create({ data: {
      name: makePersonName(),
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
