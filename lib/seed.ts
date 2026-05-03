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

async function clearPricingData() {
  await db.pricingAuditLog.deleteMany();
  await db.pricingDecision.deleteMany();
  await db.pricingSegmentResult.deleteMany();
  await db.pricingExperimentRun.deleteMany();
  await db.pricingExperimentVariant.deleteMany();
  await db.pricingExperimentSegment.deleteMany();
  await db.pricingExperiment.deleteMany();
  await db.pricingVariant.deleteMany();
  await db.pricingSegment.deleteMany();
}

async function clearRetentionData() {
  await db.retentionAuditLog.deleteMany();
  await db.retentionIntervention.deleteMany();
  await db.retentionRiskRunRow.deleteMany();
  await db.retentionRiskRun.deleteMany();
  await db.retentionPolicy.deleteMany();
  await db.retentionPlaybook.deleteMany();
  await db.retentionAccount.deleteMany();
}

async function clearExpansionData() {
  await db.expansionAuditLog.deleteMany();
  await db.expansionRunRow.deleteMany();
  await db.expansionRun.deleteMany();
  await db.expansionPolicy.deleteMany();
  await db.expansionOffer.deleteMany();
  await db.expansionAccount.deleteMany();
}

async function seedExpansionDemo() {
  await Promise.all([
    db.expansionAccount.create({
      data: {
        name: "Napster Fan Analytics",
        segment: "Strategic",
        currentArrCents: 12600000,
        seatsPurchased: 80,
        seatsActive: 76,
        usageGrowthRate: 0.24,
        productQualifiedScore: 0.82,
        supportHealthScore: 0.88,
        renewalDays: 108,
        executiveSponsor: true,
        openExpansionSignals: 5,
        trend: "accelerating"
      }
    }),
    db.expansionAccount.create({
      data: {
        name: "Goldbelly Marketplace Ops",
        segment: "Enterprise",
        currentArrCents: 8400000,
        seatsPurchased: 55,
        seatsActive: 48,
        usageGrowthRate: 0.18,
        productQualifiedScore: 0.74,
        supportHealthScore: 0.76,
        renewalDays: 74,
        executiveSponsor: true,
        openExpansionSignals: 4,
        trend: "accelerating"
      }
    }),
    db.expansionAccount.create({
      data: {
        name: "Interactive One Revenue Desk",
        segment: "Mid-market",
        currentArrCents: 3900000,
        seatsPurchased: 34,
        seatsActive: 24,
        usageGrowthRate: 0.09,
        productQualifiedScore: 0.61,
        supportHealthScore: 0.81,
        renewalDays: 145,
        executiveSponsor: false,
        openExpansionSignals: 2,
        trend: "steady"
      }
    }),
    db.expansionAccount.create({
      data: {
        name: "MyLife Identity Growth",
        segment: "Enterprise",
        currentArrCents: 7200000,
        seatsPurchased: 60,
        seatsActive: 38,
        usageGrowthRate: 0.05,
        productQualifiedScore: 0.55,
        supportHealthScore: 0.68,
        renewalDays: 51,
        executiveSponsor: false,
        openExpansionSignals: 1,
        trend: "softening"
      }
    }),
    db.expansionAccount.create({
      data: {
        name: "Northstar Customer Ops",
        segment: "SMB",
        currentArrCents: 960000,
        seatsPurchased: 18,
        seatsActive: 17,
        usageGrowthRate: 0.31,
        productQualifiedScore: 0.7,
        supportHealthScore: 0.9,
        renewalDays: 88,
        executiveSponsor: true,
        openExpansionSignals: 3,
        trend: "accelerating"
      }
    })
  ]);

  await Promise.all([
    db.expansionOffer.create({
      data: {
        name: "Seat expansion package",
        motion: "seat_expansion",
        targetSegment: "Enterprise",
        expectedLiftPercent: 0.22,
        costCents: 42000,
        marginPercent: 0.78,
        slaDays: 14
      }
    }),
    db.expansionOffer.create({
      data: {
        name: "Strategic feature upgrade",
        motion: "feature_upgrade",
        targetSegment: "Strategic",
        expectedLiftPercent: 0.28,
        costCents: 68000,
        marginPercent: 0.74,
        slaDays: 21
      }
    }),
    db.expansionOffer.create({
      data: {
        name: "Usage commit conversion",
        motion: "usage_commit",
        targetSegment: "Mid-market",
        expectedLiftPercent: 0.18,
        costCents: 26000,
        marginPercent: 0.82,
        slaDays: 10
      }
    }),
    db.expansionOffer.create({
      data: {
        name: "Services attach launch plan",
        motion: "services_attach",
        targetSegment: "Enterprise",
        expectedLiftPercent: 0.14,
        costCents: 52000,
        marginPercent: 0.66,
        slaDays: 28
      }
    })
  ]);

  const policy = await db.expansionPolicy.create({
    data: {
      name: "Default expansion policy",
      highReadinessThreshold: 0.72,
      mediumReadinessThreshold: 0.48,
      minMarginPercent: 0.65,
      minPaybackRatio: 3,
      maxSlaDays: 21
    }
  });

  await db.expansionAuditLog.create({
    data: {
      actor: "system",
      action: "SEED_INIT",
      detail: "Seeded expansion revenue intelligence demo.",
      metadata: { policyId: policy.id, accounts: 5, offers: 4 } as Prisma.InputJsonValue
    }
  });
}

async function seedRetentionDemo() {
  await Promise.all([
    db.retentionAccount.create({
      data: {
        name: "Goldbelly Enterprise Gifts",
        segment: "Enterprise",
        mrrCents: 420000,
        usageScore: 0.42,
        supportTicketCount: 6,
        npsScore: 4,
        renewalDays: 38,
        paymentRiskScore: 0.28,
        executiveSponsor: false,
        lastTouchedDays: 41,
        healthTrend: "declining"
      }
    }),
    db.retentionAccount.create({
      data: {
        name: "Napster Listener CRM",
        segment: "Strategic",
        mrrCents: 680000,
        usageScore: 0.76,
        supportTicketCount: 2,
        npsScore: 31,
        renewalDays: 72,
        paymentRiskScore: 0.09,
        executiveSponsor: true,
        lastTouchedDays: 12,
        healthTrend: "flat"
      }
    }),
    db.retentionAccount.create({
      data: {
        name: "Interactive One Media Ops",
        segment: "Mid-market",
        mrrCents: 185000,
        usageScore: 0.51,
        supportTicketCount: 5,
        npsScore: 12,
        renewalDays: 24,
        paymentRiskScore: 0.22,
        executiveSponsor: false,
        lastTouchedDays: 33,
        healthTrend: "declining"
      }
    }),
    db.retentionAccount.create({
      data: {
        name: "MyLife Identity Platform",
        segment: "Enterprise",
        mrrCents: 360000,
        usageScore: 0.63,
        supportTicketCount: 1,
        npsScore: 45,
        renewalDays: 116,
        paymentRiskScore: 0.38,
        executiveSponsor: true,
        lastTouchedDays: 19,
        healthTrend: "improving"
      }
    }),
    db.retentionAccount.create({
      data: {
        name: "Northstar Subscription Ops",
        segment: "SMB",
        mrrCents: 74000,
        usageScore: 0.36,
        supportTicketCount: 3,
        npsScore: -6,
        renewalDays: 52,
        paymentRiskScore: 0.18,
        executiveSponsor: false,
        lastTouchedDays: 55,
        healthTrend: "declining"
      }
    })
  ]);

  await Promise.all([
    db.retentionPlaybook.create({
      data: {
        name: "Usage recovery sprint",
        riskDriver: "usage",
        saveRateLift: 0.18,
        costCents: 18000,
        maxDiscountPct: 0.08,
        slaHours: 48
      }
    }),
    db.retentionPlaybook.create({
      data: {
        name: "Executive sponsor reset",
        riskDriver: "relationship",
        saveRateLift: 0.16,
        costCents: 26000,
        maxDiscountPct: 0.05,
        slaHours: 24
      }
    }),
    db.retentionPlaybook.create({
      data: {
        name: "Support escalation room",
        riskDriver: "support",
        saveRateLift: 0.14,
        costCents: 22000,
        maxDiscountPct: 0.04,
        slaHours: 12
      }
    }),
    db.retentionPlaybook.create({
      data: {
        name: "Commercial renewal redesign",
        riskDriver: "commercial",
        saveRateLift: 0.21,
        costCents: 31000,
        maxDiscountPct: 0.12,
        slaHours: 24
      }
    }),
    db.retentionPlaybook.create({
      data: {
        name: "Billing risk recovery",
        riskDriver: "billing",
        saveRateLift: 0.1,
        costCents: 12000,
        maxDiscountPct: 0.03,
        slaHours: 36
      }
    })
  ]);

  const policy = await db.retentionPolicy.create({
    data: {
      name: "Default retention policy",
      highRiskThreshold: 0.72,
      mediumRiskThreshold: 0.46,
      maxDiscountPct: 0.1,
      minPaybackRatio: 2.5,
      slaHoursHighRisk: 24
    }
  });

  await db.retentionAuditLog.create({
    data: {
      actor: "system",
      action: "SEED_INIT",
      detail: "Seeded retention risk command center demo.",
      metadata: { policyId: policy.id, accounts: 5, playbooks: 5 } as Prisma.InputJsonValue
    }
  });
}

async function seedPricingDemo() {
  const segments = await Promise.all([
    db.pricingSegment.create({
      data: {
        name: "SMB monthly subscribers",
        eligibilityRule: "plan=monthly AND employees<100",
        baselineConversionRate: 0.082,
        baselineChurnRate: 0.038,
        baselineArpuCents: 7900,
        grossMarginPercent: 0.74,
        monthlyVolume: 4200,
        riskBand: "medium"
      }
    }),
    db.pricingSegment.create({
      data: {
        name: "Mid-market annual subscribers",
        eligibilityRule: "plan=annual AND employees BETWEEN 100 AND 1000",
        baselineConversionRate: 0.118,
        baselineChurnRate: 0.021,
        baselineArpuCents: 18900,
        grossMarginPercent: 0.78,
        monthlyVolume: 1800,
        riskBand: "low"
      }
    }),
    db.pricingSegment.create({
      data: {
        name: "High-usage power users",
        eligibilityRule: "usage_p95=true AND support_tickets<3",
        baselineConversionRate: 0.142,
        baselineChurnRate: 0.018,
        baselineArpuCents: 24900,
        grossMarginPercent: 0.8,
        monthlyVolume: 950,
        riskBand: "low"
      }
    }),
    db.pricingSegment.create({
      data: {
        name: "Discount-sensitive lapsed accounts",
        eligibilityRule: "status=lapsed AND prior_discount=true",
        baselineConversionRate: 0.044,
        baselineChurnRate: 0.064,
        baselineArpuCents: 6900,
        grossMarginPercent: 0.68,
        monthlyVolume: 2600,
        riskBand: "high"
      }
    })
  ]);

  const variants = await Promise.all([
    db.pricingVariant.create({
      data: {
        name: "Control: current monthly plan",
        monthlyPriceCents: 7900,
        annualPriceCents: 79000,
        packagingChange: "Current packaging and support entitlements",
        marginImpactPercent: 0,
        expectedSupportLoadDelta: 0
      }
    }),
    db.pricingVariant.create({
      data: {
        name: "Treatment A: 8% price increase",
        monthlyPriceCents: 8500,
        annualPriceCents: 85000,
        packagingChange: "No packaging change",
        marginImpactPercent: 0.025,
        expectedSupportLoadDelta: 0.04
      }
    }),
    db.pricingVariant.create({
      data: {
        name: "Treatment B: premium support bundle",
        monthlyPriceCents: 9900,
        annualPriceCents: 99000,
        packagingChange: "Adds premium support bundle and faster SLA",
        marginImpactPercent: -0.015,
        expectedSupportLoadDelta: 0.18
      }
    })
  ]);

  const experiment = await db.pricingExperiment.create({
    data: {
      name: "Premium support bundle for high-usage accounts",
      hypothesis: "High-usage accounts will accept a premium bundle if SLA value is explicit and margin remains above floor.",
      owner: "pricing-operator",
      state: "RUNNING",
      holdoutPercent: 0.15,
      minimumSampleSize: 1200,
      minGrossMarginPercent: 0.72,
      maxChurnDeltaPercent: 1.5,
      maxSupportLoadDelta: 0.25,
      minConfidence: 0.7,
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      decisionDueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
    }
  });

  await Promise.all(segments.slice(1, 3).map((segment) =>
    db.pricingExperimentSegment.create({
      data: { experimentId: experiment.id, segmentId: segment.id }
    })
  ));
  await db.pricingExperimentVariant.create({
    data: { experimentId: experiment.id, variantId: variants[0].id, role: "control" }
  });
  await db.pricingExperimentVariant.create({
    data: { experimentId: experiment.id, variantId: variants[2].id, role: "treatment" }
  });
  await db.pricingAuditLog.create({
    data: {
      experimentId: experiment.id,
      actor: "system",
      action: "SEED_INIT",
      detail: "Seeded pricing experiment control tower demo.",
      metadata: { segments: 2, variants: 2 } as Prisma.InputJsonValue
    }
  });
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

export async function reseedPricingOnly() {
  await clearPricingData();
  await seedPricingDemo();
}

export async function reseedRetentionOnly() {
  await clearRetentionData();
  await seedRetentionDemo();
}

export async function reseedExpansionOnly() {
  await clearExpansionData();
  await seedExpansionDemo();
}

export async function reseed() {
  await clearLifecycleData();
  await clearAcquisitionData();
  await clearAuctionData();
  await clearPricingData();
  await clearRetentionData();
  await clearExpansionData();
  await seedLifecycleDemo();
  await seedAcquisitionDemo();
  await seedAuctionDemo();
  await seedPricingDemo();
  await seedRetentionDemo();
  await seedExpansionDemo();
}
