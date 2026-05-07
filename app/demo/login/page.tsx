import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  ACCOUNT_SESSION_COOKIE,
  AccountAuthError,
  authenticateAccountUserWithDefaultWorkspace,
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
  title: "Workspace Login | David Wolfe",
  description: "Sign in to the Tools workspace.",
  path: "/workspace/login"
});

type SearchParams = { error?: string; mode?: string; next?: string; registered?: string };

function sanitizeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/workspace/dashboard";
  if (value.startsWith("/workspace/login") || value.startsWith("/workspace/register")) return "/workspace/dashboard";
  return value;
}

function errorMessage(code: string | undefined) {
  if (code === "email") return "Enter a valid email address.";
  if (code === "ACCOUNT_NOT_FOUND") return "No account exists for that email.";
  if (code === "ACCOUNT_EXISTS") return "An account already exists for that email. Sign in instead.";
  if (code === "INVALID_PASSWORD") return "The password does not match this account.";
  if (code === "PASSWORD_REQUIRED") return "Enter your password.";
  if (code === "PASSWORD_TOO_SHORT") return "Password must be at least 8 characters.";
  if (code === "mutations") return "Account login is disabled in this environment.";
  return null;
}

function authHref(mode: "signin" | "signup", next: string) {
  return `/workspace/login?mode=${mode}&next=${encodeURIComponent(next)}`;
}

async function loginAccount(formData: FormData) {
  "use server";

  const next = sanitizeNext(String(formData.get("next") ?? ""));
  const email = normalizeAccountEmail(formData.get("email"));
  if (!isValidAccountEmail(email)) redirect(`/workspace/login?error=email&next=${encodeURIComponent(next)}`);

  let accountUser;
  try {
    const result = await authenticateAccountUserWithDefaultWorkspace({
      email,
      password: normalizeAccountPassword(formData.get("password"))
    });
    accountUser = result.accountUser;
  } catch (error) {
    if (error instanceof AccountAuthError) {
      redirect(`/workspace/login?error=${error.code}&next=${encodeURIComponent(next)}`);
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

async function registerAccount(formData: FormData) {
  "use server";

  const next = sanitizeNext(String(formData.get("next") ?? ""));
  const email = normalizeAccountEmail(formData.get("email"));
  if (!isValidAccountEmail(email)) redirect(`/workspace/login?mode=signup&error=email&next=${encodeURIComponent(next)}`);

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
      redirect(`/workspace/login?mode=signup&error=${error.code}&next=${encodeURIComponent(next)}`);
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

export default async function DemoLoginPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = sanitizeNext(params.next);
  const error = errorMessage(params.error);
  const mode = params.mode === "signup" ? "signup" : "signin";

  return (
    <>
      <Section eyebrow="Workspace" title={mode === "signup" ? "Create account" : "Sign in"}>
        <p>
          Sign in or create an account to manage workspace datasets, source connections, saved selections, and account-scoped activity.
        </p>
      </Section>

      <Section title="Workspace access">
        <div className="card workspaceAuthUnifiedCard">
          <div className="workspaceAuthToggle" aria-label="Workspace access mode">
            <Link className={mode === "signin" ? "active" : undefined} href={authHref("signin", next)}>Sign in</Link>
            <Link className={mode === "signup" ? "active" : undefined} href={authHref("signup", next)}>Create account</Link>
          </div>
          {mode === "signin" ? (
            <form action={loginAccount} className="demoLoginForm">
              <input type="hidden" name="next" value={next} />
              <label>
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                <span>Password</span>
                <input name="password" type="password" autoComplete="current-password" minLength={8} required />
              </label>
              {params.registered ? <p className="small bandText--healthy">Account created. Sign in to continue.</p> : null}
              {error ? <p className="small bandText--unhealthy">{error}</p> : null}
              <button className="btn primary" type="submit">Sign in</button>
            </form>
          ) : (
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
          )}
        </div>
      </Section>
    </>
  );
}
