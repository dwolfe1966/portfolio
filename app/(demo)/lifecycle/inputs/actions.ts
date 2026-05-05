"use server";

import { DeltaChangeType, SubscriptionStatus, UserSegment } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { recordImportedDataSourceSelection } from "@/lib/app-data-source-selection";
import { db } from "@/lib/db";
import { isDemoMutationAllowed } from "@/lib/env-guard";

type CsvRow = Record<string, unknown>;

type LifecycleSnapshotRows = {
  users: CsvRow[];
  entities: CsvRow[];
  interestEdges: CsvRow[];
  changeEvents: CsvRow[];
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase();
}

function isLifecycleSnapshotRows(value: unknown): value is LifecycleSnapshotRows {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.users)
    && Array.isArray(record.entities)
    && Array.isArray(record.interestEdges)
    && Array.isArray(record.changeEvents);
}

export async function applyLifecycleDatasetSnapshotAction(formData: FormData) {
  if (!isDemoMutationAllowed()) redirect("/lifecycle/inputs?datasetError=mutations-disabled");

  const datasetId = clean(formData.get("datasetId"), 120);
  if (!datasetId) redirect("/lifecycle/inputs?datasetError=missing-dataset");

  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const dataset = await db.workspaceDataset.findFirst({
    where: {
      id: datasetId,
      app: "lifecycle",
      OR: session
        ? [{ accountUserId: session.userId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    }
  });

  if (!dataset || !isLifecycleSnapshotRows(dataset.rowData)) {
    redirect("/lifecycle/inputs?datasetError=dataset-not-found");
  }

  const rows = dataset.rowData;
  await db.$transaction(async (tx) => {
    await tx.generatedMessage.deleteMany();
    await tx.campaignCandidate.deleteMany();
    await tx.campaignRun.deleteMany();
    await tx.interestEdge.deleteMany();
    await tx.entityDelta.deleteMany();
    await tx.user.deleteMany();
    await tx.entity.deleteMany();

    const userByEmail = new Map<string, string>();
    const entityByName = new Map<string, string>();

    for (const row of rows.users) {
      const email = normalizeEmail(row.email);
      if (!email) continue;
      const user = await tx.user.create({
        data: {
          fullName: clean(row.fullName, 120) || email,
          email,
          segment: clean(row.segment) as UserSegment,
          subscriptionStatus: clean(row.subscriptionStatus) as SubscriptionStatus,
          lastActiveAt: clean(row.lastActiveAt) ? new Date(clean(row.lastActiveAt)) : null
        }
      });
      userByEmail.set(email, user.id);
    }

    for (const row of rows.entities) {
      const name = clean(row.name, 120);
      if (!name) continue;
      const entity = await tx.entity.create({
        data: {
          name,
          entityType: clean(row.entityType, 60) || "account",
          city: clean(row.city, 80) || null,
          state: clean(row.state, 30) || null
        }
      });
      entityByName.set(name.toLowerCase(), entity.id);
    }

    for (const row of rows.interestEdges) {
      const userId = userByEmail.get(normalizeEmail(row.userEmail));
      const entityId = entityByName.get(clean(row.entityName, 120).toLowerCase());
      const interestScore = Number(row.interestScore);
      if (!userId || !entityId || !Number.isFinite(interestScore)) continue;
      await tx.interestEdge.create({
        data: {
          userId,
          entityId,
          source: clean(row.source, 80) || "dataset",
          interestScore
        }
      });
    }

    for (const row of rows.changeEvents) {
      const entityId = entityByName.get(clean(row.entityName, 120).toLowerCase());
      const detectedAt = new Date(clean(row.detectedAt));
      if (!entityId || Number.isNaN(detectedAt.getTime())) continue;
      await tx.entityDelta.create({
        data: {
          entityId,
          changeType: clean(row.changeType) as DeltaChangeType,
          oldValue: clean(row.oldValue, 180) || null,
          newValue: clean(row.newValue, 180) || null,
          deltaSummary: clean(row.deltaSummary, 240) || "Imported lifecycle event",
          detectedAt
        }
      });
    }
  });

  await recordImportedDataSourceSelection("lifecycle", dataset, session?.userId);

  revalidatePath("/lifecycle/inputs");
  revalidatePath("/lifecycle/overview");
  revalidatePath("/lifecycle/simulations");
  revalidatePath("/lifecycle/outputs");
  redirect(`/lifecycle/inputs?datasetApplied=${encodeURIComponent(dataset.id)}`);
}
