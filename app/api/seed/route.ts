import { reseed } from "@/lib/seed";
import { apiError, apiOk } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.confirm !== "RESET_DEMO") {
    return apiError(400, "CONFIRMATION_REQUIRED", "Reset requires confirm=RESET_DEMO in request body.");
  }
  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Seed endpoint is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable."
    );
  }
  await reseed();
  return apiOk({});
}
