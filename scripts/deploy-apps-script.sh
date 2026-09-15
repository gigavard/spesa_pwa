#!/usr/bin/env bash
set -euo pipefail

: "${CLASPRC_JSON:?CLASPRC_JSON is required}"
: "${DEPLOYMENT_ID:?DEPLOYMENT_ID is required}"

printf '%s' "$CLASPRC_JSON" > "$HOME/.clasprc.json"
chmod 600 "$HOME/.clasprc.json"

npx --yes @google/clasp@3.1.0 show-file-status
npx --yes @google/clasp@3.1.0 push --force
npx --yes @google/clasp@3.1.0 update-deployment "$DEPLOYMENT_ID" --description "GitHub ${GITHUB_SHA:-manual}"
