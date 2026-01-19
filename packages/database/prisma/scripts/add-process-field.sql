-- Add process field to Recipe table
-- Run this SQL directly on your database if migration fails

-- Check if column already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Recipe' 
        AND column_name = 'process'
    ) THEN
        -- Add the process column as JSONB (PostgreSQL)
        ALTER TABLE "Recipe" 
        ADD COLUMN "process" JSONB;
        
        RAISE NOTICE 'Column "process" added to Recipe table';
    ELSE
        RAISE NOTICE 'Column "process" already exists in Recipe table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Recipe' 
AND column_name = 'process';















