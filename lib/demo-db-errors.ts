export function isMissingDemoTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeCode = (error as { code?: string }).code;
  if (maybeCode === "P2021" || maybeCode === "P2022") return true;

  const maybeMessage = (error as { message?: string }).message;
  if (typeof maybeMessage !== "string") return false;

  return maybeMessage.includes("does not exist in the current database");
}
