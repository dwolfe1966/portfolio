import {
  Prisma,
  UserSegment,
  SubscriptionStatus,
  DeltaChangeType,
  CampaignStatus,
  AcquisitionChannel,
  AcquisitionCampaignState
} from "@prisma/client";
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

const sources = ["search_history", "profile_view", "email_click", "signup_intent"];

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

async function clearLifecycleData() {
  await db.generatedMessage.deleteMany();
  await db.campaignCandidate.deleteMany();
  await db.campaignRun.deleteMany();
  await db.interestEdge.deleteMany();
  await db.entityDelta.deleteMany();
  await db.user.deleteMany();
  await db.entity.deleteMany();
}

async function clearAcquisitionData() {
  await db.adPerformance.deleteMany();
  await db.budgetActivity.deleteMany();
  await db.testCell.deleteMany();
  await db.adCreative.deleteMany();
  await db.audienceSegment.deleteMany();
  await db.acquisitionAuditLog.deleteMany();
  await db.acquisitionCampaign.deleteMany();
}

async function clearAuctionData() {
  // Order matters: child rows first, then parents.
  await db.auctionAuditLog.deleteMany();
  await db.auctionAdvertiserSpend.deleteMany();
  await db.auctionResultRow.deleteMany();
  await db.auctionResult.deleteMany();
  await db.auctionRun.deleteMany();
  await db.auctionBid.deleteMany();
  await db.auctionAdvertiser.deleteMany();
  await db.auctionSlot.deleteMany();
}

async function seedAuctionDemo() {
  const advertisers = await Promise.all([
    db.auctionAdvertiser.create({
      data: {
        name: "ICP Brand",
        qualityScore: 0.85,
        dailyBudgetCents: 80000,
        smoothingFactor: 0.6,
        behaviorMode: "truthful",
        targetCacCents: null
      }
    }),
    db.auctionAdvertiser.create({
      data: {
        name: "Performance Bidder",
        qualityScore: 0.7,
        dailyBudgetCents: 60000,
        smoothingFactor: 0.5,
        behaviorMode: "auto_bid",
        targetCacCents: 18000
      }
    }),
    db.auctionAdvertiser.create({
      data: {
        name: "Bargain Hunter",
        qualityScore: 0.6,
        dailyBudgetCents: 40000,
        smoothingFactor: 0.4,
        behaviorMode: "shaded",
        targetCacCents: null
      }
    }),
    db.auctionAdvertiser.create({
      data: {
        name: "Display Whale",
        qualityScore: 0.5,
        dailyBudgetCents: 100000,
        smoothingFactor: 0.7,
        behaviorMode: "truthful",
        targetCacCents: null
      }
    })
  ]);

  const slots = await Promise.all([
    db.auctionSlot.create({
      data: { name: "Top banner", reservePriceCents: 250, expectedDailyVolume: 200 }
    }),
    db.auctionSlot.create({
      data: { name: "Sidebar", reservePriceCents: 120, expectedDailyVolume: 350 }
    }),
    db.auctionSlot.create({
      data: { name: "Newsletter inline", reservePriceCents: 80, expectedDailyVolume: 90 }
    })
  ]);

  // Bid matrix: each advertiser bids on each slot at slightly different premiums.
  const matrix: Record<string, Record<string, number>> = {
    "ICP Brand": { "Top banner": 800, "Sidebar": 380, "Newsletter inline": 200 },
    "Performance Bidder": { "Top banner": 650, "Sidebar": 320, "Newsletter inline": 180 },
    "Bargain Hunter": { "Top banner": 500, "Sidebar": 260, "Newsletter inline": 150 },
    "Display Whale": { "Top banner": 700, "Sidebar": 300, "Newsletter inline": 130 }
  };

  for (const advertiser of advertisers) {
    const row = matrix[advertiser.name];
    if (!row) continue;
    for (const slot of slots) {
      const bid = row[slot.name];
      if (bid == null) continue;
      await db.auctionBid.create({
        data: { advertiserId: advertiser.id, slotId: slot.id, bidCents: bid }
      });
    }
  }
}

async function seedAcquisitionDemo() {
  const now = new Date();
  const endAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const campaign = await db.acquisitionCampaign.create({
    data: {
      name: "Spring Revenue Expansion",
      objective: "Grow qualified pipeline with CAC discipline",
      budgetCents: 450000,
      startAt: now,
      endAt,
      channels: [AcquisitionChannel.SEARCH, AcquisitionChannel.SOCIAL],
      targetCacCents: 9000,
      targetLtvCents: 28000,
      state: AcquisitionCampaignState.TESTING,
      maxBudgetShiftPct: 0.2,
      minConfidence: 0.65,
      cooldownHours: 24
    }
  });

  const creatives = await Promise.all([
    db.adCreative.create({
      data: {
        campaignId: campaign.id,
        headline: "Cut onboarding time by 40%",
        description: "AI-native lifecycle playbooks for growth teams.",
        callToAction: "Book demo",
        channel: AcquisitionChannel.SEARCH,
        predictedCtr: 0.043,
        predictedConversion: 0.032,
        status: CampaignStatus.GENERATED
      }
    }),
    db.adCreative.create({
      data: {
        campaignId: campaign.id,
        headline: "Stop losing high-intent users",
        description: "Unify lifecycle + acquisition operating loops.",
        callToAction: "See architecture",
        channel: AcquisitionChannel.SOCIAL,
        predictedCtr: 0.038,
        predictedConversion: 0.029,
        status: CampaignStatus.GENERATED
      }
    })
  ]);

  const audiences = await Promise.all([
    db.audienceSegment.create({
      data: {
        campaignId: campaign.id,
        name: "PLG leaders",
        audienceType: "Lookalike",
        targetingJson: { seniority: ["Director", "VP"], industry: ["SaaS"] } as Prisma.InputJsonValue,
        predictedCpcCents: 420,
        predictedCacCents: 8600
      }
    }),
    db.audienceSegment.create({
      data: {
        campaignId: campaign.id,
        name: "Lifecycle operators",
        audienceType: "Interest",
        targetingJson: { interests: ["lifecycle marketing", "growth ops"] } as Prisma.InputJsonValue,
        predictedCpcCents: 390,
        predictedCacCents: 9100
      }
    })
  ]);

  const testCells: { id: string }[] = [];
  for (const creative of creatives) {
    for (const audience of audiences) {
      testCells.push(await db.testCell.create({
        data: {
          campaignId: campaign.id,
          creativeId: creative.id,
          audienceId: audience.id,
          budgetCents: 56000,
          impressions: randomInt(9000, 18000),
          clicks: randomInt(220, 640),
          conversions: randomInt(16, 52),
          spendCents: randomInt(30000, 52000),
          revenueCents: randomInt(90000, 210000),
          cacCents: randomInt(6500, 11500),
          roas: Number((1.3 + Math.random() * 2.1).toFixed(2)),
          score: Number((0.45 + Math.random() * 0.45).toFixed(2)),
          status: CampaignStatus.REVIEWED
        }
      }));
    }
  }

  await Promise.all(testCells.map((cell) =>
    db.adPerformance.create({
      data: {
        testCellId: cell.id,
        impressions: randomInt(3000, 9000),
        clicks: randomInt(90, 260),
        conversions: randomInt(7, 23),
        spendCents: randomInt(8000, 22000),
        revenueCents: randomInt(22000, 58000),
        ctr: Number((0.018 + Math.random() * 0.03).toFixed(3)),
        conversionRate: Number((0.03 + Math.random() * 0.08).toFixed(3)),
        cpcCents: randomInt(260, 510),
        cpaCents: randomInt(5200, 12100),
        roas: Number((1.1 + Math.random() * 1.8).toFixed(2))
      }
    })
  ));

  if (testCells.length >= 2) {
    await db.budgetActivity.create({
      data: {
        campaignId: campaign.id,
        fromTestCellId: testCells[0].id,
        toTestCellId: testCells[1].id,
        amountCents: 7500,
        reason: "Shift toward higher confidence conversion cell"
      }
    });
  }

  await db.acquisitionAuditLog.create({
    data: {
      campaignId: campaign.id,
      actor: "system",
      action: "SEED_INIT",
      metadata: {
        note: "Demo acquisition campaign seeded",
        cells: testCells.length,
        channels: campaign.channels
      } as Prisma.InputJsonValue
    }
  });
}

async function seedLifecycleDemo() {
  const users = [];
  for (let i = 0; i < 80; i++) {
    const seg = i < 36 ? UserSegment.FREE : i < 48 ? UserSegment.TRIAL : i < 72 ? UserSegment.LAPSED : UserSegment.ACTIVE;
    const status = seg === UserSegment.ACTIVE ? SubscriptionStatus.ACTIVE : seg === UserSegment.TRIAL ? SubscriptionStatus.TRIALING : SubscriptionStatus.NONE;
    const fullName = makePersonName();
    const emailHandle = fullName.toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".");
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

export async function reseedLifecycleOnly() {
  await clearLifecycleData();
  await seedLifecycleDemo();
}

export async function reseedAcquisitionOnly() {
  await clearAcquisitionData();
  await seedAcquisitionDemo();
}

export async function reseedAuctionOnly() {
  await clearAuctionData();
  await seedAuctionDemo();
}

export async function reseed() {
  await clearLifecycleData();
  await clearAcquisitionData();
  await clearAuctionData();
  await seedLifecycleDemo();
  await seedAcquisitionDemo();
  await seedAuctionDemo();
}
