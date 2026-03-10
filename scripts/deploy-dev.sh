#!/bin/bash
# Deploy to the DEV instance only (startup-kid-app-copy-d0e832ae.base44.app)
# This script temporarily strips heavy assets to fit Base44's 5MB site limit,
# then restores them after deploy.
#
# IMPORTANT: This does NOT deploy to production/main.
# Heavy assets (models, Startamons, large PNGs) are restored after deploy.
# For production deploys, a separate process should be used that includes all assets.

set -e

echo "=== Deploying to DEV instance ==="
echo "Target: startup-kid-app-copy-d0e832ae.base44.app"
echo ""

# 0. Auto-bump dev version (e.g., 0.1.0-dev.1 → 0.1.0-dev.2)
CURRENT_VERSION=$(node -p "require('./package.json').version")
if [[ "$CURRENT_VERSION" == *"-dev."* ]]; then
  DEV_NUM=$(echo "$CURRENT_VERSION" | grep -oP '(?<=dev\.)\d+')
  NEW_NUM=$((DEV_NUM + 1))
  NEW_VERSION=$(echo "$CURRENT_VERSION" | sed "s/dev\.$DEV_NUM/dev.$NEW_NUM/")
  npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version > /dev/null 2>&1
  echo "[0/5] Version: $CURRENT_VERSION → $NEW_VERSION"
else
  echo "[0/5] Version: $CURRENT_VERSION (not a dev version, skipping bump)"
fi

# 1. Move heavy assets to temp location
echo "[1/5] Moving heavy assets aside..."
BACKUP_DIR="/tmp/startup-kid-heavy-assets-$$"
mkdir -p "$BACKUP_DIR"

mv public/models "$BACKUP_DIR/" 2>/dev/null || true
mv public/Startamons "$BACKUP_DIR/" 2>/dev/null || true
find public -maxdepth 1 -name "*.png" -size +100k -exec mv {} "$BACKUP_DIR/" \;

# 2. Build with dev environment flag
echo "[2/5] Building..."
BUILD_ENV=dev npm run build
# Remove sourcemaps to stay under Base44's 5MB limit (keep for production deploys)
find dist -name "*.map" -delete 2>/dev/null || true

# 3. Check size
DIST_SIZE=$(du -sm dist/ | cut -f1)
echo "[3/5] Build size: ${DIST_SIZE}MB"
if [ "$DIST_SIZE" -gt 5 ]; then
  echo "ERROR: dist/ is ${DIST_SIZE}MB, exceeds Base44's 5MB limit"
  # Restore assets before exiting
  mv "$BACKUP_DIR"/models public/ 2>/dev/null || true
  mv "$BACKUP_DIR"/Startamons public/ 2>/dev/null || true
  mv "$BACKUP_DIR"/*.png public/ 2>/dev/null || true
  rm -rf "$BACKUP_DIR"
  exit 1
fi

# 4. Deploy
echo "[4/5] Deploying to Base44 dev instance..."
npx base44 deploy -y

# 5. Restore heavy assets
echo "[5/5] Restoring heavy assets..."
mv "$BACKUP_DIR"/models public/ 2>/dev/null || true
mv "$BACKUP_DIR"/Startamons public/ 2>/dev/null || true
mv "$BACKUP_DIR"/*.png public/ 2>/dev/null || true
rm -rf "$BACKUP_DIR"

FINAL_VERSION=$(node -p "require('./package.json').version")
echo ""
echo "=== Dev deploy complete ==="
echo "Version: $FINAL_VERSION"
echo "URL: https://startup-kid-app-copy-d0e832ae.base44.app"
