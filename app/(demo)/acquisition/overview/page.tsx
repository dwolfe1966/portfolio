import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";
import { AcquisitionFlowDiagram } from "@/components/acquisition/AcquisitionFlowDiagram";
import { OperatorDecisionCanvas } from "@/components/site/OperatorDecisionCanvas";
import { ResetDemoDataCard } from "@/components/site/ResetDemoDataCard";
import { DemoSystemGraph } from "@/components/demo-shell/DemoSystemGraph";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { accountOwnedImportWhere, resolveActiveDataSourceMode } from "@/lib/account-data-scope";
import { getActiveDataSourceSelection } from "@/lib/app-data-source-selection";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import {
  acquisitionProviderSnapshotFacts,
  acquisitionProviderSnapshotSourceLabel
} from "@/lib/acquisition-provider-snapshots";
import { RevenueProofPanel } from "@/components/demo/RevenueProofPanel";
import { buildRevenueProofDashboard } from "@/lib/revenue-proof-dashboard";

export const metadata: Metadata = buildMetadata({
  title: "Acquisition App Overview | David Wolfe",
  description: "Agent-managed acquisition architecture with budget guardrails, orchestration, and operator controls.",
  path: "/acquisition/overview"
});
export const dynamic = "force-dynamic";

const architecture = [
  {
    title: "Campaign manager",
    detail: "Stores campaign objective, constraints, channels, and state transitions (draft → testing → scaling)."
  },
  {
    title: "Creative generation",
    detail: "Produces headline/description variants and predictive quality signals for faster test-cell construction."
  },
  {
    title: "Audience + keyword selector",
    detail: "Builds target pools, exclusions, and testable combinations for channel-specific execution."
  },
  {
    title: "Agent orchestrator",
    detail: "Runs iteration loops: score cells, pause weak performers, shift budget, and request new variants."
  },
  {
    title: "Performance analytics",
    detail: "Aggregates spend, conversions, CAC, and ROAS to inform budget decisions and operator review."
  },
  {
    title: "Audit + controls",
    detail: "Logs budget actions and decision context so humans can override and tune safely."
  }
];

const flow = [
  "1) Define campaign objective, budget, channels, and economic constraints.",
  "2) Generate creatives and audience/keyword candidates.",
  "3) Assemble test cells and allocate initial spend.",
  "4) Ingest performance and compute score quality.",
  "5) Reallocate budget toward winners while enforcing guardrails.",
  "6) Promote winning cells to scaling and continue monitoring."
];

function sourceLabel(value: string | null | undefined) {
  if (!value) return "Sample data";
  if (value === "google_ads") return "Google Ads";
  if (value === "meta_ads") return "Meta Ads";
  if (value === "google_sheets") return "Google Sheets";
  if (value === "csv") return "CSV";
  if (value === "sample") return "Sample data";
  return value.replaceAll("_", " ");
}

function rowCountTotal(rowCounts: unknown) {
  if (!rowCounts || typeof rowCounts !== "object" || Array.isArray(rowCounts)) return 0;
  return Object.values(rowCounts).reduce((sum, value) => sum + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function metadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export default async function AcquisitionOverviewPage() {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  let schemaReady = true;
  let counts = {
    campaigns: 0,
    cells: 0,
    budgetActivities: 0,
    auditLogs: 0
  };
  let sourceState = {
    activeMode: "sample" as "sample" | "imported",
    activeLabel: "Acquisition sample data",
    activeSourceType: "sample" as string | null,
    activeRows: 0,
    activeDatasetId: "",
    activeConnectionId: "",
    activeExternalAccountId: "",
    activeSnapshotType: "",
    providerSnapshots: 0,
    liveProviderSnapshots: 0,
    fallbackProviderSnapshots: 0,
    latestProviderSnapshotAt: null as Date | null
  };

  try {
    const [campaigns, cells, budgetActivities, auditLogs, activeSelection, providerSnapshots] = await Promise.all([
      db.acquisitionCampaign.count(),
      db.testCell.count(),
      db.budgetActivity.count(),
      db.acquisitionAuditLog.count(),
      getActiveDataSourceSelection("acquisition", accountUserId),
      db.workspaceDataset.findMany({
        where: {
          app: "acquisition",
          sourceType: { in: ["google_ads", "meta_ads"] },
          ...accountOwnedImportWhere(accountUserId)
        },
        select: { rowCounts: true, metadata: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 25
      })
    ]);
    const activeDataset = activeSelection?.mode === "imported" && activeSelection.datasetId
      ? await db.workspaceDataset.findFirst({
          where: {
            id: activeSelection.datasetId,
            app: "acquisition",
            ...accountOwnedImportWhere(accountUserId)
          },
          select: {
            id: true,
            name: true,
            sourceType: true,
            rowCounts: true,
            metadata: true
          }
        })
      : null;
    counts = { campaigns, cells, budgetActivities, auditLogs };
    const activeMode = resolveActiveDataSourceMode(accountUserId, activeSelection?.mode);
    const liveProviderSnapshots = providerSnapshots.filter((snapshot) => !acquisitionProviderSnapshotFacts(snapshot.metadata).fallbackSnapshot).length;
    const fallbackProviderSnapshots = providerSnapshots.length - liveProviderSnapshots;
    sourceState = {
      activeMode,
      activeLabel: activeMode === "imported" ? activeDataset?.name ?? activeSelection?.label ?? "Imported acquisition data" : "Acquisition sample data",
      activeSourceType: activeMode === "imported" ? activeDataset?.sourceType ?? activeSelection?.sourceType ?? null : "sample",
      activeRows: activeMode === "imported" ? rowCountTotal(activeDataset?.rowCounts ?? activeSelection?.rowCounts) : campaigns + cells,
      activeDatasetId: activeDataset?.id ?? "",
      activeConnectionId: metadataString(activeDataset?.metadata, "connectionId"),
      activeExternalAccountId: metadataString(activeDataset?.metadata, "externalAccountId"),
      activeSnapshotType: activeDataset ? acquisitionProviderSnapshotSourceLabel(activeDataset.metadata) : "",
      providerSnapshots: providerSnapshots.length,
      liveProviderSnapshots,
      fallbackProviderSnapshots,
      latestProviderSnapshotAt: providerSnapshots[0]?.createdAt ?? null
    };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      schemaReady = false;
    } else {
      throw error;
    }
  }
  const acquisitionTreatmentPopulation = Math.max(counts.cells, 12);
  const acquisitionObservedConversions = Math.max(Math.round(acquisitionTreatmentPopulation * 0.24), 3);
  const revenueProof = buildRevenueProofDashboard({
    app: "acquisition",
    baselineLabel: sourceState.activeMode === "imported" ? `${sourceState.activeLabel} baseline` : "Acquisition launch baseline",
    baselinePopulation: Math.max(sourceState.activeRows, 1000),
    baselineConversionRate: 0.055,
    baselineRevenueCents: Math.max(sourceState.activeRows, 1000) * 2600,
    treatmentPopulation: acquisitionTreatmentPopulation,
    controlPopulation: Math.max(Math.round(acquisitionTreatmentPopulation * 0.2), 1),
    observedConversions: acquisitionObservedConversions,
    observedRevenueCents: acquisitionObservedConversions * 18500,
    spendCents: Math.max(counts.budgetActivities, 1) * 2500,
    confidence: sourceState.activeMode === "imported" ? "medium" : "low",
    confidenceFlags: [
      sourceState.activeMode === "imported"
        ? "Imported/provider data is attached; billing confidence still requires frozen baseline approval."
        : "Sample data keeps this proof directional until a provider snapshot is active."
    ],
    actions: [
      { id: "acquisition_budget_actions", label: `${counts.budgetActivities.toLocaleString()} budget actions`, status: counts.budgetActivities > 0 ? "applied" : "pending", auditUrl: "/acquisition/audit" },
      { id: "acquisition_test_cells", label: `${counts.cells.toLocaleString()} test cells`, status: counts.cells > 0 ? "approved" : "pending", auditUrl: "/acquisition/campaigns" }
    ],
    exportLinks: [
      { label: "Agent audit export", href: "/api/workspace/agents/audit-export", evidenceType: "audit" },
      { label: "Acquisition audit", href: "/acquisition/audit", evidenceType: "actions" }
    ]
  });

  return (
    <>
      <Section title="Agent-managed paid acquisition system">
        <p>
          This workspace demonstrates a paid-growth operating loop where experiments, economics checks, and budget movement are explicitly linked for operator review.
        </p>
        <div className="grid grid-3" style={{ marginTop: 12 }}>
          <div className="card"><div className="kpi">24h</div><p>Iteration cadence target for budget and creative updates.</p></div>
          <div className="card"><div className="kpi">&lt; 1.0</div><p>Target CAC/LTV ratio threshold for sustained scaling.</p></div>
          <div className="card"><div className="kpi">100%</div><p>Budget-shift actions recorded for operator auditability.</p></div>
        </div>
      </Section>

      <Section title="Live acquisition flow">
        <DemoSystemGraph title="Budget learning loop" nodes={["Objective", "Cells", "Performance", "Budget action"]} />
      </Section>

      <Section title="Acquisition data readiness">
        {schemaReady ? (
          <>
            <div className="grid grid-3">
              <div className="card">
                <p className="small">Active source</p>
                <p className={`statusPill ${sourceState.activeMode === "imported" ? "live" : "progress"}`}>
                  {sourceState.activeMode === "imported" ? "Imported" : "Sample"}
                </p>
                <h3 style={{ marginTop: 10 }}>{sourceState.activeLabel}</h3>
                <p className="small">{sourceLabel(sourceState.activeSourceType)} · {sourceState.activeRows.toLocaleString()} source rows</p>
                {sourceState.activeSnapshotType ? <p className="small">{sourceState.activeSnapshotType}</p> : null}
                {sourceState.activeDatasetId || sourceState.activeConnectionId ? (
                  <div className="ctaRow">
                    {sourceState.activeDatasetId ? (
                      <Link className="btn smallBtn" href={`/workspace/datasets/${sourceState.activeDatasetId}`}>Review dataset</Link>
                    ) : null}
                    {sourceState.activeConnectionId ? (
                      <Link className="btn smallBtn" href={`/acquisition/connections/${sourceState.activeConnectionId}`}>
                        Provider account
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="card">
                <p className="small">Provider snapshots</p>
                <div className="kpi">{sourceState.providerSnapshots}</div>
                <p className="small">
                  {sourceState.liveProviderSnapshots.toLocaleString()} live · {sourceState.fallbackProviderSnapshots.toLocaleString()} fallback
                </p>
                <p className="small">
                  Latest: {sourceState.latestProviderSnapshotAt ? sourceState.latestProviderSnapshotAt.toLocaleString() : "None"}
                </p>
              </div>
              <div className="card">
                <p className="small">Next data action</p>
                <h3>{sourceState.activeConnectionId ? "Inspect provider account" : sourceState.activeMode === "imported" ? "Review applied rows" : "Connect or apply data"}</h3>
                {sourceState.activeExternalAccountId ? (
                  <p className="small">Active account: <code className="small">{sourceState.activeExternalAccountId}</code></p>
                ) : null}
                <div className="ctaRow">
                  <Link className="btn smallBtn primary" href="/acquisition/inputs">Open inputs</Link>
                  <Link className="btn smallBtn" href={sourceState.activeConnectionId ? `/acquisition/connections/${sourceState.activeConnectionId}` : "/acquisition/connections"}>
                    {sourceState.activeConnectionId ? "Open provider" : "Connections"}
                  </Link>
                </div>
              </div>
            </div>
            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div className="card"><p className="small">Campaigns</p><div className="kpi">{counts.campaigns}</div></div>
              <div className="card"><p className="small">Test cells</p><div className="kpi">{counts.cells}</div></div>
              <div className="card"><p className="small">Budget actions</p><div className="kpi">{counts.budgetActivities}</div></div>
              <div className="card"><p className="small">Audit logs</p><div className="kpi">{counts.auditLogs}</div></div>
            </div>
          </>
        ) : (
          <div className="card">
            <p>Acquisition schema is not initialized yet.</p>
            <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
          </div>
        )}
        <p className="small" style={{ marginTop: 8 }}>
          Health endpoint: <Link href="/api/acquisition/health/demo-db">/api/acquisition/health/demo-db</Link>
        </p>
      </Section>


      <Section title="Workspace data operations">
        <ResetDemoDataCard appLabel="Acquisition" scope="acquisition" />
      </Section>

      <Section title="Revenue proof foundation">
        <RevenueProofPanel proof={revenueProof} />
      </Section>

      <Section title="Architecture infographic">
        <AcquisitionFlowDiagram />
      </Section>

      <Section title="Architecture modules">
        <div className="grid grid-2">
          {architecture.map((item) => (
            <div className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>


      <Section title="Operator decision canvas">
        <p className="small">A shared frame for how inputs become governed actions and measurable learning.</p>
        <OperatorDecisionCanvas />
      </Section>

      <Section title="Operating sequence">
        <div className="grid grid-2">
          {flow.map((step) => (
            <div className="card" key={step}>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
