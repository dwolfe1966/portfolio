"use client";

import { useEffect, useMemo, useState } from "react";

type ConnectorSummary = {
  provider: string;
  kind: string;
  capabilities: string[];
  diagnostics?: {
    state: "ready" | "review" | "blocked";
    healthStatus: "ok" | "warning" | "blocked";
    permissionStatus: "ok" | "warning" | "blocked";
    syncStatus: "ok" | "warning" | "blocked";
    credentialStatus: "ok" | "warning" | "blocked";
    missingCapabilities: string[];
    diagnostics: Array<{ key: string; label: string; severity: "ok" | "warning" | "blocked"; detail: string }>;
  };
  health: {
    ok: boolean;
    accountLabel: string;
    lastSyncAt?: string;
    nextSyncAt?: string;
    permissionWarnings: string[];
    freshnessWarnings: string[];
  };
  discovery: {
    objects: Array<{
      objectKey: string;
      externalName: string;
      primaryKey: string;
      fields: Array<{ name: string; type: string; nullable: boolean }>;
    }>;
  } | null;
};

type ConnectorPayload = {
  connectors?: ConnectorSummary[];
  account?: { email: string; userId: string };
};

type LabStatus = {
  state: "idle" | "loading" | "success" | "error";
  message: string;
};

const providerLabels: Record<string, string> = {
  fake_warehouse: "Warehouse",
  fake_webhook: "Webhook",
  fake_esp: "ESP",
  fake_smtp: "SMTP",
  fake_engagement: "Engagement",
  fake_conversion: "Conversion"
};

const objectOptions = ["users", "entities", "interestEdges", "events", "consent"];
const sourceProviders = ["fake_warehouse", "fake_webhook"];
const deliveryProviders = ["fake_esp", "fake_smtp"];
const observationProviders = ["fake_esp", "fake_engagement", "fake_conversion"];

function formatApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: { message?: unknown; details?: unknown } }).error;
  if (!error || typeof error !== "object") return fallback;
  const eventId = error.details && typeof error.details === "object" && "eventId" in error.details
    ? String((error.details as { eventId?: unknown }).eventId ?? "")
    : "";
  return [typeof error.message === "string" ? error.message : fallback, eventId ? `Event id: ${eventId}` : ""]
    .filter(Boolean)
    .join(" ");
}

function labelProvider(provider: string) {
  return providerLabels[provider] ?? provider;
}

function summarizeJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function diagnosticPillClass(severity: string | undefined) {
  if (severity === "ok") return "live";
  if (severity === "blocked") return "warning";
  return "progress";
}

function diagnosticStateLabel(state: string | undefined) {
  if (state === "ready") return "Ready";
  if (state === "blocked") return "Blocked";
  return "Review";
}

export function LifecycleConnectorLab() {
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [accountEmail, setAccountEmail] = useState("");
  const [selectedSourceProvider, setSelectedSourceProvider] = useState("fake_warehouse");
  const [selectedObjectKey, setSelectedObjectKey] = useState("users");
  const [selectedDeliveryProvider, setSelectedDeliveryProvider] = useState("fake_esp");
  const [selectedObservationProvider, setSelectedObservationProvider] = useState("fake_conversion");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [status, setStatus] = useState<LabStatus>({
    state: "idle",
    message: "Sign in, then run fake connector checks before wiring real providers."
  });
  const [resultTitle, setResultTitle] = useState("Connector output");
  const [result, setResult] = useState<unknown>(null);

  const sourceConnector = useMemo(
    () => connectors.find((connector) => connector.provider === selectedSourceProvider),
    [connectors, selectedSourceProvider]
  );

  async function loadConnectors() {
    setStatus({ state: "loading", message: "Loading lifecycle connector health..." });
    try {
      const response = await fetch("/api/workspace/lifecycle-connectors", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as ConnectorPayload;
      if (!response.ok) throw new Error(formatApiError(payload, "Lifecycle connector health could not be loaded."));
      setConnectors(Array.isArray(payload.connectors) ? payload.connectors : []);
      setAccountEmail(payload.account?.email ?? "");
      setRecipientEmail((current) => current || payload.account?.email || "operator@customer.com");
      setStatus({ state: "success", message: `Loaded ${(payload.connectors ?? []).length} fake lifecycle connectors.` });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Lifecycle connector health could not be loaded."
      });
    }
  }

  useEffect(() => {
    void loadConnectors();
  }, []);

  async function runAction(action: string, body: Record<string, unknown>, title: string) {
    setStatus({ state: "loading", message: `Running ${title.toLowerCase()}...` });
    try {
      const response = await fetch("/api/workspace/lifecycle-connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(formatApiError(payload, `${title} failed.`));
      setResultTitle(title);
      setResult(payload);
      setStatus({ state: "success", message: `${title} completed.` });
    } catch (error) {
      setStatus({ state: "error", message: error instanceof Error ? error.message : `${title} failed.` });
    }
  }

  return (
    <div className="lifecycleConnectorLab">
      <div className="lifecycleConnectorLabHeader">
        <div>
          <p className="editorKicker">Lifecycle connector lab</p>
          <h3>Health, preview, dry-run, test-send, and observation harness</h3>
          <p>
            Fake connectors exercise the same contracts that real Postgres, webhook, SMTP, ESP, pixel, and conversion providers will implement.
          </p>
        </div>
        <button type="button" className="btn smallBtn" onClick={loadConnectors}>Refresh health</button>
      </div>

      <div className={`connectorLabStatus connectorLabStatus--${status.state}`}>
        <strong>{status.state === "error" ? "Needs attention" : status.state === "loading" ? "Working" : "Status"}</strong>
        <span>{status.message}</span>
      </div>

      <div className="connectorLabHealthGrid">
        {connectors.map((connector) => (
          <div className="card connectorLabHealthCard" key={connector.provider}>
            <div className="connectionChooserHeader">
              <p className="editorKicker">{connector.kind}</p>
              <span className={`statusPill ${diagnosticPillClass(connector.diagnostics?.state === "ready" ? "ok" : connector.diagnostics?.state === "blocked" ? "blocked" : "warning")}`}>
                {diagnosticStateLabel(connector.diagnostics?.state)}
              </span>
            </div>
            <h3>{labelProvider(connector.provider)}</h3>
            <p>{connector.health.accountLabel}</p>
            <div className="connectorChipGrid">
              <span className={`connectorChip ${diagnosticPillClass(connector.diagnostics?.healthStatus)}`}>Health: {connector.diagnostics?.healthStatus ?? "unknown"}</span>
              <span className={`connectorChip ${diagnosticPillClass(connector.diagnostics?.permissionStatus)}`}>Permissions: {connector.diagnostics?.permissionStatus ?? "unknown"}</span>
              <span className={`connectorChip ${diagnosticPillClass(connector.diagnostics?.syncStatus)}`}>Sync: {connector.diagnostics?.syncStatus ?? "unknown"}</span>
              <span className={`connectorChip ${diagnosticPillClass(connector.diagnostics?.credentialStatus)}`}>Rotation: {connector.diagnostics?.credentialStatus ?? "unknown"}</span>
            </div>
            <div className="connectorChipGrid">
              {connector.capabilities.map((capability) => (
                <span className="connectorChip" key={capability}>{capability}</span>
              ))}
            </div>
            {connector.discovery ? (
              <p className="small">{connector.discovery.objects.length} source objects discovered</p>
            ) : null}
            {connector.diagnostics?.diagnostics.length ? (
              <ul className="connectorDiagnosticList">
                {connector.diagnostics.diagnostics.map((item) => (
                  <li key={item.key}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      <div className="connectorLabActionGrid">
        <div className="card connectorLabActionCard">
          <p className="editorKicker">Source preview</p>
          <h3>Inspect normalized rows</h3>
          <label>
            Source provider
            <select value={selectedSourceProvider} onChange={(event) => setSelectedSourceProvider(event.target.value)}>
              {sourceProviders.map((provider) => <option key={provider} value={provider}>{labelProvider(provider)}</option>)}
            </select>
          </label>
          <label>
            Object
            <select value={selectedObjectKey} onChange={(event) => setSelectedObjectKey(event.target.value)}>
              {objectOptions.map((objectKey) => <option key={objectKey} value={objectKey}>{objectKey}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="btn smallBtn primary"
            onClick={() => runAction("preview", { provider: selectedSourceProvider, objectKey: selectedObjectKey, limit: 3 }, "Source preview")}
          >
            Preview rows
          </button>
          <button
            type="button"
            className="btn smallBtn"
            onClick={() => runAction("syncDryRun", {
              provider: selectedSourceProvider,
              objectKeys: selectedSourceProvider === "fake_webhook" ? ["events"] : objectOptions,
              idempotencyKey: `connector-lab-${selectedSourceProvider}`
            }, "Sync dry-run")}
          >
            Sync dry-run
          </button>
          {sourceConnector?.discovery ? (
            <p className="small">
              {sourceConnector.discovery.objects.map((object) => object.objectKey).join(", ")}
            </p>
          ) : null}
        </div>

        <div className="card connectorLabActionCard">
          <p className="editorKicker">Delivery</p>
          <h3>Send through fake delivery connector</h3>
          <label>
            Delivery provider
            <select value={selectedDeliveryProvider} onChange={(event) => setSelectedDeliveryProvider(event.target.value)}>
              {deliveryProviders.map((provider) => <option key={provider} value={provider}>{labelProvider(provider)}</option>)}
            </select>
          </label>
          <label>
            Recipient
            <input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder={accountEmail || "operator@customer.com"} />
          </label>
          <button
            type="button"
            className="btn smallBtn primary"
            onClick={() => runAction("testSend", {
              provider: selectedDeliveryProvider,
              recipientEmail,
              idempotencyKey: `connector-lab-${selectedDeliveryProvider}-send`,
              mode: "test"
            }, "Delivery test-send")}
          >
            Test send
          </button>
        </div>

        <div className="card connectorLabActionCard">
          <p className="editorKicker">Observation</p>
          <h3>Preview engagement and conversion events</h3>
          <label>
            Observation provider
            <select value={selectedObservationProvider} onChange={(event) => setSelectedObservationProvider(event.target.value)}>
              {observationProviders.map((provider) => <option key={provider} value={provider}>{labelProvider(provider)}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="btn smallBtn primary"
            onClick={() => runAction("observe", {
              provider: selectedObservationProvider,
              since: "2026-05-07T12:00:00.000Z",
              limit: 10
            }, "Observation preview")}
          >
            Observe events
          </button>
        </div>
      </div>

      <div className="card connectorLabResult">
        <div className="connectionChooserHeader">
          <p className="editorKicker">{resultTitle}</p>
          <span className="statusPill progress">JSON</span>
        </div>
        <pre>{result ? summarizeJson(result) : "Run a connector action to inspect the response payload."}</pre>
      </div>
    </div>
  );
}
