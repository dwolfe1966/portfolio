"use client";

import { useMemo, useState } from "react";

type Category = "inputs" | "outputs" | "weights" | "assumptions";

type VariableRow = {
  category: Category;
  variable: string;
  type: string;
  description: string;
  example: string;
};

const rows: VariableRow[] = [
  { category: "weights", variable: "interest_weight", type: "float", description: "Weight for interest score.", example: "0-1" },
  { category: "weights", variable: "value_weight", type: "float", description: "Weight for segment value score.", example: "0-1" },
  { category: "weights", variable: "recency_weight", type: "float", description: "Weight for recency of entity change.", example: "0-1" },
  { category: "weights", variable: "engagement_weight", type: "float", description: "Weight for historical engagement signal.", example: "0-1" },
  { category: "assumptions", variable: "open_rate", type: "float", description: "Expected open rate for generated outreach.", example: "0-1" },
  { category: "assumptions", variable: "click_rate", type: "float", description: "Expected click-through rate.", example: "0-1" },
  { category: "assumptions", variable: "purchase_rate", type: "float", description: "Expected purchase conversion rate.", example: "0-1" },
  { category: "assumptions", variable: "revenue_per_event", type: "currency", description: "Average revenue per downstream conversion.", example: "$120" },
  { category: "inputs", variable: "entity_type", type: "enum", description: "Entity class used in matching and prioritization.", example: "property, permit, legal" },
  { category: "inputs", variable: "delta_type", type: "enum", description: "Type of detected entity change event.", example: "address_change" },
  { category: "inputs", variable: "segment", type: "enum", description: "Commercial segment for a user profile.", example: "trial, active, lapsed" },
  { category: "outputs", variable: "entityDeltas", type: "int", description: "Detected changes in current run window.", example: "45" },
  { category: "outputs", variable: "campaignCandidates", type: "int", description: "Candidates passing score threshold.", example: "20" },
  { category: "outputs", variable: "generatedMessages", type: "int", description: "Generated message assets.", example: "5" },
  { category: "outputs", variable: "projectedRevenue", type: "currency", description: "Modeled revenue estimate.", example: "$480" }
];

const tabs: Array<{ key: Category; label: string }> = [
  { key: "inputs", label: "Inputs" },
  { key: "outputs", label: "Outputs" },
  { key: "weights", label: "Scoring Weights" },
  { key: "assumptions", label: "Assumptions" }
];

export function VariableDefinitions() {
  const [active, setActive] = useState<Category>("inputs");

  const filteredRows = useMemo(() => rows.filter((row) => row.category === active), [active]);

  return (
    <div className="card">
      <h3>Variable definitions</h3>
      <p>Use this reference to understand each input, scoring control, and output metric used in the lifecycle engine.</p>
      <div className="ctaRow" style={{ marginTop: 8 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active === tab.key}
            className={active === tab.key ? "btn primary" : "btn"}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Type</th>
              <th>Description</th>
              <th>Range / Example</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.variable}>
                <td><code>{row.variable}</code></td>
                <td>{row.type}</td>
                <td>{row.description}</td>
                <td>{row.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
