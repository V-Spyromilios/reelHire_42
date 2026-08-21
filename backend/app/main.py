import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from app.api.routes import health, media, opportunities, submissions
from app.core.config import get_settings
from app.services.repository_evaluation_service import repository_analysis_worker


@asynccontextmanager
async def lifespan(_app: FastAPI):
    analysis_worker = asyncio.create_task(repository_analysis_worker(), name="repository-analysis-worker")
    try:
        yield
    finally:
        analysis_worker.cancel()
        with suppress(asyncio.CancelledError):
            await analysis_worker


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="ReelHire API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(media.router)
    app.include_router(opportunities.router)
    app.include_router(submissions.router)

    @app.exception_handler(OperationalError)
    async def database_unavailable_handler(_request, _exc):
        return JSONResponse(
            status_code=503,
            content={"detail": "Database is unavailable. Check PostgreSQL and run Alembic migrations."},
        )

    return app


app = create_app()
