export function isDemoMutationAllowed() {
  if (process.env.DEMO_MUTATIONS_ENABLED === "true") return true;
  if (process.env.DEMO_MUTATIONS_ENABLED === "false") return false;
  return process.env.NODE_ENV !== "production";
}
