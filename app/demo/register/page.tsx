import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  ACCOUNT_SESSION_COOKIE,
  AccountAuthError,
  createAccountSessionToken,
  isValidAccountEmail,
  normalizeAccountEmail,
  normalizeAccountName,
  normalizeAccountPassword,
  registerAccountUserWithDefaultWorkspace
} from "@/lib/account-session";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Workspace Registration | David Wolfe",
  description: "Create an account for the Tools workspace.",
  path: "/workspace/register"
});

type SearchParams = { error?: string; next?: string };

function sanitizeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/workspace/dashboard";
  if (value.startsWith("/workspace/login") || value.startsWith("/workspace/register")) return "/workspace/dashboard";
  return value;
}

function errorMessage(code: string | undefined) {
  if (code === "email") return "Enter a valid email address.";
  if (code === "ACCOUNT_EXISTS") return "An account already exists for that email. Sign in instead.";
  if (code === "PASSWORD_REQUIRED") return "Create a password for this account.";
  if (code === "PASSWORD_TOO_SHORT") return "Password must be at least 8 characters.";
  if (code === "mutations") return "Account registration is disabled in this environment.";
  return null;
}

async function registerAccount(formData: FormData) {
  "use server";

  const next = sanitizeNext(String(formData.get("next") ?? ""));
  const email = normalizeAccountEmail(formData.get("email"));
  if (!isValidAccountEmail(email)) redirect(`/workspace/register?error=email&next=${encodeURIComponent(next)}`);

  let accountUser;
  try {
    const result = await registerAccountUserWithDefaultWorkspace({
      email,
      name: normalizeAccountName(formData.get("name"), email),
      zipCode: String(formData.get("zipCode") ?? ""),
      company: String(formData.get("company") ?? ""),
      title: String(formData.get("title") ?? ""),
      password: normalizeAccountPassword(formData.get("password"))
    });
    accountUser = result.accountUser;
  } catch (error) {
    if (error instanceof AccountAuthError) {
      redirect(`/workspace/register?error=${error.code}&next=${encodeURIComponent(next)}`);
    }
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

  redirect(next);
}

export default async function WorkspaceRegisterPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = sanitizeNext(params.next);
  const error = errorMessage(params.error);

  return (
    <>
      <Section eyebrow="Workspace" title="Create account">
        <p>
          Create an account to own imported datasets, saved source mappings, selected tool data, and workspace activity.
        </p>
      </Section>

      <Section title="Workspace registration">
        <div className="workspaceAuthPanel">
          <div className="card demoLoginCard">
            <form action={registerAccount} className="demoLoginForm">
              <input type="hidden" name="next" value={next} />
              <label>
                <span>Name</span>
                <input name="name" type="text" autoComplete="name" maxLength={80} placeholder="Workspace user" />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                <span>Zipcode</span>
                <input name="zipCode" type="text" inputMode="numeric" autoComplete="postal-code" maxLength={20} />
              </label>
              <label>
                <span>Company</span>
                <input name="company" type="text" autoComplete="organization" maxLength={120} />
              </label>
              <label>
                <span>Title</span>
                <input name="title" type="text" autoComplete="organization-title" maxLength={120} />
              </label>
              <label>
                <span>Password</span>
                <input name="password" type="password" autoComplete="new-password" minLength={8} required />
              </label>
              {error ? <p className="small bandText--unhealthy">{error}</p> : null}
              <button className="btn primary" type="submit">Create account</button>
            </form>
          </div>
          <div className="workspaceAuthAside">
            <p className="small">Already registered</p>
            <strong>Sign in to your workspace.</strong>
            <span>Existing accounts keep their saved workspace membership and future dataset ownership.</span>
            <Link className="btn" href={`/workspace/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
          </div>
        </div>
      </Section>
    </>
  );
}
