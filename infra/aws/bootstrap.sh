#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_command aws
require_command jq
require_command openssl

ACCOUNT_ID="$(aws_account_id)"
PARTITION="$(aws_partition)"
echo "Using AWS account ${ACCOUNT_ID} in region ${AWS_REGION}."

echo "Ensuring ECR repositories..."
ensure_ecr_repo "${FRONTEND_REPO}"
ensure_ecr_repo "${BACKEND_REPO}"

echo "Discovering default VPC and subnets..."
VPC_ID="$(default_vpc_id)"
if [[ -z "${VPC_ID}" || "${VPC_ID}" == "None" ]]; then
  echo "No default VPC found. Create a VPC first or extend this script with custom VPC inputs." >&2
  exit 1
fi
read -r -a SUBNET_IDS <<< "$(subnet_ids_for_vpc "${VPC_ID}")"
if [[ "${#SUBNET_IDS[@]}" -lt 2 ]]; then
  echo "At least two subnets are required for the ALB and RDS subnet group." >&2
  exit 1
fi

echo "Ensuring security groups..."
ALB_SG_ID="$(ensure_security_group "${VPC_ID}" "${PREFIX}-alb-sg" "ReelHire ALB ingress")"
FRONTEND_SG_ID="$(ensure_security_group "${VPC_ID}" "${PREFIX}-frontend-sg" "ReelHire frontend tasks")"
BACKEND_SG_ID="$(ensure_security_group "${VPC_ID}" "${PREFIX}-backend-sg" "ReelHire backend tasks")"
RDS_SG_ID="$(ensure_security_group "${VPC_ID}" "${PREFIX}-rds-sg" "ReelHire RDS database")"

authorize_ingress "${ALB_SG_ID}" --protocol tcp --port 80 --cidr 0.0.0.0/0
authorize_ingress "${FRONTEND_SG_ID}" --protocol tcp --port 3000 --source-group "${ALB_SG_ID}"
authorize_ingress "${BACKEND_SG_ID}" --protocol tcp --port 8000 --source-group "${ALB_SG_ID}"
authorize_ingress "${RDS_SG_ID}" --protocol tcp --port 5432 --source-group "${BACKEND_SG_ID}"

echo "Ensuring IAM roles..."
TRUST_FILE="$(mktemp)"
cat > "${TRUST_FILE}" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

EXECUTION_ROLE_ARN="$(aws iam get-role --role-name "${EXECUTION_ROLE_NAME}" --query 'Role.Arn' --output text 2>/dev/null || true)"
if [[ -z "${EXECUTION_ROLE_ARN}" ]]; then
  EXECUTION_ROLE_ARN="$(aws iam create-role \
    --role-name "${EXECUTION_ROLE_NAME}" \
    --assume-role-policy-document "file://${TRUST_FILE}" \
    --query 'Role.Arn' \
    --output text)"
fi
TASK_ROLE_ARN="$(aws iam get-role --role-name "${TASK_ROLE_NAME}" --query 'Role.Arn' --output text 2>/dev/null || true)"
if [[ -z "${TASK_ROLE_ARN}" ]]; then
  TASK_ROLE_ARN="$(aws iam create-role \
    --role-name "${TASK_ROLE_NAME}" \
    --assume-role-policy-document "file://${TRUST_FILE}" \
    --query 'Role.Arn' \
    --output text)"
fi
rm -f "${TRUST_FILE}"

aws iam attach-role-policy \
  --role-name "${EXECUTION_ROLE_NAME}" \
  --policy-arn arn:${PARTITION}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy >/dev/null

SECRETS_POLICY_FILE="$(mktemp)"
cat > "${SECRETS_POLICY_FILE}" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:${PARTITION}:secretsmanager:${AWS_REGION}:${ACCOUNT_ID}:secret:${PREFIX}/*"
    }
  ]
}
JSON
aws iam put-role-policy \
  --role-name "${EXECUTION_ROLE_NAME}" \
  --policy-name "${PREFIX}-secrets-read" \
  --policy-document "file://${SECRETS_POLICY_FILE}" >/dev/null
rm -f "${SECRETS_POLICY_FILE}"

echo "Ensuring CloudWatch log groups..."
ensure_log_group "/ecs/${PREFIX}/frontend"
ensure_log_group "/ecs/${PREFIX}/backend"

echo "Ensuring RDS password and database..."
if [[ -z "$(secret_arn "${DB_PASSWORD_SECRET}")" ]]; then
  DB_PASSWORD="$(openssl rand -hex 18)"
  put_secret_string "${DB_PASSWORD_SECRET}" "${DB_PASSWORD}" "ReelHire RDS password"
else
  DB_PASSWORD="$(aws secretsmanager get-secret-value --secret-id "${DB_PASSWORD_SECRET}" --query SecretString --output text)"
fi

DB_SUBNET_GROUP="${PREFIX}-db-subnets"
if ! aws rds describe-db-subnet-groups --db-subnet-group-name "${DB_SUBNET_GROUP}" >/dev/null 2>&1; then
  aws rds create-db-subnet-group \
    --db-subnet-group-name "${DB_SUBNET_GROUP}" \
    --db-subnet-group-description "ReelHire database subnets" \
    --subnet-ids "${SUBNET_IDS[@]}" >/dev/null
fi

if ! aws rds describe-db-instances --db-instance-identifier "${DB_IDENTIFIER}" >/dev/null 2>&1; then
  RDS_CREATE_ARGS=(
    --db-instance-identifier "${DB_IDENTIFIER}"
    --engine postgres
    --db-instance-class "${DB_INSTANCE_CLASS}"
    --allocated-storage 20
    --storage-type gp3
    --db-name "${DB_NAME}"
    --master-username "${DB_USER}"
    --master-user-password "${DB_PASSWORD}"
    --db-subnet-group-name "${DB_SUBNET_GROUP}"
    --vpc-security-group-ids "${RDS_SG_ID}"
    --backup-retention-period 1
    --no-publicly-accessible
    --no-multi-az
    --no-deletion-protection
  )
  if [[ -n "${DB_ENGINE_VERSION}" ]]; then
    RDS_CREATE_ARGS+=(--engine-version "${DB_ENGINE_VERSION}")
  fi
  aws rds create-db-instance "${RDS_CREATE_ARGS[@]}" >/dev/null
  echo "Waiting for RDS instance ${DB_IDENTIFIER} to become available..."
  aws rds wait db-instance-available --db-instance-identifier "${DB_IDENTIFIER}"
fi

DB_ENDPOINT="$(aws rds describe-db-instances \
  --db-instance-identifier "${DB_IDENTIFIER}" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)"
DATABASE_URL="postgresql+psycopg://${DB_USER}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}"
put_secret_string "${DATABASE_URL_SECRET}" "${DATABASE_URL}" "ReelHire production database URL"

echo "Ensuring load balancer, target groups, and routing..."
ALB_ARN="$(aws elbv2 describe-load-balancers --names "${ALB_NAME}" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || true)"
if [[ -z "${ALB_ARN}" ]]; then
  ALB_ARN="$(aws elbv2 create-load-balancer \
    --name "${ALB_NAME}" \
    --type application \
    --scheme internet-facing \
    --security-groups "${ALB_SG_ID}" \
    --subnets "${SUBNET_IDS[@]}" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)"
  aws elbv2 wait load-balancer-available --load-balancer-arns "${ALB_ARN}"
fi
ALB_DNS_NAME="$(aws elbv2 describe-load-balancers --load-balancer-arns "${ALB_ARN}" --query 'LoadBalancers[0].DNSName' --output text)"

FRONTEND_TG_ARN="$(aws elbv2 describe-target-groups --names "${FRONTEND_TG_NAME}" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)"
if [[ -z "${FRONTEND_TG_ARN}" ]]; then
  FRONTEND_TG_ARN="$(aws elbv2 create-target-group \
    --name "${FRONTEND_TG_NAME}" \
    --protocol HTTP \
    --port 3000 \
    --vpc-id "${VPC_ID}" \
    --target-type ip \
    --health-check-path "/" \
    --matcher HttpCode=200-399 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)"
fi

BACKEND_TG_ARN="$(aws elbv2 describe-target-groups --names "${BACKEND_TG_NAME}" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)"
if [[ -z "${BACKEND_TG_ARN}" ]]; then
  BACKEND_TG_ARN="$(aws elbv2 create-target-group \
    --name "${BACKEND_TG_NAME}" \
    --protocol HTTP \
    --port 8000 \
    --vpc-id "${VPC_ID}" \
    --target-type ip \
    --health-check-path "/api/health" \
    --matcher HttpCode=200-399 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)"
fi

LISTENER_ARN="$(aws elbv2 describe-listeners --load-balancer-arn "${ALB_ARN}" --query 'Listeners[?Port==`80`].ListenerArn | [0]' --output text)"
if [[ -z "${LISTENER_ARN}" || "${LISTENER_ARN}" == "None" ]]; then
  LISTENER_ARN="$(aws elbv2 create-listener \
    --load-balancer-arn "${ALB_ARN}" \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn="${FRONTEND_TG_ARN}" \
    --query 'Listeners[0].ListenerArn' \
    --output text)"
fi

if ! aws elbv2 describe-rules --listener-arn "${LISTENER_ARN}" | jq -e '.Rules[] | select(.Conditions[]?.PathPatternConfig.Values[]? == "/api/*")' >/dev/null; then
  aws elbv2 create-rule \
    --listener-arn "${LISTENER_ARN}" \
    --priority 10 \
    --conditions Field=path-pattern,Values='/api/*' \
    --actions Type=forward,TargetGroupArn="${BACKEND_TG_ARN}" >/dev/null
fi

echo "Ensuring ECS cluster..."
aws ecs describe-clusters --clusters "${CLUSTER_NAME}" --query 'clusters[0].clusterArn' --output text 2>/dev/null | grep -q '^arn:' \
  || aws ecs create-cluster --cluster-name "${CLUSTER_NAME}" >/dev/null

cat > "${STATE_FILE}" <<EOF
AWS_REGION=${AWS_REGION}
ACCOUNT_ID=${ACCOUNT_ID}
VPC_ID=${VPC_ID}
SUBNET_IDS="${SUBNET_IDS[*]}"
ALB_ARN=${ALB_ARN}
ALB_DNS_NAME=${ALB_DNS_NAME}
LISTENER_ARN=${LISTENER_ARN}
FRONTEND_TG_ARN=${FRONTEND_TG_ARN}
BACKEND_TG_ARN=${BACKEND_TG_ARN}
ALB_SG_ID=${ALB_SG_ID}
FRONTEND_SG_ID=${FRONTEND_SG_ID}
BACKEND_SG_ID=${BACKEND_SG_ID}
RDS_SG_ID=${RDS_SG_ID}
DB_ENDPOINT=${DB_ENDPOINT}
EXECUTION_ROLE_ARN=${EXECUTION_ROLE_ARN}
TASK_ROLE_ARN=${TASK_ROLE_ARN}
EOF

echo "Bootstrap complete."
echo "ALB URL: http://${ALB_DNS_NAME}"
echo "Cloudinary secrets are not read from local .env automatically."
echo "Run ${SCRIPT_DIR}/put-cloudinary-secrets.sh before deploying backend media uploads."
echo "Run bash ${SCRIPT_DIR}/put-openrouter-secret.sh before deploying repository analysis."
