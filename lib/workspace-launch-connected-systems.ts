import type { CustomerLaunchPacketConnectedSystem } from "@/lib/customer-launch-packet";

export const WORKSPACE_LAUNCH_CONNECTED_SYSTEMS: CustomerLaunchPacketConnectedSystem[] = [
  {
    name: "Workspace source imports",
    systemType: "warehouse",
    provider: "workspace",
    accountId: "default-demo-workspace",
    readReady: true,
    writeReady: false,
    credentialGrantId: "workspace_imports"
  },
  {
    name: "Google Ads",
    systemType: "ad_platform",
    provider: "google_ads",
    accountId: "selected_account",
    readReady: true,
    writeReady: false,
    credentialGrantId: "google_ads_grant"
  },
  {
    name: "Meta Ads",
    systemType: "ad_platform",
    provider: "meta_ads",
    accountId: "pending",
    readReady: false,
    writeReady: false,
    credentialGrantId: "meta_ads_grant_pending"
  }
];

function clean(value: unknown, maxLength = 120) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function systemKey(system: Pick<Partial<CustomerLaunchPacketConnectedSystem>, "provider" | "name">) {
  return clean(system.provider || system.name, 80).toLowerCase() || "unknown";
}

export function buildDefaultWorkspaceLaunchConnectedSystems(input: {
  providerReadReady?: boolean | null;
  providerWriteReady?: boolean | null;
} = {}): CustomerLaunchPacketConnectedSystem[] {
  const providerReadReady = input.providerReadReady !== false;
  const providerWriteReady = input.providerWriteReady === true;

  return WORKSPACE_LAUNCH_CONNECTED_SYSTEMS.map((system) => {
    if (system.provider === "google_ads") {
      return { ...system, readReady: providerReadReady, writeReady: providerWriteReady };
    }
    return { ...system };
  });
}

export function normalizeWorkspaceLaunchConnectedSystems(input: unknown): CustomerLaunchPacketConnectedSystem[] {
  const byKey = new Map<string, CustomerLaunchPacketConnectedSystem>();
  const values = Array.isArray(input) ? input : [];

  for (const item of values) {
    if (!item || typeof item !== "object") continue;
    const system = item as Partial<CustomerLaunchPacketConnectedSystem>;
    const key = systemKey(system);
    byKey.set(key, {
      name: clean(system.name) || clean(system.provider) || "Connected system",
      systemType: clean(system.systemType, 80) || null,
      provider: clean(system.provider, 80) || null,
      accountId: clean(system.accountId, 120) || null,
      readReady: system.readReady === true,
      writeReady: system.writeReady === true,
      credentialGrantId: clean(system.credentialGrantId, 160) || null
    });
  }

  return WORKSPACE_LAUNCH_CONNECTED_SYSTEMS.map((defaultSystem) => {
    const system = byKey.get(systemKey(defaultSystem));
    return {
      ...defaultSystem,
      ...system,
      name: system?.name || defaultSystem.name,
      provider: system?.provider || defaultSystem.provider,
      systemType: system?.systemType || defaultSystem.systemType
    };
  });
}

export function providerReadReadyFromConnectedSystems(systems: CustomerLaunchPacketConnectedSystem[]) {
  return systems.some((system) => system.systemType === "ad_platform" && system.readReady === true);
}

export function providerWriteReadyFromConnectedSystems(systems: CustomerLaunchPacketConnectedSystem[]) {
  return systems.some((system) => system.systemType === "ad_platform" && system.writeReady === true);
}
