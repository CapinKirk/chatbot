#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 2 ]]; then echo "usage: $0 <development|preview|production> <path-to-.env-file>"; exit 1; fi
: "${VERCEL_TOKEN:?set VERCEL_TOKEN}"
ENVIRONMENT="$1"; ENVFILE="$2"
if [[ ! -f ".vercel/project.json" ]]; then echo "Missing .vercel/project.json. Run 'vercel link' in this directory."; exit 1; fi
while IFS= read -r line; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"; val="${line#*=}"
  printf '%s' "$val" | vercel env add "$key" "$ENVIRONMENT" --yes --token "$VERCEL_TOKEN"
done < "$ENVFILE"
vercel env ls --token "$VERCEL_TOKEN"