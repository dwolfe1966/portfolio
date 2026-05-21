import { getActiveDataSourceSelection, type ToolScope } from "@/lib/app-data-source-selection";

export type ActiveDataSourceSummary = {
  mode: "sample" | "imported";
  sourceType: string;
  sourceLabel: string;
  label: string;
  detail: string;
  href: string;
};

const appLabels: Record<ToolScope, string> = {
  lifecycle: "Lifecycle",
  acquisition: "Acquisition",
  auction: "Auction",
  pricing: "Pricing",
  retention: "Retention",
  expansion: "Expansion"
};

const sourceLabels: Record<string, string> = {
  sample: "Sample",
  csv: "CSV",
  google_sheets: "Google Sheets",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  manual: "Manual"
};

function rowCountTotal(rowCounts: unknown) {
  if (!rowCounts || typeof rowCounts !== "object" || Array.isArray(rowCounts)) return 0;
  return Object.values(rowCounts).reduce((sum, value) => sum + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function sourceLabel(sourceType: string | null | undefined) {
  if (!sourceType) return "Imported";
  return sourceLabels[sourceType] ?? sourceType.replaceAll("_", " ");
}

function sourceClass(sourceType: string | null | undefined) {
  return sourceType?.replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || "imported";
}

function formatUpdatedAt(value: Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export async function loadActiveDataSourceSummary(
  app: ToolScope,
  accountUserId?: string | null
): Promise<ActiveDataSourceSummary> {
  const selection = await getActiveDataSourceSelection(app, accountUserId);
  const appLabel = appLabels[app];

  if (!selection || selection.mode === "sample") {
    const rows = selection ? rowCountTotal(selection.rowCounts) : 0;
    const updated = selection ? formatUpdatedAt(selection.updatedAt) : "";
    return {
      mode: "sample",
      sourceType: "sample",
      sourceLabel: "Sample",
      label: `${appLabel} sample data`,
      detail: [
        rows > 0 ? `${rows.toLocaleString()} rows` : "Default app tables",
        updated ? `updated ${updated}` : ""
      ].filter(Boolean).join(" · "),
      href: `/${app}/inputs`
    };
  }

  const rows = rowCountTotal(selection.rowCounts);
  const updated = formatUpdatedAt(selection.updatedAt);
  const label = sourceLabel(selection.sourceType);
  return {
    mode: "imported",
    sourceType: sourceClass(selection.sourceType),
    sourceLabel: label,
    label: selection.label,
    detail: [
      rows > 0 ? `${rows.toLocaleString()} rows` : "",
      updated ? `updated ${updated}` : ""
    ].filter(Boolean).join(" · ") || label,
    href: selection.datasetId ? `/workspace/datasets/${selection.datasetId}` : `/${app}/inputs`
  };
}
