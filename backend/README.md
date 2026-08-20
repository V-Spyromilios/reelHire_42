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
