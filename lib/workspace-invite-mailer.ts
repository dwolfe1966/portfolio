import type { WorkspaceInviteMailDeliveryConfig } from "@/lib/workspace-membership-summary";

export type WorkspaceInviteEmailPayload = {
  to: string;
  workspaceName: string;
  roleLabel: string;
  invitedByLabel: string;
  inviteUrl: string;
  expiresAtLabel: string;
};

export function workspaceInviteEmailSubject(input: Pick<WorkspaceInviteEmailPayload, "workspaceName">) {
  return `Invitation to ${input.workspaceName}`;
}

export function workspaceInviteEmailText(input: WorkspaceInviteEmailPayload) {
  return [
    `You have been invited to ${input.workspaceName}.`,
    "",
    `Role: ${input.roleLabel}`,
    `Invited by: ${input.invitedByLabel}`,
    `Expires: ${input.expiresAtLabel}`,
    "",
    "Review your invitation:",
    input.inviteUrl,
    "",
    "If you were not expecting this invitation, you can ignore this email."
  ].join("\n");
}

export async function deliverWorkspaceInviteEmail(input: {
  config: WorkspaceInviteMailDeliveryConfig;
  apiKey?: string;
  payload: WorkspaceInviteEmailPayload;
}) {
  const apiKey = input.apiKey?.trim();
  if (!apiKey || input.config.status !== "ready") return { ok: false, status: null };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: input.config.fromEmail,
      to: input.payload.to,
      subject: workspaceInviteEmailSubject(input.payload),
      text: workspaceInviteEmailText(input.payload)
    })
  }).catch(() => null);

  return { ok: Boolean(response?.ok), status: response?.status ?? null };
}
