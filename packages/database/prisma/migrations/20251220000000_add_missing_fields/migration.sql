-- Add missing columns if they don't exist

-- Add capabilities to Tank if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tank' AND column_name = 'capabilities'
    ) THEN
        -- Create TankCapability enum if it doesn't exist
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TankCapability') THEN
                CREATE TYPE "TankCapability" AS ENUM ('FERMENTATION', 'CONDITIONING', 'SERVING', 'STORAGE');
            END IF;
        END $$;
        
        ALTER TABLE "Tank" ADD COLUMN "capabilities" "TankCapability"[] DEFAULT ARRAY[]::"TankCapability"[];
    END IF;
END $$;

-- Add targetOg to Batch if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Batch' AND column_name = 'targetOg'
    ) THEN
        ALTER TABLE "Batch" ADD COLUMN "targetOg" DECIMAL(5,4);
    END IF;
END $$;

-- Add other Tank fields if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tank' AND column_name = 'minFillPercent'
    ) THEN
        ALTER TABLE "Tank" ADD COLUMN "minFillPercent" INTEGER NOT NULL DEFAULT 20;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tank' AND column_name = 'maxFillPercent'
    ) THEN
        ALTER TABLE "Tank" ADD COLUMN "maxFillPercent" INTEGER NOT NULL DEFAULT 95;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tank' AND column_name = 'defaultTurnaroundHours'
    ) THEN
        ALTER TABLE "Tank" ADD COLUMN "defaultTurnaroundHours" INTEGER NOT NULL DEFAULT 4;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tank' AND column_name = 'currentLotId'
    ) THEN
        ALTER TABLE "Tank" ADD COLUMN "currentLotId" TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tank' AND column_name = 'currentPhase'
    ) THEN
        -- Create LotPhase enum if it doesn't exist
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LotPhase') THEN
                CREATE TYPE "LotPhase" AS ENUM ('FERMENTATION', 'CONDITIONING', 'BRIGHT', 'PACKAGING');
            END IF;
        END $$;
        
        ALTER TABLE "Tank" ADD COLUMN "currentPhase" "LotPhase";
    END IF;
END $$;













