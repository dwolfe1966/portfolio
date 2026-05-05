"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type ProgressStage = {
  percent: number;
  status: string;
  detail: string;
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
  const [progress, setProgress] = useState(0);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const timers = useRef<number[]>([]);

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === datasetId),
    [datasetId, datasets]
  );

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function clearProgressTimers() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }

  function startProgress(stages: ProgressStage[]) {
    clearProgressTimers();
    setIsApplying(true);
    setProgressSteps([]);
    stages.forEach((stage, index) => {
      const timer = window.setTimeout(() => {
        setProgress(stage.percent);
        setStatus(stage.status);
        setDetail(stage.detail);
        setProgressSteps((current) => [...current.slice(-3), stage.status]);
      }, index * 1300);
      timers.current.push(timer);
    });
  }

  function completeProgress(statusText: string, detailText: string) {
    clearProgressTimers();
    setProgress(100);
    setStatus(statusText);
    setDetail(detailText);
    setProgressSteps((current) => [...current.slice(-3), statusText]);
  }

  function sampleStages(): ProgressStage[] {
    return [
      {
        percent: 15,
        status: `Preparing ${appLabel} sample data`,
        detail: "Confirming the sample dataset switch and locking the active source selector."
      },
      {
        percent: 35,
        status: "Clearing current product rows",
        detail: "Removing current active rows so the app does not mix imported and sample data."
      },
      {
        percent: 65,
        status: "Reseeding baseline data",
        detail: "Writing representative sample users, entities, policies, runs, or product records."
      },
      {
        percent: 85,
        status: "Recording selected source",
        detail: "Saving Sample Data as the active source and refreshing displayed counts."
      }
    ];
  }

  function importedStages(): ProgressStage[] {
    return [
      {
        percent: 12,
        status: "Loading selected workspace dataset",
        detail: selectedDataset ? `Reading ${selectedDataset.label}.` : "Reading the selected persisted dataset snapshot."
      },
      {
        percent: 30,
        status: "Validating imported rows",
        detail: "Checking required fields and preparing model-ready records for this product."
      },
      {
        percent: 55,
        status: "Replacing active product tables",
        detail: "Clearing current rows and copying the imported dataset into the app tables."
      },
      {
        percent: 78,
        status: "Rebuilding downstream outputs",
        detail: "Clearing prior generated runs, messages, audit rows, and stale outputs where needed."
      },
      {
        percent: 92,
        status: "Refreshing source indicator and counts",
        detail: "Saving Imported Data as the active source and reloading the product view."
      }
    ];
  }

  async function applySampleData() {
    startProgress(sampleStages());
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_DEMO", scope })
      });
      const payload = await response.json();
      if (!payload.ok) {
        completeProgress("Source switch failed", payload.error?.message ?? "The sample dataset could not be restored.");
        return;
      }
      completeProgress("Sample data is active", "Refreshing counts from the product database.");
      router.refresh();
    } catch {
      completeProgress("Source switch failed", "The request could not reach the server.");
    } finally {
      setIsApplying(false);
    }
  }

  function onSubmit() {
    startProgress(importedStages());
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
          <div className="toolDataSourceProgressTrack">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="toolDataSourceProgressHeader">
            <strong>{status}</strong>
            <span>{progress}%</span>
          </div>
          <p>{detail}</p>
          <ol>
            {progressSteps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {!isApplying && status && (
        <p className="toolDataSourceMessage" aria-live="polite"><strong>{status}</strong> {detail}</p>
      )}
    </form>
  );
}
