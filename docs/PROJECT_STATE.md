# ReelHire Current State

Last verified: 2026-08-21 13:10 CEST.

## Product

ReelHire is a video-first technical hiring application. Employers publish short pitch videos plus project challenges. Candidates browse opportunities as reels, pass/save/accept challenges, and later submit a GitHub repository plus an explanation video. Employers can review submissions and future project analysis, then accept/pass candidates toward matches.

## Architecture

Frontend:

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Motion for React, TanStack Query, React Hook Form, Zod, Lucide, Recharts.
- Data flow is `UI -> feature hooks/TanStack Query -> hiringService -> HiringRepository -> ApiHiringRepository or MockHiringRepository -> API client`.
- Repository selection is controlled by `NEXT_PUBLIC_DATA_SOURCE`; `api` selects FastAPI and anything else uses mocks.
- In production the browser API base is same-origin because `NEXT_PUBLIC_API_BASE_URL` is empty and the ALB routes `/api/*` to FastAPI.
- Server-side frontend requests can use `API_INTERNAL_BASE_URL`.

Backend:

- FastAPI, Pydantic v2, SQLAlchemy 2.x async, PostgreSQL via psycopg, Alembic migrations.
- Router registration is in `backend/app/main.py`.
- Temporary identity is centralized in `backend/app/dependencies/identity.py` with employer `emp-nova` and candidate `cand-alex`.
- Settings load `.env` from both repository root and `backend/.env`; secrets must not be committed.

Media:

- Cloudinary signed direct upload.
- FastAPI signs upload parameters at `/api/media/sign-upload`.
- Browser uploads video directly to Cloudinary.
- FastAPI persists Cloudinary public IDs, secure URLs, and video metadata.
- Cloudinary API secret remains backend-only.
- Employer opportunity deletion deletes the stored Cloudinary pitch video server-side before database deletion.

Infrastructure:

- Dockerfiles exist for frontend and backend.
- `docker-compose.yml` runs frontend, backend, and local PostgreSQL for container integration testing.
- AWS deployment uses ECR, ECS/Fargate, an Application Load Balancer, RDS PostgreSQL, Secrets Manager, and CloudWatch Logs.
- AWS production region is `eu-central-1`.
- Deployment script builds AWS images with Docker Buildx for `linux/amd64` and disables provenance for simpler ECS-compatible manifests.

## Routes

Landing:

- `/`

Candidate:

- `/candidate`
- `/candidate/feed`
- `/candidate/challenges`
- `/candidate/challenges/[id]`
- `/candidate/submit/[opportunityId]`
- `/candidate/matches`
- `/candidate/profile`

Employer:

- `/employer`
- `/employer/dashboard`
- `/employer/opportunities`
- `/employer/opportunities/new`
- `/employer/opportunities/[id]`
- `/employer/opportunities/[id]/analytics`
- `/employer/opportunities/[id]/submissions`
- `/employer/submissions/[id]`
- `/employer/matches`

## API

Implemented FastAPI endpoints:

- `GET /api/health`
- `POST /api/media/sign-upload`
- `GET /api/opportunities`
- `POST /api/opportunities`
- `GET /api/opportunities/feed`
- `GET /api/opportunities/{opportunity_id}`
- `DELETE /api/opportunities/{opportunity_id}`
- `POST /api/opportunities/{opportunity_id}/reactions`
- `DELETE /api/opportunities/{opportunity_id}/reactions`
- `GET /api/candidate/challenges`
- `GET /api/employer/opportunities/{opportunity_id}/analytics`
- `POST /api/submissions`
- `GET /api/submissions/{submission_id}`
- `GET /api/employer/submissions/{submission_id}`
- `GET /api/candidate/submissions`
- `GET /api/employer/opportunities/{opportunity_id}/submissions`
- `POST /api/employer/submissions/{submission_id}/analyze`
- `POST /api/employer/submissions/{submission_id}/reaction`
- `GET /api/employer/matches`
- `GET /api/candidate/matches`
- `POST /api/matches/{match_id}/interview`

Current API-mode repository behavior:

- Employer submission accept/pass is implemented against FastAPI.
- Matches are persisted and returned separately for employer and candidate identities.
- Interview request is implemented as a small persisted match status transition to `interview_requested`.
- Employer submission repository evaluation is implemented against FastAPI. It validates and shallow-clones public GitHub repositories, inspects bounded source evidence, calls the configured evaluator, calculates the weighted score server-side, persists one `ProjectEvaluation` per submission, and returns existing completed evaluations unless `force=true`.

## Database

Current Alembic head: `20260821_0004`.

Migrations:

- `20260820_0001_initial_video_upload_schema.py`
- `20260820_0002_candidate_reaction_withdrawal.py`
- `20260821_0003_employer_reactions_matches.py`
- `20260821_0004_project_evaluations.py`

Important models:

- `opportunities`: employer-owned published opportunities with pitch video metadata. `status` supports `draft`, `published`, and `closed`; current employer/current feed queries use `published`.
- `candidate_reactions`: one row per `candidate_id + opportunity_id`, with `reaction`, watch-time metrics, `reacted_at`, and nullable `withdrawn_at`.
- `submissions`: one row per `candidate_id + opportunity_id`, with GitHub URL, explanation-video metadata, and status. It has an FK to `opportunities` with database cascade, but service-level employer deletion prevents deletion if submissions exist.
- `employer_reactions`: one current employer decision per `employer_id + submission_id`, with `reaction`, `reacted_at`, and `updated_at`.
- `matches`: persisted mutual matches with opportunity, submission, candidate, employer, created timestamp, and status.
- `project_evaluations`: one current repository evaluation per submission. Stores dimension scores, backend-calculated overall score, summary, strengths, concerns, concrete file-backed evidence, status, and timestamps. Repository source code is not persisted.

Status semantics:

- Active accepted challenge: `reaction = accepted` and `withdrawn_at IS NULL`.
- Removed candidate challenge: same reaction row is preserved with `withdrawn_at IS NOT NULL`.
- Re-accepting uses the existing unique reaction row and clears `withdrawn_at`.
- Discover excludes active accepted challenges at the backend query level.
- Candidate Challenges returns only active accepted challenges.
- Historical acceptance analytics still count the stored accepted reaction even after withdrawal.
- Match creation requires active candidate acceptance, a submitted project, employer ownership of the opportunity, and employer reaction `accepted`.
- Employer reaction upserts are idempotent. Pass then accept can create one match; once a match exists, changing the decision to pass is blocked with HTTP 409.
- Duplicate employer accept requests return the existing match and do not create duplicate rows.

## Candidate Flow

Working from current code:

- Candidate feed is a mobile-first reel interface with Motion-based vertical navigation and horizontal pass/accept gestures.
- Only the active reel video plays; other candidate reel videos are paused.
- Feed videos autoplay muted, include custom sound controls, store sound preference in sessionStorage under `reelhire:candidate-feed-muted`, and keep `playsInline` for Safari.
- Watch time and video duration are measured and sent with candidate reactions.
- `Accept Challenge` calls the same mutation path as swipe-right acceptance.
- Successful acceptance invalidates feed and candidate challenges, shows a brief success state, then advances to the next eligible reel.
- Accepted opportunities disappear from Discover via backend filtering.
- Candidate Challenges can remove an accepted challenge with confirmation; removal marks the reaction withdrawn, invalidates relevant queries, and makes the opportunity eligible for Discover again.
- Removal is blocked if the candidate has already submitted a project for that opportunity.
- Candidate submission flow is present with GitHub URL validation, explanation video upload, and submission persistence.
- Candidate Matches uses persisted API matches in API mode and shows company, role, matched date, status, and challenge/project access.

## Employer Flow

Working from current code:

- Employer can create an opportunity through a lightweight form.
- Employer pitch video upload uses signed direct Cloudinary upload and then persists metadata through FastAPI.
- Employer opportunities list is backed by `GET /api/opportunities`.
- Employer can delete an opportunity through a contextual menu plus confirmation dialog.
- Opportunity deletion checks temporary employer ownership, blocks if submissions exist, deletes the Cloudinary pitch video using the stored public ID, deletes candidate reactions, and then hard-deletes the opportunity.
- Employer dashboard uses `useEmployerOpportunities`, selected opportunity analytics, and persisted employer matches query. In API mode it does not import mock opportunities for dashboard cards.
- Dashboard Pitch Performance uses the most recent active opportunity. If none exist, it shows an intentional empty state.
- Active Opportunities shows current published employer opportunities only, with an empty state when none exist.
- Employer submission lists and detail pages are backed by real submissions.
- Employer submission detail shows the explanation video with native controls, GitHub URL, candidate and challenge details, real Project Evaluation action/results, and real Pass / Accept Candidate actions.
- Project Evaluation evaluates only the submitted repository artifact against the employer challenge. It must not evaluate the human candidate, infer personal traits, or make hire/reject recommendations.
- Employer accepting a valid submission creates a persisted Match and shows a restrained Match success state.
- Employer Matches uses persisted API matches in API mode, links back to the project/submission and GitHub repository, and shows a compact Project Evaluation summary when one exists.

Scaffolded or incomplete:

- Video/transcript evaluation is not implemented.
- Databricks integration is not implemented. The current evaluator boundary can later be replaced by a Databricks-backed evaluator.
- Production repository evaluation is deployed and the backend task injects `OPENAI_API_KEY` from AWS Secrets Manager. The only current production submission points at `https://github.com/alexmorgan-dev/incident-queue`, which is not a public/reachable repository, so the evaluator endpoint correctly stops at repository clone with HTTP 502 instead of fabricating an evaluation.

## Media

Cloudinary behavior:

- Upload purposes: `opportunity_pitch` and `candidate_explanation`.
- Resource type is `video`.
- Signed response contains cloud name, API key, timestamp, signature, folder, public ID, and resource type; it does not expose API secret.
- Frontend upload errors are stage-aware: validation, signing, Cloudinary upload, and persistence.
- Server-side media deletion uses Cloudinary `destroy` with `resource_type="video"`.
- Already-missing Cloudinary assets are treated as recoverable for deletion; real Cloudinary failures abort database deletion.

## AWS

Region: `eu-central-1`.

Production URL:

- `http://reelhire-alb-239098254.eu-central-1.elb.amazonaws.com`

Verified AWS state on 2026-08-21:

- ECS cluster: `reelhire-cluster`.
- Frontend service: `reelhire-frontend-service`, ACTIVE, desired 1, running 1.
- Backend service: `reelhire-backend-service`, ACTIVE, desired 1, running 1.
- Frontend task definition: `reelhire-frontend:17`, X86_64/Linux, image tag `98866d178f27`.
- Backend task definition: `reelhire-backend:12`, X86_64/Linux, image tag `98866d178f27`.
- ECR repositories: `reelhire-frontend`, `reelhire-backend`.
- RDS: `reelhire-db`, PostgreSQL 18.3, `db.t4g.micro`, available, not publicly accessible.
- ALB: `reelhire-alb`, internet-facing application load balancer, active.
- Target groups: frontend port 3000 health path `/`, backend port 8000 health path `/api/health`; both had healthy targets.
- Backend task secrets are injected by name: `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Backend task definitions inject `OPENAI_API_KEY` from secret `reelhire/openai-api-key` for Project Evaluation.

Verified public endpoints:

- `GET /` returned HTTP 200 HTML.
- `GET /branding/reelhire-logo.png` returned HTTP 200 with `Content-Type: image/png`.
- `GET /api/health` returned HTTP 200 with `{"status":"ok"}`.
- `GET /api/opportunities/feed` returned HTTP 200 and `[]` in production at verification time because the current temporary candidate has accepted the only active opportunity.
- `GET /api/opportunities` returned HTTP 200 and one published opportunity at verification time.
- `GET /api/candidate/challenges` returned HTTP 200 and one submitted/matched challenge at verification time.
- `GET /api/employer/matches` returned HTTP 200 and one persisted match at verification time.
- `GET /api/candidate/matches` returned HTTP 200 and one persisted match at verification time.

## Deployment

Standard deployment command:

```bash
AWS_REGION=eu-central-1 ./infra/aws/deploy.sh
```

Supported partial deployments:

```bash
AWS_REGION=eu-central-1 ./infra/aws/deploy.sh frontend
AWS_REGION=eu-central-1 ./infra/aws/deploy.sh backend
AWS_REGION=eu-central-1 ./infra/aws/deploy.sh all
```

Migration command:

```bash
AWS_REGION=eu-central-1 ./infra/aws/migrate.sh
```

Status command:

```bash
AWS_REGION=eu-central-1 ./infra/aws/status.sh
```

Cloudinary production secrets helper:

```bash
AWS_REGION=eu-central-1 ./infra/aws/put-cloudinary-secrets.sh
```

OpenAI evaluator secret helper:

```bash
AWS_REGION=eu-central-1 ./infra/aws/put-openai-secret.sh
```

Rollback:

```bash
AWS_REGION=eu-central-1 ./infra/aws/rollback.sh frontend <task-definition-revision>
AWS_REGION=eu-central-1 ./infra/aws/rollback.sh backend <task-definition-revision>
```

## Local Development

Native local services:

- PostgreSQL is expected on `127.0.0.1:5432` with database `reelhire`.
- Start backend from `backend/`:

```bash
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- Start frontend from repository root:

```bash
npm run dev
```

- Local frontend API mode:

```env
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Docker local integration:

```bash
docker compose up --build
```

Notes from verification:

- Homebrew `postgresql@17` was running locally on port 5432.
- Local FastAPI was not running until started for a smoke test.
- Local Next.js was not running.
- Docker Desktop was not running.
- Local database was at Alembic head and had the expected tables.

## Important Product Rules

- Accepted challenges are hidden from Discover.
- Candidate challenge removal withdraws the candidate reaction; it does not delete the employer opportunity or video.
- Re-accepting a removed challenge clears `withdrawn_at` on the existing reaction row.
- Submitted challenges cannot be casually removed by the candidate.
- Employer opportunity deletion is a hard delete for opportunities without submissions.
- Employer opportunity deletion deletes the stored Cloudinary pitch video server-side; the browser never deletes Cloudinary assets directly.
- Employer opportunity deletion is blocked when submissions exist.
- Employer dashboard Active Opportunities and Pitch Performance must represent current published employer opportunities, not mocks.
- Candidate accepted challenge plus submitted project plus employer accepted decision creates a persisted Match.
- Employer pass decisions do not create a Match.
- Once a Match exists, accept-to-pass is blocked; use explicit close/archive semantics in a future iteration instead of deleting match history.
- Project Evaluation uses a fixed repository rubric: Challenge Completion 30%, Code Quality 25%, Architecture / Design 20%, Testing / Correctness 15%, Documentation 10%. The backend clamps dimension scores and calculates the overall score.

## Known Limitations / TODO

- No authentication; temporary candidate/employer identities are hardcoded in backend dependency abstractions.
- No HTTPS/custom domain yet; ALB is currently HTTP.
- Project Evaluation requires a submitted public GitHub repository. The only current production submission uses a non-existent/private demo GitHub URL, so production E2E evaluation is blocked until a real public repository is submitted.
- Video/transcript evaluation is not implemented.
- Candidate submission and employer review-to-match now work in API mode.
- Analytics are derived from current stored reaction rows and submissions; there is no separate immutable analytics-event table.
- Production currently has one published opportunity, one submitted challenge, and one persisted match for the temporary candidate, so production Discover returns an empty feed until another opportunity is created.

## Last Verified

Validation performed on 2026-08-21:

- `git status --short --branch`: `main` with local repository-evaluation/logo/deployment-script changes pending.
- Local PostgreSQL `SELECT 1`: succeeded.
- Local Alembic current: `20260821_0004 (head)`.
- Local Project Evaluation validation: repository inspector/evaluation service tests passed.
- Local FastAPI `GET /api/health`: HTTP 200.
- Local FastAPI `GET /api/opportunities/feed`: HTTP 200.
- `AWS_REGION=eu-central-1 ./infra/aws/status.sh`: services running and public health/feed checks passed.
- Public ALB `GET /`: HTTP 200.
- Public ALB `GET /api/health`: HTTP 200.
- Public ALB `GET /api/opportunities/feed`: HTTP 200.
- Public ALB `GET /api/employer/matches`: HTTP 200.
- Public ALB `GET /api/candidate/matches`: HTTP 200.
- Production direct Cloudinary candidate explanation upload succeeded through signed upload parameters.
- Production `POST /api/submissions` created a real submitted project.
- Production `POST /api/employer/submissions/{id}/reaction` with `accepted` created persisted match `match-2ab49129071f`.
- Production duplicate accept returned the same match; accept-to-pass returned HTTP 409 and match count stayed 1.
- Browser verification confirmed employer submission detail, employer matches, candidate matches, and dashboard match count render the persisted match.
- AWS deployment after Project Evaluation fix completed with frontend `reelhire-frontend:13` and backend `reelhire-backend:8`.
- AWS deployment after the frontend standalone public-asset fix completed with frontend `reelhire-frontend:14` and backend `reelhire-backend:9`.
- Public ALB `GET /branding/reelhire-logo.png`: HTTP 200, `Content-Type: image/png`.
- AWS deployment after the shared frontend logo branding cleanup completed with frontend `reelhire-frontend:15` and backend `reelhire-backend:10`.
- Production landing and employer sidebar use the shared ReelHire logo asset; the old manual `RH` badge branding is removed from the employer sidebar while `Employer Studio` remains visible.
- AWS deployment after the scoped landing/candidate palette refresh completed with frontend `reelhire-frontend:16` and backend `reelhire-backend:11`.
- Production landing uses the warm editorial `landing-theme`; candidate routes use the scoped coral/dusty-blue `candidate-theme`; employer dashboard remains on the existing `employer-theme`.
- AWS deployment after the deeper candidate dark-theme correction completed with frontend `reelhire-frontend:17` and backend `reelhire-backend:12` on 2026-08-21 13:10 CEST.
- Production candidate routes (`/candidate/feed`, `/candidate/challenges`, `/candidate/matches`, `/candidate/profile`) return HTTP 200 and use the layered warm-charcoal `candidate-theme`; the empty feed no longer renders as a flat black page.
- Production employer dashboard returns HTTP 200 and remains scoped to `employer-theme`; backend health through the ALB remains HTTP 200.
- Migration ECS task exited with code 0 and production is on `20260821_0004`.
- Backend ECS task definition secret names include `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `OPENAI_API_KEY`.
- Production `POST /api/employer/submissions/sub-ae0d2eafedfe/analyze` reached repository cloning and returned HTTP 502 because `https://github.com/alexmorgan-dev/incident-queue` is not public/reachable. It no longer returns missing OpenAI configuration.
- Production submission detail still has `project_evaluation: null`; no fake evaluation was persisted after the clone failure.
- `bash -n infra/aws/*.sh`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `cd backend && .venv/bin/pytest`: passed, 48 tests.
