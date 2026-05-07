export const ANONYMOUS_IMPORT_SENTINEL = "__anonymous_no_imports__";

export function accountOwnedImportWhere(accountUserId: string | null | undefined) {
  return { accountUserId: accountUserId ?? ANONYMOUS_IMPORT_SENTINEL };
}

export function canUseImportedData(accountUserId: string | null | undefined) {
  return Boolean(accountUserId);
}

export function resolveActiveDataSourceMode(
  accountUserId: string | null | undefined,
  mode: string | null | undefined
): "sample" | "imported" {
  return canUseImportedData(accountUserId) && mode === "imported" ? "imported" : "sample";
}

export function shouldCreateAccountOwnedImportSnapshot(accountUserId: string | null | undefined) {
  return Boolean(accountUserId);
}
