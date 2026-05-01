import { reseed, reseedAcquisitionOnly, reseedLifecycleOnly } from "@/lib/seed";
import { apiError, apiOk } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { resolveDemoResetRequest } from "@/lib/demo-reset";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const resolved = resolveDemoResetRequest(body);
  if (!resolved.ok) {
    return apiError(400, resolved.code, resolved.message);
  }

  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Seed endpoint is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable."
    );
  }

  if (resolved.scope === "lifecycle") {
    await reseedLifecycleOnly();
  } else if (resolved.scope === "acquisition") {
    await reseedAcquisitionOnly();
  } else {
    await reseed();
  }

  return apiOk({ scope: resolved.scope });
}
