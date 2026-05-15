import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomerReadinessReviewWorkflow } from "@/lib/customer-readiness-review-workflow";

const OWNERS = [
  { role: "executive_sponsor", name: "Executive", approved: true },
  { role: "workspace_owner", name: "Workspace", approved: true },
  { role: "data_owner", name: "Data", approved: true },
  { role: "channel_owner", name: "Channel", approved: true },
  { role: "consent_compliance_owner", name: "Compliance", approved: true },
  { role: "finance_owner", name: "Finance", approved: true },
  { role: "operator_approver", name: "Operator", approved: true }
] as const;

test("buildCustomerReadinessReviewWorkflow approves launch escalation when every reviewer is approved", () => {
  const workflow = buildCustomerReadinessReviewWorkflow({
    owners: [...OWNERS],
    launchMode: "human_approved_execution"
  });

  assert.equal(workflow.status, "approved");
  assert.equal(workflow.launchEscalationAllowed, true);
  assert.equal(workflow.approvedCount, 7);
  assert.deepEqual(workflow.blockers, []);
});

test("buildCustomerReadinessReviewWorkflow marks assigned but unapproved reviewers as pending", () => {
  const workflow = buildCustomerReadinessReviewWorkflow({
    owners: OWNERS.map((owner) => owner.role === "finance_owner" ? { ...owner, approved: false } : owner),
    launchMode: "human_approved_execution"
  });

  assert.equal(workflow.status, "pending");
  assert.equal(workflow.launchEscalationAllowed, false);
  assert.ok(workflow.blockers.includes("Collect Finance owner approval."));
});

test("buildCustomerReadinessReviewWorkflow blocks when required reviewers are unassigned", () => {
  const workflow = buildCustomerReadinessReviewWorkflow({
    owners: OWNERS.filter((owner) => owner.role !== "channel_owner"),
    launchMode: "agent_managed_execution"
  });

  assert.equal(workflow.status, "blocked");
  assert.equal(workflow.launchEscalationAllowed, false);
  assert.ok(workflow.blockers.includes("Assign Channel owner."));
});
