import React from "react";
import { DemoAppShell } from "@/components/demo-shell/DemoAppShell";
import type { StatusBand } from "@/components/demo-shell/StatusDot";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

async function loadGlobalStatus(): Promise<{ band: StatusBand; detail?: string } | undefined> {
  try {
    const counts = await db.acquisitionCampaign.groupBy({
      by: ["state"],
      _count: { state: true }
    });
    const stateCounts = Object.fromEntries(
      counts.map((row) => [row.state as string, row._count.state])
    );
    const paused = stateCounts.PAUSED ?? 0;
    const testing = stateCounts.TESTING ?? 0;
    const scaling = stateCounts.SCALING ?? 0;

    if (paused > 0) {
      return { band: "unhealthy", detail: `${paused} paused` };
    }
    if (testing > 0) {
      return { band: "watch", detail: `${testing} testing` };
    }
    if (scaling > 0) {
      return { band: "healthy", detail: `${scaling} scaling` };
    }
    return { band: "neutral", detail: "No active runs" };
  } catch (error) {
    if (isMissingDemoTableError(error)) return undefined;
    return undefined;
  }
}

export default async function AcquisitionLayout({ children }: { children: React.ReactNode }) {
  const globalStatus = await loadGlobalStatus();
  return (
    <DemoAppShell app="acquisition" globalStatus={globalStatus}>
      {children}
    </DemoAppShell>
  );
}
