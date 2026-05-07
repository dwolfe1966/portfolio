import { Metadata } from "next";
import Link from "next/link";
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

async function signOutAccount() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete(ACCOUNT_SESSION_COOKIE);
  redirect("/workspace/account");
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
  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Account" title="Workspace account">
        <p>
          Accounts give imported datasets, source configs, presets, and future connector credentials a real owner.
          Demo tools still run without signing in.
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
        ) : !accountUser ? (
          <div className="workspaceAuthChoiceGrid">
            <div className="card workspaceAuthChoiceCard">
              <p className="editorKicker">New workspace</p>
              <h3>Create account</h3>
              <p>Own imported datasets, saved mappings, source connections, and future operational credentials.</p>
              <Link className="btn primary" href="/workspace/register?next=/workspace/account">Sign up</Link>
            </div>
            <div className="card workspaceAuthChoiceCard">
              <p className="editorKicker">Existing workspace</p>
              <h3>Sign in</h3>
              <p>Return to your account-scoped data sources, selected datasets, and workspace activity.</p>
              <Link className="btn" href="/workspace/login?next=/workspace/account">Sign in</Link>
            </div>
          </div>
        ) : (
          <div className="workspaceAccountPanel">
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
                <form action={signOutAccount}>
                  <button className="btn smallBtn" type="submit">Sign out</button>
                </form>
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
        )}
      </Section>
    </>
  );
}
