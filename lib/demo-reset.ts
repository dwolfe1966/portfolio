export type DemoResetScope = "all" | "lifecycle" | "acquisition" | "auction";

export type DemoResetResolution =
  | { ok: true; scope: DemoResetScope }
  | { ok: false; code: "CONFIRMATION_REQUIRED"; message: string };

export function resolveDemoResetRequest(body: unknown): DemoResetResolution {
  const payload = (body ?? {}) as { confirm?: unknown; scope?: unknown };
  if (payload.confirm !== "RESET_DEMO") {
    return {
      ok: false,
      code: "CONFIRMATION_REQUIRED",
      message: "Reset requires confirm=RESET_DEMO in request body."
    };
  }

  const rawScope = payload.scope;
  const scope: DemoResetScope =
    rawScope === "lifecycle" ||
    rawScope === "acquisition" ||
    rawScope === "auction" ||
    rawScope === "all"
      ? rawScope
      : "all";

  return { ok: true, scope };
}
