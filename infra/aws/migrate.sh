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

TASK_DEFINITION="${BACKEND_TASK_DEFINITION_ARN:-}"
if [[ -z "${TASK_DEFINITION}" ]]; then
  TASK_DEFINITION="$(aws ecs describe-task-definition \
    --task-definition "${BACKEND_FAMILY}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)"
fi

read -r -a SUBNET_ID_ARRAY <<< "${SUBNET_IDS}"
SUBNET_CSV="$(IFS=,; echo "${SUBNET_ID_ARRAY[*]}")"

echo "Running Alembic migration task..."
RUN_OUTPUT="$(aws ecs run-task \
  --cluster "${CLUSTER_NAME}" \
  --launch-type FARGATE \
  --task-definition "${TASK_DEFINITION}" \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_CSV}],securityGroups=[${BACKEND_SG_ID}],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["alembic","upgrade","head"]}]}' \
  --query 'tasks[0].taskArn' \
  --output text)"

if [[ -z "${RUN_OUTPUT}" || "${RUN_OUTPUT}" == "None" ]]; then
  echo "Failed to start migration task." >&2
  exit 1
fi

aws ecs wait tasks-stopped --cluster "${CLUSTER_NAME}" --tasks "${RUN_OUTPUT}"

EXIT_CODE="$(aws ecs describe-tasks \
  --cluster "${CLUSTER_NAME}" \
  --tasks "${RUN_OUTPUT}" \
  --query 'tasks[0].containers[?name==`backend`].exitCode | [0]' \
  --output text)"

STOP_REASON="$(aws ecs describe-tasks \
  --cluster "${CLUSTER_NAME}" \
  --tasks "${RUN_OUTPUT}" \
  --query 'tasks[0].stoppedReason' \
  --output text)"

if [[ "${EXIT_CODE}" != "0" ]]; then
  echo "Migration failed with exit code ${EXIT_CODE}. Reason: ${STOP_REASON}" >&2
  exit 1
fi

echo "Migrations applied successfully."
