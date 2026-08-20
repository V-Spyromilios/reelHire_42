from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class UploadPurpose(StrEnum):
    opportunity_pitch = "opportunity_pitch"
    candidate_explanation = "candidate_explanation"


class SignUploadRequest(BaseModel):
    purpose: UploadPurpose


class SignedUploadResponse(BaseModel):
    cloud_name: str
    api_key: str
    timestamp: int
    signature: str
    folder: str
    public_id: str
    resource_type: str = "video"


class MediaAsset(BaseModel):
    public_id: str = Field(min_length=1, max_length=255)
    secure_url: HttpUrl
    resource_type: str
    format: str = Field(min_length=1, max_length=32)
    bytes: int = Field(gt=0, le=100 * 1024 * 1024)
    width: int | None = Field(default=None, gt=0)
    height: int | None = Field(default=None, gt=0)
    duration_seconds: float | None = Field(default=None, gt=0)
    created_at: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("resource_type")
    @classmethod
    def validate_video(cls, value: str) -> str:
        if value != "video":
            raise ValueError("Only video uploads are supported.")
        return value


class MediaAssetResponse(MediaAsset):
    secure_url: str
