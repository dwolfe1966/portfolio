import type { WorkspaceLaunchReadiness } from "@/lib/workspace-launch-readiness";
import type { CustomerOnboardingOwner } from "@/lib/customer-onboarding-readiness";
import type { CustomerLaunchPacketConnectedSystem } from "@/lib/customer-launch-packet";

export type WorkspaceLaunchEvidenceSectionStatus = "ready" | "needs_evidence";

export type WorkspaceLaunchEvidenceSection = {
  key: "reviewers" | "systems" | "mappings" | "policy" | "baseline" | "exports";
  label: string;
  status: WorkspaceLaunchEvidenceSectionStatus;
  detail: string;
  href: string;
};

export type WorkspaceLaunchEvidenceSettings = {
  status: "ready" | "incomplete";
  reviewerCount: number;
  approvedReviewerCount: number;
  connectedSystemsCount: number;
  readReadySystemsCount: number;
  writeReadySystemsCount: number;
  approvedMappingsCount: number;
  evidenceExportsCount: number;
  owners: CustomerOnboardingOwner[];
  connectedSystems: CustomerLaunchPacketConnectedSystem[];
  editableSections: WorkspaceLaunchEvidenceSection[];
  nextRequiredAction: string;
};

function sectionStatus(ready: boolean): WorkspaceLaunchEvidenceSectionStatus {
  return ready ? "ready" : "needs_evidence";
}

export function buildWorkspaceLaunchEvidenceSettings(
  readiness: WorkspaceLaunchReadiness
): WorkspaceLaunchEvidenceSettings {
  const { sections } = readiness.packet;
  const reviewerCount = sections.owners.length;
  const approvedReviewerCount = sections.owners.filter((owner) => owner.approved === true).length;
  const connectedSystemsCount = sections.connectedSystems.length;
  const readReadySystemsCount = sections.connectedSystems.filter((system) => system.readReady === true).length;
  const writeReadySystemsCount = sections.connectedSystems.filter((system) => system.writeReady === true).length;
  const approvedMappingsCount = sections.mappings.filter((mapping) => mapping.approved === true).length;
  const evidenceExportsCount = sections.evidenceExports.length;

  const allReviewersApproved = reviewerCount > 0 && approvedReviewerCount === reviewerCount;
  const allSystemsReadReady = connectedSystemsCount > 0 && readReadySystemsCount === connectedSystemsCount;
  const anyProviderWriteReady = sections.connectedSystems.some(
    (system) => system.systemType === "ad_platform" && system.writeReady === true
  );
  const allMappingsApproved = sections.mappings.length > 0 && approvedMappingsCount === sections.mappings.length;
  const policyReady = sections.policy?.approved === true
    && sections.policy.consentApproved === true
    && sections.policy.spendCapsApproved === true
    && sections.policy.emergencyStopReady === true
    && sections.policy.rollbackReady === true;
  const baselineReady = sections.baseline?.status === "ready"
    && sections.baseline.reportable === true
    && sections.revenueProof?.status !== "blocked"
    && sections.billableGate?.status !== "blocked";
  const exportsReady = evidenceExportsCount > 0;

  const editableSections: WorkspaceLaunchEvidenceSection[] = [
    {
      key: "reviewers",
      label: "Reviewer roster",
      status: sectionStatus(allReviewersApproved),
      detail: allReviewersApproved
        ? `${approvedReviewerCount} of ${reviewerCount} launch reviewers approved.`
        : "Complete owner, finance, data, channel, and operator approvals.",
      href: "/workspace/agents"
    },
    {
      key: "systems",
      label: "Connected systems",
      status: sectionStatus(allSystemsReadReady && anyProviderWriteReady),
      detail: allSystemsReadReady && anyProviderWriteReady
        ? `${readReadySystemsCount} systems read ready; ${writeReadySystemsCount} write ready.`
        : "Attach read evidence and approved write grants for provider execution.",
      href: "/workspace/connections"
    },
    {
      key: "mappings",
      label: "Approved mappings",
      status: sectionStatus(allMappingsApproved),
      detail: allMappingsApproved
        ? `${approvedMappingsCount} mapping contracts approved.`
        : "Approve source-of-truth mappings before launch escalation.",
      href: "/workspace/datasets"
    },
    {
      key: "policy",
      label: "Policy controls",
      status: sectionStatus(policyReady),
      detail: policyReady
        ? "Consent, spend caps, emergency stop, and rollback evidence are ready."
        : "Finish consent, spend-cap, emergency-stop, and rollback evidence.",
      href: "/workspace/agents"
    },
    {
      key: "baseline",
      label: "Baseline and revenue proof",
      status: sectionStatus(baselineReady),
      detail: baselineReady
        ? "Baseline, revenue proof, and billable gate evidence are ready."
        : "Confirm baseline, revenue proof, and billable gate evidence.",
      href: "/workspace/agents"
    },
    {
      key: "exports",
      label: "Evidence exports",
      status: sectionStatus(exportsReady),
      detail: exportsReady
        ? `${evidenceExportsCount} evidence export available.`
        : "Attach at least one launch packet or audit evidence export.",
      href: "/api/workspace/launch-packet?format=markdown"
    }
  ];

  const firstIncomplete = editableSections.find((section) => section.status === "needs_evidence");

  return {
    status: firstIncomplete ? "incomplete" : "ready",
    reviewerCount,
    approvedReviewerCount,
    connectedSystemsCount,
    readReadySystemsCount,
    writeReadySystemsCount,
    approvedMappingsCount,
    evidenceExportsCount,
    owners: sections.owners,
    connectedSystems: sections.connectedSystems,
    editableSections,
    nextRequiredAction: firstIncomplete?.detail ?? "Review launch evidence before the next customer readiness meeting."
  };
}
