#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <development|preview|production> <path-to-.env-file>"
  exit 1
fi

ENVIRONMENT="$1"
ENVFILE="$2"

: "${VERCEL_TOKEN:?set VERCEL_TOKEN env var with a Vercel personal access token}"

if [[ ! -f ".vercel/project.json" ]]; then
  echo "Run 'vercel link' once, or write .vercel/project.json with orgId and projectId"
  exit 1
fi

# Skip comments and blank lines. Accept KEY=VALUE. Pipe value to CLI to avoid prompts.
while IFS= read -r line; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  if [[ -z "$key" ]]; then continue; fi
  printf '%s' "$val" | vercel env add "$key" "$ENVIRONMENT" --yes --token "$VERCEL_TOKEN"
done < "$ENVFILE"

vercel env ls --token "$VERCEL_TOKEN"

