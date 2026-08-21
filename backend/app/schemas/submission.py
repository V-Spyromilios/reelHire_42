from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.schemas.media import MediaAsset, MediaAssetResponse
from app.schemas.reaction import EmployerReactionResponse
from app.schemas.evaluation import ProjectEvaluationResponse


class SubmissionStatus(StrEnum):
    draft = "draft"
    submitted = "submitted"
    analysis_pending = "analysis_pending"
    analysis_complete = "analysis_complete"
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
        if value.host not in {"github.com", "www.github.com"}:
            raise ValueError("Repository must be hosted on GitHub.")
        parts = [part for part in value.path.split("/") if part]
        if len(parts) < 2:
            raise ValueError("Enter a public GitHub repository URL.")
        return value


class SubmissionResponse(BaseModel):
    id: str
    candidate: CandidateResponse
    candidate_id: str
    opportunity_id: str
    github_url: str
    explanation_video: MediaAssetResponse | None = None
    explanation_video_secure_url: str | None = None
    status: SubmissionStatus
    created_at: datetime
    updated_at: datetime
    employer_reaction: EmployerReactionResponse | None = None
    match_id: str | None = None
    match_status: str | None = None
    project_evaluation: ProjectEvaluationResponse | None = None
