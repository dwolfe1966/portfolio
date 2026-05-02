import React from "react";

export function MetricChip({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <span className="metricChip">
      <span className="metricChip__label">{label}</span>
      <span>{value}</span>
    </span>
  );
}

export function MetricChipRow({ children }: { children: React.ReactNode }) {
  return <span className="metricChipRow">{children}</span>;
}
