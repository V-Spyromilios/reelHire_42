#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"
load_state

require_command aws
require_command jq

if [[ ! -f "${STATE_FILE}" ]]; then
  echo "Missing ${STATE_FILE}. Run ${SCRIPT_DIR}/bootstrap.sh first." >&2
  exit 1
fi

echo "AWS region: ${AWS_REGION}"
echo "ALB URL: http://${ALB_DNS_NAME}"
echo

echo "ECS services:"
aws ecs describe-services \
  --cluster "${CLUSTER_NAME}" \
  --services "${FRONTEND_SERVICE}" "${BACKEND_SERVICE}" \
  --query 'services[].{service:serviceName,status:status,desired:desiredCount,running:runningCount,pending:pendingCount,taskDefinition:taskDefinition}' \
  --output table

echo
echo "Deployed images:"
for family in "${FRONTEND_FAMILY}" "${BACKEND_FAMILY}"; do
  if aws ecs describe-task-definition --task-definition "${family}" >/dev/null 2>&1; then
    aws ecs describe-task-definition \
      --task-definition "${family}" \
      --query 'taskDefinition.{family:family,revision:revision,image:containerDefinitions[0].image}' \
      --output table
  fi
done

echo
echo "RDS:"
aws rds describe-db-instances \
  --db-instance-identifier "${DB_IDENTIFIER}" \
  --query 'DBInstances[0].{identifier:DBInstanceIdentifier,status:DBInstanceStatus,class:DBInstanceClass,engine:Engine,public:PubliclyAccessible}' \
  --output table

if command -v curl >/dev/null 2>&1; then
  echo
  echo "Public health checks:"
  curl -fsS "http://${ALB_DNS_NAME}/api/health" || true
  printf '\n'
  curl -fsS "http://${ALB_DNS_NAME}/api/opportunities/feed" >/dev/null && echo "feed: 200" || echo "feed: unavailable"
fi
