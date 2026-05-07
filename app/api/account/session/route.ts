import { cookies } from "next/headers";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { apiOk } from "@/lib/api-contract";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);

  return apiOk({
    authenticated: Boolean(session),
    account: session ? { email: session.email, userId: session.userId } : null
  });
}
