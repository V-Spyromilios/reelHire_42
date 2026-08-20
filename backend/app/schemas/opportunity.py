from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.media import MediaAsset, MediaAssetResponse

SkillName = Annotated[str, Field(min_length=1, max_length=100)]


class WorkMode(StrEnum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"


class OpportunityStatus(StrEnum):
    draft = "draft"
    published = "published"
    closed = "closed"


class EmployerResponse(BaseModel):
    id: str
    companyName: str
    logoUrl: str
    recruiterName: str
    recruiterAvatarUrl: str
    location: str


class CreateOpportunityRequest(BaseModel):
    role_title: str = Field(min_length=3, max_length=160)
    short_description: str = Field(min_length=12, max_length=1_200)
    challenge_title: str = Field(min_length=4, max_length=200)
    challenge_description: str = Field(min_length=24, max_length=6_000)
    skills: list[SkillName] = Field(min_length=1, max_length=12)
    location: str = Field(min_length=2, max_length=160)
    work_mode: WorkMode
    expected_challenge_duration: str = Field(min_length=2, max_length=80)
    deadline: datetime | None = None
    pitch_video: MediaAsset

    model_config = ConfigDict(str_strip_whitespace=True)


class OpportunityResponse(BaseModel):
    id: str
    employer: EmployerResponse
    employer_id: str
    company_name: str
    role_title: str
    short_description: str
    challenge_title: str
    challenge_description: str
    skills: list[str]
    location: str
    work_mode: WorkMode
    expected_challenge_duration: str
    deadline: datetime | None = None
    created_at: datetime
    status: OpportunityStatus
    pitch_video: MediaAssetResponse | None = None
    pitch_video_secure_url: str | None = None
