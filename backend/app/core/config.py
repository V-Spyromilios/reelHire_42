from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPOSITORY_DIR = BACKEND_DIR.parent
ENV_FILES = (REPOSITORY_DIR / ".env", BACKEND_DIR / ".env")


class Settings(BaseSettings):
    database_url: str = Field(default="postgresql+psycopg://reelhire:reelhire@localhost:5432/reelhire")
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    frontend_origin: str = "http://localhost:3000"
    openrouter_api_key: SecretStr | None = None
    openrouter_model: str = "nvidia/nemotron-3-super-120b-a12b:free"
    openrouter_fallback_models: str = "openai/gpt-4.1-mini"
    openrouter_site_url: str | None = None
    openrouter_app_name: str = "ReelHire"
    github_token: SecretStr | None = None

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

    @property
    def openrouter_models(self) -> list[str]:
        fallbacks = [model.strip() for model in self.openrouter_fallback_models.split(",") if model.strip()]
        return list(dict.fromkeys([self.openrouter_model.strip(), *fallbacks]))


@lru_cache
def get_settings() -> Settings:
    return Settings()
