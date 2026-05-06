export type ToolKey = "lifecycle" | "acquisition" | "pricing" | "retention" | "expansion" | "auction";

export type FieldValidation =
  | { kind: "email" }
  | { kind: "date" }
  | { kind: "enum"; values: string[] }
  | { kind: "numberRange"; min: number; max: number };

export type ToolDataObjectSchema = {
  key: string;
  title: string;
  description: string;
  fields: string[];
  requiredFields: string[];
  maxRows: number;
  sample: string;
  fieldAliases?: Record<string, string[]>;
  validations?: Record<string, FieldValidation[]>;
};

export type ToolImportSchema = {
  tool: ToolKey;
  label: string;
  sourceTypes: Array<"csv" | "google_sheets" | "live" | "oauth">;
  objects: ToolDataObjectSchema[];
};

export type ParsedSourceRows = {
  headers: string[];
  sourceRows: Record<string, string>[];
  parseErrors: string[];
};

export type ParsedMappedRows = {
  headers: string[];
  sourceRows: Record<string, string>[];
  rows: Record<string, string>[];
  errors: string[];
};

export type FieldMappings = Record<string, Record<string, string>>;

const lifecycleAliases: Record<string, string[]> = {
  fullName: ["fullName", "full name", "name", "customer name", "user name"],
  email: ["email", "email address", "user email"],
  segment: ["segment", "user segment", "lifecycle segment"],
  subscriptionStatus: ["subscriptionStatus", "subscription status", "status", "plan status"],
  lastActiveAt: ["lastActiveAt", "last active", "last active at", "last seen"],
  name: ["name", "entity name", "record name"],
  entityType: ["entityType", "entity type", "type", "record type"],
  city: ["city", "entity city"],
  state: ["state", "region", "entity state"],
  userEmail: ["userEmail", "user email", "email", "customer email"],
  entityName: ["entityName", "entity name", "record name", "name"],
  interestScore: ["interestScore", "interest score", "score", "intent score"],
  source: ["source", "signal source", "event source"],
  changeType: ["changeType", "change type", "event type", "delta type"],
  oldValue: ["oldValue", "old value", "previous value"],
  newValue: ["newValue", "new value", "current value"],
  deltaSummary: ["deltaSummary", "delta summary", "summary", "event summary"],
  detectedAt: ["detectedAt", "detected at", "event date", "detected date", "date"]
};

export const TOOL_IMPORT_SCHEMAS: ToolImportSchema[] = [
  {
    tool: "lifecycle",
    label: "Lifecycle",
    sourceTypes: ["csv", "google_sheets", "live"],
    objects: [
      {
        key: "users",
        title: "Users",
        description: "People eligible for lifecycle scoring and generated outreach.",
        fields: ["fullName", "email", "segment", "subscriptionStatus", "lastActiveAt"],
        requiredFields: ["fullName", "email", "segment", "subscriptionStatus"],
        maxRows: 500,
        sample: "fullName,email,segment,subscriptionStatus,lastActiveAt\nJordan Lee,jordan@example.com,TRIAL,TRIALING,2026-04-28\nMorgan Patel,morgan@example.com,LAPSED,EXPIRED,2026-04-15",
        fieldAliases: lifecycleAliases,
        validations: {
          email: [{ kind: "email" }],
          segment: [{ kind: "enum", values: ["FREE", "TRIAL", "LAPSED", "ACTIVE"] }],
          subscriptionStatus: [{ kind: "enum", values: ["NONE", "TRIALING", "ACTIVE", "CANCELED", "EXPIRED"] }],
          lastActiveAt: [{ kind: "date" }]
        }
      },
      {
        key: "entities",
        title: "Entities",
        description: "Records, people, companies, properties, or objects a user is tracking.",
        fields: ["name", "entityType", "city", "state"],
        requiredFields: ["name", "entityType"],
        maxRows: 500,
        sample: "name,entityType,city,state\n123 Main St,property,Austin,TX\nAcme Holdings,business,Denver,CO",
        fieldAliases: lifecycleAliases
      },
      {
        key: "interestEdges",
        title: "Interest edges",
        description: "Relationships connecting users to tracked entities with signal strength.",
        fields: ["userEmail", "entityName", "interestScore", "source"],
        requiredFields: ["userEmail", "entityName", "interestScore", "source"],
        maxRows: 1500,
        sample: "userEmail,entityName,interestScore,source\njordan@example.com,123 Main St,0.82,saved_search\nmorgan@example.com,Acme Holdings,0.64,profile_view",
        fieldAliases: lifecycleAliases,
        validations: {
          userEmail: [{ kind: "email" }],
          interestScore: [{ kind: "numberRange", min: 0, max: 1 }]
        }
      },
      {
        key: "changeEvents",
        title: "Change events",
        description: "Detected deltas that create lifecycle campaign opportunities.",
        fields: ["entityName", "changeType", "oldValue", "newValue", "deltaSummary", "detectedAt"],
        requiredFields: ["entityName", "changeType", "deltaSummary", "detectedAt"],
        maxRows: 1000,
        sample: "entityName,changeType,oldValue,newValue,deltaSummary,detectedAt\n123 Main St,ADDRESS_CHANGE,Old address,New address,A new address update was detected.,2026-05-01\nAcme Holdings,EMAIL_ADDED,,ops@example.com,A new email was added.,2026-05-02",
        fieldAliases: lifecycleAliases,
        validations: {
          changeType: [{ kind: "enum", values: ["ADDRESS_CHANGE", "PHONE_ADDED", "PHONE_CHANGED", "EMAIL_ADDED", "ASSOCIATE_ADDED", "EMPLOYEE_RECORD_ADDED", "LEGAL_RECORD_ADDED", "OTHER_RECORD_ADDED"] }],
          detectedAt: [{ kind: "date" }]
        }
      }
    ]
  },
  {
    tool: "acquisition",
    label: "Acquisition",
    sourceTypes: ["csv", "google_sheets", "live", "oauth"],
    objects: [
      {
        key: "campaigns",
        title: "Campaigns",
        description: "Paid-growth campaign definitions, budgets, economics, channels, and policy settings.",
        fields: ["name", "objective", "budget", "channels", "targetCAC", "targetLTV", "maxBudgetShiftPct", "minConfidence"],
        requiredFields: ["name", "objective", "budget", "channels", "targetCAC", "targetLTV"],
        maxRows: 250,
        sample: "name,objective,budget,channels,targetCAC,targetLTV,maxBudgetShiftPct,minConfidence\nQ2 Trial Growth,Acquire qualified trials,25000,\"SEARCH,SOCIAL\",140,600,0.2,0.65",
        validations: {
          budget: [{ kind: "numberRange", min: 50, max: 100000000 }],
          targetCAC: [{ kind: "numberRange", min: 1, max: 10000000 }],
          targetLTV: [{ kind: "numberRange", min: 1, max: 10000000 }],
          maxBudgetShiftPct: [{ kind: "numberRange", min: 0.01, max: 0.5 }],
          minConfidence: [{ kind: "numberRange", min: 0.5, max: 0.95 }]
        }
      },
      {
        key: "audiences",
        title: "Audiences",
        description: "Targeting segments and forecast assumptions for acquisition tests.",
        fields: ["campaignName", "name", "audienceType", "targetingJson", "predictedCPC", "predictedCAC"],
        requiredFields: ["campaignName", "name", "audienceType", "predictedCPC", "predictedCAC"],
        maxRows: 500,
        sample: "campaignName,name,audienceType,targetingJson,predictedCPC,predictedCAC\nQ2 Trial Growth,High-intent search,search_intent,\"{\\\"intent\\\":\\\"high\\\"}\",3.25,145",
        validations: {
          predictedCPC: [{ kind: "numberRange", min: 0, max: 100000 }],
          predictedCAC: [{ kind: "numberRange", min: 0, max: 1000000 }]
        }
      },
      {
        key: "creatives",
        title: "Creatives",
        description: "Ad copy variants and prior response assumptions.",
        fields: ["campaignName", "headline", "description", "callToAction", "channel", "predictedCtr", "predictedConversion"],
        requiredFields: ["campaignName", "headline", "description", "callToAction", "channel", "predictedCtr", "predictedConversion"],
        maxRows: 500,
        sample: "campaignName,headline,description,callToAction,channel,predictedCtr,predictedConversion\nQ2 Trial Growth,Find better-fit prospects,Launch a revenue system in days,Start now,SEARCH,0.018,0.07",
        validations: {
          channel: [{ kind: "enum", values: ["SEARCH", "SOCIAL", "DISPLAY", "VIDEO"] }],
          predictedCtr: [{ kind: "numberRange", min: 0, max: 1 }],
          predictedConversion: [{ kind: "numberRange", min: 0, max: 1 }]
        }
      },
      {
        key: "performance",
        title: "Performance rows",
        description: "Observed paid-media results by cell, campaign, creative, audience, or date.",
        fields: ["campaignName", "creativeHeadline", "audienceName", "date", "impressions", "clicks", "conversions", "spend", "revenue"],
        requiredFields: ["campaignName", "date", "impressions", "clicks", "conversions", "spend"],
        maxRows: 5000,
        sample: "campaignName,creativeHeadline,audienceName,date,impressions,clicks,conversions,spend,revenue\nQ2 Trial Growth,Find better-fit prospects,High-intent search,2026-05-01,10000,240,18,720,10800",
        validations: {
          date: [{ kind: "date" }],
          impressions: [{ kind: "numberRange", min: 0, max: 1000000000 }],
          clicks: [{ kind: "numberRange", min: 0, max: 1000000000 }],
          conversions: [{ kind: "numberRange", min: 0, max: 1000000000 }],
          spend: [{ kind: "numberRange", min: 0, max: 100000000 }],
          revenue: [{ kind: "numberRange", min: 0, max: 100000000 }]
        }
      }
    ]
  },
  {
    tool: "pricing",
    label: "Pricing",
    sourceTypes: ["csv", "google_sheets", "live"],
    objects: [
      {
        key: "segments",
        title: "Segments",
        description: "Customer or traffic cohorts used to model conversion, churn, ARPU, and volume.",
        fields: ["name", "eligibilityRule", "baselineConversionRate", "baselineChurnRate", "baselineARPU", "monthlyVolume"],
        requiredFields: ["name", "baselineConversionRate", "baselineChurnRate", "baselineARPU", "monthlyVolume"],
        maxRows: 500,
        sample: "name,eligibilityRule,baselineConversionRate,baselineChurnRate,baselineARPU,monthlyVolume\nSMB Active,active SMB accounts,0.08,0.04,65,4000",
        validations: {
          baselineConversionRate: [{ kind: "numberRange", min: 0, max: 1 }],
          baselineChurnRate: [{ kind: "numberRange", min: 0, max: 1 }],
          baselineARPU: [{ kind: "numberRange", min: 0, max: 1000000 }],
          monthlyVolume: [{ kind: "numberRange", min: 1, max: 100000000 }]
        }
      },
      {
        key: "variants",
        title: "Variants",
        description: "Price and package treatments being tested against a control.",
        fields: ["name", "monthlyPrice", "annualPrice", "packagingChange", "grossMarginPercent"],
        requiredFields: ["name", "monthlyPrice", "annualPrice", "grossMarginPercent"],
        maxRows: 100,
        sample: "name,monthlyPrice,annualPrice,packagingChange,grossMarginPercent\nPro Plus,29,290,Adds team reporting,0.76",
        validations: {
          monthlyPrice: [{ kind: "numberRange", min: 0, max: 1000000 }],
          annualPrice: [{ kind: "numberRange", min: 0, max: 10000000 }],
          grossMarginPercent: [{ kind: "numberRange", min: 0, max: 1 }]
        }
      },
      {
        key: "experiments",
        title: "Experiments",
        description: "Pricing test configuration, owners, sample sizes, and guardrails.",
        fields: ["name", "hypothesis", "owner", "holdoutPercent", "minimumSampleSize", "minGrossMarginPercent", "maxChurnDeltaPercent"],
        requiredFields: ["name", "hypothesis", "owner", "holdoutPercent", "minimumSampleSize", "minGrossMarginPercent", "maxChurnDeltaPercent"],
        maxRows: 100,
        sample: "name,hypothesis,owner,holdoutPercent,minimumSampleSize,minGrossMarginPercent,maxChurnDeltaPercent\nPro packaging test,Increase ARPU without churn,Growth lead,0.1,1000,0.72,0.03",
        validations: {
          holdoutPercent: [{ kind: "numberRange", min: 0, max: 0.5 }],
          minimumSampleSize: [{ kind: "numberRange", min: 1, max: 100000000 }],
          minGrossMarginPercent: [{ kind: "numberRange", min: 0, max: 1 }],
          maxChurnDeltaPercent: [{ kind: "numberRange", min: 0, max: 1 }]
        }
      },
      {
        key: "guardrails",
        title: "Guardrails",
        description: "Scenario controls for conversion lift, churn sensitivity, elasticity, margin, and support load.",
        fields: ["experimentName", "conversionLift", "churnSensitivity", "demandElasticity", "supportLoadPercent"],
        requiredFields: ["experimentName", "conversionLift", "churnSensitivity", "demandElasticity"],
        maxRows: 250,
        sample: "experimentName,conversionLift,churnSensitivity,demandElasticity,supportLoadPercent\nPro packaging test,0.08,0.02,0.35,0.04",
        validations: {
          demandElasticity: [{ kind: "numberRange", min: 0, max: 10 }]
        }
      }
    ]
  },
  {
    tool: "retention",
    label: "Retention",
    sourceTypes: ["csv", "google_sheets", "live"],
    objects: [
      {
        key: "accounts",
        title: "Accounts",
        description: "Customer health, renewal, revenue, and relationship signals used to score churn risk.",
        fields: ["name", "segment", "MRR", "usageScore", "supportTicketCount", "npsScore", "renewalDays", "paymentRiskScore", "executiveSponsor", "lastTouchedDays", "healthTrend"],
        requiredFields: ["name", "segment", "MRR", "usageScore", "supportTicketCount", "npsScore", "renewalDays", "paymentRiskScore", "executiveSponsor", "lastTouchedDays", "healthTrend"],
        maxRows: 1000,
        sample: "name,segment,MRR,usageScore,supportTicketCount,npsScore,renewalDays,paymentRiskScore,executiveSponsor,lastTouchedDays,healthTrend\nNorthstar Health,Enterprise,8500,0.42,8,12,45,0.25,true,21,declining",
        validations: {
          MRR: [{ kind: "numberRange", min: 0, max: 100000000 }],
          usageScore: [{ kind: "numberRange", min: 0, max: 1 }],
          supportTicketCount: [{ kind: "numberRange", min: 0, max: 1000000 }],
          npsScore: [{ kind: "numberRange", min: -100, max: 100 }],
          renewalDays: [{ kind: "numberRange", min: 0, max: 5000 }],
          paymentRiskScore: [{ kind: "numberRange", min: 0, max: 1 }],
          lastTouchedDays: [{ kind: "numberRange", min: 0, max: 5000 }],
          healthTrend: [{ kind: "enum", values: ["improving", "flat", "declining"] }]
        }
      },
      {
        key: "playbooks",
        title: "Playbooks",
        description: "Retention interventions mapped to risk drivers and expected economics.",
        fields: ["name", "riskDriver", "saveRateLift", "cost", "maxDiscountPct"],
        requiredFields: ["name", "riskDriver", "saveRateLift", "cost"],
        maxRows: 100,
        sample: "name,riskDriver,saveRateLift,cost,maxDiscountPct\nUsage rescue,usage_gap,0.18,900,0.1",
        validations: {
          saveRateLift: [{ kind: "numberRange", min: 0, max: 1 }],
          cost: [{ kind: "numberRange", min: 0, max: 10000000 }],
          maxDiscountPct: [{ kind: "numberRange", min: 0, max: 1 }]
        }
      },
      {
        key: "policy",
        title: "Policy",
        description: "Portfolio-level thresholds for risk classification, routing, and payback decisions.",
        fields: ["name", "highRiskThreshold", "mediumRiskThreshold", "minPaybackRatio", "maxInterventionCost"],
        requiredFields: ["name", "highRiskThreshold", "mediumRiskThreshold", "minPaybackRatio"],
        maxRows: 20,
        sample: "name,highRiskThreshold,mediumRiskThreshold,minPaybackRatio,maxInterventionCost\nDefault retention policy,0.7,0.45,2,5000",
        validations: {
          highRiskThreshold: [{ kind: "numberRange", min: 0, max: 1 }],
          mediumRiskThreshold: [{ kind: "numberRange", min: 0, max: 1 }],
          minPaybackRatio: [{ kind: "numberRange", min: 0, max: 1000 }],
          maxInterventionCost: [{ kind: "numberRange", min: 0, max: 10000000 }]
        }
      }
    ]
  },
  {
    tool: "expansion",
    label: "Expansion",
    sourceTypes: ["csv", "google_sheets", "live"],
    objects: [
      {
        key: "accounts",
        title: "Accounts",
        description: "Installed-base account signals used to score expansion readiness.",
        fields: ["name", "segment", "currentARR", "seatsPurchased", "seatsActive", "usageGrowthRate", "productQualifiedScore", "supportHealthScore", "renewalDays", "executiveSponsor", "openExpansionSignals", "trend"],
        requiredFields: ["name", "segment", "currentARR", "seatsPurchased", "seatsActive", "usageGrowthRate", "productQualifiedScore", "supportHealthScore", "renewalDays", "executiveSponsor", "openExpansionSignals", "trend"],
        maxRows: 1000,
        sample: "name,segment,currentARR,seatsPurchased,seatsActive,usageGrowthRate,productQualifiedScore,supportHealthScore,renewalDays,executiveSponsor,openExpansionSignals,trend\nAtlas Logistics,Mid-market,120000,100,92,0.18,0.82,0.74,90,true,4,accelerating",
        validations: {
          currentARR: [{ kind: "numberRange", min: 0, max: 1000000000 }],
          seatsPurchased: [{ kind: "numberRange", min: 1, max: 10000000 }],
          seatsActive: [{ kind: "numberRange", min: 0, max: 10000000 }],
          usageGrowthRate: [{ kind: "numberRange", min: -1, max: 1 }],
          productQualifiedScore: [{ kind: "numberRange", min: 0, max: 1 }],
          supportHealthScore: [{ kind: "numberRange", min: 0, max: 1 }],
          renewalDays: [{ kind: "numberRange", min: 0, max: 5000 }],
          openExpansionSignals: [{ kind: "numberRange", min: 0, max: 1000000 }],
          trend: [{ kind: "enum", values: ["accelerating", "steady", "softening"] }]
        }
      },
      {
        key: "offers",
        title: "Offers",
        description: "Expansion motions, target segments, expected lift, pursuit cost, margin, and SLA rules.",
        fields: ["name", "motion", "targetSegment", "expectedLiftPercent", "cost", "marginPercent", "slaDays"],
        requiredFields: ["name", "motion", "targetSegment", "expectedLiftPercent", "cost", "marginPercent", "slaDays"],
        maxRows: 100,
        sample: "name,motion,targetSegment,expectedLiftPercent,cost,marginPercent,slaDays\nSeat expansion,seat_expansion,Mid-market,0.18,1200,0.78,14",
        validations: {
          expectedLiftPercent: [{ kind: "numberRange", min: 0, max: 1 }],
          cost: [{ kind: "numberRange", min: 0, max: 10000000 }],
          marginPercent: [{ kind: "numberRange", min: 0, max: 1 }],
          slaDays: [{ kind: "numberRange", min: 1, max: 5000 }]
        }
      },
      {
        key: "policy",
        title: "Policy",
        description: "Expansion thresholds for readiness, payback, margin, and SLA decisions.",
        fields: ["name", "highReadinessThreshold", "mediumReadinessThreshold", "minPaybackRatio", "minMarginPercent", "maxSlaDays"],
        requiredFields: ["name", "highReadinessThreshold", "mediumReadinessThreshold", "minPaybackRatio", "minMarginPercent", "maxSlaDays"],
        maxRows: 20,
        sample: "name,highReadinessThreshold,mediumReadinessThreshold,minPaybackRatio,minMarginPercent,maxSlaDays\nDefault expansion policy,0.72,0.5,2.5,0.65,30",
        validations: {
          highReadinessThreshold: [{ kind: "numberRange", min: 0, max: 1 }],
          mediumReadinessThreshold: [{ kind: "numberRange", min: 0, max: 1 }],
          minPaybackRatio: [{ kind: "numberRange", min: 0, max: 1000 }],
          minMarginPercent: [{ kind: "numberRange", min: 0, max: 1 }],
          maxSlaDays: [{ kind: "numberRange", min: 1, max: 5000 }]
        }
      }
    ]
  },
  {
    tool: "auction",
    label: "Auction",
    sourceTypes: ["csv", "google_sheets", "live"],
    objects: [
      {
        key: "advertisers",
        title: "Advertisers",
        description: "Demand-side participants, quality scores, budgets, and bidding behavior.",
        fields: ["name", "qualityScore", "dailyBudget", "behaviorMode", "targetCAC", "smoothingFactor"],
        requiredFields: ["name", "qualityScore", "dailyBudget", "behaviorMode", "smoothingFactor"],
        maxRows: 500,
        sample: "name,qualityScore,dailyBudget,behaviorMode,targetCAC,smoothingFactor\nAcme Legal Leads,0.82,1500,auto_bid,120,0.3",
        validations: {
          qualityScore: [{ kind: "numberRange", min: 0.01, max: 1 }],
          dailyBudget: [{ kind: "numberRange", min: 0, max: 100000000 }],
          behaviorMode: [{ kind: "enum", values: ["truthful", "shaded", "auto_bid"] }],
          targetCAC: [{ kind: "numberRange", min: 0, max: 10000000 }],
          smoothingFactor: [{ kind: "numberRange", min: 0.01, max: 1 }]
        }
      },
      {
        key: "slots",
        title: "Slots",
        description: "Marketplace inventory placements, reserve prices, and expected volume.",
        fields: ["name", "reservePrice", "expectedDailyVolume"],
        requiredFields: ["name", "reservePrice", "expectedDailyVolume"],
        maxRows: 250,
        sample: "name,reservePrice,expectedDailyVolume\nSearch results top card,0.75,500",
        validations: {
          reservePrice: [{ kind: "numberRange", min: 0, max: 100000 }],
          expectedDailyVolume: [{ kind: "numberRange", min: 1, max: 100000000 }]
        }
      },
      {
        key: "bids",
        title: "Bids",
        description: "Advertiser willingness to pay for each auction slot.",
        fields: ["advertiserName", "slotName", "bid"],
        requiredFields: ["advertiserName", "slotName", "bid"],
        maxRows: 2000,
        sample: "advertiserName,slotName,bid\nAcme Legal Leads,Search results top card,2.4",
        validations: {
          bid: [{ kind: "numberRange", min: 0, max: 100000 }]
        }
      },
      {
        key: "reserveSettings",
        title: "Reserve settings",
        description: "Simulation controls for reserve tuning and auction volume.",
        fields: ["name", "totalAuctions", "reserveTestPercent"],
        requiredFields: ["name", "totalAuctions"],
        maxRows: 20,
        sample: "name,totalAuctions,reserveTestPercent\nDefault reserve test,250,0.1",
        validations: {
          totalAuctions: [{ kind: "numberRange", min: 1, max: 500 }],
          reserveTestPercent: [{ kind: "numberRange", min: 0, max: 1 }]
        }
      }
    ]
  }
];

export function getToolImportSchema(tool: ToolKey) {
  const schema = TOOL_IMPORT_SCHEMAS.find((item) => item.tool === tool);
  if (!schema) throw new Error(`Unknown tool import schema: ${tool}`);
  return schema;
}

export function describeFieldValidation(validation: FieldValidation) {
  if (validation.kind === "email") return "valid email";
  if (validation.kind === "date") return "valid date or ISO timestamp";
  if (validation.kind === "enum") return `one of: ${validation.values.join(", ")}`;
  return `${validation.min} to ${validation.max}`;
}

export function normalizeEnumValue(value: string, values: string[]) {
  const normalized = normalizeHeader(value);
  return values.find((candidate) => normalizeHeader(candidate) === normalized) ?? value;
}

export function describeObjectConstraints(objectSchema: ToolDataObjectSchema) {
  const rules = [
    `Maximum ${objectSchema.maxRows.toLocaleString()} rows.`,
    `Required fields: ${objectSchema.requiredFields.join(", ")}.`
  ];
  Object.entries(objectSchema.validations ?? {}).forEach(([field, validations]) => {
    rules.push(`${field}: ${validations.map(describeFieldValidation).join("; ")}.`);
  });
  return rules;
}

export function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      value += "\"";
      index++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  cells.push(value.trim());
  return cells;
}

export function escapeCsvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

export function sourceRowsToCsv(headers: string[], sourceRows: Record<string, string>[]) {
  if (headers.length === 0) return "";
  return [
    headers.map(escapeCsvCell).join(","),
    ...sourceRows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","))
  ].join("\n");
}

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function createEmptyMappings(schema: ToolImportSchema): FieldMappings {
  return Object.fromEntries(schema.objects.map((object) => [
    object.key,
    Object.fromEntries(object.fields.map((field) => [field, ""]))
  ]));
}

export function inferMapping(headers: string[], field: string, objectSchema: ToolDataObjectSchema) {
  const aliases = objectSchema.fieldAliases?.[field] ?? [field];
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeHeader(header) }));
  return normalizedHeaders.find((item) => aliases.some((alias) => item.normalized === normalizeHeader(alias)))?.header ?? "";
}

export function parseSourceCsv(text: string): ParsedSourceRows {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], sourceRows: [], parseErrors: ["Paste CSV text or load the sample data."] };

  const headers = parseCsvLine(lines[0]);
  const sourceRows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, sourceRows, parseErrors: [] };
}

export function normalizeRows(
  sourceRows: Record<string, string>[],
  mappings: Record<string, string>,
  objectSchema: ToolDataObjectSchema
) {
  return sourceRows.slice(0, objectSchema.maxRows).map((sourceRow) => Object.fromEntries(
    objectSchema.fields.map((field) => {
      const rawValue = mappings[field] ? sourceRow[mappings[field]] ?? "" : "";
      const enumValidation = objectSchema.validations?.[field]?.find((validation): validation is Extract<FieldValidation, { kind: "enum" }> => (
        validation.kind === "enum"
      ));
      return [field, enumValidation ? normalizeEnumValue(rawValue, enumValidation.values) : rawValue];
    })
  ));
}

function isValidDate(value: string) {
  return value.length > 0 && !Number.isNaN(new Date(value).getTime());
}

function validateField(value: string, validation: FieldValidation) {
  if (!value && validation.kind === "date") return null;
  if (validation.kind === "email") return value.includes("@") ? null : "does not look valid";
  if (validation.kind === "date") return isValidDate(value) ? null : "must be a date";
  if (validation.kind === "enum") {
    return validation.values.some((candidate) => normalizeHeader(candidate) === normalizeHeader(value))
      ? null
      : `must be ${validation.values.join(", ")}`;
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < validation.min || numericValue > validation.max) {
    return `must be between ${validation.min} and ${validation.max}`;
  }
  return null;
}

export function parseMappedCsvObject(
  text: string,
  objectSchema: ToolDataObjectSchema,
  mappings: Record<string, string>
): ParsedMappedRows {
  const parsed = parseSourceCsv(text);
  const errors: string[] = [...parsed.parseErrors];
  const missing = objectSchema.requiredFields.filter((field) => !mappings[field]);
  if (missing.length > 0 && parsed.headers.length > 0) errors.push(`Map required fields: ${missing.join(", ")}`);

  const rows = normalizeRows(parsed.sourceRows, mappings, objectSchema);

  rows.slice(0, 100).forEach((row, index) => {
    const rowNumber = index + 2;
    objectSchema.requiredFields.forEach((field) => {
      if (!row[field]) errors.push(`Row ${rowNumber}: ${field} is required.`);
    });
    Object.entries(objectSchema.validations ?? {}).forEach(([field, validations]) => {
      if (!row[field] && !objectSchema.requiredFields.includes(field)) return;
      validations.forEach((validation) => {
        const message = validateField(row[field] ?? "", validation);
        if (message) errors.push(`Row ${rowNumber}: ${field} ${message}.`);
      });
    });
  });

  if (rows.length === 0) errors.push("CSV has headers but no data rows.");

  return { headers: parsed.headers, sourceRows: parsed.sourceRows, rows, errors: [...new Set(errors)] };
}
