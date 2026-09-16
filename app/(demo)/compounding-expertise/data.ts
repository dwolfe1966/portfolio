import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";

export type CompoundingAnalysisRecord = Awaited<ReturnType<typeof loadCompoundingAnalysis>>;

export async function currentAccountUserId() {
  const cookieStore = await cookies();
  return verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

export async function loadCompoundingAnalysis(accountUserId: string | null) {
  return db.compoundingExpertiseAnalysis.findFirst({
    where: accountUserId
      ? { OR: [{ accountUserId }, { accountUserId: null }] }
      : { accountUserId: null },
    include: {
      keyDebates: { orderBy: { createdAt: "asc" } },
      dimensionAssessments: { orderBy: [{ framework: "asc" }, { dimension: "asc" }] },
      simulationScenarios: { orderBy: { name: "asc" } },
      scorebookCases: { orderBy: [{ decisionAt: "desc" }, { createdAt: "desc" }] }
    },
    orderBy: { updatedAt: "desc" }
  });
}
