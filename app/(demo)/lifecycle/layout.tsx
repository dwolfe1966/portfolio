import React from "react";
import { cookies } from "next/headers";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";
import { LifecycleFirstRunIntro } from "@/components/demo/LifecycleFirstRunIntro";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { loadActiveDataSourceSummary } from "@/lib/active-data-source-summary";

export default async function LifecycleLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  const activeDataSource = await loadActiveDataSourceSummary("lifecycle", accountUserId);

  return (
    <DemoAppShell app="lifecycle" activeDataSource={activeDataSource}>
      <LifecycleFirstRunIntro />
      {children}
    </DemoAppShell>
  );
}
