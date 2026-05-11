"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { applyAcquisitionDatasetSnapshot } from "@/lib/acquisition-dataset-apply";
import { isDemoMutationAllowed } from "@/lib/env-guard";

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

export async function applyAcquisitionDatasetSnapshotAction(formData: FormData) {
  if (!isDemoMutationAllowed()) redirect("/acquisition/inputs?datasetError=mutations-disabled");

  const datasetId = clean(formData.get("datasetId"), 120);
  if (!datasetId) redirect("/acquisition/inputs?datasetError=missing-dataset");

  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const result = await applyAcquisitionDatasetSnapshot(datasetId, session?.userId);
  if (!result.ok) {
    redirect("/acquisition/inputs?datasetError=dataset-not-found");
  }

  revalidatePath("/acquisition/inputs");
  revalidatePath("/acquisition/overview");
  revalidatePath("/acquisition/simulations");
  revalidatePath("/acquisition/outputs");
  revalidatePath("/acquisition/campaigns");
  redirect(`/acquisition/inputs?datasetApplied=${encodeURIComponent(result.datasetId)}`);
}
