#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:?target required (e.g. Lambda or Web)}"
STATUS="${2:?status required (success or failure)}"
DETAIL="${3:-}"

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "RESEND_API_KEY not set — skipping deploy email"
  exit 0
fi

DEPLOY_NOTIFY_EMAIL="${DEPLOY_NOTIFY_EMAIL:-dimitar@dimitar.ai}"
EMAIL_FROM="${EMAIL_FROM:-LinkedIn Finder <onboarding@resend.dev>}"
COMMIT_MSG="${GITHUB_EVENT_HEAD_COMMIT_MESSAGE:-(manual run)}"
SHORT_SHA="${GITHUB_SHA:0:7}"

if [[ "$STATUS" == "success" ]]; then
  SUBJECT="[jobs-reporter] ${TARGET} deploy succeeded (${SHORT_SHA})"
  OUTCOME="completed successfully"
else
  SUBJECT="[jobs-reporter] ${TARGET} deploy FAILED (${SHORT_SHA})"
  OUTCOME="failed"
fi

DETAIL_LINE=""
if [[ -n "$DETAIL" ]]; then
  DETAIL_LINE="<li>${DETAIL}</li>"
fi

HTML="<p><strong>${TARGET}</strong> deploy ${OUTCOME}.</p>
<ul>
  <li>Branch: <code>${GITHUB_REF_NAME}</code></li>
  <li>Commit: <code>${SHORT_SHA}</code></li>
  <li>Message: ${COMMIT_MSG}</li>
  <li>Actor: ${GITHUB_ACTOR}</li>
  ${DETAIL_LINE}
  <li><a href=\"${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}\">View workflow run</a></li>
</ul>"

curl -sS -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc \
    --arg from "$EMAIL_FROM" \
    --arg to "$DEPLOY_NOTIFY_EMAIL" \
    --arg subject "$SUBJECT" \
    --arg html "$HTML" \
    '{from: $from, to: [$to], subject: $subject, html: $html}')"
