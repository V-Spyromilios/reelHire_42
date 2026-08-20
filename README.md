# ReelHire

Video-first hiring prototype with a Next.js frontend, FastAPI backend, PostgreSQL, Alembic migrations, and Cloudinary signed direct uploads.

## Local Native Development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Expected local frontend API settings:

```env
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Local Docker Development

Cloudinary remains external. Export Cloudinary variables in your shell if you want to test uploads in Docker.

```bash
docker compose up --build
```

Compose runs:

- frontend on `http://localhost:3000`
- backend on `http://localhost:8000`
- PostgreSQL in Docker, exposed on host port `5433`

The backend container applies Alembic migrations during local Compose startup only.

## AWS Prerequisites

Install and authenticate AWS CLI. The scripts discover the active account and region. Region order is:

1. `AWS_REGION`
2. AWS CLI configured region
3. `eu-central-1`

The deployment uses:

- ECR for images
- ECS/Fargate for frontend and backend
- ALB routing `/api/*` to FastAPI and everything else to Next.js
- RDS PostgreSQL
- Secrets Manager for production secrets
- CloudWatch Logs

## First AWS Deployment

```bash
./infra/aws/bootstrap.sh
./infra/aws/put-cloudinary-secrets.sh
./infra/aws/deploy.sh
```

`bootstrap.sh` creates the AWS infrastructure and stores generated database credentials in Secrets Manager. It does not read local `.env` Cloudinary credentials automatically.

## Deploying A New Version

```bash
./infra/aws/deploy.sh
```

Optional targets:

```bash
./infra/aws/deploy.sh frontend
./infra/aws/deploy.sh backend
./infra/aws/deploy.sh all
```

Images are tagged with the current Git SHA and ECS task definitions reference those immutable tags.

## Migrations

```bash
./infra/aws/migrate.sh
```

Migrations run as a one-off ECS/Fargate task using the backend image. Normal backend containers do not automatically run Alembic.

## Status

```bash
./infra/aws/status.sh
```

Shows ECS service state, deployed image tags, ALB URL, RDS state, and public health/feed checks.

## Rollback

List previous task definition revisions:

```bash
aws ecs list-task-definitions --family-prefix reelhire-frontend --sort DESC
aws ecs list-task-definitions --family-prefix reelhire-backend --sort DESC
```

Rollback one service:

```bash
./infra/aws/rollback.sh frontend <revision>
./infra/aws/rollback.sh backend <revision>
```

## Teardown And Cost Control

```bash
./infra/aws/destroy.sh
```

By default, RDS is preserved. To delete the database too:

```bash
./infra/aws/destroy.sh --include-database
```

The destroy script requires typing `delete reelhire`.
