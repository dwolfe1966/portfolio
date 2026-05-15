import type { CustomerOnboardingOwner, CustomerOnboardingOwnerRole } from "@/lib/customer-onboarding-readiness";

export const WORKSPACE_LAUNCH_OWNER_ROLES: { role: CustomerOnboardingOwnerRole; label: string }[] = [
  { role: "executive_sponsor", label: "Executive sponsor" },
  { role: "workspace_owner", label: "Workspace owner" },
  { role: "data_owner", label: "Data owner" },
  { role: "channel_owner", label: "Channel owner" },
  { role: "consent_compliance_owner", label: "Consent and compliance" },
  { role: "finance_owner", label: "Finance owner" },
  { role: "operator_approver", label: "Operator approver" }
];

const ROLE_SET = new Set(WORKSPACE_LAUNCH_OWNER_ROLES.map((item) => item.role));

function clean(value: unknown, maxLength = 120) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function normalizeWorkspaceLaunchOwners(input: unknown): CustomerOnboardingOwner[] {
  const byRole = new Map<CustomerOnboardingOwnerRole, CustomerOnboardingOwner>();
  const values = Array.isArray(input) ? input : [];

  for (const item of values) {
    if (!item || typeof item !== "object") continue;
    const owner = item as Partial<CustomerOnboardingOwner>;
    if (!owner.role || !ROLE_SET.has(owner.role)) continue;
    byRole.set(owner.role, {
      role: owner.role,
      name: clean(owner.name),
      email: clean(owner.email, 160).toLowerCase(),
      approved: owner.approved === true
    });
  }

  return WORKSPACE_LAUNCH_OWNER_ROLES.map(({ role, label }) => {
    const owner = byRole.get(role);
    return {
      role,
      name: owner?.name || label,
      email: owner?.email || null,
      approved: owner?.approved === true
    };
  });
}
