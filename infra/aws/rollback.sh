#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"
load_state

require_command aws

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 frontend|backend <task-definition-revision>" >&2
  exit 1
fi

TARGET="$1"
REVISION="$2"

case "${TARGET}" in
  frontend)
    SERVICE="${FRONTEND_SERVICE}"
    FAMILY="${FRONTEND_FAMILY}"
    ;;
  backend)
    SERVICE="${BACKEND_SERVICE}"
    FAMILY="${BACKEND_FAMILY}"
    ;;
  *)
    echo "Usage: $0 frontend|backend <task-definition-revision>" >&2
    exit 1
    ;;
esac

TASK_DEFINITION="${FAMILY}:${REVISION}"
aws ecs describe-task-definition --task-definition "${TASK_DEFINITION}" >/dev/null

echo "Rolling ${TARGET} back to ${TASK_DEFINITION}..."
aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${SERVICE}" \
  --task-definition "${TASK_DEFINITION}" \
  --force-new-deployment >/dev/null
aws ecs wait services-stable --cluster "${CLUSTER_NAME}" --services "${SERVICE}"
echo "Rollback complete."
