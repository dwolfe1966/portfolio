"use client";

import { useMemo, useState } from "react";

type WeightKey = "interest" | "value" | "recency" | "engagement";

type WeightState = Record<WeightKey, number>;
type LockState = Record<WeightKey, boolean>;

const labels: Record<WeightKey, string> = {
  interest: "Interest score",
  value: "Segment value",
  recency: "Recency",
  engagement: "Engagement"
};

const defaultWeights: WeightState = {
  interest: 0.35,
  value: 0.25,
  recency: 0.2,
  engagement: 0.2
};

function clamp(v: number) {
  return Math.max(0, Math.min(1, v));
}

function round3(v: number) {
  return Math.round(v * 1000) / 1000;
}

export function LifecycleScoringSettings() {
  const [weights, setWeights] = useState<WeightState>(defaultWeights);
  const [locks, setLocks] = useState<LockState>({
    interest: false,
    value: false,
    recency: false,
    engagement: false
  });

  const total = useMemo(() => Object.values(weights).reduce((sum, v) => sum + v, 0), [weights]);

  function updateWeight(key: WeightKey, raw: number) {
    const target = clamp(raw);

    setWeights((prev) => {
      const lockedKeys = (Object.keys(locks) as WeightKey[]).filter((k) => locks[k] && k !== key);
      const unlockedOthers = (Object.keys(prev) as WeightKey[]).filter((k) => k !== key && !locks[k]);

      const lockedTotal = lockedKeys.reduce((sum, k) => sum + prev[k], 0);
      const remaining = clamp(1 - lockedTotal - target);

      const currentUnlockedTotal = unlockedOthers.reduce((sum, k) => sum + prev[k], 0);
      const next: WeightState = { ...prev, [key]: target };

      if (unlockedOthers.length === 0) {
        return next;
      }

      if (currentUnlockedTotal <= 0) {
        const even = round3(remaining / unlockedOthers.length);
        unlockedOthers.forEach((k) => {
          next[k] = even;
        });
      } else {
        unlockedOthers.forEach((k) => {
          const proportion = prev[k] / currentUnlockedTotal;
          next[k] = round3(remaining * proportion);
        });
      }

      const drift = 1 - Object.values(next).reduce((sum, value) => sum + value, 0);
      const fixKey = unlockedOthers[0] ?? key;
      next[fixKey] = round3(clamp(next[fixKey] + drift));

      return next;
    });
  }

  return (
    <div className="card">
      <h3>Scoring settings</h3>
      <p>
        Adjust priority weights for interest, value, recency, and engagement. Weights auto-rebalance to keep total
        weight at 1.0. Lock any value to keep it fixed while editing others.
      </p>

      <p className="weightFormula">
        priorityScore = interestScore × interest_weight + recencyScore × recency_weight + segmentScore × value_weight +
        engagementScore × engagement_weight
      </p>

      <div className="grid" style={{ marginTop: 12 }}>
        {(Object.keys(weights) as WeightKey[]).map((key) => (
          <div key={key} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <label htmlFor={`weight-${key}`} style={{ margin: 0 }}>
                {labels[key]}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={locks[key]}
                  onChange={(e) => setLocks((prev) => ({ ...prev, [key]: e.target.checked }))}
                  style={{ width: 16, marginTop: 0 }}
                />
                Lock
              </label>
            </div>
            <input
              id={`weight-${key}`}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={weights[key]}
              onChange={(e) => updateWeight(key, Number(e.target.value))}
            />
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={weights[key]}
              onChange={(e) => updateWeight(key, Number(e.target.value || 0))}
            />
          </div>
        ))}
      </div>

      <p className="small" style={{ marginTop: 10 }}>
        Total weight: {total.toFixed(3)}
      </p>
    </div>
  );
}
