import {
  FakeConversionConnector,
  FakeEngagementConnector,
  FakeEspConnector,
  FakeSmtpConnector,
  FakeWarehouseConnector,
  FakeWebhookConnector
} from "./simulated";
import type {
  LifecycleConnector,
  LifecycleConnectorProvider,
  LifecycleDeliveryConnector,
  LifecycleObservationConnector,
  LifecycleSourceConnector
} from "./types";

export type {
  LifecycleConnector,
  LifecycleConnectorAuditEvent,
  LifecycleConnectorCapability,
  LifecycleConnectorHealth,
  LifecycleConnectorKind,
  LifecycleConnectorProvider,
  LifecycleDeliveryConnector,
  LifecycleDeliveryRequest,
  LifecycleDeliveryResult,
  LifecycleDiscoveryResult,
  LifecycleObjectKey,
  LifecycleObservationConnector,
  LifecycleObservationRequest,
  LifecycleObservationResult,
  LifecycleObservedEvent,
  LifecyclePreviewRequest,
  LifecyclePreviewResult,
  LifecycleSourceConnector,
  LifecycleSourceField,
  LifecycleSourceObjectSchema,
  LifecycleSyncRequest,
  LifecycleSyncResult
} from "./types";
export {
  FakeConversionConnector,
  FakeEngagementConnector,
  FakeEspConnector,
  FakeSmtpConnector,
  FakeWarehouseConnector,
  FakeWebhookConnector
} from "./simulated";

export function getLifecycleConnector(provider: LifecycleConnectorProvider): LifecycleConnector {
  switch (provider) {
    case "fake_warehouse":
      return new FakeWarehouseConnector();
    case "fake_webhook":
      return new FakeWebhookConnector();
    case "fake_esp":
      return new FakeEspConnector();
    case "fake_smtp":
      return new FakeSmtpConnector();
    case "fake_engagement":
      return new FakeEngagementConnector();
    case "fake_conversion":
      return new FakeConversionConnector();
    default:
      return new FakeWarehouseConnector();
  }
}

export function getLifecycleSourceConnector(provider: "fake_warehouse" | "fake_webhook"): LifecycleSourceConnector {
  return getLifecycleConnector(provider) as LifecycleSourceConnector;
}

export function getLifecycleDeliveryConnector(provider: "fake_esp" | "fake_smtp"): LifecycleDeliveryConnector {
  return getLifecycleConnector(provider) as LifecycleDeliveryConnector;
}

export function getLifecycleObservationConnector(
  provider: "fake_esp" | "fake_engagement" | "fake_conversion"
): LifecycleObservationConnector {
  return getLifecycleConnector(provider) as LifecycleObservationConnector;
}
