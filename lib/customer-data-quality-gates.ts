export type CustomerDataQualityStatus = "ready" | "warning" | "blocked";

export type CustomerDataQualityGateKey =
  | "required_fields"
  | "row_reconciliation"
  | "timestamp_semantics"
  | "currency_semantics"
  | "identity_match"
  | "freshness"
  | "duplicates"
  | "rejected_rows"
  | "source_of_truth_order";

export type RequiredFieldEvidence = {
  objectName: string;
  fieldName: string;
  present?: boolean | null;
  coverageRate?: number | null;
  minCoverageRate?: number | null;
};

export type RowReconciliationEvidence = {
  objectName: string;
  sourceRowCount?: number | null;
  importedRowCount?: number | null;
  rejectedRowCount?: number | null;
  maxUnreconciledRows?: number | null;
};

export type SemanticFieldEvidence = {
  objectName: string;
  fieldName: string;
  validRate?: number | null;
  minValidRate?: number | null;
  invalidCount?: number | null;
  timezoneKnown?: boolean | null;
  currencyCode?: string | null;
  mixedCurrencyCodes?: string[] | null;
};

export type SourceFreshnessEvidence = {
  sourceName: string;
  lastSyncedAt?: Date | string | null;
  maxAgeHours?: number | null;
};

export type DuplicateEvidence = {
  objectName: string;
  duplicateRowCount?: number | null;
  maxDuplicateRows?: number | null;
};

export type RejectedRowsEvidence = {
  objectName: string;
  totalRows?: number | null;
  rejectedRowCount?: number | null;
  maxRejectedRows?: number | null;
  maxRejectedRate?: number | null;
};

export type SourceOfTruthEvidence = {
  entityName: string;
  observedSources?: string[] | null;
  approvedPrecedence?: string[] | null;
  primarySource?: string | null;
};

export type CustomerDataQualityGateInput = {
  requiredFields?: RequiredFieldEvidence[];
  rowReconciliations?: RowReconciliationEvidence[];
  timestampFields?: SemanticFieldEvidence[];
  currencyFields?: SemanticFieldEvidence[];
  identityMatchRate?: number | null;
  minIdentityMatchRate?: number | null;
  warningIdentityMatchRate?: number | null;
  freshness?: SourceFreshnessEvidence[];
  duplicateGroups?: DuplicateEvidence[];
  rejectedRows?: RejectedRowsEvidence[];
  sourceOfTruthOrder?: SourceOfTruthEvidence[];
  now?: Date | string | null;
};

export type CustomerDataQualityGateResult = {
  gate: CustomerDataQualityGateKey;
  status: CustomerDataQualityStatus;
  blockers: string[];
  warnings: string[];
};

export type CustomerDataQualityGateDecision = {
  status: CustomerDataQualityStatus;
  readyForRecommendation: boolean;
  readyForExecution: boolean;
  blockers: string[];
  warnings: string[];
  gates: CustomerDataQualityGateResult[];
  nextRequiredAction: string;
};

function finiteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function statusFor(blockers: string[], warnings: string[]): CustomerDataQualityStatus {
  if (blockers.length > 0) return "blocked";
  if (warnings.length > 0) return "warning";
  return "ready";
}

function gate(gateName: CustomerDataQualityGateKey, blockers: string[] = [], warnings: string[] = []): CustomerDataQualityGateResult {
  return {
    gate: gateName,
    status: statusFor(blockers, warnings),
    blockers,
    warnings
  };
}

function normalizedDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function sourceLabel(item: { objectName?: string; sourceName?: string; entityName?: string; fieldName?: string }) {
  const base = item.objectName ?? item.sourceName ?? item.entityName ?? "source";
  return item.fieldName ? `${base}.${item.fieldName}` : base;
}

function evaluateRequiredFields(fields: RequiredFieldEvidence[]) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const field of fields) {
    const label = sourceLabel(field);
    const minCoverageRate = finiteNumber(field.minCoverageRate) ? field.minCoverageRate : 1;
    if (field.present !== true) {
      blockers.push(`Map required field ${label}.`);
      continue;
    }
    if (finiteNumber(field.coverageRate) && field.coverageRate < minCoverageRate) {
      blockers.push(`Raise ${label} coverage to at least ${Math.round(minCoverageRate * 100)}%.`);
    } else if (finiteNumber(field.coverageRate) && field.coverageRate < 1) {
      warnings.push(`${label} has partial coverage.`);
    }
  }

  return gate("required_fields", blockers, warnings);
}

function evaluateRowReconciliation(items: RowReconciliationEvidence[]) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    const sourceRowCount = item.sourceRowCount ?? null;
    const importedRowCount = item.importedRowCount ?? null;
    const rejectedRowCount = item.rejectedRowCount ?? 0;
    const maxUnreconciledRows = item.maxUnreconciledRows ?? 0;

    if (!finiteNumber(sourceRowCount) || !finiteNumber(importedRowCount)) {
      blockers.push(`Record source and imported row counts for ${item.objectName}.`);
      continue;
    }

    const accountedRows = importedRowCount + (finiteNumber(rejectedRowCount) ? rejectedRowCount : 0);
    const unreconciledRows = Math.abs(sourceRowCount - accountedRows);
    if (unreconciledRows > maxUnreconciledRows) {
      blockers.push(`Reconcile ${unreconciledRows} unaccounted ${item.objectName} rows.`);
    } else if (unreconciledRows > 0) {
      warnings.push(`${item.objectName} has ${unreconciledRows} tolerated unreconciled rows.`);
    }
  }

  return gate("row_reconciliation", blockers, warnings);
}

function evaluateTimestampSemantics(fields: SemanticFieldEvidence[]) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const field of fields) {
    const label = sourceLabel(field);
    const minValidRate = finiteNumber(field.minValidRate) ? field.minValidRate : 0.995;
    const invalidCount = field.invalidCount ?? 0;
    if (finiteNumber(field.validRate) && field.validRate < minValidRate) {
      blockers.push(`Fix timestamp parsing for ${label}.`);
    } else if (finiteNumber(invalidCount) && invalidCount > 0) {
      warnings.push(`${label} has ${invalidCount} invalid timestamp values.`);
    }
    if (field.timezoneKnown !== true) warnings.push(`Confirm timezone semantics for ${label}.`);
  }

  return gate("timestamp_semantics", blockers, warnings);
}

function evaluateCurrencySemantics(fields: SemanticFieldEvidence[]) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const field of fields) {
    const label = sourceLabel(field);
    const invalidCount = field.invalidCount ?? 0;
    if (!field.currencyCode?.trim()) blockers.push(`Set currency code for ${label}.`);
    if (finiteNumber(invalidCount) && invalidCount > 0) blockers.push(`Fix ${invalidCount} invalid currency values in ${label}.`);
    if ((field.mixedCurrencyCodes ?? []).length > 1) blockers.push(`Normalize mixed currencies for ${label}.`);
    if ((field.mixedCurrencyCodes ?? []).length === 1 && field.mixedCurrencyCodes?.[0] !== field.currencyCode) {
      warnings.push(`${label} observed currency differs from configured currency.`);
    }
  }

  return gate("currency_semantics", blockers, warnings);
}

function evaluateIdentityMatch(input: CustomerDataQualityGateInput) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const minIdentityMatchRate = finiteNumber(input.minIdentityMatchRate) ? input.minIdentityMatchRate : 0.9;
  const warningIdentityMatchRate = finiteNumber(input.warningIdentityMatchRate) ? input.warningIdentityMatchRate : 0.97;

  if (!finiteNumber(input.identityMatchRate)) {
    blockers.push("Measure identity match rate.");
  } else if (input.identityMatchRate < minIdentityMatchRate) {
    blockers.push(`Raise identity match rate to at least ${Math.round(minIdentityMatchRate * 100)}%.`);
  } else if (input.identityMatchRate < warningIdentityMatchRate) {
    warnings.push(`Identity match rate is below ${Math.round(warningIdentityMatchRate * 100)}%.`);
  }

  return gate("identity_match", blockers, warnings);
}

function evaluateFreshness(items: SourceFreshnessEvidence[], nowValue: CustomerDataQualityGateInput["now"]) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const now = normalizedDate(nowValue) ?? new Date();

  for (const item of items) {
    const lastSyncedAt = normalizedDate(item.lastSyncedAt);
    const maxAgeHours = finiteNumber(item.maxAgeHours) ? item.maxAgeHours : 24;
    if (!lastSyncedAt) {
      blockers.push(`Record last sync time for ${item.sourceName}.`);
      continue;
    }
    const ageHours = (now.getTime() - lastSyncedAt.getTime()) / 3_600_000;
    if (ageHours > maxAgeHours) {
      blockers.push(`Refresh stale source ${item.sourceName}.`);
    } else if (ageHours > maxAgeHours * 0.8) {
      warnings.push(`${item.sourceName} is near its freshness limit.`);
    }
  }

  return gate("freshness", blockers, warnings);
}

function evaluateDuplicates(items: DuplicateEvidence[]) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    const duplicateRowCount = item.duplicateRowCount ?? 0;
    const maxDuplicateRows = item.maxDuplicateRows ?? 0;
    if (!finiteNumber(duplicateRowCount)) {
      blockers.push(`Measure duplicate rows for ${item.objectName}.`);
    } else if (duplicateRowCount > maxDuplicateRows) {
      blockers.push(`Resolve ${duplicateRowCount} duplicate ${item.objectName} rows.`);
    } else if (duplicateRowCount > 0) {
      warnings.push(`${item.objectName} has ${duplicateRowCount} tolerated duplicate rows.`);
    }
  }

  return gate("duplicates", blockers, warnings);
}

function evaluateRejectedRows(items: RejectedRowsEvidence[]) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    const rejectedRowCount = item.rejectedRowCount ?? 0;
    const totalRows = item.totalRows ?? null;
    const maxRejectedRows = item.maxRejectedRows ?? 0;
    const maxRejectedRate = item.maxRejectedRate ?? 0;

    if (!finiteNumber(rejectedRowCount)) {
      blockers.push(`Measure rejected rows for ${item.objectName}.`);
      continue;
    }

    const rejectedRate = finiteNumber(totalRows) && totalRows > 0 ? rejectedRowCount / totalRows : 0;
    if (rejectedRowCount > maxRejectedRows || rejectedRate > maxRejectedRate) {
      blockers.push(`Resolve rejected rows for ${item.objectName}.`);
    } else if (rejectedRowCount > 0) {
      warnings.push(`${item.objectName} has ${rejectedRowCount} tolerated rejected rows.`);
    }
  }

  return gate("rejected_rows", blockers, warnings);
}

function evaluateSourceOfTruthOrder(items: SourceOfTruthEvidence[]) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    const approvedPrecedence = item.approvedPrecedence ?? [];
    const observedSources = item.observedSources ?? [];
    if (approvedPrecedence.length === 0) {
      blockers.push(`Define source-of-truth precedence for ${item.entityName}.`);
      continue;
    }
    const unknownSources = observedSources.filter((source) => !approvedPrecedence.includes(source));
    if (unknownSources.length > 0) blockers.push(`Approve source ordering for ${item.entityName}: ${unknownSources.join(", ")}.`);
    if (item.primarySource && approvedPrecedence[0] !== item.primarySource) {
      blockers.push(`Make ${approvedPrecedence[0]} the primary source for ${item.entityName}.`);
    }
    if (!item.primarySource && observedSources.length > 1) warnings.push(`Record primary source for ${item.entityName}.`);
  }

  return gate("source_of_truth_order", blockers, warnings);
}

function nextAction(gates: CustomerDataQualityGateResult[]) {
  const blocked = gates.find((item) => item.blockers.length > 0);
  if (blocked) return blocked.blockers[0];
  const warning = gates.find((item) => item.warnings.length > 0);
  if (warning) return warning.warnings[0];
  return "Record data quality approval and attach evidence to the customer launch packet.";
}

export function buildCustomerDataQualityGateDecision(input: CustomerDataQualityGateInput): CustomerDataQualityGateDecision {
  const gates = [
    evaluateRequiredFields(input.requiredFields ?? []),
    evaluateRowReconciliation(input.rowReconciliations ?? []),
    evaluateTimestampSemantics(input.timestampFields ?? []),
    evaluateCurrencySemantics(input.currencyFields ?? []),
    evaluateIdentityMatch(input),
    evaluateFreshness(input.freshness ?? [], input.now),
    evaluateDuplicates(input.duplicateGroups ?? []),
    evaluateRejectedRows(input.rejectedRows ?? []),
    evaluateSourceOfTruthOrder(input.sourceOfTruthOrder ?? [])
  ];
  const blockers = gates.flatMap((item) => item.blockers);
  const warnings = gates.flatMap((item) => item.warnings);
  const status = statusFor(blockers, warnings);

  return {
    status,
    readyForRecommendation: blockers.length === 0,
    readyForExecution: status === "ready",
    blockers,
    warnings,
    gates,
    nextRequiredAction: nextAction(gates)
  };
}
