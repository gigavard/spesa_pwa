#!/usr/bin/env bash
set -euo pipefail

: "${CLASPRC_JSON:?CLASPRC_JSON is required}"
: "${DEPLOYMENT_ID:?DEPLOYMENT_ID is required}"

printf '%s' "$CLASPRC_JSON" > "$HOME/.clasprc.json"
chmod 600 "$HOME/.clasprc.json"

CLASP='npx --yes @google/clasp@3.3.0'

$CLASP show-file-status
$CLASP push --force
$CLASP update-deployment "$DEPLOYMENT_ID" --description "GitHub ${GITHUB_SHA:-manual}"
