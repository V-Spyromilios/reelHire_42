from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class ProjectEvaluationStatus(StrEnum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class EvidenceItem(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    file_path: str | None = Field(default=None, max_length=400)
    observation: str = Field(min_length=1, max_length=800)


class ProjectEvaluationResult(BaseModel):
    challenge_completion: int
    code_quality: int
    architecture: int
    testing: int
    documentation: int
    summary: str = Field(min_length=1, max_length=1600)
    strengths: list[str] = Field(default_factory=list, max_length=8)
    concerns: list[str] = Field(default_factory=list, max_length=8)
    evidence: list[EvidenceItem] = Field(default_factory=list, max_length=12)


class ProjectEvaluationResponse(BaseModel):
    id: str
    submission_id: str
    overall_score: int | None = None
    challenge_completion: int
    code_quality: int
    architecture: int
    testing: int
    documentation: int
    summary: str
    strengths: list[str]
    concerns: list[str]
    evidence: list[EvidenceItem]
    status: ProjectEvaluationStatus
    created_at: datetime
    updated_at: datetime


class RepositoryFileEvidence(BaseModel):
    path: str
    content: str


class RepositoryEvidence(BaseModel):
    url: str
    file_count_examined: int
    languages_detected: list[str]
    has_readme: bool
    has_tests: bool
    tree: list[str]
    readme: str | None = None
    files: list[RepositoryFileEvidence]


class ChallengeContext(BaseModel):
    role_title: str
    challenge_title: str
    challenge_description: str
    expected_challenge_duration: str
    skills: list[str]
