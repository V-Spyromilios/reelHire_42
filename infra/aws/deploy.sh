#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"
load_state

TARGET="${1:-all}"
if [[ "${TARGET}" != "all" && "${TARGET}" != "frontend" && "${TARGET}" != "backend" ]]; then
  echo "Usage: $0 [all|frontend|backend]" >&2
  exit 1
fi

require_command aws
require_command docker
require_command jq
docker buildx version >/dev/null

ACCOUNT_ID="$(aws_account_id)"
echo "Deploying ReelHire to account ${ACCOUNT_ID} in ${AWS_REGION} (${TARGET})."

if [[ ! -f "${STATE_FILE}" ]]; then
  echo "Missing ${STATE_FILE}. Run ${SCRIPT_DIR}/bootstrap.sh first." >&2
  exit 1
fi

require_secret "${DATABASE_URL_SECRET}"
require_secret "${CLOUDINARY_CLOUD_NAME_SECRET}"
require_secret "${CLOUDINARY_API_KEY_SECRET}"
require_secret "${CLOUDINARY_API_SECRET_SECRET}"

FRONTEND_URI="$(ecr_uri "${FRONTEND_REPO}")"
BACKEND_URI="$(ecr_uri "${BACKEND_REPO}")"
GIT_SHA="$(git -C "${REPO_ROOT}" rev-parse --short=12 HEAD 2>/dev/null || date +nogit-%Y%m%d%H%M%S)"
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"
ECS_CPU_ARCHITECTURE="X86_64"
PUBLIC_ORIGIN="http://${ALB_DNS_NAME}"
read -r -a SUBNET_ID_ARRAY <<< "${SUBNET_IDS}"
SUBNET_CSV="$(IFS=,; echo "${SUBNET_ID_ARRAY[*]}")"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com" >/dev/null

validate_ecr_platform() {
  local repository="$1"
  local tag="$2"
  local platform="$3"
  local expected_os="${platform%%/*}"
  local expected_arch="${platform##*/}"
  local image_uri
  local manifest
  local matches

  image_uri="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${repository}:${tag}"
  manifest="$(docker manifest inspect --verbose "${image_uri}")"
  matches="$(jq --arg os "${expected_os}" --arg arch "${expected_arch}" \
    'if type == "array" then
       [.[] | select(.Descriptor.platform.os == $os and .Descriptor.platform.architecture == $arch)] | length
     elif .Descriptor then
       if .Descriptor.platform.os == $os and .Descriptor.platform.architecture == $arch then 1 else 0 end
     else
       0
     end' <<< "${manifest}")"

  if [[ "${matches}" == "0" ]]; then
    echo "ECR image ${repository}:${tag} does not contain ${platform}." >&2
    exit 1
  fi
  echo "Verified ${repository}:${tag} contains ${platform}."
}

if [[ "${TARGET}" == "all" || "${TARGET}" == "frontend" ]]; then
  echo "Building and pushing frontend image ${GIT_SHA} for ${TARGET_PLATFORM}..."
  docker buildx build \
    --platform "${TARGET_PLATFORM}" \
    --provenance=false \
    --build-arg NEXT_PUBLIC_DATA_SOURCE=api \
    --build-arg NEXT_PUBLIC_API_BASE_URL= \
    -t "${FRONTEND_URI}:${GIT_SHA}" \
    -t "${FRONTEND_URI}:latest" \
    --push \
    "${REPO_ROOT}"
  validate_ecr_platform "${FRONTEND_REPO}" "${GIT_SHA}" "${TARGET_PLATFORM}"

  FRONTEND_TASK_FILE="$(mktemp)"
  jq -n \
    --arg family "${FRONTEND_FAMILY}" \
    --arg executionRoleArn "${EXECUTION_ROLE_ARN}" \
    --arg taskRoleArn "${TASK_ROLE_ARN}" \
    --arg image "${FRONTEND_URI}:${GIT_SHA}" \
    --arg region "${AWS_REGION}" \
    --arg apiInternal "${PUBLIC_ORIGIN}" \
    --arg logGroup "/ecs/${PREFIX}/frontend" \
    --arg cpuArchitecture "${ECS_CPU_ARCHITECTURE}" \
    '{
      family: $family,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: "512",
      memory: "1024",
      runtimePlatform: {
        cpuArchitecture: $cpuArchitecture,
        operatingSystemFamily: "LINUX"
      },
      executionRoleArn: $executionRoleArn,
      taskRoleArn: $taskRoleArn,
      containerDefinitions: [{
        name: "frontend",
        image: $image,
        essential: true,
        portMappings: [{containerPort: 3000, protocol: "tcp"}],
        environment: [
          {name: "NODE_ENV", value: "production"},
          {name: "NEXT_PUBLIC_DATA_SOURCE", value: "api"},
          {name: "NEXT_PUBLIC_API_BASE_URL", value: ""},
          {name: "API_INTERNAL_BASE_URL", value: $apiInternal}
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": $logGroup,
            "awslogs-region": $region,
            "awslogs-stream-prefix": "ecs"
          }
        }
      }]
    }' > "${FRONTEND_TASK_FILE}"
  FRONTEND_TASK_DEFINITION_ARN="$(aws ecs register-task-definition \
    --cli-input-json "file://${FRONTEND_TASK_FILE}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)"
  rm -f "${FRONTEND_TASK_FILE}"
fi

if [[ "${TARGET}" == "all" || "${TARGET}" == "backend" ]]; then
  echo "Building and pushing backend image ${GIT_SHA} for ${TARGET_PLATFORM}..."
  docker buildx build \
    --platform "${TARGET_PLATFORM}" \
    --provenance=false \
    -t "${BACKEND_URI}:${GIT_SHA}" \
    -t "${BACKEND_URI}:latest" \
    --push \
    "${REPO_ROOT}/backend"
  validate_ecr_platform "${BACKEND_REPO}" "${GIT_SHA}" "${TARGET_PLATFORM}"

  DB_URL_ARN="$(secret_arn "${DATABASE_URL_SECRET}")"
  CLOUD_NAME_ARN="$(secret_arn "${CLOUDINARY_CLOUD_NAME_SECRET}")"
  CLOUD_KEY_ARN="$(secret_arn "${CLOUDINARY_API_KEY_SECRET}")"
  CLOUD_SECRET_ARN="$(secret_arn "${CLOUDINARY_API_SECRET_SECRET}")"

  BACKEND_TASK_FILE="$(mktemp)"
  jq -n \
    --arg family "${BACKEND_FAMILY}" \
    --arg executionRoleArn "${EXECUTION_ROLE_ARN}" \
    --arg taskRoleArn "${TASK_ROLE_ARN}" \
    --arg image "${BACKEND_URI}:${GIT_SHA}" \
    --arg region "${AWS_REGION}" \
    --arg frontendOrigin "${PUBLIC_ORIGIN}" \
    --arg logGroup "/ecs/${PREFIX}/backend" \
    --arg databaseUrlArn "${DB_URL_ARN}" \
    --arg cloudNameArn "${CLOUD_NAME_ARN}" \
    --arg cloudKeyArn "${CLOUD_KEY_ARN}" \
    --arg cloudSecretArn "${CLOUD_SECRET_ARN}" \
    --arg cpuArchitecture "${ECS_CPU_ARCHITECTURE}" \
    '{
      family: $family,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: "512",
      memory: "1024",
      runtimePlatform: {
        cpuArchitecture: $cpuArchitecture,
        operatingSystemFamily: "LINUX"
      },
      executionRoleArn: $executionRoleArn,
      taskRoleArn: $taskRoleArn,
      containerDefinitions: [{
        name: "backend",
        image: $image,
        essential: true,
        portMappings: [{containerPort: 8000, protocol: "tcp"}],
        environment: [
          {name: "FRONTEND_ORIGIN", value: $frontendOrigin}
        ],
        secrets: [
          {name: "DATABASE_URL", valueFrom: $databaseUrlArn},
          {name: "CLOUDINARY_CLOUD_NAME", valueFrom: $cloudNameArn},
          {name: "CLOUDINARY_API_KEY", valueFrom: $cloudKeyArn},
          {name: "CLOUDINARY_API_SECRET", valueFrom: $cloudSecretArn}
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": $logGroup,
            "awslogs-region": $region,
            "awslogs-stream-prefix": "ecs"
          }
        }
      }]
    }' > "${BACKEND_TASK_FILE}"
  BACKEND_TASK_DEFINITION_ARN="$(aws ecs register-task-definition \
    --cli-input-json "file://${BACKEND_TASK_FILE}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)"
  rm -f "${BACKEND_TASK_FILE}"

  BACKEND_TASK_DEFINITION_ARN="${BACKEND_TASK_DEFINITION_ARN}" "${SCRIPT_DIR}/migrate.sh"
fi

create_or_update_service() {
  local service_name="$1"
  local task_definition="$2"
  local tg_arn="$3"
  local container_name="$4"
  local container_port="$5"
  local sg_id="$6"

  local status
  status="$(aws ecs describe-services \
    --cluster "${CLUSTER_NAME}" \
    --services "${service_name}" \
    --query 'services[0].status' \
    --output text 2>/dev/null || true)"

  if [[ "${status}" == "ACTIVE" || "${status}" == "DRAINING" ]]; then
    aws ecs update-service \
      --cluster "${CLUSTER_NAME}" \
      --service "${service_name}" \
      --task-definition "${task_definition}" \
      --force-new-deployment >/dev/null
  else
    aws ecs create-service \
      --cluster "${CLUSTER_NAME}" \
      --service-name "${service_name}" \
      --task-definition "${task_definition}" \
      --desired-count 1 \
      --launch-type FARGATE \
      --platform-version LATEST \
      --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_CSV}],securityGroups=[${sg_id}],assignPublicIp=ENABLED}" \
      --load-balancers "targetGroupArn=${tg_arn},containerName=${container_name},containerPort=${container_port}" \
      --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true},maximumPercent=200,minimumHealthyPercent=0" >/dev/null
  fi
}

if [[ "${TARGET}" == "all" || "${TARGET}" == "backend" ]]; then
  create_or_update_service "${BACKEND_SERVICE}" "${BACKEND_TASK_DEFINITION_ARN}" "${BACKEND_TG_ARN}" "backend" "8000" "${BACKEND_SG_ID}"
fi

if [[ "${TARGET}" == "all" || "${TARGET}" == "frontend" ]]; then
  create_or_update_service "${FRONTEND_SERVICE}" "${FRONTEND_TASK_DEFINITION_ARN}" "${FRONTEND_TG_ARN}" "frontend" "3000" "${FRONTEND_SG_ID}"
fi

echo "Waiting for ECS services to stabilize..."
if [[ "${TARGET}" == "all" || "${TARGET}" == "backend" ]]; then
  aws ecs wait services-stable --cluster "${CLUSTER_NAME}" --services "${BACKEND_SERVICE}"
fi
if [[ "${TARGET}" == "all" || "${TARGET}" == "frontend" ]]; then
  aws ecs wait services-stable --cluster "${CLUSTER_NAME}" --services "${FRONTEND_SERVICE}"
fi

echo "Checking public endpoints..."
if command -v curl >/dev/null 2>&1; then
  curl -fsS "${PUBLIC_ORIGIN}/api/health" >/dev/null
  curl -fsS "${PUBLIC_ORIGIN}/api/opportunities/feed" >/dev/null
  curl -fsS "${PUBLIC_ORIGIN}/" >/dev/null
fi

echo "Deployment complete."
echo "URL: ${PUBLIC_ORIGIN}"
echo "Git SHA: ${GIT_SHA}"
