from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel

from app.schemas.opportunity import OpportunityResponse
from app.schemas.reaction import EmployerReactionResponse
from app.schemas.submission import CandidateResponse


class MatchStatus(StrEnum):
    matched = "matched"
    interview_requested = "interview_requested"
    interview_scheduled = "interview_scheduled"
    closed = "closed"


class MatchResponse(BaseModel):
    id: str
    opportunity: OpportunityResponse
    candidate: CandidateResponse
    submissionId: str
    createdAt: datetime
    status: MatchStatus


class EmployerSubmissionReactionResponse(BaseModel):
    reaction: EmployerReactionResponse
    match: MatchResponse | None = None
