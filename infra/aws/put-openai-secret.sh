#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_command aws

echo "This stores the ReelHire project evaluator OpenAI API key in AWS Secrets Manager."
echo "The value will not be printed."

read -r -s -p "OPENAI_API_KEY: " OPENAI_API_KEY
echo

if [[ -z "${OPENAI_API_KEY}" ]]; then
  echo "OPENAI_API_KEY cannot be empty." >&2
  exit 1
fi

put_secret_string "${OPENAI_API_KEY_SECRET}" "${OPENAI_API_KEY}" "ReelHire OpenAI API key for project evaluation"

echo "OpenAI evaluator secret configured."
