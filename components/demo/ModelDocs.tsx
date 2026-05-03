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

const DOCS: Record<DemoDocApp, { title: string; summary: string; rows: VariableRow[]; formulas: FormulaRow[] }> = {
  lifecycle: {
    title: "Lifecycle Engine Docs",
    summary: "Variables used to match users to tracked entities, score campaign opportunities, and model funnel outcomes.",
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
