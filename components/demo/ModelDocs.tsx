import { Section } from "@/components/site/Section";

type DemoDocApp = "lifecycle" | "acquisition" | "auction" | "pricing" | "retention" | "expansion";

type VariableRow = {
  variable: string;
  type: string;
  range: string;
  usedBy: string;
};

type FormulaRow = {
  name: string;
  formula: string;
  decision: string;
};

type InputFieldRow = {
  field: string;
  meaning: string;
  example: string;
  usedBy: string;
};

const DOCS: Record<DemoDocApp, { title: string; summary: string; inputFields: InputFieldRow[]; rows: VariableRow[]; formulas: FormulaRow[] }> = {
  lifecycle: {
    title: "Lifecycle Engine Docs",
    summary: "Variables used to match users to tracked entities, score campaign opportunities, and model funnel outcomes.",
    inputFields: [
      { field: "user.fullName / email", meaning: "The person who may receive a generated lifecycle message.", example: "Jordan Lee / jordan@example.com", usedBy: "Message personalization and candidate context" },
      { field: "user.segment", meaning: "Commercial lifecycle segment assigned to the user.", example: "FREE, TRIAL, LAPSED, ACTIVE", usedBy: "Segment contribution and eligibility" },
      { field: "user.subscriptionStatus", meaning: "Billing/subscription state used to choose appropriate outreach posture.", example: "NONE, TRIALING, ACTIVE, CANCELED, EXPIRED", usedBy: "Campaign targeting and suppression logic" },
      { field: "user.lastActiveAt", meaning: "Most recent observed activity timestamp for the user.", example: "Recent date or blank", usedBy: "Recency context and message tone" },
      { field: "entity.name / entityType", meaning: "The person, place, record, or object the user has shown interest in.", example: "123 Main St / property", usedBy: "Interest graph and generated copy" },
      { field: "entity.city / state", meaning: "Optional location context for the tracked entity.", example: "Austin / TX", usedBy: "Message specificity and landing context" },
      { field: "interestEdge.interestScore", meaning: "Strength of the user's demonstrated relationship to an entity.", example: "0.72", usedBy: "Interest contribution to priority score" },
      { field: "interestEdge.source", meaning: "Where the relationship signal came from.", example: "search, view, saved", usedBy: "Auditability and operator interpretation" },
      { field: "entityDelta.changeType", meaning: "The type of change detected on the tracked entity.", example: "ADDRESS_CHANGE, EMPLOYEE_RECORD_ADDED, OTHER_RECORD_ADDED", usedBy: "Change-type contribution and message angle" },
      { field: "entityDelta.oldValue / newValue / deltaSummary", meaning: "Before/after values and plain-language explanation of the change.", example: "Old phone -> new phone; phone added", usedBy: "Generated message evidence and landing copy" },
      { field: "simulation.topN / deltaCount", meaning: "Operator controls for how many opportunities to generate and how many new deltas to inject.", example: "Top 20, 8-20 deltas", usedBy: "Simulation volume and campaign run size" }
    ],
    rows: [
      { variable: "segment", type: "enum", range: "FREE, TRIAL, LAPSED, ACTIVE", usedBy: "Priority score segment contribution" },
      { variable: "subscriptionStatus", type: "enum", range: "NONE, TRIALING, ACTIVE, CANCELED, EXPIRED", usedBy: "User context and campaign targeting" },
      { variable: "interestScore", type: "float", range: "0-1", usedBy: "Interest-edge contribution" },
      { variable: "recencyScore", type: "float", range: "0-1", usedBy: "Delta freshness contribution" },
      { variable: "minPriorityScore", type: "float", range: "0-1", usedBy: "Candidate filtering" },
      { variable: "openRate/clickRate/engageRate/purchaseRate", type: "float", range: "0-1", usedBy: "Outcome simulation" },
      { variable: "avgOrderValue", type: "currency", range: "$0+", usedBy: "Estimated revenue" },
      { variable: "topN/deltaCount", type: "integer", range: "1-100 / 1-200", usedBy: "Simulation volume controls" }
    ],
    formulas: [
      { name: "Priority score", formula: "interestContribution + recencyContribution + segmentContribution + changeTypeContribution", decision: "Candidates below minPriorityScore are filtered out." },
      { name: "High-priority flag", formula: "priorityScore >= highPriorityThreshold", decision: "High-priority candidates drive campaign generation and revenue projection." },
      { name: "Projected revenue", formula: "purchases * avgOrderValue, with purchase rate adjusted by highPriorityLift", decision: "Used to compare scenario assumptions across campaign runs." }
    ]
  },
  acquisition: {
    title: "Acquisition Agent Docs",
    summary: "Variables used to create paid-growth campaigns, score cells, run iterations, and apply budget guardrails.",
    inputFields: [
      { field: "campaign.name / objective", meaning: "Operator-defined campaign identity and business goal.", example: "Q2 trial acquisition / acquire qualified trials", usedBy: "Campaign workspace and audit records" },
      { field: "campaign.budget", meaning: "Total campaign allocation available for test cells.", example: "$25,000", usedBy: "Budget allocation and shift policy" },
      { field: "campaign.channels", meaning: "Paid channels included in the campaign.", example: "SEARCH, SOCIAL, DISPLAY, VIDEO", usedBy: "Creative generation and test-cell setup" },
      { field: "campaign.targetCAC / targetLTV", meaning: "Unit economics constraints for acquisition decisions.", example: "$140 CAC / $600 LTV", usedBy: "CAC policy and LTV:CAC guardrails" },
      { field: "campaign.maxBudgetShiftPct", meaning: "Maximum share of budget that can move in one iteration.", example: "0.20", usedBy: "Budget reallocation ceiling" },
      { field: "campaign.minConfidence", meaning: "Minimum statistical/heuristic confidence before scaling a cell.", example: "0.65", usedBy: "Iteration decision threshold" },
      { field: "creative.headline / description / CTA", meaning: "Ad copy variants that can be tested against audiences.", example: "Find better-fit prospects / Start now", usedBy: "Test-cell creative dimension" },
      { field: "creative.predictedCtr / predictedConversion", meaning: "Expected creative response rates before performance data is observed.", example: "0.018 CTR / 0.07 CVR", usedBy: "Initial cell scoring" },
      { field: "audience.name / audienceType", meaning: "Targeting segment label and type.", example: "High-intent lookalikes / search_intent", usedBy: "Audience dimension and reporting" },
      { field: "audience.targetingJson", meaning: "Structured targeting definition for the audience.", example: "{ interests, geos, exclusions }", usedBy: "Audience setup and audit context" },
      { field: "audience.predictedCPC / predictedCAC", meaning: "Expected cost assumptions for an audience before live data.", example: "$3 CPC / $145 CAC", usedBy: "Forecasting and cell setup" },
      { field: "testCell.impressions / clicks / conversions / spend / revenue", meaning: "Observed performance data for each creative-audience cell.", example: "10k impressions, 240 clicks, $720 spend", usedBy: "CAC, ROAS, score, and budget decisions" }
    ],
    rows: [
      { variable: "budget", type: "currency", range: "$50+", usedBy: "Campaign and test-cell allocation" },
      { variable: "targetCAC", type: "currency", range: "$10+", usedBy: "Policy checks and auto-pause rules" },
      { variable: "targetLTV", type: "currency", range: "$10+", usedBy: "LTV:CAC guardrails" },
      { variable: "predictedCPC/predictedCAC", type: "currency", range: "$0+", usedBy: "Audience templates and campaign cells" },
      { variable: "maxBudgetShiftPct", type: "float", range: "0.01-0.5", usedBy: "Budget reallocation ceiling" },
      { variable: "minConfidence", type: "float", range: "0.5-0.95", usedBy: "Iteration decision threshold" },
      { variable: "runCount", type: "integer", range: "1+", usedBy: "Monte Carlo scenario lab" },
      { variable: "spendVariance/conversionVariance", type: "float", range: "0+", usedBy: "Scenario spread assumptions" }
    ],
    formulas: [
      { name: "Cell score", formula: "weighted blend of ROAS, conversion efficiency, CAC-to-target, and confidence", decision: "Highest cells receive budget; weak cells lose budget or require approval." },
      { name: "Observed CAC", formula: "spend / conversions", decision: "If CAC exceeds cacAutoPausePctOfTarget * targetCAC, policy flags unhealthy." },
      { name: "LTV:CAC", formula: "observed or target LTV / observed CAC", decision: "Below minLtvCacRatio triggers watch/unhealthy policy state." }
    ]
  },
  auction: {
    title: "Auction Desk Docs",
    summary: "Variables used to run quality-adjusted second-price auctions, pacing controls, and marketplace health diagnostics.",
    inputFields: [
      { field: "advertiser.name", meaning: "Demand-side participant bidding into the closed marketplace.", example: "Acme Legal Leads", usedBy: "Bid matrix and run output" },
      { field: "advertiser.qualityScore", meaning: "Relevance/quality multiplier applied to bids.", example: "0.01-1.00", usedBy: "Quality-adjusted ranking" },
      { field: "advertiser.dailyBudget", meaning: "Daily spend limit available to the advertiser.", example: "$1,500", usedBy: "Eligibility and pacing" },
      { field: "advertiser.behaviorMode", meaning: "Simulated bidding strategy.", example: "truthful, shaded, auto_bid", usedBy: "Effective bid calculation" },
      { field: "advertiser.targetCAC", meaning: "Optional CAC target used to cap auto-bids.", example: "$120", usedBy: "auto_bid behavior mode" },
      { field: "advertiser.smoothingFactor", meaning: "How aggressively the bidder paces spend across auctions.", example: "0.01-1.00", usedBy: "Pacing throttle" },
      { field: "slot.name", meaning: "Inventory placement being auctioned.", example: "Search results top card", usedBy: "Auction slot selection" },
      { field: "slot.reservePrice", meaning: "Minimum clearing price for the slot.", example: "$0.75", usedBy: "Eligibility floor and clearing price" },
      { field: "slot.expectedDailyVolume", meaning: "Expected number of auctions/impressions available for a slot.", example: "500", usedBy: "Slot weighting in simulation" },
      { field: "bid.bid", meaning: "Advertiser's max willingness to pay for the slot.", example: "$2.40", usedBy: "Effective bid and clearing calculation" },
      { field: "simulation.totalAuctions", meaning: "Number of auction iterations to run.", example: "1-500", usedBy: "Simulation loop size" }
    ],
    rows: [
      { variable: "qualityScore", type: "float", range: "0.01-1", usedBy: "Effective bid calculation" },
      { variable: "dailyBudget", type: "currency", range: "$0+", usedBy: "Advertiser pacing" },
      { variable: "targetCAC", type: "currency", range: "$0+", usedBy: "auto_bid cap" },
      { variable: "reservePrice", type: "currency", range: "$0+", usedBy: "Slot eligibility floor" },
      { variable: "bid", type: "currency", range: "$0+", usedBy: "Bid matrix and clearing price" },
      { variable: "expectedDailyVolume", type: "integer", range: "1+", usedBy: "Slot weighting" },
      { variable: "totalAuctions", type: "integer", range: "1-500", usedBy: "Simulation loop count" },
      { variable: "smoothingFactor", type: "float", range: "0.01-1", usedBy: "Pacing throttle" }
    ],
    formulas: [
      { name: "Effective bid", formula: "bid * qualityScore, optionally capped by auto_bid targetCAC", decision: "Rank order for each auction." },
      { name: "Clearing price", formula: "max(reservePrice, secondAdjustedScore / winnerQualityScore + $0.01)", decision: "Winner pays the quality-adjusted second price." },
      { name: "Marketplace health", formula: "fill rate, fill quality, revenue stability, bidder trust, and HHI", decision: "Reserve suggestions and health alerts use these diagnostics." }
    ]
  },
  pricing: {
    title: "Pricing Control Tower Docs",
    summary: "Variables used to test price/packaging variants against segment economics and guardrails.",
    inputFields: [
      { field: "experiment.name / hypothesis", meaning: "Test identity and expected business effect.", example: "Pro plan packaging test / increase ARPU without churn", usedBy: "Experiment registry and decision record" },
      { field: "experiment.owner", meaning: "Accountable operator for the pricing test.", example: "Growth lead", usedBy: "Decision ownership" },
      { field: "experiment.holdoutPercent", meaning: "Share of eligible traffic preserved as control.", example: "0.10", usedBy: "Holdout health and confidence" },
      { field: "experiment.minimumSampleSize", meaning: "Minimum sample required before confident action.", example: "1,000", usedBy: "Extend vs promote decision" },
      { field: "experiment.minGrossMarginPercent", meaning: "Lowest acceptable gross margin for treatment.", example: "0.72", usedBy: "Margin guardrail" },
      { field: "experiment.maxChurnDeltaPercent", meaning: "Maximum tolerated churn increase.", example: "0.03", usedBy: "Rollback guardrail" },
      { field: "variant.monthlyPrice / annualPrice", meaning: "Price points being tested.", example: "$29 monthly / $290 annual", usedBy: "ARPU and price response modeling" },
      { field: "variant.packagingChange", meaning: "What changes in the offer beyond price.", example: "Adds team reporting", usedBy: "Operator context and decision rationale" },
      { field: "segment.eligibilityRule", meaning: "Who belongs in a pricing segment.", example: "active SMB accounts with usage > threshold", usedBy: "Segment inclusion" },
      { field: "segment.baselineConversionRate / baselineChurnRate", meaning: "Pre-test conversion and churn behavior for the segment.", example: "0.08 conversion / 0.04 churn", usedBy: "Simulation baseline" },
      { field: "segment.baselineARPU / monthlyVolume", meaning: "Existing revenue and scale of the segment.", example: "$65 ARPU / 4,000 monthly users", usedBy: "Revenue lift sizing" },
      { field: "scenario.conversionLift / churnSensitivity / demandElasticity", meaning: "Operator assumptions for treatment response.", example: "0.08 lift / 0.02 churn sensitivity / 0.35 elasticity", usedBy: "Simulation stress test" }
    ],
    rows: [
      { variable: "monthlyPrice/annualPrice", type: "currency", range: "$0+", usedBy: "Variant ARPU modeling" },
      { variable: "baselineARPU", type: "currency", range: "$0+", usedBy: "Segment baseline revenue" },
      { variable: "baselineConversionRate/baselineChurnRate", type: "float", range: "0-1", usedBy: "Experiment simulation" },
      { variable: "grossMarginPercent", type: "float", range: "0-1", usedBy: "Margin guardrail" },
      { variable: "minimumSampleSize", type: "integer", range: "1+", usedBy: "Holdout health and decisions" },
      { variable: "conversionLiftPercent", type: "percent", range: "any practical numeric", usedBy: "Simulation scenario" },
      { variable: "churnSensitivityPercent", type: "percent", range: "any practical numeric", usedBy: "Guardrail stress test" },
      { variable: "demandElasticity", type: "float", range: "0+", usedBy: "Price response modeling" }
    ],
    formulas: [
      { name: "Conversion rate", formula: "baselineConversionRate * (1 + conversionLift - priceDelta * demandElasticity)", decision: "Feeds segment-level treatment revenue." },
      { name: "Net revenue lift", formula: "treatmentNet - controlNet - churnCost", decision: "Primary economic output for promotion decisions." },
      { name: "Recommendation", formula: "rollback on unhealthy holdout/margin/churn, pause on support overload, extend on low sample/confidence, otherwise promote", decision: "Controls decision queue state." }
    ]
  },
  retention: {
    title: "Retention Command Center Docs",
    summary: "Variables used to score churn risk, select playbooks, and estimate preventable revenue.",
    inputFields: [
      { field: "account.name / segment", meaning: "Customer account and commercial grouping.", example: "Northstar Health / Enterprise", usedBy: "Risk queue and reporting" },
      { field: "account.MRR", meaning: "Monthly recurring revenue at risk.", example: "$8,500", usedBy: "Preventable churn and saved revenue" },
      { field: "account.usageScore", meaning: "Product usage health where lower values indicate risk.", example: "0.20-0.95", usedBy: "Usage-risk contribution" },
      { field: "account.supportTicketCount", meaning: "Recent support burden or unresolved issue count.", example: "0-20+", usedBy: "Support-risk driver" },
      { field: "account.npsScore", meaning: "Customer sentiment signal.", example: "-100 to 100", usedBy: "Sentiment-risk driver" },
      { field: "account.renewalDays", meaning: "Days until renewal or commercial decision point.", example: "0-365", usedBy: "Timing-risk contribution" },
      { field: "account.paymentRiskScore", meaning: "Likelihood of billing/payment friction.", example: "0-1", usedBy: "Payment-risk contribution" },
      { field: "account.executiveSponsor", meaning: "Whether a senior relationship owner exists.", example: "true / false", usedBy: "Relationship-risk adjustment" },
      { field: "account.lastTouchedDays", meaning: "Days since the account was last contacted.", example: "0-180", usedBy: "Relationship-risk contribution" },
      { field: "account.healthTrend", meaning: "Recent direction of account health.", example: "improving, flat, declining", usedBy: "Trend risk adjustment" },
      { field: "playbook.riskDriver / saveRateLift / cost", meaning: "Intervention mapped to a driver, expected lift, and cost.", example: "usage_gap / 0.18 / $900", usedBy: "Playbook selection and payback" },
      { field: "policy.highRiskThreshold / minPaybackRatio", meaning: "Portfolio thresholds for urgency and economic viability.", example: "0.70 risk / 2.0x payback", usedBy: "Recommendation and routing" }
    ],
    rows: [
      { variable: "MRR", type: "currency", range: "$0+", usedBy: "Preventable churn and saved revenue" },
      { variable: "usageScore/paymentRiskScore", type: "float", range: "0-1", usedBy: "Risk score" },
      { variable: "supportTicketCount", type: "integer", range: "0+", usedBy: "Support-risk driver" },
      { variable: "npsScore", type: "integer", range: "-100 to 100", usedBy: "Sentiment driver" },
      { variable: "renewalDays/lastTouchedDays", type: "integer", range: "0+", usedBy: "Timing and relationship-risk drivers" },
      { variable: "saveRateLift", type: "float", range: "0-1", usedBy: "Playbook economics" },
      { variable: "maxDiscountPct", type: "float", range: "0-1", usedBy: "Intervention guardrail" },
      { variable: "minPaybackRatio", type: "float", range: "0+", usedBy: "Portfolio recommendation" }
    ],
    formulas: [
      { name: "Risk score", formula: "usage risk + support risk + NPS risk + renewal timing + payment risk + relationship coverage + trend", decision: "Classifies low/medium/high risk." },
      { name: "Expected saved revenue", formula: "preventable churn * selected playbook saveRateLift", decision: "Used to prioritize interventions." },
      { name: "Payback ratio", formula: "expectedSavedRevenue / interventionCost", decision: "Below minPaybackRatio weakens portfolio recommendation." }
    ]
  },
  expansion: {
    title: "Expansion Command Center Docs",
    summary: "Variables used to score installed-base readiness, select expansion motions, and estimate ARR lift.",
    inputFields: [
      { field: "account.name / segment", meaning: "Installed-base account and commercial segment.", example: "Atlas Logistics / Mid-market", usedBy: "Account queue and offer matching" },
      { field: "account.currentARR", meaning: "Existing annual recurring revenue for the account.", example: "$120,000", usedBy: "Pipeline and ARR lift sizing" },
      { field: "account.seatsPurchased / seatsActive", meaning: "Contracted seats and active seats.", example: "100 purchased / 92 active", usedBy: "Seat-utilization signal" },
      { field: "account.usageGrowthRate", meaning: "Recent growth or decline in product usage.", example: "-1 to 1", usedBy: "Readiness score and motion inference" },
      { field: "account.productQualifiedScore", meaning: "Product-qualified signal for expansion readiness.", example: "0-1", usedBy: "Readiness contribution" },
      { field: "account.supportHealthScore", meaning: "Support/customer health signal where higher is healthier.", example: "0-1", usedBy: "Readiness and risk adjustment" },
      { field: "account.renewalDays", meaning: "Days until renewal or commercial negotiation window.", example: "0-365", usedBy: "Timing contribution" },
      { field: "account.executiveSponsor", meaning: "Whether a senior sponsor exists.", example: "true / false", usedBy: "Readiness lift" },
      { field: "account.openExpansionSignals", meaning: "Count of active commercial/product expansion cues.", example: "0-10+", usedBy: "Commercial-signal contribution" },
      { field: "account.trend", meaning: "Direction of account momentum.", example: "accelerating, steady, softening", usedBy: "Readiness lift/penalty" },
      { field: "offer.motion / targetSegment", meaning: "Expansion motion and intended segment.", example: "seat_expansion / Enterprise", usedBy: "Offer selection" },
      { field: "offer.expectedLiftPercent / cost / margin / slaDays", meaning: "Expected ARR lift, pursuit cost, margin, and SLA requirement.", example: "0.18 lift / $1,200 cost / 0.78 margin / 14 days", usedBy: "Expected ARR, payback, and pursue/nurture/defer decision" }
    ],
    rows: [
      { variable: "currentARR", type: "currency", range: "$0+", usedBy: "Pipeline and expected expansion ARR" },
      { variable: "seatsPurchased/seatsActive", type: "integer", range: "1+ / 0+", usedBy: "Seat utilization signal" },
      { variable: "usageGrowthRate", type: "float", range: "-1 to 1", usedBy: "Readiness score and motion inference" },
      { variable: "productQualifiedScore/supportHealthScore", type: "float", range: "0-1", usedBy: "Readiness score" },
      { variable: "renewalDays/openExpansionSignals", type: "integer", range: "0+", usedBy: "Timing and commercial-signal score" },
      { variable: "trend", type: "enum", range: "accelerating, steady, softening", usedBy: "Readiness lift/penalty" },
      { variable: "expectedLiftPercent/marginPercent", type: "float", range: "0-1", usedBy: "Offer economics" },
      { variable: "minPaybackRatio/maxSlaDays", type: "float/integer", range: "0+ / 1+", usedBy: "Pursue/nurture/defer decision" }
    ],
    formulas: [
      { name: "Readiness score", formula: "seat utilization + usage growth + PQS + support health + renewal timing + sponsor + signals + trend lift", decision: "Classifies low/medium/high expansion readiness." },
      { name: "Expected expansion ARR", formula: "currentARR * offerExpectedLift * clamp(readinessScore + 0.18, 0.2, 1)", decision: "Ranks expansion opportunities by economic value." },
      { name: "Decision", formula: "defer if margin/payback fail; pursue if high readiness and SLA fits; otherwise nurture", decision: "Determines account-level next action." }
    ]
  }
};

export function ModelDocs({ app }: { app: DemoDocApp }) {
  const doc = DOCS[app];
  return (
    <>
      <Section title={doc.title}>
        <p>{doc.summary}</p>
      </Section>
      <Section title="Input data fields">
        <table className="table modelDocsTable">
          <thead>
            <tr><th>Field</th><th>Meaning</th><th>Example / range</th><th>Used by</th></tr>
          </thead>
          <tbody>
            {doc.inputFields.map((row) => (
              <tr key={row.field}>
                <td><code className="small">{row.field}</code></td>
                <td>{row.meaning}</td>
                <td>{row.example}</td>
                <td>{row.usedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Model variables and ranges">
        <table className="table modelDocsTable">
          <thead>
            <tr><th>Variable</th><th>Type</th><th>Range</th><th>Used by</th></tr>
          </thead>
          <tbody>
            {doc.rows.map((row) => (
              <tr key={row.variable}>
                <td><code className="small">{row.variable}</code></td>
                <td>{row.type}</td>
                <td>{row.range}</td>
                <td>{row.usedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Formulas and recommendation rules">
        <table className="table modelDocsTable">
          <thead>
            <tr><th>Model step</th><th>Formula</th><th>Decision rule</th></tr>
          </thead>
          <tbody>
            {doc.formulas.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td><code className="small">{row.formula}</code></td>
                <td>{row.decision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}
