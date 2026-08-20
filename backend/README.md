# ReelHire FastAPI Backend

Local setup:

1. Start PostgreSQL and create a `reelhire` database.
2. Create a virtual environment:
   `python3 -m venv .venv`
3. Install dependencies:
   `.venv/bin/pip install -r requirements.txt`
4. Copy `backend/.env.example` to `backend/.env` and fill in PostgreSQL and Cloudinary values.
5. Run migrations from `backend/`:
   `.venv/bin/alembic upgrade head`
6. Start the API from `backend/`:
   `.venv/bin/uvicorn app.main:app --reload --port 8000`

The browser uploads video directly to Cloudinary using signed parameters from `POST /api/media/sign-upload`.
FastAPI never receives the video binary and never exposes `CLOUDINARY_API_SECRET` to the frontend.

## OpenRouter repository analysis

Set `OPENROUTER_API_KEY` in `backend/.env` to enable the background analysis that starts when a candidate submits a public GitHub repository. The key must remain in the FastAPI environment; never use a `NEXT_PUBLIC_OPENROUTER_API_KEY` frontend variable.

The default route is `nvidia/nemotron-3-super-120b-a12b:free`, followed by `openai/gpt-4.1-mini` as a reliability fallback. Override `OPENROUTER_MODEL` or comma-separated `OPENROUTER_FALLBACK_MODELS` only with models that support JSON Schema structured outputs. `GITHUB_TOKEN` is optional but useful for higher GitHub API limits. The evaluator reads a capped, allow-listed set of text files and never clones or executes repository code.

Run a real evaluation without the database or frontend:

```bash
.venv/bin/python scripts/evaluate_repository.py https://github.com/owner/repository
```

Evaluations are persisted with the repository commit SHA. Exact resubmissions do not create another paid model call; failed analyses can be retried without re-uploading the repository or video. Treat the result as advisory and verify its file evidence before making a hiring decision.
