-- Add acquisition-focused constraints and indexes for campaign and test-cell workflows.

CREATE INDEX "AcquisitionCampaign_state_updatedAt_idx"
  ON "AcquisitionCampaign"("state", "updatedAt");

CREATE INDEX "AcquisitionCampaign_startAt_endAt_idx"
  ON "AcquisitionCampaign"("startAt", "endAt");

CREATE INDEX "AdCreative_campaignId_status_idx"
  ON "AdCreative"("campaignId", "status");

CREATE INDEX "AdCreative_campaignId_channel_idx"
  ON "AdCreative"("campaignId", "channel");

CREATE INDEX "AudienceSegment_campaignId_audienceType_idx"
  ON "AudienceSegment"("campaignId", "audienceType");

CREATE INDEX "AudienceSegment_campaignId_createdAt_idx"
  ON "AudienceSegment"("campaignId", "createdAt");

CREATE UNIQUE INDEX "TestCell_campaignId_creativeId_audienceId_key"
  ON "TestCell"("campaignId", "creativeId", "audienceId");

CREATE INDEX "TestCell_campaignId_status_idx"
  ON "TestCell"("campaignId", "status");

CREATE INDEX "BudgetActivity_campaignId_createdAt_idx"
  ON "BudgetActivity"("campaignId", "createdAt");

CREATE INDEX "BudgetActivity_fromTestCellId_idx"
  ON "BudgetActivity"("fromTestCellId");

CREATE INDEX "BudgetActivity_toTestCellId_idx"
  ON "BudgetActivity"("toTestCellId");

ALTER TABLE "BudgetActivity"
  ADD CONSTRAINT "BudgetActivity_fromTestCellId_fkey"
  FOREIGN KEY ("fromTestCellId") REFERENCES "TestCell"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "BudgetActivity"
  ADD CONSTRAINT "BudgetActivity_toTestCellId_fkey"
  FOREIGN KEY ("toTestCellId") REFERENCES "TestCell"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
