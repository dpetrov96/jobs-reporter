#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="/tmp/lambda-sam-build-$$"

echo "Building to $BUILD_DIR..."
cd "$ROOT"
sam build --build-dir "$BUILD_DIR" 2>/dev/null || true

for fn in HealthFunction FetchJobsFunction; do
  js_file="$(find "$BUILD_DIR/$fn" -maxdepth 1 -name '*.js' ! -name '*.map' | head -1)"
  if [[ -z "$js_file" ]]; then
    echo "Build failed — no bundle for $fn."
    echo "Fix permissions: sudo chown -R \$(whoami) .aws-sam && npm run build"
    exit 1
  fi
done

echo "Uploading Lambda code..."
for entry in "HealthFunction:health.js:lambda-linkedin-finder-HealthFunction-D4xk2A4984JY" \
             "FetchJobsFunction:fetch-jobs.js:lambda-linkedin-finder-FetchJobsFunction-7eEN47TavFpY"; do
  IFS=: read -r dir file name <<< "$entry"
  (cd "$BUILD_DIR/$dir" && zip -j "/tmp/$dir.zip" "$file")
  aws lambda update-function-code \
    --function-name "$name" \
    --region eu-central-1 \
    --zip-file "fileb:///tmp/$dir.zip" \
    --output text --query LastModified
done

echo "Done. Lambda code updated."
echo "For env changes use: sam deploy --parameter-overrides \"ReportEmailTo=you@email.com ...\""
echo "Or: aws lambda update-function-configuration"
