export type GraphInfluenceInput = {
  users: number;
  entities: number;
  edges: number;
  events: number;
};

export type GraphClusterId = "discovery" | "intent" | "conversion";

export type GraphCluster = {
  id: GraphClusterId;
  label: string;
  nodeCount: number;
  influence: number;
};

export type GraphLink = {
  from: GraphClusterId;
  to: GraphClusterId;
  weight: number;
};

export type GraphInfluenceModel = {
  clusters: GraphCluster[];
  links: GraphLink[];
};

export const CLUSTER_LABELS: Record<GraphClusterId, string> = {
  discovery: "Discovery",
  intent: "Intent",
  conversion: "Conversion"
};

function atLeastOne(value: number): number {
  return Math.max(1, value);
}

function clampInfluence(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function buildGraphInfluenceModel({ users, entities, edges, events }: GraphInfluenceInput): GraphInfluenceModel {
  const totalNodes = atLeastOne(users + entities);
  const discoveryNodes = atLeastOne(Math.round(users * 0.38));
  const intentNodes = atLeastOne(Math.round(users * 0.34));
  const conversionNodes = atLeastOne(totalNodes - discoveryNodes - intentNodes);

  const clusters: GraphCluster[] = [
    {
      id: "discovery",
      label: "Discovery cluster",
      nodeCount: discoveryNodes,
      influence: clampInfluence((edges / totalNodes) * 10)
    },
    {
      id: "intent",
      label: "Intent cluster",
      nodeCount: intentNodes,
      influence: clampInfluence((events / atLeastOne(entities)) * 18)
    },
    {
      id: "conversion",
      label: "Conversion cluster",
      nodeCount: conversionNodes,
      influence: clampInfluence((events / atLeastOne(users)) * 22)
    }
  ];

  const links: GraphLink[] = [
    {
      from: "discovery",
      to: "intent",
      weight: atLeastOne(Math.round((edges / totalNodes) * 4))
    },
    {
      from: "intent",
      to: "conversion",
      weight: atLeastOne(Math.round((events / atLeastOne(users)) * 8))
    },
    {
      from: "discovery",
      to: "conversion",
      weight: atLeastOne(Math.round((events / totalNodes) * 6))
    }
  ];

  return { clusters, links };
}


export type RankedInfluencePath = {
  label: string;
  weight: number;
};

export function rankInfluencePaths(links: GraphLink[]): RankedInfluencePath[] {
  return links
    .map((link) => ({
      label: `${CLUSTER_LABELS[link.from]} → ${CLUSTER_LABELS[link.to]}`,
      weight: link.weight
    }))
    .sort((a, b) => {
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }

      return a.label.localeCompare(b.label);
    });
}

export function getStrongestInfluencePath(links: GraphLink[]): string {
  const [strongest] = rankInfluencePaths(links);
  if (!strongest) {
    return "No influence paths available";
  }

  return `${strongest.label} (w${strongest.weight})`;
}
