-- Alter gravity columns to allow larger values (Plato format up to 30°P)
-- Change from DECIMAL(5,4) to DECIMAL(6,3)

-- GravityReading table
ALTER TABLE "GravityReading" 
  ALTER COLUMN "gravity" TYPE DECIMAL(6,3);

-- Batch table
ALTER TABLE "Batch" 
  ALTER COLUMN "originalGravity" TYPE DECIMAL(6,3),
  ALTER COLUMN "currentGravity" TYPE DECIMAL(6,3),
  ALTER COLUMN "finalGravity" TYPE DECIMAL(6,3),
  ALTER COLUMN "targetOg" TYPE DECIMAL(6,3);

-- Recipe table
ALTER TABLE "Recipe" 
  ALTER COLUMN "og" TYPE DECIMAL(6,3),
  ALTER COLUMN "fg" TYPE DECIMAL(6,3);
