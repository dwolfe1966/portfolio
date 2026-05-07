import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import {
  ACCOUNT_SESSION_COOKIE,
  getAccountSessionUser,
  updateAccountUserProfile
} from "@/lib/account-session";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Workspace Account | David Wolfe",
  description: "Account profile and workspace membership for Tools.",
  path: "/workspace/account"
});

type AccountSearchParams = {
  saved?: string;
  error?: string;
};

async function saveSignedInAccountProfile(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) redirect("/workspace/account?error=mutations");

  const cookieStore = await cookies();
  const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  if (!accountUser) redirect("/workspace/account?error=session");
  await updateAccountUserProfile({
    userId: accountUser.id,
    name: String(formData.get("name") ?? ""),
    zipCode: String(formData.get("zipCode") ?? ""),
    company: String(formData.get("company") ?? ""),
    title: String(formData.get("title") ?? "")
  });
  redirect("/workspace/account?saved=profile");
}

async function loadAccountPage() {
  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    return { accountUser, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) return { accountUser: null, compatibilityMode: true };
    throw error;
  }
}

export default async function WorkspaceAccountPage({
  searchParams
}: {
  searchParams?: Promise<AccountSearchParams>;
}) {
  const params = await searchParams;
  const { accountUser, compatibilityMode } = await loadAccountPage();
  if (!compatibilityMode && !accountUser) redirect("/workspace/login?next=/workspace/account");
  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Account" title="Workspace account">
        <p>
          Manage the profile attached to your workspace data, source configs, selected datasets, and future connector credentials.
        </p>
      </Section>

      <Section title="Profile">
        {params?.saved === "profile" ? <p className="small bandText--healthy">Account profile saved.</p> : null}
        {params?.error === "session" ? <p className="small bandText--unhealthy">Sign in before editing your account.</p> : null}
        {params?.error === "mutations" ? <p className="small bandText--unhealthy">Account editing is disabled in this environment.</p> : null}
        {compatibilityMode ? (
          <div className="card">
            <p>Account tables are not available yet. Run the latest Prisma migration to enable account ownership.</p>
          </div>
        ) : accountUser ? (
          <div className="workspaceAccountPanel workspaceAccountPanel--profileOnly">
            <div className="workspaceAccountStateCard workspaceAccountStateCard--profile">
              <div>
                <p className="small">Signed in</p>
                <strong>{accountUser.name}</strong>
                <span>{accountUser.email}</span>
              </div>
              <div className="workspaceAccountProfileFacts">
                <div>
                  <span className="small">Company</span>
                  <strong>{accountUser.company || "Not set"}</strong>
                </div>
                <div>
                  <span className="small">Title</span>
                  <strong>{accountUser.title || "Not set"}</strong>
                </div>
                <div>
                  <span className="small">Zipcode</span>
                  <strong>{accountUser.zipCode || "Not set"}</strong>
                </div>
                <div>
                  <span className="small">Workspace</span>
                  <strong>{accountUser.memberships[0]?.workspace.name ?? "Default Workspace"}</strong>
                </div>
                <div>
                  <span className="small">Role</span>
                  <strong>{accountUser.memberships[0]?.role ?? "Owner"}</strong>
                </div>
              </div>
              <div className="workspaceAccountActions">
                <a className="btn smallBtn" href="#edit-account">Edit</a>
              </div>
            </div>
            <div className="card workspaceAccountFormCard" id="edit-account">
              <p className="small">Edit profile</p>
              <form action={saveSignedInAccountProfile} className="demoLoginForm">
                <label>
                  <span>Name</span>
                  <input name="name" type="text" defaultValue={accountUser.name} maxLength={80} placeholder="Workspace user" />
                </label>
                <label>
                  <span>Company</span>
                  <input name="company" type="text" defaultValue={accountUser.company ?? ""} maxLength={120} placeholder="Company" />
                </label>
                <label>
                  <span>Title</span>
                  <input name="title" type="text" defaultValue={accountUser.title ?? ""} maxLength={120} placeholder="Title" />
                </label>
                <label>
                  <span>Zipcode</span>
                  <input name="zipCode" type="text" inputMode="numeric" defaultValue={accountUser.zipCode ?? ""} maxLength={20} placeholder="Zipcode" />
                </label>
                <button className="btn primary" type="submit">Save profile</button>
              </form>
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}
