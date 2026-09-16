-- Persist V0.2 UX system/environment structured assumptions.

ALTER TABLE "CompoundingExpertiseAnalysis"
  ADD COLUMN "economicCostWrongDecision" TEXT,
  ADD COLUMN "outcomeObjectivity" TEXT,
  ADD COLUMN "naturalFeedbackTime" TEXT,
  ADD COLUMN "customerCaseHeterogeneity" TEXT,
  ADD COLUMN "environmentalChangeRate" TEXT,
  ADD COLUMN "foundationModelImprovementRate" TEXT,
  ADD COLUMN "ownsDecisionPoint" TEXT,
  ADD COLUMN "observesOutcome" TEXT,
  ADD COLUMN "capturesOverrides" TEXT,
  ADD COLUMN "capturesGrades" TEXT,
  ADD COLUMN "learnsAcrossCustomers" TEXT,
  ADD COLUMN "contractualLearningRights" TEXT,
  ADD COLUMN "runsControlledExperiments" TEXT,
  ADD COLUMN "updatesModelPolicyRegularly" TEXT,
  ADD COLUMN "deploysImprovementsQuickly" TEXT;
