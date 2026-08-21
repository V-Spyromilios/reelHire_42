#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

configured_region="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"
if [[ -z "${configured_region}" ]]; then
  configured_region="$(aws configure get region 2>/dev/null || true)"
fi
export AWS_REGION="${configured_region:-eu-central-1}"
export AWS_PAGER=""

PREFIX="${PREFIX:-reelhire}"
CLUSTER_NAME="${PREFIX}-cluster"
FRONTEND_REPO="${PREFIX}-frontend"
BACKEND_REPO="${PREFIX}-backend"
FRONTEND_FAMILY="${PREFIX}-frontend"
BACKEND_FAMILY="${PREFIX}-backend"
MIGRATION_FAMILY="${PREFIX}-migration"
FRONTEND_SERVICE="${PREFIX}-frontend-service"
BACKEND_SERVICE="${PREFIX}-backend-service"
ALB_NAME="${PREFIX}-alb"
FRONTEND_TG_NAME="${PREFIX}-frontend"
BACKEND_TG_NAME="${PREFIX}-backend"
DB_IDENTIFIER="${PREFIX}-db"
DB_NAME="${DB_NAME:-reelhire}"
DB_USER="${DB_USER:-reelhire}"
DB_INSTANCE_CLASS="${DB_INSTANCE_CLASS:-db.t4g.micro}"
DB_ENGINE_VERSION="${DB_ENGINE_VERSION:-}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-7}"
EXECUTION_ROLE_NAME="${PREFIX}-ecs-task-execution-role"
TASK_ROLE_NAME="${PREFIX}-ecs-task-role"
DATABASE_URL_SECRET="${PREFIX}/database-url"
DB_PASSWORD_SECRET="${PREFIX}/db-password"
CLOUDINARY_CLOUD_NAME_SECRET="${PREFIX}/cloudinary-cloud-name"
CLOUDINARY_API_KEY_SECRET="${PREFIX}/cloudinary-api-key"
CLOUDINARY_API_SECRET_SECRET="${PREFIX}/cloudinary-api-secret"
OPENROUTER_API_KEY_SECRET="${PREFIX}/openrouter-api-key"
STATE_FILE="${SCRIPT_DIR}/.state.env"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

aws_account_id() {
  aws sts get-caller-identity --query Account --output text
}

aws_partition() {
  aws sts get-caller-identity --query Arn --output text | awk -F: '{print $2}'
}

secret_arn() {
  aws secretsmanager describe-secret --secret-id "$1" --query ARN --output text 2>/dev/null || true
}

put_secret_string() {
  local name="$1"
  local value="$2"
  local description="${3:-ReelHire secret}"
  local secret_file
  local command_status=0

  secret_file="$(mktemp)"
  trap 'rm -f "${secret_file}"' EXIT
  chmod 600 "${secret_file}"
  printf '%s' "${value}" > "${secret_file}"
  if [[ -n "$(secret_arn "${name}")" ]]; then
    aws secretsmanager put-secret-value \
      --secret-id "${name}" \
      --secret-string "file://${secret_file}" >/dev/null || command_status=$?
  else
    aws secretsmanager create-secret \
      --name "${name}" \
      --description "${description}" \
      --secret-string "file://${secret_file}" >/dev/null || command_status=$?
  fi
  rm -f "${secret_file}"
  trap - EXIT
  return "${command_status}"
}

require_secret() {
  local name="$1"
  if [[ -z "$(secret_arn "${name}")" ]]; then
    echo "Missing AWS Secrets Manager secret: ${name}" >&2
    return 1
  fi
}

ecr_uri() {
  local repo="$1"
  aws ecr describe-repositories --repository-names "${repo}" --query 'repositories[0].repositoryUri' --output text
}

ensure_log_group() {
  local name="$1"
  if ! aws logs describe-log-groups --log-group-name-prefix "${name}" --query "logGroups[?logGroupName=='${name}'].logGroupName | [0]" --output text | grep -qx "${name}"; then
    aws logs create-log-group --log-group-name "${name}" >/dev/null
  fi
  aws logs put-retention-policy --log-group-name "${name}" --retention-in-days "${LOG_RETENTION_DAYS}" >/dev/null
}

ensure_ecr_repo() {
  local repo="$1"
  if ! aws ecr describe-repositories --repository-names "${repo}" >/dev/null 2>&1; then
    aws ecr create-repository \
      --repository-name "${repo}" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 >/dev/null
  fi
}

security_group_id_by_name() {
  local vpc_id="$1"
  local name="$2"
  aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=${vpc_id}" "Name=group-name,Values=${name}" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null | sed 's/^None$//'
}

ensure_security_group() {
  local vpc_id="$1"
  local name="$2"
  local description="$3"
  local sg_id
  sg_id="$(security_group_id_by_name "${vpc_id}" "${name}")"
  if [[ -z "${sg_id}" ]]; then
    sg_id="$(aws ec2 create-security-group \
      --group-name "${name}" \
      --description "${description}" \
      --vpc-id "${vpc_id}" \
      --tag-specifications "ResourceType=security-group,Tags=[{Key=Project,Value=ReelHire},{Key=Name,Value=${name}}]" \
      --query GroupId \
      --output text)"
  fi
  printf '%s\n' "${sg_id}"
}

authorize_ingress() {
  local sg_id="$1"
  shift
  local err
  err="$(mktemp)"
  if aws ec2 authorize-security-group-ingress --group-id "${sg_id}" "$@" 2>"${err}" >/dev/null; then
    rm -f "${err}"
    return
  fi
  if grep -q "InvalidPermission.Duplicate" "${err}"; then
    rm -f "${err}"
    return
  fi
  cat "${err}" >&2
  rm -f "${err}"
  exit 1
}

default_vpc_id() {
  aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text
}

subnet_ids_for_vpc() {
  local vpc_id="$1"
  aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=${vpc_id}" \
    --query 'Subnets[].SubnetId' \
    --output text
}

json_array_from_words() {
  printf '%s\n' "$@" | jq -R . | jq -s .
}

load_state() {
  if [[ -f "${STATE_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${STATE_FILE}"
  fi
}
