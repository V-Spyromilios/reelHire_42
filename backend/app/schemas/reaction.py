from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class CandidateReactionKind(StrEnum):
    accepted = "accepted"
    passed = "passed"
    saved = "saved"


class CandidateReactionRequest(BaseModel):
    reaction: CandidateReactionKind
    watch_time_ms: int = Field(ge=0)
    video_duration_ms: int = Field(gt=0)
    reacted_at: datetime | None = None


class CandidateReactionResponse(BaseModel):
    id: str
    candidateId: str
    opportunityId: str
    reaction: CandidateReactionKind
    watchTimeMs: int
    videoDurationMs: int
    reactedAt: datetime


class EmployerReactionKind(StrEnum):
    accepted = "accepted"
    passed = "passed"


class EmployerReactionRequest(BaseModel):
    reaction: EmployerReactionKind


class EmployerReactionResponse(BaseModel):
    id: str
    employerId: str
    submissionId: str
    reaction: EmployerReactionKind
    reactedAt: datetime
    updatedAt: datetime
