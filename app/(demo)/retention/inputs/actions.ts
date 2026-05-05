"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { recordImportedDataSourceSelection } from "@/lib/app-data-source-selection";
import { db } from "@/lib/db";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import {
  validateRetentionAccountInput,
  validateRetentionPlaybookInput,
  validateRetentionPolicyInput
} from "@/lib/retention-engine";

type RetentionSnapshotRows = {
  source?: unknown;
  normalized: {
    accounts: unknown[];
    playbooks: unknown[];
    policy: unknown[];
  };
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function isRetentionSnapshotRows(value: unknown): value is RetentionSnapshotRows {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const normalized = (value as Record<string, unknown>).normalized;
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return false;
  const record = normalized as Record<string, unknown>;
  return Array.isArray(record.accounts)
    && Array.isArray(record.playbooks)
    && Array.isArray(record.policy);
}

export async function applyRetentionDatasetSnapshotAction(formData: FormData) {
  if (!isDemoMutationAllowed()) redirect("/retention/inputs?datasetError=mutations-disabled");

  const datasetId = clean(formData.get("datasetId"), 120);
  if (!datasetId) redirect("/retention/inputs?datasetError=missing-dataset");

  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const dataset = await db.workspaceDataset.findFirst({
    where: {
      id: datasetId,
      app: "retention",
      OR: session
        ? [{ accountUserId: session.userId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    }
  });

  if (!dataset || !isRetentionSnapshotRows(dataset.rowData)) {
    redirect("/retention/inputs?datasetError=dataset-not-found");
  }

  const normalized = dataset.rowData.normalized;
  await db.$transaction(async (tx) => {
    await tx.retentionAuditLog.deleteMany();
    await tx.retentionIntervention.deleteMany();
    await tx.retentionRiskRunRow.deleteMany();
    await tx.retentionRiskRun.deleteMany();
    await tx.retentionPolicy.deleteMany();
    await tx.retentionPlaybook.deleteMany();
    await tx.retentionAccount.deleteMany();

    let accountsApplied = 0;
    let playbooksApplied = 0;
    let policiesApplied = 0;

    for (const input of normalized.accounts) {
      const parsed = validateRetentionAccountInput(input);
      if (!parsed.ok) continue;
      await tx.retentionAccount.create({ data: parsed.value });
      accountsApplied++;
    }

    for (const input of normalized.playbooks) {
      const parsed = validateRetentionPlaybookInput(input);
      if (!parsed.ok) continue;
      await tx.retentionPlaybook.create({ data: parsed.value });
      playbooksApplied++;
    }

    for (const input of normalized.policy) {
      const parsed = validateRetentionPolicyInput(input);
      if (!parsed.ok) continue;
      await tx.retentionPolicy.create({ data: parsed.value });
      policiesApplied++;
    }

    await tx.retentionAuditLog.create({
      data: {
        actor: "workspace-dataset-selector",
        action: "retention_dataset_applied",
        detail: `Applied persisted retention dataset: ${dataset.name}.`,
        metadata: {
          datasetId: dataset.id,
          sourceType: dataset.sourceType,
          rowCounts: dataset.rowCounts,
          applied: { accountsApplied, playbooksApplied, policiesApplied }
        }
      }
    });
  });

  await recordImportedDataSourceSelection("retention", dataset, session?.userId);

  revalidatePath("/retention/inputs");
  revalidatePath("/retention/overview");
  revalidatePath("/retention/simulations");
  revalidatePath("/retention/outputs");
  revalidatePath("/retention/accounts");
  redirect(`/retention/inputs?datasetApplied=${encodeURIComponent(dataset.id)}`);
}
