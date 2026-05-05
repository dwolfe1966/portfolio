"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "sample" | "imported";

export type ToolDatasetOption = {
  id: string;
  label: string;
};

export type ToolDataSourceStat = {
  label: string;
  value: number;
};

type ToolDataSourceSelectorProps = {
  appLabel: string;
  scope: "lifecycle" | "acquisition" | "auction" | "pricing" | "retention" | "expansion";
  activeMode: Mode;
  activeLabel: string;
  activeDatasetId?: string | null;
  stats: ToolDataSourceStat[];
  datasets: ToolDatasetOption[];
  applyDatasetAction: (formData: FormData) => void | Promise<void>;
};

export function ToolDataSourceSelector({
  appLabel,
  scope,
  activeMode,
  activeLabel,
  activeDatasetId,
  stats,
  datasets,
  applyDatasetAction
}: ToolDataSourceSelectorProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(activeMode);
  const [datasetId, setDatasetId] = useState(activeDatasetId ?? datasets[0]?.id ?? "");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === datasetId),
    [datasetId, datasets]
  );

  async function applySampleData() {
    setIsApplying(true);
    setStatus(`Switching ${appLabel} to sample data`);
    setDetail("Clearing current product rows and reseeding the baseline sample dataset.");
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_DEMO", scope })
      });
      const payload = await response.json();
      if (!payload.ok) {
        setStatus("Source switch failed");
        setDetail(payload.error?.message ?? "The sample dataset could not be restored.");
        return;
      }
      setStatus("Sample data is active");
      setDetail("Refreshing counts from the product database.");
      router.refresh();
    } catch {
      setStatus("Source switch failed");
      setDetail("The request could not reach the server.");
    } finally {
      setIsApplying(false);
    }
  }

  function onSubmit() {
    setIsApplying(true);
    setStatus(`Applying imported dataset${selectedDataset ? `: ${selectedDataset.label}` : ""}`);
    setDetail("Replacing current product rows with the selected workspace dataset. Counts refresh when the switch completes.");
  }

  const canApply = mode === "sample" || Boolean(datasetId);
  const cta = mode === "sample" ? `Apply Option A: Use Sample Data` : `Apply Option B: Use Imported Data`;

  return (
    <form className="toolDataSourceSelector" action={applyDatasetAction} onSubmit={onSubmit}>
      <div className="toolDataSourceStatus">
        <div>
          <span>Selected source</span>
          <strong>{activeMode === "sample" ? "Sample Data" : "Imported Data"}</strong>
          <p>{activeLabel}</p>
        </div>
        <div className="toolDataSourceCounts">
          {stats.map((stat) => (
            <div key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="toolDataSourceOptions" role="radiogroup" aria-label={`${appLabel} data source`}>
        <label className={`toolDataSourceOption ${mode === "sample" ? "isSelected" : ""}`}>
          <input
            type="radio"
            name="dataSourceMode"
            value="sample"
            checked={mode === "sample"}
            onChange={() => setMode("sample")}
          />
          <span>
            <strong>Option A Use Sample Data</strong>
            <small>Use the seeded product dataset.</small>
          </span>
        </label>
        <label className={`toolDataSourceOption ${mode === "imported" ? "isSelected" : ""}`}>
          <input
            type="radio"
            name="dataSourceMode"
            value="imported"
            checked={mode === "imported"}
            onChange={() => setMode("imported")}
          />
          <span>
            <strong>Option B Use Imported Data</strong>
            <small>Use a persisted workspace dataset.</small>
          </span>
        </label>
      </div>

      {mode === "imported" && (
        <label className="toolDataSourceDataset">
          Imported dataset
          <select name="datasetId" value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>
            {datasets.length > 0 ? datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>{dataset.label}</option>
            )) : (
              <option value="">No imported datasets available</option>
            )}
          </select>
        </label>
      )}
      {mode === "sample" && <input type="hidden" name="datasetId" value="" />}

      <button
        type={mode === "sample" ? "button" : "submit"}
        disabled={!canApply || isApplying}
        onClick={mode === "sample" ? applySampleData : undefined}
      >
        {isApplying ? "Applying selection..." : cta}
      </button>

      {isApplying && (
        <div className="toolDataSourceProgress" aria-live="polite">
          <div><span /></div>
          <p><strong>{status}</strong> {detail}</p>
        </div>
      )}
      {!isApplying && status && (
        <p className="toolDataSourceMessage" aria-live="polite"><strong>{status}</strong> {detail}</p>
      )}
    </form>
  );
}
