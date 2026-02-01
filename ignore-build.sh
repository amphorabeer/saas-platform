#!/bin/bash

echo "Checking if saas-hotel needs rebuild..."

# Check if apps/hotel or packages changed
git diff --quiet HEAD^ HEAD -- apps/hotel/ packages/

if [ $? -eq 0 ]; then
  echo "No changes in apps/hotel or packages - skipping build"
  exit 0
else
  echo "Changes detected - proceeding with build"
  exit 1
fi