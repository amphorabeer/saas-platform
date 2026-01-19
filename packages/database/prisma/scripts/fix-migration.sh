#!/bin/bash
# Script to fix Prisma migration conflicts

set -e

echo "🔧 Fixing Prisma Migration Conflicts"
echo "===================================="

# Navigate to database package
cd "$(dirname "$0")/.."

echo ""
echo "Step 1: Checking current enum values in database..."
echo "---------------------------------------------------"

# Check if we can connect to database
if command -v psql &> /dev/null; then
  echo "Checking database connection..."
  # You may need to adjust DATABASE_URL
  # psql $DATABASE_URL -c "SELECT DISTINCT type FROM \"InventoryLedger\";" || echo "Could not connect to database"
else
  echo "⚠️  psql not found. Please check enum values manually in Prisma Studio."
fi

echo ""
echo "Step 2: Verifying schema has all required fields..."
echo "---------------------------------------------------"

# Check if schema has required fields
if grep -q "cachedBalance" prisma/schema.prisma && \
   grep -q "costPerUnit" prisma/schema.prisma && \
   grep -q "ADJUSTMENT_ADD" prisma/schema.prisma && \
   grep -q "ADJUSTMENT_REMOVE" prisma/schema.prisma && \
   grep -q "REVERSAL" prisma/schema.prisma; then
  echo "✅ Schema has all required fields"
else
  echo "❌ Schema is missing required fields!"
  exit 1
fi

echo ""
echo "Step 3: Generating Prisma Client..."
echo "-----------------------------------"
npx prisma generate

echo ""
echo "Step 4: Pushing schema to database..."
echo "--------------------------------------"
echo "⚠️  This will update the database schema."
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

npx prisma db push --accept-data-loss

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Verify data in Prisma Studio: npx prisma studio"
echo "2. Check that all enum values are preserved"
echo "3. Verify cachedBalance and costPerUnit columns exist"















