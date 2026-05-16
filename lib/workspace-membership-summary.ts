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
    members
  };
}
