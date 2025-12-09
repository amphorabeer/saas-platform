-- Step 1: Add column as nullable first
ALTER TABLE "Organization" ADD COLUMN "hotelCode" TEXT;

-- Step 2: Generate unique 4-digit codes for existing organizations
UPDATE "Organization" SET "hotelCode" = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') WHERE "hotelCode" IS NULL;

-- Step 3: Ensure all codes are unique (regenerate if duplicates)
DO $$
DECLARE
    rec RECORD;
    new_code TEXT;
BEGIN
    FOR rec IN 
        SELECT id FROM "Organization" WHERE "hotelCode" IN (
            SELECT "hotelCode" FROM "Organization" GROUP BY "hotelCode" HAVING COUNT(*) > 1
        )
    LOOP
        new_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        WHILE EXISTS (SELECT 1 FROM "Organization" WHERE "hotelCode" = new_code) LOOP
            new_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        END LOOP;
        UPDATE "Organization" SET "hotelCode" = new_code WHERE id = rec.id;
    END LOOP;
END $$;

-- Step 4: Make column NOT NULL
ALTER TABLE "Organization" ALTER COLUMN "hotelCode" SET NOT NULL;

-- Step 5: Add unique constraint
CREATE UNIQUE INDEX "Organization_hotelCode_key" ON "Organization"("hotelCode");
