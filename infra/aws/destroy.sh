#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"
load_state

require_command aws

INCLUDE_DATABASE=false
if [[ "${1:-}" == "--include-database" ]]; then
  INCLUDE_DATABASE=true
fi

echo "This will remove ReelHire ECS, ALB, target groups, ECR repositories, log groups, and related security groups."
if [[ "${INCLUDE_DATABASE}" == "true" ]]; then
  echo "It will also delete the RDS database without a final snapshot."
else
  echo "RDS will be preserved. Use --include-database to delete it too."
fi
read -r -p "Type 'delete reelhire' to continue: " CONFIRM
if [[ "${CONFIRM}" != "delete reelhire" ]]; then
  echo "Aborted."
  exit 1
fi

delete_service() {
  local service="$1"
  if aws ecs describe-services --cluster "${CLUSTER_NAME}" --services "${service}" --query 'services[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
    aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${service}" --desired-count 0 >/dev/null
    aws ecs delete-service --cluster "${CLUSTER_NAME}" --service "${service}" >/dev/null
  fi
}

delete_service "${FRONTEND_SERVICE}"
delete_service "${BACKEND_SERVICE}"

if [[ -n "${ALB_ARN:-}" ]]; then
  for listener in $(aws elbv2 describe-listeners --load-balancer-arn "${ALB_ARN}" --query 'Listeners[].ListenerArn' --output text 2>/dev/null || true); do
    aws elbv2 delete-listener --listener-arn "${listener}" >/dev/null
  done
  aws elbv2 delete-load-balancer --load-balancer-arn "${ALB_ARN}" >/dev/null || true
  aws elbv2 wait load-balancers-deleted --load-balancer-arns "${ALB_ARN}" || true
fi

for tg in "${FRONTEND_TG_ARN:-}" "${BACKEND_TG_ARN:-}"; do
  if [[ -n "${tg}" ]]; then
    aws elbv2 delete-target-group --target-group-arn "${tg}" >/dev/null || true
  fi
done

aws ecs delete-cluster --cluster "${CLUSTER_NAME}" >/dev/null 2>&1 || true

for repo in "${FRONTEND_REPO}" "${BACKEND_REPO}"; do
  aws ecr delete-repository --repository-name "${repo}" --force >/dev/null 2>&1 || true
done

for group in "/ecs/${PREFIX}/frontend" "/ecs/${PREFIX}/backend"; do
  aws logs delete-log-group --log-group-name "${group}" >/dev/null 2>&1 || true
done

if [[ "${INCLUDE_DATABASE}" == "true" ]]; then
  if aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" >/dev/null 2>&1; then
    aws rds delete-db-instance \
      --db-instance-identifier "${DB_IDENTIFIER}" \
      --skip-final-snapshot \
      --delete-automated-backups >/dev/null
  fi
else
  echo "Skipped RDS database ${DB_IDENTIFIER}."
fi

echo "Destroy requested. Some resources may take several minutes to finish deleting."
