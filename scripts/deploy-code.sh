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
sam build --build-dir "$BUILD_DIR"

for fn in HealthFunction FetchJobsFunction; do
  js_file="$(find "$BUILD_DIR/$fn" -maxdepth 1 -name '*.js' ! -name '*.map' | head -1)"
  if [[ -z "$js_file" ]]; then
    echo "Build failed — no bundle for $fn."
    exit 1
  fi
done

echo "Uploading Lambda code to $REGION..."
for entry in "HealthFunction:health.js" "FetchJobsFunction:fetch-jobs.js"; do
  IFS=: read -r dir file <<< "$entry"
  fn_name="$(lookup_fn "$dir")"

  if [[ -z "$fn_name" || "$fn_name" == "None" ]]; then
    echo "Lambda not found for $dir (prefix: $STACK_PREFIX)."
    exit 1
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
