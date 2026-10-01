import { createHash } from "node:crypto";
import { canonicalExperienceInput } from "./experience-analysis";
import { actionPolicyEvidenceSnapshot, type ActionPolicyExperimentResult } from "./action-policy-experiment";
import type { ScorebookCaseInput } from "./compounding-expertise-lab";

export function actionPolicyReviewToken(result: ActionPolicyExperimentResult, rows: ScorebookCaseInput[], datasetKey: string) {
  return createHash("sha256").update(JSON.stringify({ datasetKey, source: canonicalExperienceInput(rows), result: actionPolicyEvidenceSnapshot(result) })).digest("hex");
}

export function assertActionPolicyReview(expected: string, result: ActionPolicyExperimentResult, rows: ScorebookCaseInput[], datasetKey: string) {
  const current = actionPolicyReviewToken(result, rows, datasetKey);
  if (!expected || expected !== current) throw new Error("The dataset, configuration, or experiment engine changed. Run and review the current result before applying it.");
  return current;
}
