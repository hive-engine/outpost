#!/usr/bin/env bash
# Weekly Bee Invaders payout trigger. Sources the app .env for ARCADE_ADMIN_TOKEN
# (+ PORT) and calls the in-app payout route on localhost. The route does the real
# work (pot from chain history, burn, eligibility, BBHBot broadcast) and no-ops if
# BBHBOT_ACTIVE_KEY / ARCADE_ADMIN_TOKEN aren't set. Pass --dry-run to preview.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

set -a
# shellcheck disable=SC1091
[ -f .env ] && . ./.env
set +a

PORT="${PORT:-8082}"
BODY='{}'
if [ "${1:-}" = "--dry-run" ]; then BODY='{"dryRun":true}'; fi

if [ -z "${ARCADE_ADMIN_TOKEN:-}" ]; then
  echo "ARCADE_ADMIN_TOKEN not set in $APP_DIR/.env — payout disabled." >&2
  exit 0
fi

curl -fsS -X POST "http://127.0.0.1:${PORT}/api/v1/games/payout" \
  -H "Content-Type: application/json" \
  -H "x-arcade-admin: ${ARCADE_ADMIN_TOKEN}" \
  -d "$BODY"
echo
