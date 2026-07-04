#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-/tmp/lambda-sam-build-$$}"
REGION="${AWS_REGION:-eu-central-1}"
STACK_PREFIX="${STACK_PREFIX:-lambda-linkedin-finder}"

lookup_fn() {
  local suffix="$1"
  aws lambda list-functions --region "$REGION" \
    --query "Functions[?contains(FunctionName, '${STACK_PREFIX}-${suffix}')].FunctionName | [0]" \
    --output text
}

echo "Building to $BUILD_DIR..."
cd "$ROOT"
cp "$ROOT/../packages/shared/src/countries.ts" "$ROOT/src/shared/countries.ts"
sam build --build-dir "$BUILD_DIR"

FUNCTIONS=(HealthFunction FetchJobsFunction ListRunsFunction GetRunFunction)
BUNDLES=(
  "HealthFunction:health.js"
  "FetchJobsFunction:fetch-jobs.js"
  "ListRunsFunction:list-runs.js"
  "GetRunFunction:get-run.js"
)

for fn in "${FUNCTIONS[@]}"; do
  js_file="$(find "$BUILD_DIR/$fn" -maxdepth 1 -name '*.js' ! -name '*.map' | head -1)"
  if [[ -z "$js_file" ]]; then
    echo "Build failed — no bundle for $fn."
    exit 1
  fi
done

echo "Uploading Lambda code to $REGION..."
for entry in "${BUNDLES[@]}"; do
  IFS=: read -r dir file <<< "$entry"
  fn_name="$(lookup_fn "$dir")"

  if [[ -z "$fn_name" || "$fn_name" == "None" ]]; then
    echo "Skipping $dir — Lambda not found. Run sam deploy for new API functions."
    continue
  fi

  echo "Deploying $file -> $fn_name"
  (cd "$BUILD_DIR/$dir" && zip -j "/tmp/$dir.zip" "$file")
  aws lambda update-function-code \
    --function-name "$fn_name" \
    --region "$REGION" \
    --zip-file "fileb:///tmp/$dir.zip" \
    --output text --query LastModified
done

echo "Done. Lambda code updated."
