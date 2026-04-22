#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${NEXT_PUBLIC_SITE_URL:-}" ]]; then
  echo "Missing NEXT_PUBLIC_SITE_URL" >&2
  exit 1
fi

base="${NEXT_PUBLIC_SITE_URL%/}"

echo "Smoke testing $base"

check_get() {
  local path="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$base$path")
  echo "$path -> $code"
  [[ "$code" =~ ^2|3 ]] || return 1
}

check_get "/"
check_get "/about"
check_get "/demo/login"
check_get "/demo/dashboard"

echo "Smoke tests passed."
