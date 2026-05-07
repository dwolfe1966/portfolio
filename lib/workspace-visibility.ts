export type WorkspaceVisibility = "personal" | "shared_sample" | "shared_workspace";

export type WorkspaceVisibilityLabel = {
  label: string;
  detail: string;
  statusClass: "live" | "progress";
};

export function resolveWorkspaceVisibility(
  ownerAccountUserId: string | null | undefined,
  currentAccountUserId: string | null | undefined
): WorkspaceVisibility {
  if (!ownerAccountUserId) return "shared_sample";
  if (currentAccountUserId && ownerAccountUserId === currentAccountUserId) return "personal";
  return "shared_workspace";
}

export function workspaceVisibilityLabel(
  ownerAccountUserId: string | null | undefined,
  currentAccountUserId: string | null | undefined
): WorkspaceVisibilityLabel {
  const visibility = resolveWorkspaceVisibility(ownerAccountUserId, currentAccountUserId);

  if (visibility === "personal") {
    return {
      label: "Personal",
      detail: "Owned by your account",
      statusClass: "live"
    };
  }

  if (visibility === "shared_workspace") {
    return {
      label: "Team/shared",
      detail: "Visible through shared workspace access",
      statusClass: "progress"
    };
  }

  return {
    label: "Shared sample",
    detail: "Available without an account",
    statusClass: "progress"
  };
}
