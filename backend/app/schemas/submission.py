from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.schemas.media import MediaAsset, MediaAssetResponse
from app.services.github_repository import parse_github_repository_url


class SubmissionStatus(StrEnum):
    draft = "draft"
    submitted = "submitted"
    analysis_pending = "analysis_pending"
    analysis_complete = "analysis_complete"
    analysis_failed = "analysis_failed"
    matched = "matched"
    closed = "closed"


class CandidateResponse(BaseModel):
    id: str
    name: str
    avatarUrl: str
    headline: str
    location: str
    skills: list[str]
    githubUsername: str | None = None


class CreateSubmissionRequest(BaseModel):
    opportunity_id: str = Field(min_length=1)
    github_url: HttpUrl
    explanation_video: MediaAsset

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("github_url")
    @classmethod
    def validate_github_repo(cls, value: HttpUrl) -> HttpUrl:
        parse_github_repository_url(str(value))
        return value


class ProjectEvidenceResponse(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    file: str = Field(min_length=1, max_length=500)
    lines: str = Field(min_length=1, max_length=80)
    note: str = Field(min_length=1, max_length=600)

    model_config = ConfigDict(extra="forbid")


class ProjectAnalysisResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    code_quality: int = Field(ge=0, le=100)
    architecture: int = Field(ge=0, le=100)
    testing: int = Field(ge=0, le=100)
    documentation: int = Field(ge=0, le=100)
    summary: str = Field(min_length=1, max_length=1_200)
    strengths: list[str] = Field(max_length=5)
    concerns: list[str] = Field(max_length=5)
    evidence: list[ProjectEvidenceResponse] = Field(max_length=6)

    model_config = ConfigDict(extra="forbid")


class SubmissionResponse(BaseModel):
    id: str
    candidate: CandidateResponse
    candidate_id: str
    opportunity_id: str
    github_url: str
    explanation_video: MediaAssetResponse | None = None
    explanation_video_secure_url: str | None = None
    status: SubmissionStatus
    analysis: ProjectAnalysisResponse | None = None
    analysis_error: str | None = None
    analysis_model: str | None = None
    analysis_commit_sha: str | None = None
    analysis_evaluated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
