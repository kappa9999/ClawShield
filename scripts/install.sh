#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/kappa9999/ClawShield"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js first."
  exit 1
fi

npm install -g "$REPO_URL"

echo "Installed clawshield. Run: clawshield --help"
