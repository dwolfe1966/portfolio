import { createHash } from "node:crypto";
import { analyzeExperience, canonicalExperienceInput, EXPERIENCE_ENGINE_VERSION } from "./experience-analysis";
import type { ScorebookCaseInput } from "./compounding-expertise-lab";

export function createExperienceRun(rows: ScorebookCaseInput[], source: { analysisId: string; datasetKey: string; datasetName: string; provenance: string }) {
  const inputSnapshot = JSON.parse(canonicalExperienceInput(rows)) as string[];
  const revision = createHash("sha256").update(JSON.stringify({ source, inputSnapshot })).digest("hex");
  return { runId: `${EXPERIENCE_ENGINE_VERSION}:${revision}`, revision, source, engineVersion: EXPERIENCE_ENGINE_VERSION, inputSnapshot: inputSnapshot.map(row => JSON.parse(row)), report: analyzeExperience(rows) };
}
