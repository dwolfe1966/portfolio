import type { CustomerLaunchMode, CustomerOnboardingOwner, CustomerOnboardingOwnerRole } from "@/lib/customer-onboarding-readiness";

export type CustomerReadinessReviewStatus = "approved" | "pending" | "blocked";

export type CustomerReadinessReview = {
  role: CustomerOnboardingOwnerRole;
  label: string;
  status: CustomerReadinessReviewStatus;
  reviewer: string;
  blocker: string | null;
};

export type CustomerReadinessReviewWorkflow = {
  status: CustomerReadinessReviewStatus;
  launchMode: CustomerLaunchMode;
  launchEscalationAllowed: boolean;
  approvedCount: number;
  totalCount: number;
  blockers: string[];
  reviews: CustomerReadinessReview[];
  nextRequiredAction: string;
};

const REQUIRED_REVIEW_ROLES: Array<{ role: CustomerOnboardingOwnerRole; label: string }> = [
  { role: "executive_sponsor", label: "Executive sponsor" },
  { role: "workspace_owner", label: "Workspace owner" },
  { role: "data_owner", label: "Data owner" },
  { role: "channel_owner", label: "Channel owner" },
  { role: "consent_compliance_owner", label: "Consent and compliance" },
  { role: "finance_owner", label: "Finance owner" },
  { role: "operator_approver", label: "Operator approver" }
];

function ownerReviewer(owner: CustomerOnboardingOwner | undefined) {
  return owner?.email?.trim() || owner?.name?.trim() || "Unassigned";
}

function reviewStatus(owner: CustomerOnboardingOwner | undefined): CustomerReadinessReviewStatus {
  if (!owner || (!owner.name?.trim() && !owner.email?.trim())) return "blocked";
  return owner.approved === true ? "approved" : "pending";
}

function blockerFor(roleLabel: string, owner: CustomerOnboardingOwner | undefined, status: CustomerReadinessReviewStatus) {
  if (status === "approved") return null;
  if (!owner || (!owner.name?.trim() && !owner.email?.trim())) return `Assign ${roleLabel}.`;
  return `Collect ${roleLabel} approval.`;
}

export function buildCustomerReadinessReviewWorkflow(input: {
  owners?: CustomerOnboardingOwner[] | null;
  launchMode?: CustomerLaunchMode | null;
}): CustomerReadinessReviewWorkflow {
  const byRole = new Map((input.owners ?? []).map((owner) => [owner.role, owner]));
  const launchMode = input.launchMode ?? "recommendation_only";
  const reviews = REQUIRED_REVIEW_ROLES.map(({ role, label }) => {
    const owner = byRole.get(role);
    const status = reviewStatus(owner);
    return {
      role,
      label,
      status,
      reviewer: ownerReviewer(owner),
      blocker: blockerFor(label, owner, status)
    };
  });
  const blockers = reviews.flatMap((review) => review.blocker ? [review.blocker] : []);
  const approvedCount = reviews.filter((review) => review.status === "approved").length;
  const hasBlocked = reviews.some((review) => review.status === "blocked");
  const hasPending = reviews.some((review) => review.status === "pending");
  const status: CustomerReadinessReviewStatus = hasBlocked ? "blocked" : hasPending ? "pending" : "approved";

  return {
    status,
    launchMode,
    launchEscalationAllowed: status === "approved",
    approvedCount,
    totalCount: reviews.length,
    blockers,
    reviews,
    nextRequiredAction: blockers[0] ?? "Record final launch review and schedule the next customer readiness check."
  };
}
