#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_command aws

echo "This stores Cloudinary values in AWS Secrets Manager for ReelHire."
echo "Values are not printed."

normalize_cloudinary_value() {
  local name="$1"
  local value="$2"

  value="${value//$'\r'/}"
  value="${value//$'\n'/}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [[ "${value}" == "${name}="* ]]; then
    value="${value#${name}=}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
  fi
  if [[ "${#value}" -ge 2 ]]; then
    if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]] || [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi

  printf '%s' "${value}"
}

read -r -p "Cloudinary cloud name: " CLOUD_NAME
read -r -p "Cloudinary API key: " API_KEY
read -r -s -p "Cloudinary API secret: " API_SECRET
printf '\n'

CLOUD_NAME="$(normalize_cloudinary_value "CLOUDINARY_CLOUD_NAME" "${CLOUD_NAME}")"
API_KEY="$(normalize_cloudinary_value "CLOUDINARY_API_KEY" "${API_KEY}")"
API_SECRET="$(normalize_cloudinary_value "CLOUDINARY_API_SECRET" "${API_SECRET}")"

if [[ -z "${CLOUD_NAME}" || -z "${API_KEY}" || -z "${API_SECRET}" ]]; then
  echo "All Cloudinary values are required." >&2
  exit 1
fi

put_secret_string "${CLOUDINARY_CLOUD_NAME_SECRET}" "${CLOUD_NAME}" "ReelHire Cloudinary cloud name"
put_secret_string "${CLOUDINARY_API_KEY_SECRET}" "${API_KEY}" "ReelHire Cloudinary API key"
put_secret_string "${CLOUDINARY_API_SECRET_SECRET}" "${API_SECRET}" "ReelHire Cloudinary API secret"

echo "Cloudinary secrets stored: configured"
