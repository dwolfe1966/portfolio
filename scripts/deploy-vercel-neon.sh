#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  VERCEL_TOKEN
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID
  DATABASE_URL
  DATABASE_URL_UNPOOLED
  NEXT_PUBLIC_SITE_URL
  ACCOUNT_SESSION_SECRET
)

for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
done

run() {
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

seed_prod="${SEED_PROD:-no}"

if [[ ! -d node_modules ]]; then
  run "npm install"
fi

run "npm run db:generate"

if compgen -G "prisma/migrations/*" > /dev/null; then
  echo "Migrations found: running prisma migrate deploy"
  run "npm run db:migrate:deploy"
else
  echo "No migrations found: running prisma db push"
  run "npx prisma db push"
fi

if [[ "$seed_prod" == "yes" ]]; then
  echo "SEED_PROD=yes: running npm run db:seed"
  run "npm run db:seed"
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Installing Vercel CLI"
  run "npm i -g vercel"
fi

upsert_vercel_env() {
  local key="$1"
  local value="$2"

  run "vercel env rm '$key' production --yes --token '$VERCEL_TOKEN' --scope '$VERCEL_ORG_ID' >/dev/null 2>&1 || true"
  run "printf '%s' '$value' | vercel env add '$key' production --token '$VERCEL_TOKEN' --scope '$VERCEL_ORG_ID'"
}

upsert_vercel_env "DATABASE_URL" "$DATABASE_URL"
upsert_vercel_env "DATABASE_URL_UNPOOLED" "$DATABASE_URL_UNPOOLED"
upsert_vercel_env "ACCOUNT_SESSION_SECRET" "$ACCOUNT_SESSION_SECRET"
upsert_vercel_env "NEXT_PUBLIC_SITE_URL" "$NEXT_PUBLIC_SITE_URL"

run "vercel pull --yes --environment=production --token '$VERCEL_TOKEN' --scope '$VERCEL_ORG_ID'"
run "vercel deploy --prod --yes --token '$VERCEL_TOKEN' --scope '$VERCEL_ORG_ID'"

echo "Deployment flow completed."
