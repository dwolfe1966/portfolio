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

function mappingRows(mappings: unknown) {
  return Object.entries(metadataRecord(mappings))
    .map(([objectKey, value]) => ({
      objectKey,
      fields: Object.entries(metadataRecord(value)).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    }))
    .sort((a, b) => a.objectKey.localeCompare(b.objectKey));
}

function jsonPreview(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
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
    const mappings = mappingRows(config.mappings);

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
            {config.sourceType === "google_sheets" ? (
              <Link className="btn primary" href={sourceConfigHref(config.sourceType, config.app, config.id, "refresh")}>Refresh source</Link>
            ) : null}
            <Link className="btn" href={sourceConfigHref(config.sourceType, config.app, config.id, "map")}>Map source</Link>
            <Link className="btn" href={sourceConfigHref(config.sourceType, config.app, config.id, "import")}>Import source</Link>
          </div>
        </Section>

        <Section title="Source status">
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

        <Section title="Activity">
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
                <div className="card" key={objectKey}>
                  <p className="editorKicker">{objectKey}</p>
                  <div className="kpi">{count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Field mappings">
          {mappings.length === 0 ? (
            <div className="card">
              <p>No field mappings have been saved for this source yet.</p>
            </div>
          ) : (
            <div className="tableScroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Object</th>
                    <th>App field</th>
                    <th>Source column</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.flatMap((object) => object.fields.map(([field, sourceColumn]) => (
                    <tr key={`${object.objectKey}-${field}`}>
                      <td>{object.objectKey}</td>
                      <td><code>{field}</code></td>
                      <td>{sourceColumn || <span className="small">Not mapped</span>}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Raw source metadata">
          <div className="grid grid-2">
            <div className="card importMetadataDetails">
              <p className="editorKicker">Metadata</p>
              <pre>{jsonPreview(config.metadata)}</pre>
            </div>
            <div className="card importMetadataDetails">
              <p className="editorKicker">Mappings</p>
              <pre>{jsonPreview(config.mappings)}</pre>
            </div>
          </div>
        </Section>

        <Section title="Use this source">
          <div className="ctaRow">
            <Link className="btn" href={toolPageHref(config.app, "inputs")}>Open inputs</Link>
            <Link className="btn primary" href={toolPageHref(config.app, "simulations")}>Run simulation</Link>
            <Link className="btn" href={sourceConfigHref(config.sourceType, config.app, config.id, "import")}>Import latest data</Link>
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
