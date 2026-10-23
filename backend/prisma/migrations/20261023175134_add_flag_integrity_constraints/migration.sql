-- This is an empty migration.
ALTER TABLE "Flag"
ADD CONSTRAINT "Flag_rolloutPercentage_range_check"
CHECK ("rolloutPercentage" >= 0 AND "rolloutPercentage" <= 100);

ALTER TABLE "Flag"
ADD CONSTRAINT "Flag_version_positive_check"
CHECK ("version" >= 1);