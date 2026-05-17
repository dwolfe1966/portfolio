import { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildMetadata } from "@/lib/seo";
import { buildWorkspaceInviteAcceptancePreview } from "@/lib/workspace-membership-summary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Workspace Invite | David Wolfe",
  description: "Preview workspace invitation state before acceptance is enabled.",
  path: "/workspace/invite"
});

async function loadInvitePreview(inviteId: string) {
  try {
    const invite = await db.workspaceInvite.findUnique({
      where: { id: inviteId },
      include: { workspace: true, invitedByAccountUser: true }
    });
    return {
      compatibilityMode: false,
      preview: buildWorkspaceInviteAcceptancePreview(invite)
    };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return {
        compatibilityMode: true,
        preview: buildWorkspaceInviteAcceptancePreview(null)
      };
    }
    throw error;
  }
}

export default async function WorkspaceInvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { compatibilityMode, preview } = await loadInvitePreview(id);

  return (
    <>
      <Section eyebrow="Workspace invite" title="Invitation preview">
        <p>
          Review the invitation state before account acceptance, email delivery, and membership creation are enabled.
        </p>
      </Section>
      <Section title={preview.workspaceName}>
        {compatibilityMode ? (
          <div className="card">
            <p>Workspace invite tables are not available yet. Run the latest Prisma migration to enable invite previews.</p>
          </div>
        ) : (
          <div className={`workspaceInviteAcceptPreview workspaceInviteAcceptPreview--${preview.status}`}>
            <div>
              <p className="small">Invite status</p>
              <strong>{preview.statusLabel}</strong>
              <span>{preview.nextAction}</span>
            </div>
            <div className="workspaceInviteAcceptFacts">
              <div>
                <span className="small">Recipient</span>
                <strong>{preview.email || "Unknown"}</strong>
              </div>
              <div>
                <span className="small">Role</span>
                <strong>{preview.roleLabel}</strong>
              </div>
              <div>
                <span className="small">Invited by</span>
                <strong>{preview.invitedByLabel}</strong>
              </div>
              <div>
                <span className="small">Created</span>
                <strong>{preview.createdAtLabel}</strong>
              </div>
              <div>
                <span className="small">Expires</span>
                <strong>{preview.expiresAtLabel}</strong>
              </div>
            </div>
            <div className="workspaceAccountActions">
              <Link className="btn smallBtn" href="/workspace/login">Sign in</Link>
              <Link className="btn smallBtn" href="/workspace/register">Register</Link>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
