import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import {
  ACCOUNT_SESSION_COOKIE,
  AccountAuthError,
  createAccountSessionToken,
  getAccountSessionUser,
  isValidAccountEmail,
  normalizeAccountEmail,
  normalizeAccountName,
  normalizeAccountPassword,
  upsertAccountUserWithDefaultWorkspace
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

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not created";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

async function saveAccountProfile(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) redirect("/workspace/account?error=mutations");

  const email = normalizeAccountEmail(formData.get("email"));
  if (!isValidAccountEmail(email)) redirect("/workspace/account?error=email");
  const password = normalizeAccountPassword(formData.get("password"));

  let accountUser;
  try {
    const result = await upsertAccountUserWithDefaultWorkspace({
      email,
      password,
      name: normalizeAccountName(formData.get("name"), email)
    });
    accountUser = result.accountUser;
  } catch (error) {
    if (error instanceof AccountAuthError) redirect(`/workspace/account?error=${error.code}`);
    throw error;
  }
  const token = createAccountSessionToken({ userId: accountUser.id, email: accountUser.email });
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  redirect("/workspace/account?saved=profile");
}

async function leaveAccount() {
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
  const membership = accountUser?.memberships[0];

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
        {params?.error === "email" ? <p className="small bandText--unhealthy">Enter a valid email address.</p> : null}
        {params?.error === "PASSWORD_REQUIRED" ? <p className="small bandText--unhealthy">Enter a password for this account.</p> : null}
        {params?.error === "PASSWORD_TOO_SHORT" ? <p className="small bandText--unhealthy">Password must be at least 8 characters.</p> : null}
        {params?.error === "INVALID_PASSWORD" ? <p className="small bandText--unhealthy">The password does not match this account.</p> : null}
        {params?.error === "mutations" ? <p className="small bandText--unhealthy">Account editing is disabled in this environment.</p> : null}
        {compatibilityMode ? (
          <div className="card">
            <p>Account tables are not available yet. Run the latest Prisma migration to enable account ownership.</p>
          </div>
        ) : (
          <div className="workspaceAccountPanel">
            <div className="card workspaceAccountFormCard">
              <p className="small">Sign in or create account</p>
              <form action={saveAccountProfile} className="demoLoginForm">
                <label>
                  <span>Name</span>
                  <input name="name" type="text" defaultValue={accountUser?.name ?? ""} maxLength={80} placeholder="Workspace user" />
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" type="email" defaultValue={accountUser?.email ?? ""} required placeholder="you@example.com" />
                </label>
                <label>
                  <span>Password</span>
                  <input name="password" type="password" minLength={8} required autoComplete={accountUser ? "current-password" : "new-password"} placeholder="Minimum 8 characters" />
                </label>
                <button className="btn primary" type="submit">{accountUser ? "Update / sign in" : "Create account / sign in"}</button>
              </form>
            </div>
            <div className="workspaceAccountStateCard">
              <div>
                <p className="small">Current account</p>
                <strong>{accountUser?.email ?? "No account session"}</strong>
                <span>{accountUser ? "This browser has an active signed account session." : "Create an account or sign in to attach future datasets to a user."}</span>
              </div>
              {accountUser ? (
                <form action={leaveAccount}>
                  <button className="btn" type="submit">Clear account session</button>
                </form>
              ) : null}
            </div>
          </div>
        )}
      </Section>

      <Section title="Workspace membership">
        <div className="workspaceMembershipGrid">
          <div className="workspaceMembershipCard">
            <p className="small">Workspace</p>
            <strong>{membership?.workspace.name ?? "Default Workspace"}</strong>
          </div>
          <div className="workspaceMembershipCard">
            <p className="small">Role</p>
            <strong>{membership?.role ?? "Not assigned"}</strong>
          </div>
          <div className="workspaceMembershipCard">
            <p className="small">Joined</p>
            <strong>{formatDate(membership?.createdAt)}</strong>
          </div>
        </div>
      </Section>

      <Section title="Why this matters">
        <div className="workspaceAccountReasonGrid">
          <div>
            <h3>Dataset ownership</h3>
            <p>Imported datasets can be attached to the account and workspace that created them.</p>
          </div>
          <div>
            <h3>Saved selections</h3>
            <p>Each user can later choose which dataset a tool should run against without changing the demo defaults.</p>
          </div>
          <div>
            <h3>Connector scope</h3>
            <p>OAuth tokens and live datasource credentials need account and workspace boundaries before production use.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
