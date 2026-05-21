import { cookies } from "next/headers";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { loadActiveDataSourceSummary } from "@/lib/active-data-source-summary";

export default async function RetentionLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  const activeDataSource = await loadActiveDataSourceSummary("retention", accountUserId);

  return <DemoAppShell app="retention" activeDataSource={activeDataSource}>{children}</DemoAppShell>;
}
