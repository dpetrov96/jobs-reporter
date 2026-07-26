#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT/apps/web/dist"

EC2_HOST="${EC2_HOST:-63.181.35.55}"
EC2_USER="${EC2_USER:-ubuntu}"
DEPLOY_PATH="${EC2_DEPLOY_PATH:-/var/www/jobs-reporter}"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Missing build output at $DIST_DIR — run npm run build:web first"
  exit 1
fi

SSH_KEY_FILE=""
CLEANUP_KEY_FILE=0

if [[ -n "${EC2_SSH_KEY_FILE:-}" ]]; then
  SSH_KEY_FILE="$EC2_SSH_KEY_FILE"
elif [[ -n "${EC2_SSH_KEY:-}" ]]; then
  SSH_KEY_FILE="$(mktemp)"
  CLEANUP_KEY_FILE=1
  printf '%s\n' "$EC2_SSH_KEY" > "$SSH_KEY_FILE"
  chmod 600 "$SSH_KEY_FILE"
else
  for candidate in \
    "$ROOT/.ec2/jobs-reporter-key.pem" \
    "$ROOT/.ec2/jobs-reporter-deploy.pem" \
    "$ROOT/.ec2/key.pem" \
    "$HOME/.ec2/jobs-reporter-deploy.pem" \
    "$HOME/jobs-reporter-deploy.pem" \
    "$HOME/Downloads/jobs-reporter-deploy.pem"; do
    if [[ -f "$candidate" ]]; then
      SSH_KEY_FILE="$candidate"
      break
    fi
  done
fi

if [[ -z "$SSH_KEY_FILE" || ! -f "$SSH_KEY_FILE" ]]; then
  echo "SSH key not found."
  echo "Set EC2_SSH_KEY_FILE to your PEM path, or place the key at:"
  echo "  $ROOT/.ec2/jobs-reporter-deploy.pem"
  exit 1
fi

chmod 600 "$SSH_KEY_FILE" 2>/dev/null || true

if [[ "$CLEANUP_KEY_FILE" -eq 1 ]]; then
  trap 'rm -f "$SSH_KEY_FILE"' EXIT
fi

echo "Deploying web build to $EC2_USER@$EC2_HOST:$DEPLOY_PATH"
ssh -i "$SSH_KEY_FILE" -o StrictHostKeyChecking=accept-new "$EC2_USER@$EC2_HOST" \
  "sudo mkdir -p '$DEPLOY_PATH' && sudo chown -R $EC2_USER:$EC2_USER '$DEPLOY_PATH'"
rsync -avz --delete -e "ssh -i $SSH_KEY_FILE -o StrictHostKeyChecking=accept-new" \
  "$DIST_DIR/" "$EC2_USER@$EC2_HOST:$DEPLOY_PATH/"

echo "Done. Web app deployed."
