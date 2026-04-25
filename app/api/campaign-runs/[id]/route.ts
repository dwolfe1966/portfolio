import { db } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api-contract";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const run = await db.campaignRun.findUnique({
    where: { id },
    include: { assumptionSet: true }
  });

  if (!run) {
    return apiError(404, "RUN_NOT_FOUND", "Campaign run not found");
  }

  return apiOk({ run });
}
