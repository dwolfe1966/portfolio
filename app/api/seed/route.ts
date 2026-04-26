import { reseed } from "@/lib/seed";
import { apiError, apiOk } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";

export async function POST() {
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
