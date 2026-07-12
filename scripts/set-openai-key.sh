#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-eu-central-1}"
STACK_PREFIX="${STACK_PREFIX:-lambda-linkedin-finder}"
PARAM_NAME="${OPENAI_API_KEY_PARAM:-/lambda-linkedin-finder/openai-api-key}"

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "OPENAI_API_KEY is required. Example:"
  echo "  OPENAI_API_KEY='sk-...' bash scripts/set-openai-key.sh"
  exit 1
fi

echo "Storing OpenAI key in SSM Parameter Store: $PARAM_NAME"
aws ssm put-parameter \
  --region "$REGION" \
  --name "$PARAM_NAME" \
  --value "$OPENAI_API_KEY" \
  --type SecureString \
  --overwrite \
  --query 'Version' \
  --output text >/dev/null
echo "SSM parameter updated."

update_lambda_env() {
  local fn_suffix="$1"
  local fn_name
  fn_name="$(aws lambda list-functions --region "$REGION" \
    --query "Functions[?contains(FunctionName, '${STACK_PREFIX}-${fn_suffix}')].FunctionName | [0]" \
    --output text)"

  if [[ -z "$fn_name" || "$fn_name" == "None" ]]; then
    echo "Skip $fn_suffix — Lambda not found"
    return
  fi

  local tmp
  tmp="$(mktemp)"
  aws lambda get-function-configuration \
    --function-name "$fn_name" \
    --region "$REGION" \
    --query 'Environment.Variables' \
    --output json \
  | python3 -c "
import json, os, sys
vars = json.load(sys.stdin)
vars.pop('OPENAI_API_KEY', None)
vars['OPENAI_API_KEY_PARAM'] = os.environ['OPENAI_API_KEY_PARAM']
if not vars.get('OPENAI_MODEL'):
    vars['OPENAI_MODEL'] = 'gpt-4o-mini'
json.dump({'Variables': vars}, open(sys.argv[1], 'w'))
" "$tmp"

  aws lambda update-function-configuration \
    --function-name "$fn_name" \
    --region "$REGION" \
    --environment "file://$tmp" \
    --query 'FunctionName' \
    --output text

  rm -f "$tmp"
  echo "Updated $fn_name (reads key from SSM, not Lambda env)"
}

export OPENAI_API_KEY_PARAM="$PARAM_NAME"
echo "Configuring analysis Lambdas..."
update_lambda_env "RunAnalysisFunction"
update_lambda_env "StartAnalysisFunction"
echo "Done. Key survives sam deploy — stored in SSM only."
