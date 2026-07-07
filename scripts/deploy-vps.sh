#!/bin/sh
set -eu
set +x

SERVER="${SERVER:-root@45.9.188.118}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/careguide}"
BRANCH="${BRANCH:-main}"
APP_PORT="${APP_PORT:-7100}"
ENV_FILE="${ENV_FILE:-.env.production}"

: "${GIT_REPOSITORY_URL:?GIT_REPOSITORY_URL is required}"
test -f "$ENV_FILE" || { echo "$ENV_FILE is missing" >&2; exit 1; }

if ssh "$SERVER" "ss -ltn | awk '{print \$4}' | grep -Eq '(^|:)$APP_PORT$' && ! docker ps --format '{{.Names}}' | grep -qx careguide-app"; then
  echo "Port $APP_PORT is already occupied" >&2
  exit 1
fi

ssh "$SERVER" "mkdir -p '$REMOTE_DIR' && if [ -d '$REMOTE_DIR/.git' ]; then cd '$REMOTE_DIR'; test -z \"\$(git status --porcelain)\"; git fetch origin '$BRANCH'; git checkout '$BRANCH'; git merge --ff-only 'origin/$BRANCH'; else test -z \"\$(ls -A '$REMOTE_DIR')\"; git clone --branch '$BRANCH' '$GIT_REPOSITORY_URL' '$REMOTE_DIR'; fi"
scp "$ENV_FILE" "$SERVER:$REMOTE_DIR/.env.production"
ssh "$SERVER" "chmod 600 '$REMOTE_DIR/.env.production'; cd '$REMOTE_DIR'; export IMAGE_TAG=\$(git rev-parse --short=12 HEAD) GIT_REVISION=\$(git rev-parse HEAD) BUILD_DATE=\$(date -u +%FT%TZ); docker compose -f compose.production.yml build app worker; docker compose -f compose.production.yml --profile tools run --rm migrate; docker compose -f compose.production.yml up -d app worker; curl --retry 12 --retry-delay 5 --retry-connrefused -fsS 'http://127.0.0.1:$APP_PORT/api/health/live'"

echo "Application is healthy on $SERVER loopback port $APP_PORT. Configure or verify Nginx and HTTPS separately."
