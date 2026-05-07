import type { LifecycleConnectorCapability, LifecycleConnectorHealth } from "./types";

export type ConnectorDiagnosticSeverity = "ok" | "warning" | "blocked";
export type ConnectorDiagnosticState = "ready" | "review" | "blocked";

export type LifecycleConnectorDiagnostic = {
  key: string;
  label: string;
  severity: ConnectorDiagnosticSeverity;
  detail: string;
};

export type LifecycleConnectorDiagnostics = {
  state: ConnectorDiagnosticState;
  healthStatus: ConnectorDiagnosticSeverity;
  permissionStatus: ConnectorDiagnosticSeverity;
  syncStatus: ConnectorDiagnosticSeverity;
  credentialStatus: ConnectorDiagnosticSeverity;
  rotationDueAt: string | null;
  requiredCapabilities: LifecycleConnectorCapability[];
  missingCapabilities: LifecycleConnectorCapability[];
  diagnostics: LifecycleConnectorDiagnostic[];
};

export type LifecycleConnectorDiagnosticsInput = {
  health: LifecycleConnectorHealth;
  configuredStatus?: string | null;
  credentialGrantId?: string | null;
  requiredCapabilities?: LifecycleConnectorCapability[];
  now?: Date;
};

const DEFAULT_REQUIRED_CAPABILITIES: Partial<Record<LifecycleConnectorHealth["kind"], LifecycleConnectorCapability[]>> = {
  warehouse: ["read_users", "read_entities", "read_events"],
  webhook: ["read_events"],
  esp: ["send_message", "read_delivery_events"],
  smtp: ["send_message"],
  engagement: ["read_engagement_events"],
  conversion: ["read_conversion_events", "read_revenue_events"]
};

function parseDate(value: string | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

function diagnostic(key: string, label: string, severity: ConnectorDiagnosticSeverity, detail: string): LifecycleConnectorDiagnostic {
  return { key, label, severity, detail };
}

function maxSeverity(items: LifecycleConnectorDiagnostic[]): ConnectorDiagnosticState {
  if (items.some((item) => item.severity === "blocked")) return "blocked";
  if (items.some((item) => item.severity === "warning")) return "review";
  return "ready";
}

export function buildLifecycleConnectorDiagnostics(input: LifecycleConnectorDiagnosticsInput): LifecycleConnectorDiagnostics {
  const now = input.now ?? new Date();
  const requiredCapabilities = input.requiredCapabilities ?? DEFAULT_REQUIRED_CAPABILITIES[input.health.kind] ?? [];
  const missingCapabilities = requiredCapabilities.filter((capability) => !input.health.capabilities.includes(capability));
  const permissionWarnings = input.health.permissionWarnings.filter(Boolean);
  const freshnessWarnings = input.health.freshnessWarnings.filter(Boolean);
  const lastSyncAt = parseDate(input.health.lastSyncAt);
  const nextSyncAt = parseDate(input.health.nextSyncAt);
  const diagnostics: LifecycleConnectorDiagnostic[] = [];

  diagnostics.push(
    input.health.ok
      ? diagnostic("health", "Health check", "ok", `${input.health.accountLabel} is reachable.`)
      : diagnostic("health", "Health check", "blocked", `${input.health.accountLabel} is not currently healthy.`)
  );

  if (missingCapabilities.length > 0) {
    diagnostics.push(diagnostic(
      "permissions",
      "Permission audit",
      "blocked",
      `Missing required capabilities: ${missingCapabilities.join(", ")}.`
    ));
  } else if (permissionWarnings.length > 0) {
    diagnostics.push(diagnostic("permissions", "Permission audit", "warning", permissionWarnings.join(" ")));
  } else {
    diagnostics.push(diagnostic("permissions", "Permission audit", "ok", "Required connector capabilities are available."));
  }

  if (freshnessWarnings.length > 0) {
    diagnostics.push(diagnostic("sync", "Sync status", "warning", freshnessWarnings.join(" ")));
  } else if (!lastSyncAt) {
    diagnostics.push(diagnostic("sync", "Sync status", "warning", "No successful sync timestamp has been recorded yet."));
  } else if (nextSyncAt && nextSyncAt.getTime() < now.getTime()) {
    diagnostics.push(diagnostic("sync", "Sync status", "warning", "Next scheduled sync is past due."));
  } else {
    diagnostics.push(diagnostic("sync", "Sync status", "ok", "Sync timestamps are present and not past due."));
  }

  if (input.credentialGrantId) {
    diagnostics.push(diagnostic("credential", "Credential rotation", "ok", "Credential grant is linked; rotation tracking can attach to this grant."));
  } else if (input.configuredStatus === "configured") {
    diagnostics.push(diagnostic("credential", "Credential rotation", "warning", "Fake connector is configured without a real credential grant; add rotation metadata before real provider use."));
  } else {
    diagnostics.push(diagnostic("credential", "Credential rotation", "blocked", "Connector is missing credential-grant configuration."));
  }

  const healthStatus = diagnostics.find((item) => item.key === "health")?.severity ?? "blocked";
  const permissionStatus = diagnostics.find((item) => item.key === "permissions")?.severity ?? "blocked";
  const syncStatus = diagnostics.find((item) => item.key === "sync")?.severity ?? "blocked";
  const credentialStatus = diagnostics.find((item) => item.key === "credential")?.severity ?? "blocked";

  return {
    state: maxSeverity(diagnostics),
    healthStatus,
    permissionStatus,
    syncStatus,
    credentialStatus,
    rotationDueAt: null,
    requiredCapabilities,
    missingCapabilities,
    diagnostics
  };
}
