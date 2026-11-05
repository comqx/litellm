#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dashboard="$root/ui-new/litellm-dashboard"

cd "$dashboard"
if [[ ! -d node_modules ]]; then
  npm ci
fi
rm -rf .next out
NEXT_TELEMETRY_DISABLED=1 npm run build

docker build \
  --no-cache \
  --platform linux/amd64 \
  -f "$root/ui-new/Dockerfile" \
  -t hub.glodon.com/glodon-pub/litellm-ui:v1.106.6-new \
  --push \
  "$root"
