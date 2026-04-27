"use client";

import { useMemo, useState } from "react";
import {
  buildGraphInfluenceModel,
  CLUSTER_LABELS,
  getStrongestInfluencePath,
  GraphClusterId,
  rankInfluencePaths
} from "@/lib/graph-influence";

type GraphInfluencePathsProps = {
  users: number;
  entities: number;
  edges: number;
  events: number;
  assumptions?: {
    recencyScore: number;
    highPriorityThreshold: number;
    minPriorityScore: number;
  };
};

type Position = { x: number; y: number };

const clusterPos: Record<GraphClusterId, Position> = {
  discovery: { x: 90, y: 88 },
  intent: { x: 250, y: 56 },
  conversion: { x: 410, y: 88 }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function GraphInfluencePaths({ users, entities, edges, events, assumptions }: GraphInfluencePathsProps) {
  const [recencyScore, setRecencyScore] = useState(assumptions?.recencyScore ?? 0.9);
  const [highPriorityThreshold, setHighPriorityThreshold] = useState(assumptions?.highPriorityThreshold ?? 0.8);
  const [minPriorityScore, setMinPriorityScore] = useState(assumptions?.minPriorityScore ?? 0);

  const avgNeighbors = users > 0 ? (edges / users).toFixed(1) : "0.0";
  const eventPressure = entities > 0 ? (events / entities).toFixed(2) : "0.00";
  const { hasData, clusters, links } = buildGraphInfluenceModel({ users, entities, edges, events });

  const assumptionAdjusted = useMemo(() => {
    const recencyFactor = 1 + (recencyScore - 0.9) * 0.7;
    const thresholdFactor = 1 + (0.85 - highPriorityThreshold) * 0.55;
    const floorFactor = 1 + minPriorityScore * 0.25;
    const combinedFactor = clamp(recencyFactor * thresholdFactor * floorFactor, 0.65, 1.55);

    const adjustedLinks = links.map((link) => ({
      ...link,
      weight: Math.max(1, Math.round(link.weight * combinedFactor))
    }));

    const adjustedClusters = clusters.map((cluster) => ({
      ...cluster,
      influence: clamp(Math.round(cluster.influence * combinedFactor), 0, 100)
    }));

    return { adjustedLinks, adjustedClusters };
  }, [clusters, highPriorityThreshold, links, minPriorityScore, recencyScore]);

  const strongestPath = getStrongestInfluencePath(assumptionAdjusted.adjustedLinks);
  const rankedPaths = rankInfluencePaths(assumptionAdjusted.adjustedLinks);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Influence path explorer (beta)</h3>
      <p className="small">Multi-hop relationship view with lightweight cluster and path-strength signals.</p>
      <p className="small">
        Interpretation: Discovery captures broad intent collection, Intent shows concentrated qualification pressure,
        and Conversion reflects where operator-ready actions are most likely to emerge.
      </p>
      <p className="small">
        Use the assumption controls below to preview how stronger recency emphasis or tighter priority thresholds alter
        link strength and cluster influence before running a full simulation.
      </p>

      {!hasData && <p className="small">No graph activity yet. Run simulation steps to populate influence paths.</p>}

      <div className="card" style={{ marginTop: 10 }}>
        <p className="small" style={{ marginBottom: 6 }}>Assumption sensitivity (preview)</p>
        <div className="grid grid-3">
          <label>
            Recency score
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.01"
              value={recencyScore}
              onChange={(event) => setRecencyScore(Number(event.target.value))}
            />
            <span className="small">{recencyScore.toFixed(2)}</span>
          </label>
          <label>
            High-priority threshold
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.01"
              value={highPriorityThreshold}
              onChange={(event) => setHighPriorityThreshold(Number(event.target.value))}
            />
            <span className="small">{highPriorityThreshold.toFixed(2)}</span>
          </label>
          <label>
            Priority floor
            <input
              type="range"
              min="0"
              max="0.6"
              step="0.01"
              value={minPriorityScore}
              onChange={(event) => setMinPriorityScore(Number(event.target.value))}
            />
            <span className="small">{minPriorityScore.toFixed(2)}</span>
          </label>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div className="card">
          <p className="small">Avg neighbors / user</p>
          <div className="kpi">{avgNeighbors}</div>
        </div>
        <div className="card">
          <p className="small">Event pressure / entity</p>
          <div className="kpi">{eventPressure}</div>
        </div>
        <div className="card">
          <p className="small">Path templates</p>
          <div className="kpi">{rankedPaths.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <p className="small" style={{ marginBottom: 8 }}>Cluster influence map</p>
        <svg
          viewBox="0 0 500 180"
          role="img"
          aria-label="Influence cluster map"
          style={{ width: "100%", height: "auto", overflow: "visible" }}
        >
          <title>Lifecycle influence cluster map</title>
          {assumptionAdjusted.adjustedLinks.map((link) => {
            const from = clusterPos[link.from];
            const to = clusterPos[link.to];
            const ctrlY = Math.min(from.y, to.y) - 28;

            return (
              <g key={`${link.from}-${link.to}`}>
                <path
                  d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${ctrlY}, ${to.x} ${to.y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeWidth={Math.min(8, 1.5 + link.weight)}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={ctrlY - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                >
                  w{link.weight}
                </text>
              </g>
            );
          })}

          {assumptionAdjusted.adjustedClusters.map((cluster) => {
            const pos = clusterPos[cluster.id];
            const radius = cluster.nodeCount > 0
              ? 14 + Math.min(18, Math.round(cluster.nodeCount / 2))
              : 12;

            return (
              <g key={cluster.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill="currentColor"
                  fillOpacity={cluster.influence > 0 ? 0.1 + cluster.influence / 250 : 0.08}
                  stroke="currentColor"
                />
                <text x={pos.x} y={pos.y - 2} textAnchor="middle" fontSize="11" fill="currentColor">
                  {CLUSTER_LABELS[cluster.id]}
                </text>
                <text x={pos.x} y={pos.y + 14} textAnchor="middle" fontSize="10" fill="currentColor">
                  {cluster.nodeCount} nodes
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <p className="small" style={{ marginBottom: 8 }}>Strongest current path</p>
        <p style={{ margin: 0 }}>{strongestPath}</p>
        <div className="grid grid-3" style={{ marginTop: 10 }}>
          {assumptionAdjusted.adjustedClusters.map((cluster) => (
            <div className="card" key={`${cluster.id}-stats`}>
              <p className="small">{CLUSTER_LABELS[cluster.id]}</p>
              <p className="small" style={{ margin: 0 }}>Nodes: {cluster.nodeCount}</p>
              <p className="small" style={{ margin: 0 }}>Influence: {cluster.influence}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid" style={{ marginTop: 10 }}>
        {rankedPaths.length > 0 ? (
          rankedPaths.map((path) => (
            <div className="card" key={path.label}>
              <p style={{ marginBottom: 6 }}>{path.label}</p>
              <p className="small" style={{ margin: 0 }}>Path strength: w{path.weight}</p>
            </div>
          ))
        ) : (
          <div className="card">
            <p className="small" style={{ margin: 0 }}>Influence path ranking will appear after first simulation run.</p>
          </div>
        )}
      </div>
    </div>
  );
}
