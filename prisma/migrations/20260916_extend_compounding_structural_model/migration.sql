-- Extend Compounding Expertise Lab structural model with company layers, CaseSet windows, and case lineage.

ALTER TABLE "CompoundingExpertiseAnalysis"
  ADD COLUMN "companyUrl" TEXT,
  ADD COLUMN "productCategory" TEXT,
  ADD COLUMN "businessModel" TEXT,
  ADD COLUMN "actionSpace" TEXT,
  ADD COLUMN "companyStage" TEXT,
  ADD COLUMN "caseFrequency" TEXT,
  ADD COLUMN "controlsAction" TEXT,
  ADD COLUMN "dataExclusivity" TEXT,
  ADD COLUMN "workflowEmbeddedness" TEXT,
  ADD COLUMN "switchingCostsAssumption" TEXT,
  ADD COLUMN "rebuildability" TEXT,
  ADD COLUMN "foundationModelDependence" TEXT,
  ADD COLUMN "deterministicInfrastructure" TEXT,
  ADD COLUMN "distributionAdvantage" TEXT,
  ADD COLUMN "regulatoryContractualBarriers" TEXT;

ALTER TABLE "CompoundingExpertiseCaseSet"
  ADD COLUMN "timeWindowStart" TIMESTAMP(3),
  ADD COLUMN "timeWindowEnd" TIMESTAMP(3);

ALTER TABLE "CompoundingExpertiseCase"
  ADD COLUMN "actionAt" TIMESTAMP(3),
  ADD COLUMN "sourceRecordId" TEXT,
  ADD COLUMN "sourceRecordType" TEXT,
  ADD COLUMN "sourceRecordRoute" TEXT;

CREATE INDEX "CompoundingExpertiseCase_sourceRecordType_sourceRecordId_idx"
  ON "CompoundingExpertiseCase"("sourceRecordType", "sourceRecordId");
