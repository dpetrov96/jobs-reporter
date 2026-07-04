#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT/apps/web/dist"

: "${EC2_HOST:?EC2_HOST is required}"
: "${EC2_USER:?EC2_USER is required}"
: "${EC2_SSH_KEY:?EC2_SSH_KEY is required}"

DEPLOY_PATH="${EC2_DEPLOY_PATH:-/var/www/jobs-reporter}"
SSH_KEY_FILE="$(mktemp)"
trap 'rm -f "$SSH_KEY_FILE"' EXIT
printf '%s\n' "$EC2_SSH_KEY" > "$SSH_KEY_FILE"
chmod 600 "$SSH_KEY_FILE"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Missing build output at $DIST_DIR — run npm run build:web first"
  exit 1
fi

echo "Deploying web build to $EC2_USER@$EC2_HOST:$DEPLOY_PATH"
ssh -i "$SSH_KEY_FILE" -o StrictHostKeyChecking=accept-new "$EC2_USER@$EC2_HOST" \
  "sudo mkdir -p '$DEPLOY_PATH' && sudo chown -R $EC2_USER:$EC2_USER '$DEPLOY_PATH'"
rsync -avz --delete -e "ssh -i $SSH_KEY_FILE -o StrictHostKeyChecking=accept-new" \
  "$DIST_DIR/" "$EC2_USER@$EC2_HOST:$DEPLOY_PATH/"

echo "Done. Web app deployed."
