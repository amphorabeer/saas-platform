-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'Georgia',
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "website" TEXT;
