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

lookup_fn_fuzzy() {
  local pattern="$1"
  aws lambda list-functions --region "$REGION" \
    --query "Functions[?contains(FunctionName, '${STACK_PREFIX}-${pattern}')].FunctionName | [0]" \
    --output text
}

echo "Building to $BUILD_DIR..."
cd "$ROOT"
cp "$ROOT/../packages/shared/src/countries.ts" "$ROOT/src/shared/countries.ts"
cp "$ROOT/../packages/shared/src/keywords.ts" "$ROOT/src/shared/keywords.ts"
cp "$ROOT/../packages/shared/src/schedule.ts" "$ROOT/src/shared/schedule.ts"
cp "$ROOT/../packages/shared/src/scrapeRegions.ts" "$ROOT/src/shared/scrapeRegions.ts"
cp "$ROOT/../packages/shared/src/analysisMeta.ts" "$ROOT/src/shared/analysisMeta.ts"
# Fallback: CI installs workspace deps at repo root before this script runs.
export PATH="$ROOT/../node_modules/.bin:$ROOT/node_modules/.bin:$PATH"
sam build --build-dir "$BUILD_DIR"

FUNCTIONS=(HealthFunction FetchJobsFunction FetchJobsUsFunction ListRunsFunction GetRunFunction TriggerFetchFunction RunAnalysisFunction ListAnalysesFunction GetAnalysisFunction GetAnalysisShareFunction StartAnalysisFunction EnrichCompanyDomainsFunction StartEnrichDomainsFunction)
BUNDLES=(
  "HealthFunction:health.js"
  "FetchJobsFunction:fetch-jobs.js"
  "FetchJobsUsFunction:fetch-jobs.js"
  "ListRunsFunction:list-runs.js"
  "GetRunFunction:get-run.js"
  "TriggerFetchFunction:trigger-fetch.js"
  "RunAnalysisFunction:run-analysis.js"
  "ListAnalysesFunction:list-analyses.js"
  "GetAnalysisFunction:get-analysis.js"
  "GetAnalysisShareFunction:get-analysis-share.js"
  "StartAnalysisFunction:start-analysis.js"
  "EnrichCompanyDomainsFunction:run-enrich-domains.js"
  "StartEnrichDomainsFunction:start-enrich-domains.js"
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
  if [[ -z "$fn_name" || "$fn_name" == "None" ]] && [[ "$dir" == "EnrichCompanyDomainsFunction" ]]; then
    fn_name="$(lookup_fn_fuzzy "EnrichCompanyDomains")"
  fi

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
