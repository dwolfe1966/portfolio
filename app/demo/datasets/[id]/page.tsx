import { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildMetadata } from "@/lib/seo";
import { getDefaultWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return buildMetadata({
    title: "Source Config | David Wolfe",
    description: "Saved workspace source configuration detail.",
    path: `/workspace/datasets/${encodeURIComponent(id)}`
  });
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "google_sheets") return "Google Sheets";
  if (sourceType === "csv") return "CSV";
  if (sourceType === "oauth") return "OAuth";
  if (sourceType === "live") return "Live datasource";
  return sourceType.toUpperCase();
}

function sourceConfigHref(sourceType: string, app: string, id: string, action?: "refresh" | "map" | "import") {
  const encodedApp = encodeURIComponent(app);
  const encodedId = encodeURIComponent(id);
  const actionParam = action ? `&action=${action}` : "";
  if (sourceType === "google_sheets") return `/workspace/connections/google-sheets?tool=${encodedApp}&config=${encodedId}${actionParam}`;
  return `/workspace/connections/csv?tool=${encodedApp}&config=${encodedId}${actionParam}`;
}

function toolPageHref(app: string, page: "inputs" | "simulations") {
  const safeApp = ["lifecycle", "acquisition", "pricing", "retention", "expansion", "auction"].includes(app) ? app : "lifecycle";
  return `/${safeApp}/${page}?imported=1`;
}

function rowCount(metadata: unknown) {
  const rowCounts = metadataRecord(metadataRecord(metadata).rowCounts);
  return Object.values(rowCounts).reduce<number>((sum, count) => sum + (typeof count === "number" ? count : 0), 0);
}

function objectRows(metadata: unknown) {
  const rowCounts = metadataRecord(metadataRecord(metadata).rowCounts);
  return Object.entries(rowCounts)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function jsonPreview(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function sourceActionState({
  sourceType,
  rows,
  lastPreviewedAt,
  lastValidatedAt,
  lastImportedAt
}: {
  sourceType: string;
  rows: number;
  lastPreviewedAt: string;
  lastValidatedAt: string;
  lastImportedAt: string;
}) {
  if (sourceType === "google_sheets" && !lastPreviewedAt) {
    return {
      status: "Needs refresh",
      nextAction: "Refresh source",
      detail: "Pull live Sheet rows into the preview before mapping or importing.",
      action: "refresh" as const
    };
  }
  if (rows === 0 && !lastValidatedAt) {
    return {
      status: "Needs mapping",
      nextAction: "Map source",
      detail: "Open the connector, provide source rows, and save a validated mapping.",
      action: "map" as const
    };
  }
  if (!lastImportedAt) {
    return {
      status: "Ready to import",
      nextAction: "Import source",
      detail: "Validated rows are available, but they have not been imported into tool tables yet.",
      action: "import" as const
    };
  }
  return {
    status: "Operational",
    nextAction: sourceType === "google_sheets" ? "Refresh source" : "Import source",
    detail: sourceType === "google_sheets"
      ? "This source has been imported. Refresh before the next run when the Sheet changes."
      : "This source has been imported. Re-import when the underlying CSV data changes.",
    action: sourceType === "google_sheets" ? "refresh" as const : "import" as const
  };
}

async function loadSourceConfig(id: string) {
  const workspace = await getDefaultWorkspace();
  return db.lifecycleMappingPreset.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { workspace: true }
  });
}

async function deleteSourceConfig(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const workspace = await getDefaultWorkspace();
  await db.lifecycleMappingPreset.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/workspace/datasets");
  revalidatePath("/demo/datasets");
  redirect("/workspace/datasets");
}

export default async function SourceConfigDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const config = await loadSourceConfig(id);
    if (!config) notFound();

    const metadata = metadataRecord(config.metadata);
    const sheetId = typeof metadata.sheetId === "string" ? metadata.sheetId : "";
    const lastPreviewedAt = typeof metadata.lastPreviewedAt === "string" ? metadata.lastPreviewedAt : "";
    const lastValidatedAt = typeof metadata.lastValidatedAt === "string" ? metadata.lastValidatedAt : "";
    const lastImportedAt = typeof metadata.lastImportedAt === "string" ? metadata.lastImportedAt : "";
    const lastImportSummary = typeof metadata.lastImportSummary === "string" ? metadata.lastImportSummary : "";
    const lastImportedRowsTotal = typeof metadata.lastImportedRowsTotal === "number" ? metadata.lastImportedRowsTotal : 0;
    const rows = rowCount(config.metadata);
    const mappedObjects = objectRows(config.metadata);
    const actionState = sourceActionState({
      sourceType: config.sourceType,
      rows,
      lastPreviewedAt,
      lastValidatedAt,
      lastImportedAt
    });

    return (
      <>
        <DemoWorkspaceTabs />
        <Section eyebrow="Workspace dataset" title={config.name}>
          <p>
            Saved {sourceTypeLabel(config.sourceType).toLowerCase()} source configuration for {config.app}. Review the
            current mapping, source metadata, and operational activity before refreshing or importing.
          </p>
          <div className="ctaRow">
            <Link className="btn" href="/workspace/datasets">Back to datasets</Link>
            <Link className="btn" href="/workspace/connections">Back to connections</Link>
            <Link className="btn primary" href={sourceConfigHref(config.sourceType, config.app, config.id, actionState.action)}>
              {actionState.nextAction}
            </Link>
          </div>
        </Section>

        <Section title="Source workflow">
          <div className="grid grid-3">
            <div className="card sourceWorkflowCard sourceWorkflowCard--primary">
              <p className="editorKicker">Recommended next step</p>
              <h3>{actionState.nextAction}</h3>
              <p>{actionState.detail}</p>
              <Link className="btn smallBtn primary" href={sourceConfigHref(config.sourceType, config.app, config.id, actionState.action)}>
                {actionState.nextAction}
              </Link>
            </div>
            <div className="card sourceWorkflowCard">
              <div className="editorHeader">
                <div>
                  <p className="editorKicker">Source state</p>
                  <h3>{actionState.status}</h3>
                </div>
                <span className={`statusPill ${actionState.status === "Operational" ? "live" : "progress"}`}>{sourceTypeLabel(config.sourceType)}</span>
              </div>
              <p className="small">
                {config.sourceType === "google_sheets"
                  ? "Sheets sources refresh live rows, validate mappings, then import into tool tables."
                  : "CSV sources store reusable mappings; fresh rows are pasted or uploaded during import."}
              </p>
            </div>
            <div className="card sourceWorkflowCard">
              <p className="editorKicker">After import</p>
              <h3>Run the tool</h3>
              <p className="small">Review imported inputs, then run the simulation against the owned dataset.</p>
              <div className="importHistoryActions">
                <Link className="btn smallBtn" href={toolPageHref(config.app, "inputs")}>Inputs</Link>
                <Link className="btn smallBtn" href={toolPageHref(config.app, "simulations")}>Simulate</Link>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Source facts">
          <div className="grid grid-4">
            <div className="card">
              <p className="small">Tool</p>
              <div className="workspaceSettingValue">{config.app}</div>
            </div>
            <div className="card">
              <p className="small">Source</p>
              <div className="workspaceSettingValue">{sourceTypeLabel(config.sourceType)}</div>
            </div>
            <div className="card">
              <p className="small">Mapped rows</p>
              <div className="kpi">{rows.toLocaleString()}</div>
            </div>
            <div className="card">
              <p className="small">Workspace</p>
              <div className="workspaceSettingValue">{config.workspace.name}</div>
            </div>
          </div>
        </Section>

        <Section title="Recent activity">
          <div className="grid grid-4">
            <div className="card">
              <p className="small">{config.sourceType === "google_sheets" ? "Previewed" : "Validated"}</p>
              <div className="workspaceSettingValue">
                {formatDate(config.sourceType === "google_sheets" ? lastPreviewedAt : lastValidatedAt) || "None"}
              </div>
            </div>
            <div className="card">
              <p className="small">Imported</p>
              <div className="workspaceSettingValue">{formatDate(lastImportedAt) || "None"}</div>
            </div>
            <div className="card">
              <p className="small">Imported rows</p>
              <div className="kpi">{lastImportedRowsTotal.toLocaleString()}</div>
            </div>
            <div className="card">
              <p className="small">Updated</p>
              <div className="workspaceSettingValue">{formatDate(config.updatedAt)}</div>
            </div>
          </div>
          {lastImportSummary ? <p className="small">{lastImportSummary}</p> : null}
          {sheetId ? <p className="small">Sheet ID: <code>{sheetId}</code></p> : null}
        </Section>

        <Section title="Object coverage">
          {mappedObjects.length === 0 ? (
            <div className="card">
              <p>No object row counts have been recorded for this source yet.</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {mappedObjects.map(([objectKey, count]) => (
                <div className="card sourceObjectCoverageCard" key={objectKey}>
                  <p className="editorKicker">Object</p>
                  <h3>{objectKey}</h3>
                  <div className="kpi">{count.toLocaleString()}</div>
                  <p className="small">Mapped rows</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Technical details">
          <div className="card sourceMetadataDisclosure">
            <p>
              Raw connector metadata is available for debugging saved source configs. Most workspace tasks should use
              the workflow, coverage, and field mapping sections above.
            </p>
            <details className="importMetadataDetails">
              <summary>View raw metadata</summary>
              <pre>{jsonPreview(config.metadata)}</pre>
            </details>
            <details className="importMetadataDetails">
              <summary>View raw mappings</summary>
              <pre>{jsonPreview(config.mappings)}</pre>
            </details>
          </div>
        </Section>

        <Section title="Source management">
          <div className="card sourceDangerCard">
            <div>
              <p className="editorKicker">Delete source config</p>
              <p className="small">
                This removes the saved connector configuration and mappings. Imported tool data remains in the workspace.
              </p>
            </div>
            <form action={deleteSourceConfig}>
              <input type="hidden" name="id" value={config.id} />
              <button type="submit">Delete source config</button>
            </form>
          </div>
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <>
          <DemoWorkspaceTabs />
          <Section eyebrow="Workspace dataset" title="Source config unavailable">
            <p>Run the latest Prisma migrations to enable workspace source config detail pages.</p>
            <Link className="btn" href="/workspace/datasets">Back to datasets</Link>
          </Section>
        </>
      );
    }
    throw error;
  }
}
