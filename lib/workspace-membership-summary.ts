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

export type WorkspaceInviteReadiness = {
  status: "ready" | "blocked" | "review";
  statusLabel: string;
  canInvite: boolean;
  actorRoleLabel: string;
  nextAction: string;
  blockers: string[];
  warnings: string[];
};

export type WorkspaceInviteDraft = {
  status: "ready" | "blocked" | "invalid" | "review";
  statusLabel: string;
  canCreate: boolean;
  email: string;
  role: string;
  roleLabel: string;
  subject: string;
  auditSummary: string;
  nextAction: string;
  blockers: string[];
  warnings: string[];
};

export type WorkspacePendingInviteInput = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  tokenHash?: string | null;
  draftPayload?: unknown;
  expiresAt: Date | string;
  createdAt: Date | string;
  invitedByAccountUser?: {
    name: string | null;
    email: string;
  } | null;
};

export type WorkspacePendingInviteSummary = {
  id: string;
  email: string;
  role: string;
  roleLabel: string;
  status: string;
  statusLabel: string;
  previewHref: string;
  invitedByLabel: string;
  expiresAtLabel: string;
  createdAtLabel: string;
  lastSentAtLabel: string | null;
  isExpired: boolean;
  sendReadiness: WorkspaceInviteSendReadiness;
};

export type WorkspaceInviteSendReadiness = {
  status: "ready" | "blocked";
  statusLabel: string;
  canSend: boolean;
  nextAction: string;
  blockers: string[];
};

export type WorkspaceInviteMailDeliveryConfig = {
  status: "ready" | "blocked";
  statusLabel: string;
  providerLabel: string;
  fromEmail: string;
  publicAppUrl: string;
  nextAction: string;
  blockers: string[];
};

export type WorkspaceInviteAcceptancePreviewInput = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  workspace?: {
    name: string;
    slug: string;
  } | null;
  invitedByAccountUser?: {
    name: string | null;
    email: string;
  } | null;
} | null;

export type WorkspaceInviteAcceptancePreview = {
  available: boolean;
  status: "ready" | "expired" | "canceled" | "accepted" | "missing";
  statusLabel: string;
  canAccept: boolean;
  email: string;
  roleLabel: string;
  workspaceName: string;
  invitedByLabel: string;
  createdAtLabel: string;
  expiresAtLabel: string;
  nextAction: string;
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
  currentUserCanManageInvites: boolean;
  governanceLabel: string;
  inviteMailDelivery: WorkspaceInviteMailDeliveryConfig;
  inviteReadiness: WorkspaceInviteReadiness;
  rolePolicies: WorkspaceRolePolicy[];
  pendingInvites: WorkspacePendingInviteSummary[];
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

function normalizeInviteEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

function isValidInviteEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readPreviewHrefFromPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const href = (value as { tokenPreviewPath?: unknown }).tokenPreviewPath;
  return typeof href === "string" && href.startsWith("/workspace/invite/") ? href : null;
}

function readLastSentAtFromPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const sentAt = (value as { mailDelivery?: { sentAt?: unknown } }).mailDelivery?.sentAt;
  return typeof sentAt === "string" ? sentAt : null;
}

function normalizeEnvValue(value: unknown) {
  return String(value ?? "").trim();
}

function normalizePublicAppUrl(value: unknown) {
  const raw = normalizeEnvValue(value).replace(/\/+$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function labelWorkspaceRole(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  if (normalized === "owner") return "Owner";
  if (normalized === "admin") return "Admin";
  if (normalized === "operator") return "Operator";
  if (normalized === "viewer") return "Viewer";
  return normalized.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function canManageWorkspaceInvites(role: string | null | undefined) {
  return ["owner", "admin"].includes(normalizeRole(role));
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

export function buildWorkspaceInviteReadiness(input: {
  available: boolean;
  ownerCount: number;
  currentUserRole?: string | null;
  hasCustomRoles?: boolean;
}): WorkspaceInviteReadiness {
  const actorRole = normalizeRole(input.currentUserRole);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.available) blockers.push("Attach the signed-in account to a workspace before enabling invitations.");
  if (input.ownerCount < 1) blockers.push("Assign at least one workspace owner before inviting collaborators.");
  if (!canManageWorkspaceInvites(actorRole)) blockers.push("Only owners and admins can invite workspace collaborators.");
  if (input.hasCustomRoles) warnings.push("Review custom role capabilities before inviting additional users.");

  if (blockers.length) {
    return {
      status: "blocked",
      statusLabel: "Blocked",
      canInvite: false,
      actorRoleLabel: labelWorkspaceRole(actorRole),
      nextAction: blockers[0],
      blockers,
      warnings
    };
  }

  if (warnings.length) {
    return {
      status: "review",
      statusLabel: "Needs review",
      canInvite: false,
      actorRoleLabel: labelWorkspaceRole(actorRole),
      nextAction: warnings[0],
      blockers,
      warnings
    };
  }

  return {
    status: "ready",
    statusLabel: "Ready",
    canInvite: true,
    actorRoleLabel: labelWorkspaceRole(actorRole),
    nextAction: "Invite controls can be enabled after the write path and email audit trail are added.",
    blockers,
    warnings
  };
}

export function buildWorkspaceInviteDraft(input: {
  readiness: WorkspaceInviteReadiness;
  email?: string | null;
  role?: string | null;
  workspaceName?: string | null;
  existingMemberEmails?: string[];
  existingPendingInviteEmails?: string[];
}): WorkspaceInviteDraft {
  const email = normalizeInviteEmail(input.email);
  const role = normalizeRole(input.role);
  const rolePolicy = workspaceRolePolicy(role);
  const workspaceName = String(input.workspaceName ?? "workspace").trim() || "workspace";
  const existingEmails = new Set((input.existingMemberEmails ?? []).map(normalizeInviteEmail));
  const pendingInviteEmails = new Set((input.existingPendingInviteEmails ?? []).map(normalizeInviteEmail));
  const blockers = [...input.readiness.blockers];
  const warnings = [...input.readiness.warnings];

  if (!email) blockers.push("Enter an email address before previewing an invitation.");
  if (email && !isValidInviteEmail(email)) blockers.push("Enter a valid collaborator email address.");
  if (email && existingEmails.has(email)) blockers.push("This email already has workspace membership.");
  if (email && pendingInviteEmails.has(email)) blockers.push("This email already has a pending workspace invitation.");
  if (rolePolicy.accessLevel === "custom") warnings.push("Custom role invitations require capability review before creation.");

  if (blockers.length) {
    return {
      status: email && !isValidInviteEmail(email) ? "invalid" : "blocked",
      statusLabel: email && !isValidInviteEmail(email) ? "Invalid" : "Blocked",
      canCreate: false,
      email,
      role,
      roleLabel: rolePolicy.roleLabel,
      subject: `Invitation to ${workspaceName}`,
      auditSummary: "No invite draft can be created until blockers are resolved.",
      nextAction: blockers[0],
      blockers,
      warnings
    };
  }

  if (warnings.length) {
    return {
      status: "review",
      statusLabel: "Needs review",
      canCreate: false,
      email,
      role,
      roleLabel: rolePolicy.roleLabel,
      subject: `Invitation to ${workspaceName}`,
      auditSummary: `Draft invite for ${email} as ${rolePolicy.roleLabel}; held for review before send.`,
      nextAction: warnings[0],
      blockers,
      warnings
    };
  }

  return {
    status: "ready",
    statusLabel: "Ready",
    canCreate: true,
    email,
    role,
    roleLabel: rolePolicy.roleLabel,
    subject: `Invitation to ${workspaceName}`,
    auditSummary: `Draft invite for ${email} as ${rolePolicy.roleLabel}; no email sent and no membership created.`,
    nextAction: "Add the invite persistence, email send, expiry, and audit trail before enabling creation.",
    blockers,
    warnings
  };
}

export function buildWorkspacePendingInviteSummaries(input: {
  invites: WorkspacePendingInviteInput[];
  canManageInvites?: boolean;
  mailerReady?: boolean;
  now?: Date;
}): WorkspacePendingInviteSummary[] {
  const now = input.now ?? new Date();
  return input.invites
    .map((invite) => {
      const expiresAt = invite.expiresAt instanceof Date ? invite.expiresAt : new Date(invite.expiresAt);
      const role = normalizeRole(invite.role);
      const status = String(invite.status || "pending").toLowerCase();
      const inviterName = invite.invitedByAccountUser?.name?.trim();
      const inviterEmail = invite.invitedByAccountUser?.email;
      const isExpired = !Number.isNaN(expiresAt.getTime()) && expiresAt <= now;
      const previewHref = readPreviewHrefFromPayload(invite.draftPayload) ?? `/workspace/invite/${invite.id}`;
      const lastSentAt = readLastSentAtFromPayload(invite.draftPayload);
      return {
        id: invite.id,
        email: normalizeInviteEmail(invite.email),
        role,
        roleLabel: labelWorkspaceRole(role),
        status,
        statusLabel: labelWorkspaceRole(status),
        previewHref,
        invitedByLabel: inviterName || inviterEmail || "Unknown",
        expiresAtLabel: formatDateLabel(expiresAt),
        createdAtLabel: formatDateLabel(invite.createdAt),
        lastSentAtLabel: lastSentAt ? formatDateLabel(lastSentAt) : null,
        isExpired,
        sendReadiness: buildWorkspaceInviteSendReadiness({
          inviteStatus: status,
          isExpired,
          previewHref,
          canManageInvites: Boolean(input.canManageInvites),
          mailerReady: Boolean(input.mailerReady)
        })
      };
    })
    .sort((left, right) => {
      if (left.isExpired !== right.isExpired) return left.isExpired ? 1 : -1;
      return left.email.localeCompare(right.email);
    });
}

export function buildWorkspaceInviteSendReadiness(input: {
  inviteStatus: string;
  isExpired?: boolean;
  previewHref?: string | null;
  canManageInvites?: boolean;
  mailerReady?: boolean;
}): WorkspaceInviteSendReadiness {
  const blockers: string[] = [];
  const inviteStatus = String(input.inviteStatus || "pending").toLowerCase();

  if (inviteStatus !== "pending") blockers.push("Only pending invitations can be sent.");
  if (input.isExpired) blockers.push("Expired invitations must be recreated before sending.");
  if (!input.previewHref?.startsWith("/workspace/invite/")) blockers.push("Create an opaque invite preview link before sending.");
  if (!input.canManageInvites) blockers.push("Only owners and admins can send workspace invitations.");
  if (!input.mailerReady) blockers.push("Configure workspace invitation email delivery before sending.");

  if (blockers.length) {
    return {
      status: "blocked",
      statusLabel: "Blocked",
      canSend: false,
      nextAction: blockers[0],
      blockers
    };
  }

  return {
    status: "ready",
    statusLabel: "Ready",
    canSend: true,
    nextAction: "Send can be enabled after delivery persistence and email provider wiring are added.",
    blockers
  };
}

export function buildWorkspaceInviteMailDeliveryConfig(env: Record<string, string | undefined> = process.env): WorkspaceInviteMailDeliveryConfig {
  const resendApiKey = normalizeEnvValue(env.RESEND_API_KEY);
  const fromEmail = normalizeEnvValue(env.WORKSPACE_INVITE_FROM_EMAIL) || normalizeEnvValue(env.CONTACT_FROM_EMAIL);
  const publicAppUrl = normalizePublicAppUrl(env.NEXT_PUBLIC_SITE_URL || env.APP_BASE_URL || env.VERCEL_URL);
  const blockers: string[] = [];

  if (!resendApiKey) blockers.push("Add RESEND_API_KEY before sending workspace invitations.");
  if (!fromEmail) blockers.push("Add WORKSPACE_INVITE_FROM_EMAIL or CONTACT_FROM_EMAIL before sending workspace invitations.");
  if (!publicAppUrl) blockers.push("Add NEXT_PUBLIC_SITE_URL before sending workspace invitation links.");

  if (blockers.length) {
    return {
      status: "blocked",
      statusLabel: "Blocked",
      providerLabel: "Resend",
      fromEmail: fromEmail || "Not configured",
      publicAppUrl: publicAppUrl || "Not configured",
      nextAction: blockers[0],
      blockers
    };
  }

  return {
    status: "ready",
    statusLabel: "Ready",
    providerLabel: "Resend",
    fromEmail,
    publicAppUrl,
    nextAction: "Delivery configuration is ready; add send persistence and provider dispatch before enabling invitation email sends.",
    blockers
  };
}

export function buildWorkspaceInviteAcceptancePreview(
  invite: WorkspaceInviteAcceptancePreviewInput,
  now = new Date()
): WorkspaceInviteAcceptancePreview {
  if (!invite) {
    return {
      available: false,
      status: "missing",
      statusLabel: "Not found",
      canAccept: false,
      email: "",
      roleLabel: "Unknown",
      workspaceName: "Unknown workspace",
      invitedByLabel: "Unknown",
      createdAtLabel: "Unknown",
      expiresAtLabel: "Unknown",
      nextAction: "Ask a workspace owner or admin to create a new invitation."
    };
  }

  const expiresAt = invite.expiresAt instanceof Date ? invite.expiresAt : new Date(invite.expiresAt);
  const rawStatus = String(invite.status || "pending").toLowerCase();
  const isExpired = !Number.isNaN(expiresAt.getTime()) && expiresAt <= now;
  const status = rawStatus === "accepted"
    ? "accepted"
    : rawStatus === "canceled"
      ? "canceled"
      : isExpired
        ? "expired"
        : "ready";
  const inviterName = invite.invitedByAccountUser?.name?.trim();
  const inviterEmail = invite.invitedByAccountUser?.email;
  const nextAction = status === "ready"
    ? "Acceptance is not enabled yet. Sign in or register with this email after the membership acceptance flow is added."
    : status === "expired"
      ? "Ask a workspace owner or admin to issue a fresh invitation."
      : status === "canceled"
        ? "Ask a workspace owner or admin to restore access by creating a new invitation."
        : status === "accepted"
          ? "Sign in with the accepted account to access the workspace."
          : "Ask a workspace owner or admin to create a new invitation.";

  return {
    available: true,
    status,
    statusLabel: labelWorkspaceRole(status),
    canAccept: status === "ready",
    email: normalizeInviteEmail(invite.email),
    roleLabel: labelWorkspaceRole(invite.role),
    workspaceName: invite.workspace?.name ?? "Workspace",
    invitedByLabel: inviterName || inviterEmail || "Unknown",
    createdAtLabel: formatDateLabel(invite.createdAt),
    expiresAtLabel: formatDateLabel(expiresAt),
    nextAction
  };
}

export function buildWorkspaceMembershipSummary(input: {
  memberships: WorkspaceMembershipSummaryInput[];
  pendingInvites?: WorkspacePendingInviteInput[];
  currentUserId?: string | null;
  inviteMailDelivery?: WorkspaceInviteMailDeliveryConfig;
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
  const currentUserCanManageInvites = canManageWorkspaceInvites(currentUser?.role);
  const inviteMailDelivery = input.inviteMailDelivery ?? buildWorkspaceInviteMailDeliveryConfig({});
  const rolePolicies = workspaceRolePoliciesForRoster(members.length ? members.map((member) => member.role) : ["owner", "admin", "operator", "viewer"]);
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
    currentUserCanManageInvites,
    governanceLabel,
    inviteMailDelivery,
    inviteReadiness: buildWorkspaceInviteReadiness({
      available: Boolean(firstMembership),
      ownerCount,
      currentUserRole: currentUser?.role,
      hasCustomRoles: rolePolicies.some((policy) => policy.accessLevel === "custom")
    }),
    rolePolicies,
    pendingInvites: buildWorkspacePendingInviteSummaries({
      invites: input.pendingInvites ?? [],
      canManageInvites: currentUserCanManageInvites,
      mailerReady: inviteMailDelivery.status === "ready"
    }),
    members
  };
}
