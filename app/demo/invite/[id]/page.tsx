import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, getAccountSessionUser, normalizeAccountEmail } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildMetadata } from "@/lib/seo";
import { isPlausibleWorkspaceInviteToken, workspaceInviteTokenHash } from "@/lib/workspace-invite-tokens";
import {
  buildWorkspaceInviteAcceptanceActionReadiness,
  buildWorkspaceInviteAcceptancePreview
} from "@/lib/workspace-membership-summary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Workspace Invite | David Wolfe",
  description: "Preview workspace invitation state before acceptance is enabled.",
  path: "/workspace/invite"
});

type InviteSearchParams = {
  accepted?: string;
  error?: string;
};

function asDraftPayloadRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function findInviteByReference(inviteRef: string) {
  return isPlausibleWorkspaceInviteToken(inviteRef)
    ? db.workspaceInvite.findUnique({
        where: { tokenHash: workspaceInviteTokenHash(inviteRef) },
        include: { workspace: true, invitedByAccountUser: true }
      })
    : db.workspaceInvite.findUnique({
        where: { id: inviteRef },
        include: { workspace: true, invitedByAccountUser: true }
      });
}

async function loadInvitePreview(inviteRef: string) {
  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    const invite = await findInviteByReference(inviteRef);
    const existingMembership = Boolean(invite && accountUser?.memberships.some((membership) => membership.workspaceId === invite.workspaceId));
    const preview = buildWorkspaceInviteAcceptancePreview(invite);
    return {
      compatibilityMode: false,
      preview,
      sessionEmail: accountUser?.email ?? null,
      actionReadiness: buildWorkspaceInviteAcceptanceActionReadiness({
        preview,
        sessionEmail: accountUser?.email,
        existingMembership
      })
    };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      const preview = buildWorkspaceInviteAcceptancePreview(null);
      return {
        compatibilityMode: true,
        preview,
        sessionEmail: null,
        actionReadiness: buildWorkspaceInviteAcceptanceActionReadiness({ preview })
      };
    }
    throw error;
  }
}

async function acceptWorkspaceInvite(formData: FormData) {
  "use server";

  const inviteRef = String(formData.get("inviteRef") ?? "");
  if (!isDemoMutationAllowed()) redirect(`/workspace/invite/${encodeURIComponent(inviteRef)}?error=mutations`);
  if (!inviteRef) redirect("/workspace/login");

  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    if (!accountUser) redirect(`/workspace/login?next=${encodeURIComponent(`/workspace/invite/${inviteRef}`)}`);

    const invite = await findInviteByReference(inviteRef);
    const preview = buildWorkspaceInviteAcceptancePreview(invite);
    const existingMembership = Boolean(invite && accountUser.memberships.some((membership) => membership.workspaceId === invite.workspaceId));
    const actionReadiness = buildWorkspaceInviteAcceptanceActionReadiness({
      preview,
      sessionEmail: accountUser.email,
      existingMembership
    });
    if (!invite || !actionReadiness.canAccept) redirect(`/workspace/invite/${encodeURIComponent(inviteRef)}?error=accept`);

    const acceptedAt = new Date().toISOString();
    await db.$transaction(async (tx) => {
      const update = await tx.workspaceInvite.updateMany({
        where: {
          id: invite.id,
          status: "pending",
          email: normalizeAccountEmail(accountUser.email),
          expiresAt: { gt: new Date() }
        },
        data: {
          status: "accepted",
          draftPayload: {
            ...asDraftPayloadRecord(invite.draftPayload),
            acceptance: {
              status: "accepted",
              acceptedAt,
              acceptedByAccountUserId: accountUser.id,
              acceptedByEmail: accountUser.email
            }
          }
        }
      });
      if (update.count < 1) throw new Error("invite_accept_failed");
      await tx.workspaceMembership.upsert({
        where: {
          workspaceId_accountUserId: {
            workspaceId: invite.workspaceId,
            accountUserId: accountUser.id
          }
        },
        update: {},
        create: {
          workspaceId: invite.workspaceId,
          accountUserId: accountUser.id,
          role: invite.role
        }
      });
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) {
      if (error instanceof Error && error.message === "invite_accept_failed") redirect(`/workspace/invite/${encodeURIComponent(inviteRef)}?error=accept`);
      throw error;
    }
    redirect(`/workspace/invite/${encodeURIComponent(inviteRef)}?error=accept`);
  }

  redirect(`/workspace/invite/${encodeURIComponent(inviteRef)}?accepted=1`);
}

export default async function WorkspaceInvitePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<InviteSearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { compatibilityMode, preview, actionReadiness, sessionEmail } = await loadInvitePreview(id);

  return (
    <>
      <Section eyebrow="Workspace invite" title="Invitation preview">
        <p>
          Review the invitation state before account acceptance, email delivery, and membership creation are enabled.
        </p>
      </Section>
      <Section title={preview.workspaceName}>
        {query?.accepted ? <p className="small bandText--healthy">Workspace invitation accepted.</p> : null}
        {query?.error === "accept" ? <p className="small bandText--unhealthy">This invitation cannot be accepted with the current account.</p> : null}
        {query?.error === "mutations" ? <p className="small bandText--unhealthy">Workspace invite acceptance is disabled in this environment.</p> : null}
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
            <div>
              <p className="small">Acceptance gate</p>
              <strong>{actionReadiness.statusLabel}</strong>
              <span>{actionReadiness.nextAction}</span>
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
              <div>
                <span className="small">Signed in</span>
                <strong>{sessionEmail || "Not signed in"}</strong>
              </div>
            </div>
            {actionReadiness.blockers.length ? (
              <div className="workspaceInviteAcceptBlockers">
                {actionReadiness.blockers.map((blocker) => (
                  <span key={blocker}>{blocker}</span>
                ))}
              </div>
            ) : null}
            <div className="workspaceAccountActions">
              {actionReadiness.canAccept ? (
                <form action={acceptWorkspaceInvite} className="workspaceInviteInlineForm">
                  <input name="inviteRef" type="hidden" value={id} />
                  <button className="btn primary smallBtn" type="submit">Accept invite</button>
                </form>
              ) : null}
              <Link className="btn smallBtn" href={`/workspace/login?next=${encodeURIComponent(`/workspace/invite/${id}`)}`}>Sign in</Link>
              <Link className="btn smallBtn" href={`/workspace/register?next=${encodeURIComponent(`/workspace/invite/${id}`)}`}>Register</Link>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
