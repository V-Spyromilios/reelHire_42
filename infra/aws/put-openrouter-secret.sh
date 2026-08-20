#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_command aws

echo "This stores the OpenRouter API key in AWS Secrets Manager for ReelHire."
echo "The key is not printed."

read -r -s -p "OpenRouter API key: " API_KEY
printf '\n'

API_KEY="${API_KEY//$'\r'/}"
API_KEY="${API_KEY//$'\n'/}"
API_KEY="${API_KEY#"${API_KEY%%[![:space:]]*}"}"
API_KEY="${API_KEY%"${API_KEY##*[![:space:]]}"}"
if [[ "${API_KEY}" == "OPENROUTER_API_KEY="* ]]; then
  API_KEY="${API_KEY#OPENROUTER_API_KEY=}"
fi

if [[ -z "${API_KEY}" ]]; then
  echo "An OpenRouter API key is required." >&2
  exit 1
fi

put_secret_string "${OPENROUTER_API_KEY_SECRET}" "${API_KEY}" "ReelHire OpenRouter API key"
echo "OpenRouter secret stored: configured"
