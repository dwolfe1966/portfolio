-- Audience templates as a first-class library, decoupled from per-campaign
-- AudienceSegment rows. Segments may optionally reference a template so
-- campaigns can reuse and track template provenance.
CREATE TABLE "AudienceTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "audienceType" TEXT NOT NULL,
  "targetingJson" JSONB NOT NULL,
  "predictedCpcCents" INTEGER NOT NULL,
  "predictedCacCents" INTEGER NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AudienceTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AudienceTemplate_audienceType_idx" ON "AudienceTemplate"("audienceType");
CREATE INDEX "AudienceTemplate_createdAt_idx" ON "AudienceTemplate"("createdAt");

ALTER TABLE "AudienceSegment" ADD COLUMN "templateId" TEXT;
ALTER TABLE "AudienceSegment"
  ADD CONSTRAINT "AudienceSegment_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "AudienceTemplate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AudienceSegment_templateId_idx" ON "AudienceSegment"("templateId");
