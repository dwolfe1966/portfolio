#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d prisma/migrations ]]; then
  echo "ERROR: prisma/migrations directory is missing."
  exit 1
fi

if [[ -z "$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d)" ]]; then
  echo "ERROR: prisma/migrations has no migration subfolders."
  exit 1
fi

if ! rg -q "model AcquisitionCampaign" prisma/schema.prisma; then
  echo "ERROR: prisma/schema.prisma is missing AcquisitionCampaign model."
  exit 1
fi

if ! rg -q "enum AcquisitionCampaignState" prisma/schema.prisma; then
  echo "ERROR: prisma/schema.prisma is missing AcquisitionCampaignState enum."
  exit 1
fi

echo "Prisma artifact check passed."
