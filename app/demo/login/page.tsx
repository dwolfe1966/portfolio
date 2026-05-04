import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_ACCESS_COOKIE, getDemoAccessToken, isDemoAccessConfigured } from "@/lib/demo-access";
import { Section } from "@/components/site/Section";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Tools Access | David Wolfe",
  description: "Access page for the Tools workspace.",
  path: "/demo/login"
});

type SearchParams = { error?: string; next?: string };

function sanitizeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/demo/dashboard";
  return value;
}

async function enterDemo(formData: FormData) {
  "use server";

  const next = sanitizeNext(String(formData.get("next") ?? ""));
  const password = String(formData.get("password") ?? "");
  const expectedPassword = process.env.DEMO_PASSWORD?.trim();

  if (!expectedPassword) redirect(next);

  if (password !== expectedPassword) {
    redirect(`/demo/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const token = await getDemoAccessToken();
  if (!token) redirect(next);

  const cookieStore = await cookies();
  cookieStore.set(DEMO_ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
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
  const protectedMode = isDemoAccessConfigured();

  return (
    <>
      <Section eyebrow="Tools" title="Workspace access">
        <p>
          {protectedMode
            ? "Enter the shared Tools password to open the workspace."
            : "Tools access is open in this environment. Set DEMO_PASSWORD to enable the shared-password gate."}
        </p>
      </Section>

      <Section title={protectedMode ? "Sign in" : "Access status"}>
        <div className="card demoLoginCard">
          {protectedMode ? (
            <form action={enterDemo} className="demoLoginForm">
              <input type="hidden" name="next" value={next} />
              <label>
                <span>Password</span>
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              {params.error ? <p className="small bandText--unhealthy">Password did not match.</p> : null}
              <button className="btn primary" type="submit">Enter workspace</button>
            </form>
          ) : (
            <form action={enterDemo}>
              <input type="hidden" name="next" value={next} />
              <button className="btn primary" type="submit">Open workspace</button>
            </form>
          )}
        </div>
      </Section>
    </>
  );
}
