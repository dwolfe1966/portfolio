import { getActiveDataSourceSelection, type ToolScope } from "@/lib/app-data-source-selection";

export type ActiveDataSourceSummary = {
  mode: "sample" | "imported";
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

export async function loadActiveDataSourceSummary(
  app: ToolScope,
  accountUserId?: string | null
): Promise<ActiveDataSourceSummary> {
  const selection = await getActiveDataSourceSelection(app, accountUserId);
  const appLabel = appLabels[app];

  if (!selection || selection.mode === "sample") {
    return {
      mode: "sample",
      label: `${appLabel} sample data`,
      detail: "Sample source",
      href: `/${app}/inputs`
    };
  }

  const rows = rowCountTotal(selection.rowCounts);
  return {
    mode: "imported",
    label: selection.label,
    detail: `${sourceLabel(selection.sourceType)}${rows > 0 ? ` · ${rows.toLocaleString()} rows` : ""}`,
    href: selection.datasetId ? `/workspace/datasets/${selection.datasetId}` : `/${app}/inputs`
  };
}
