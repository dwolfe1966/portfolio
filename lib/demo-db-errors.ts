function readCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const directCode = (error as { code?: unknown }).code;
  if (typeof directCode === "string") return directCode;

  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === "string") return causeCode;
  }

  return undefined;
}

function readMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";

  const message = (error as { message?: unknown }).message;
  if (typeof message === "string") return message;

  return "";
}

export function isMissingDemoTableError(error: unknown): boolean {
  const maybeCode = readCode(error);
  if (
    maybeCode === "P1001" ||
    maybeCode === "P2021" ||
    maybeCode === "P2022" ||
    maybeCode === "3F000" ||
    maybeCode === "42P01"
  ) {
    return true;
  }

  const message = readMessage(error).toLowerCase();
  if (!message) return false;

  return [
    "can't reach database server",
    "cannot reach database server",
    "connection timed out",
    "connect timeout",
    "timed out fetching a new connection",
    "does not exist in the current database",
    "schema",
    "relation",
    "no schema has been selected",
    "does not exist"
  ].some((needle) => message.includes(needle));
}
