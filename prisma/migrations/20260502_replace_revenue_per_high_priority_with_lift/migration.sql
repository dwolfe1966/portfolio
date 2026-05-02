-- Replace standalone revenuePerHighPriority with derivable highPriorityLift.
-- Revenue is now computed as purchaseRate * avgOrderValue * highPriorityLift,
-- keeping funnel inputs and revenue projection internally consistent.
ALTER TABLE "AssumptionSet"
ADD COLUMN "highPriorityLift" DOUBLE PRECISION NOT NULL DEFAULT 1.5;

ALTER TABLE "AssumptionSet"
DROP COLUMN "revenuePerHighPriority";
