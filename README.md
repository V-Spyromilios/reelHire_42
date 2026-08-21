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

## Repository Evaluations

Submitting a public GitHub repository queues an asynchronous technical review. The FastAPI backend reads a bounded set of public source and documentation files, sends that context and the opportunity challenge to OpenRouter, and stores the structured result on the submission. It never clones or executes submitted code.

Each canonical repository URL is evaluated once per submission and the evaluated commit SHA is stored with the result. Exact resubmissions are idempotent; a failed evaluation can be retried from the candidate challenge screen. Results are advisory technical-artifact reviews, and employers should verify the cited files rather than use the score as an automated hiring decision.

For local development, copy [backend/.env.example](backend/.env.example) to `backend/.env` and set:

```env
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
OPENROUTER_FALLBACK_MODELS=openai/gpt-4.1-mini
```

`OPENROUTER_API_KEY` is backend-only. Do not put it in a `NEXT_PUBLIC_*` variable or any frontend/Vercel build setting. `GITHUB_TOKEN` is optional and raises GitHub's public API limit when you expect a higher evaluation volume.

The default route tries NVIDIA Nemotron's free structured-output model first and uses the paid fallback only when OpenRouter cannot serve the free model. To verify the evaluator without PostgreSQL, Cloudinary, Docker, or AWS:

```bash
cd backend
.venv/bin/python scripts/evaluate_repository.py https://github.com/owner/repository
```

Only bounded text from an already-public repository and the challenge criteria are sent to the model; videos and candidate profile data are not included. Free model endpoints may have lower quotas and different data-retention terms, so do not use this path for private or confidential repositories.

The current identity dependency is prototype-only and uses fixed users. Before exposing paid evaluations publicly, add real authentication and request rate limits, and configure an OpenRouter spending limit for the key.

This repository is deployed as a paired Next.js + FastAPI service on AWS ECS. It is not configured for Vercel or ChatGPT Sites; publishing only the frontend there would not deploy the evaluator API.

## Local Docker Development

Cloudinary remains external. Export Cloudinary variables in your shell if you want to test uploads in Docker.
For Docker Compose repository analysis, put `OPENROUTER_API_KEY=...` in the repository-root `.env` file (or export it in your shell); Compose does not read `backend/.env` for variable substitution.

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
bash ./infra/aws/put-openrouter-secret.sh
./infra/aws/deploy.sh
```

`bootstrap.sh` creates the AWS infrastructure and stores generated database credentials in Secrets Manager. It does not read local `.env` Cloudinary credentials automatically.
`put-openrouter-secret.sh` safely stores the backend-only OpenRouter key as `${PREFIX}/openrouter-api-key` (by default, `reelhire/openrouter-api-key`).

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
The deployment script requires a clean, committed worktree. Use the `all` target for this evaluator release because both the frontend and backend changed.

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
