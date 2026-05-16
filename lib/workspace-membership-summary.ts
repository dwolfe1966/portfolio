export type WorkspaceMembershipSummaryInput = {
  id: string;
  role: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  accountUser: {
    id: string;
    name: string | null;
    email: string;
    company?: string | null;
    title?: string | null;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
};

export type WorkspaceMemberSummary = {
  id: string;
  userId: string;
  name: string;
  email: string;
  company: string;
  title: string;
  role: string;
  roleLabel: string;
  statusLabel: string;
  joinedAtLabel: string;
  updatedAtLabel: string;
  isCurrentUser: boolean;
};

export type WorkspaceRoleCapability = {
  key: string;
  label: string;
  description: string;
};

export type WorkspaceRolePolicy = {
  role: string;
  roleLabel: string;
  accessLevel: "full" | "elevated" | "operational" | "read_only" | "custom";
  capabilityCount: number;
  capabilities: WorkspaceRoleCapability[];
};

export type WorkspaceMembershipSummary = {
  available: boolean;
  workspaceId: string | null;
  workspaceName: string;
  workspaceSlug: string | null;
  memberCount: number;
  ownerCount: number;
  adminCount: number;
  viewerCount: number;
  currentUserRoleLabel: string;
  governanceLabel: string;
  rolePolicies: WorkspaceRolePolicy[];
  members: WorkspaceMemberSummary[];
};

function formatDateLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function normalizeRole(value: string | null | undefined) {
  return String(value ?? "viewer").trim().toLowerCase() || "viewer";
}

export function labelWorkspaceRole(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  if (normalized === "owner") return "Owner";
  if (normalized === "admin") return "Admin";
  if (normalized === "operator") return "Operator";
  if (normalized === "viewer") return "Viewer";
  return normalized.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const ROLE_CAPABILITIES: Record<string, Omit<WorkspaceRolePolicy, "capabilityCount">> = {
  owner: {
    role: "owner",
    roleLabel: "Owner",
    accessLevel: "full",
    capabilities: [
      {
        key: "workspace_governance",
        label: "Workspace governance",
        description: "Manage workspace profile, launch owners, readiness evidence, and operating posture."
      },
      {
        key: "credential_grants",
        label: "Credential grants",
        description: "Approve connected systems, provider credentials, and future account delegation."
      },
      {
        key: "execution_approval",
        label: "Execution approval",
        description: "Approve high-risk agent work, provider-write dry runs, launch escalation, and rollback reviews."
      },
      {
        key: "billing_readiness",
        label: "Billing readiness",
        description: "Approve baseline, revenue proof, and billable execution gates."
      }
    ]
  },
  admin: {
    role: "admin",
    roleLabel: "Admin",
    accessLevel: "elevated",
    capabilities: [
      {
        key: "workspace_configuration",
        label: "Workspace configuration",
        description: "Configure datasets, source mappings, launch evidence, and operating settings."
      },
      {
        key: "connector_operations",
        label: "Connector operations",
        description: "Inspect provider connections, run read-only syncs, and prepare credential evidence."
      },
      {
        key: "agent_operations",
        label: "Agent operations",
        description: "Review queues, execute dry runs, and monitor operational evidence."
      }
    ]
  },
  operator: {
    role: "operator",
    roleLabel: "Operator",
    accessLevel: "operational",
    capabilities: [
      {
        key: "queue_operations",
        label: "Queue operations",
        description: "Run scheduled workers, review agent jobs, and inspect provider dry-run results."
      },
      {
        key: "dataset_operations",
        label: "Dataset operations",
        description: "Import datasets, preview source rows, and manage active app data sources."
      }
    ]
  },
  viewer: {
    role: "viewer",
    roleLabel: "Viewer",
    accessLevel: "read_only",
    capabilities: [
      {
        key: "readiness_visibility",
        label: "Readiness visibility",
        description: "View dashboard, launch report, activity, datasets, connections, and operating evidence."
      }
    ]
  }
};

export function workspaceRolePolicy(role: string | null | undefined): WorkspaceRolePolicy {
  const normalized = normalizeRole(role);
  const policy = ROLE_CAPABILITIES[normalized];
  if (policy) return { ...policy, capabilityCount: policy.capabilities.length };
  return {
    role: normalized,
    roleLabel: labelWorkspaceRole(normalized),
    accessLevel: "custom",
    capabilityCount: 1,
    capabilities: [
      {
        key: "custom_role_review",
        label: "Custom role review",
        description: "Review this role before enabling invitations, credential grants, or execution approvals."
      }
    ]
  };
}

export function workspaceRolePoliciesForRoster(roles: Array<string | null | undefined>): WorkspaceRolePolicy[] {
  const seen = new Set<string>();
  return roles
    .map((role) => workspaceRolePolicy(role))
    .filter((policy) => {
      if (seen.has(policy.role)) return false;
      seen.add(policy.role);
      return true;
    })
    .sort((left, right) => {
      const order = ["owner", "admin", "operator", "viewer"];
      const leftIndex = order.indexOf(left.role);
      const rightIndex = order.indexOf(right.role);
      if (leftIndex !== -1 || rightIndex !== -1) return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
      return left.roleLabel.localeCompare(right.roleLabel);
    });
}

export function buildWorkspaceMembershipSummary(input: {
  memberships: WorkspaceMembershipSummaryInput[];
  currentUserId?: string | null;
}): WorkspaceMembershipSummary {
  const firstMembership = input.memberships[0];
  const members = input.memberships
    .map((membership) => {
      const role = normalizeRole(membership.role);
      const isCurrentUser = membership.accountUser.id === input.currentUserId;
      return {
        id: membership.id,
        userId: membership.accountUser.id,
        name: membership.accountUser.name?.trim() || membership.accountUser.email,
        email: membership.accountUser.email,
        company: membership.accountUser.company?.trim() || "Not set",
        title: membership.accountUser.title?.trim() || "Not set",
        role,
        roleLabel: labelWorkspaceRole(role),
        statusLabel: isCurrentUser ? "Signed in" : "Member",
        joinedAtLabel: formatDateLabel(membership.createdAt),
        updatedAtLabel: formatDateLabel(membership.updatedAt),
        isCurrentUser
      };
    })
    .sort((left, right) => {
      if (left.isCurrentUser !== right.isCurrentUser) return left.isCurrentUser ? -1 : 1;
      if (left.role === "owner" && right.role !== "owner") return -1;
      if (right.role === "owner" && left.role !== "owner") return 1;
      return left.name.localeCompare(right.name);
    });

  const ownerCount = members.filter((member) => member.role === "owner").length;
  const adminCount = members.filter((member) => member.role === "admin").length;
  const viewerCount = members.filter((member) => member.role === "viewer").length;
  const currentUser = members.find((member) => member.isCurrentUser);
  const governanceLabel = ownerCount > 0
    ? `${ownerCount} owner${ownerCount === 1 ? "" : "s"} assigned`
    : "Owner assignment needed";

  return {
    available: Boolean(firstMembership),
    workspaceId: firstMembership?.workspace.id ?? null,
    workspaceName: firstMembership?.workspace.name ?? "No workspace membership",
    workspaceSlug: firstMembership?.workspace.slug ?? null,
    memberCount: members.length,
    ownerCount,
    adminCount,
    viewerCount,
    currentUserRoleLabel: currentUser?.roleLabel ?? "No current membership",
    governanceLabel,
    rolePolicies: workspaceRolePoliciesForRoster(members.length ? members.map((member) => member.role) : ["owner", "admin", "operator", "viewer"]),
    members
  };
}
