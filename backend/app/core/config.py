from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPOSITORY_DIR = BACKEND_DIR.parent
ENV_FILES = (REPOSITORY_DIR / ".env", BACKEND_DIR / ".env")


class Settings(BaseSettings):
    database_url: str = Field(default="postgresql+psycopg://reelhire:reelhire@localhost:5432/reelhire")
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    frontend_origin: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        configured = [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]
        development_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
        return list(dict.fromkeys([*configured, *development_origins]))


@lru_cache
def get_settings() -> Settings:
    return Settings()
