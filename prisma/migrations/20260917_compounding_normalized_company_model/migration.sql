-- Add normalized Compounding Expertise company, workflow, decision-system, architecture, and evidence models.
-- This migration is additive: existing analyses, CaseSets, and cases remain valid.

CREATE TABLE "CompoundingCompanyProfile" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "website" TEXT,
  "industry" TEXT,
  "productCategory" TEXT,
  "productDescription" TEXT,
  "companyStage" TEXT,
  "geography" TEXT,
  "customerType" TEXT,
  "customerSegments" TEXT,
  "revenueModel" TEXT,
  "pricingUnit" TEXT,
  "businessModelNotes" TEXT,
  "grossMarginProfile" TEXT,
  "economicValueUnit" TEXT,
  "economicsNotes" TEXT,
  "marketContext" TEXT,
  "analystThesis" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingCompanyProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingWorkflow" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "companyProfileId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingWorkflowStage" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "stageType" TEXT NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingWorkflowStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingDecisionClass" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "workflowStageId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "decisionMakerType" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "decisionFrequency" TEXT,
  "estimatedCasesPerPeriod" DOUBLE PRECISION,
  "frequencyPeriod" TEXT,
  "economicStakes" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "reversibility" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "regulatoryRisk" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "operationalRisk" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "outcomeObservability" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "gradeObjectivity" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "naturalFeedbackLatencyDays" DOUBLE PRECISION,
  "humanReviewMode" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "currentAutonomyMode" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingDecisionClass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingDecisionAction" (
  "id" TEXT NOT NULL,
  "decisionClassId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "reversible" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "requiresHumanApproval" BOOLEAN NOT NULL DEFAULT false,
  "economicExposure" TEXT,
  "regulatoryExposure" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingDecisionAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingEnvironment" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "naturalCaseFrequency" TEXT,
  "estimatedCasesPerPeriod" DOUBLE PRECISION,
  "frequencyPeriod" TEXT,
  "typicalEconomicCostOfError" TEXT,
  "typicalValueOfCorrectDecision" TEXT,
  "outcomeObservability" TEXT,
  "outcomeObjectivity" TEXT,
  "naturalFeedbackLatencyDays" DOUBLE PRECISION,
  "customerHeterogeneity" TEXT,
  "caseHeterogeneity" TEXT,
  "environmentalNonstationarity" TEXT,
  "regulatoryChangeRate" TEXT,
  "foundationModelImprovementRate" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingEnvironment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingLearningArchitecture" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "capturesContext" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "capturesAgentDecision" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "capturesHumanDecision" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "capturesActionTaken" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "capturesOutcome" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "capturesExplicitGrade" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "outcomeCompletionMechanism" TEXT,
  "gradeGenerationMethod" TEXT,
  "feedbackLatencyMechanism" TEXT,
  "pooledAcrossCustomers" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "customerSpecificAdaptation" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "usesHumanOverridesForLearning" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "usesOutcomeGradesForLearning" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "experimentationMode" TEXT,
  "modelUpdateCadence" TEXT,
  "policyUpdateCadence" TEXT,
  "deploymentMode" TEXT,
  "deploymentCadence" TEXT,
  "humanApprovalForPolicyChanges" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "canRetainCases" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "canRetainDerivedFeatures" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "canTrainAcrossCustomers" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "canUseForEvaluation" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "contractualRestrictions" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingLearningArchitecture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingCompetitiveArchitecture" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "rawCasesExclusive" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "outcomesExclusive" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "humanCorrectionsExclusive" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "crossCustomerPoolExclusive" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "customerCanExportData" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "competitorCanAccessEquivalentData" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "systemOfRecord" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "systemOfDecision" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "systemOfAction" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "systemOfOutcomeCapture" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "integrationDepth" TEXT,
  "replacementComplexity" TEXT,
  "publicDataSubstitutionRisk" TEXT,
  "syntheticDataSubstitutionRisk" TEXT,
  "foundationModelSubstitutionRisk" TEXT,
  "competitorRelearningDifficulty" TEXT,
  "deterministicInfrastructureStrength" TEXT,
  "distributionAdvantage" TEXT,
  "regulatoryBarrierStrength" TEXT,
  "contractualBarrierStrength" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingCompetitiveArchitecture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingEvidence" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "fieldKey" TEXT NOT NULL,
  "evidenceType" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "epistemicStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "valueSnapshot" TEXT,
  "sourceLabel" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceRecordId" TEXT,
  "sourceCaseSetId" TEXT,
  "confidence" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "observedAt" TIMESTAMP(3),
  "derivationMethod" TEXT,
  "analystNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingAnalystOverride" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "fieldKey" TEXT NOT NULL,
  "overrideValue" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingAnalystOverride_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CompoundingExpertiseCaseSet"
  ADD COLUMN "workflowId" TEXT,
  ADD COLUMN "decisionClassId" TEXT;

ALTER TABLE "CompoundingExpertiseCase"
  ADD COLUMN "decisionClassId" TEXT,
  ADD COLUMN "agentDecisionActionId" TEXT,
  ADD COLUMN "humanDecisionActionId" TEXT,
  ADD COLUMN "actionTakenActionId" TEXT;

CREATE UNIQUE INDEX "CompoundingCompanyProfile_analysisId_key" ON "CompoundingCompanyProfile"("analysisId");
CREATE INDEX "CompoundingCompanyProfile_name_idx" ON "CompoundingCompanyProfile"("name");
CREATE INDEX "CompoundingCompanyProfile_productCategory_idx" ON "CompoundingCompanyProfile"("productCategory");
CREATE INDEX "CompoundingWorkflow_analysisId_position_idx" ON "CompoundingWorkflow"("analysisId", "position");
CREATE INDEX "CompoundingWorkflow_companyProfileId_idx" ON "CompoundingWorkflow"("companyProfileId");
CREATE INDEX "CompoundingWorkflowStage_workflowId_position_idx" ON "CompoundingWorkflowStage"("workflowId", "position");
CREATE INDEX "CompoundingWorkflowStage_stageType_idx" ON "CompoundingWorkflowStage"("stageType");
CREATE INDEX "CompoundingDecisionClass_analysisId_name_idx" ON "CompoundingDecisionClass"("analysisId", "name");
CREATE INDEX "CompoundingDecisionClass_workflowId_idx" ON "CompoundingDecisionClass"("workflowId");
CREATE INDEX "CompoundingDecisionClass_workflowStageId_idx" ON "CompoundingDecisionClass"("workflowStageId");
CREATE UNIQUE INDEX "CompoundingDecisionAction_decisionClassId_key_key" ON "CompoundingDecisionAction"("decisionClassId", "key");
CREATE INDEX "CompoundingDecisionAction_decisionClassId_idx" ON "CompoundingDecisionAction"("decisionClassId");
CREATE UNIQUE INDEX "CompoundingEnvironment_analysisId_key" ON "CompoundingEnvironment"("analysisId");
CREATE UNIQUE INDEX "CompoundingLearningArchitecture_analysisId_key" ON "CompoundingLearningArchitecture"("analysisId");
CREATE UNIQUE INDEX "CompoundingCompetitiveArchitecture_analysisId_key" ON "CompoundingCompetitiveArchitecture"("analysisId");
CREATE INDEX "CompoundingEvidence_analysisId_entityType_fieldKey_idx" ON "CompoundingEvidence"("analysisId", "entityType", "fieldKey");
CREATE INDEX "CompoundingEvidence_analysisId_epistemicStatus_idx" ON "CompoundingEvidence"("analysisId", "epistemicStatus");
CREATE INDEX "CompoundingEvidence_sourceCaseSetId_idx" ON "CompoundingEvidence"("sourceCaseSetId");
CREATE INDEX "CompoundingAnalystOverride_analysisId_entityType_fieldKey_idx" ON "CompoundingAnalystOverride"("analysisId", "entityType", "fieldKey");
CREATE INDEX "CompoundingExpertiseCaseSet_workflowId_idx" ON "CompoundingExpertiseCaseSet"("workflowId");
CREATE INDEX "CompoundingExpertiseCaseSet_decisionClassId_idx" ON "CompoundingExpertiseCaseSet"("decisionClassId");
CREATE INDEX "CompoundingExpertiseCase_decisionClassId_decisionAt_idx" ON "CompoundingExpertiseCase"("decisionClassId", "decisionAt");
CREATE INDEX "CompoundingExpertiseCase_agentDecisionActionId_idx" ON "CompoundingExpertiseCase"("agentDecisionActionId");
CREATE INDEX "CompoundingExpertiseCase_humanDecisionActionId_idx" ON "CompoundingExpertiseCase"("humanDecisionActionId");
CREATE INDEX "CompoundingExpertiseCase_actionTakenActionId_idx" ON "CompoundingExpertiseCase"("actionTakenActionId");

ALTER TABLE "CompoundingCompanyProfile" ADD CONSTRAINT "CompoundingCompanyProfile_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingWorkflow" ADD CONSTRAINT "CompoundingWorkflow_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingWorkflow" ADD CONSTRAINT "CompoundingWorkflow_companyProfileId_fkey"
  FOREIGN KEY ("companyProfileId") REFERENCES "CompoundingCompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompoundingWorkflowStage" ADD CONSTRAINT "CompoundingWorkflowStage_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "CompoundingWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingDecisionClass" ADD CONSTRAINT "CompoundingDecisionClass_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingDecisionClass" ADD CONSTRAINT "CompoundingDecisionClass_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "CompoundingWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingDecisionClass" ADD CONSTRAINT "CompoundingDecisionClass_workflowStageId_fkey"
  FOREIGN KEY ("workflowStageId") REFERENCES "CompoundingWorkflowStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompoundingDecisionAction" ADD CONSTRAINT "CompoundingDecisionAction_decisionClassId_fkey"
  FOREIGN KEY ("decisionClassId") REFERENCES "CompoundingDecisionClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingEnvironment" ADD CONSTRAINT "CompoundingEnvironment_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingLearningArchitecture" ADD CONSTRAINT "CompoundingLearningArchitecture_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingCompetitiveArchitecture" ADD CONSTRAINT "CompoundingCompetitiveArchitecture_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingEvidence" ADD CONSTRAINT "CompoundingEvidence_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingAnalystOverride" ADD CONSTRAINT "CompoundingAnalystOverride_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseCaseSet" ADD CONSTRAINT "CompoundingExpertiseCaseSet_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "CompoundingWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseCaseSet" ADD CONSTRAINT "CompoundingExpertiseCaseSet_decisionClassId_fkey"
  FOREIGN KEY ("decisionClassId") REFERENCES "CompoundingDecisionClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseCase" ADD CONSTRAINT "CompoundingExpertiseCase_decisionClassId_fkey"
  FOREIGN KEY ("decisionClassId") REFERENCES "CompoundingDecisionClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseCase" ADD CONSTRAINT "CompoundingExpertiseCase_agentDecisionActionId_fkey"
  FOREIGN KEY ("agentDecisionActionId") REFERENCES "CompoundingDecisionAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseCase" ADD CONSTRAINT "CompoundingExpertiseCase_humanDecisionActionId_fkey"
  FOREIGN KEY ("humanDecisionActionId") REFERENCES "CompoundingDecisionAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseCase" ADD CONSTRAINT "CompoundingExpertiseCase_actionTakenActionId_fkey"
  FOREIGN KEY ("actionTakenActionId") REFERENCES "CompoundingDecisionAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
