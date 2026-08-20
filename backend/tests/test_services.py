from datetime import UTC, datetime

import pytest
from fastapi import HTTPException

from app.dependencies.identity import CandidateIdentity, EmployerIdentity
from app.models.opportunity import Opportunity
from app.schemas.media import MediaAsset
from app.schemas.opportunity import CreateOpportunityRequest
from app.schemas.reaction import CandidateReactionRequest
from app.schemas.submission import CreateSubmissionRequest
from app.services.opportunity_service import OpportunityService
from app.services.submission_service import SubmissionService


def media() -> MediaAsset:
    return MediaAsset(
        public_id="reelhire/test/video",
        secure_url="https://res.cloudinary.com/demo/video/upload/test.mp4",
        resource_type="video",
        format="mp4",
        bytes=4096,
        duration_seconds=31,
    )


class FakeOpportunityRepository:
    def __init__(self) -> None:
        self.item = None
        self.reaction = None
        self.deleted = False
        self.deleted_reactions_for = None

    async def add(self, opportunity):
        opportunity.id = opportunity.id or "opp-test"
        opportunity.created_at = datetime.now(UTC)
        self.item = opportunity
        return opportunity

    async def get(self, opportunity_id: str):
        return self.item if self.item and self.item.id == opportunity_id else None

    async def list_for_employer(self, employer_id: str):
        return [self.item] if self.item and self.item.employer_id == employer_id else []

    async def list_feed(self):
        return [self.item] if self.item else []

    async def upsert_candidate_reaction(self, reaction):
        reaction.id = "cr-test"
        self.reaction = reaction
        return reaction

    async def accepted_for_candidate(self, candidate_id: str):
        return [self.item] if self.item else []

    async def delete_candidate_reactions(self, opportunity_id: str):
        self.deleted_reactions_for = opportunity_id

    async def delete(self, opportunity):
        self.deleted = True
        self.item = None


class FakeSubmissionRepository:
    def __init__(self) -> None:
        self.item = None
        self.opportunity_submission_count = 0

    async def get_for_candidate_opportunity(self, candidate_id: str, opportunity_id: str):
        return self.item

    async def count_for_opportunity(self, opportunity_id: str):
        return self.opportunity_submission_count

    async def upsert(self, submission):
        submission.id = "sub-test"
        submission.created_at = datetime.now(UTC)
        submission.updated_at = datetime.now(UTC)
        self.item = submission
        return submission


class FakeCloudinaryService:
    def __init__(self, should_fail: bool = False) -> None:
        self.should_fail = should_fail
        self.deleted_public_ids: list[str] = []

    def delete_video(self, public_id: str) -> None:
        if self.should_fail:
            raise HTTPException(status_code=502, detail="Cloudinary deletion failed.")
        self.deleted_public_ids.append(public_id)


def stored_opportunity(
    *,
    opportunity_id: str = "opp-delete",
    employer_id: str = "emp-nova",
    pitch_video_public_id: str | None = "reelhire/opportunities/delete-me",
) -> Opportunity:
    return Opportunity(
        id=opportunity_id,
        employer_id=employer_id,
        company_name="Nova Systems",
        role_title="Backend Engineer",
        short_description="Build resilient queueing for delayed shipments.",
        challenge_title="Design a job queue",
        challenge_description="Build a queue service and document retry behavior under failure.",
        skills=["Go", "Postgres"],
        location="Berlin",
        work_mode="hybrid",
        expected_challenge_duration="4-6 hours",
        status="published",
        pitch_video_public_id=pitch_video_public_id,
        pitch_video_secure_url="https://res.cloudinary.com/demo/video/upload/delete-me.mp4",
    )


@pytest.mark.asyncio
async def test_create_opportunity_service() -> None:
    opportunities = FakeOpportunityRepository()
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity())

    response = await service.create(
        CreateOpportunityRequest(
            role_title="Backend Engineer",
            short_description="Build resilient queueing for delayed shipments.",
            challenge_title="Design a job queue",
            challenge_description="Build a queue service and document retry behavior under failure.",
            skills=["Go", "Postgres"],
            location="Berlin",
            work_mode="hybrid",
            expected_challenge_duration="4-6 hours",
            pitch_video=media(),
        )
    )

    assert response.pitch_video_secure_url == "https://res.cloudinary.com/demo/video/upload/test.mp4"
    assert response.employer.companyName == "Nova Systems"


@pytest.mark.asyncio
async def test_reaction_service_is_structured_for_upsert() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(opportunity_id="opp-test")
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity())

    response = await service.react(
        "opp-test",
        CandidateIdentity(),
        CandidateReactionRequest(reaction="accepted", watch_time_ms=1200, video_duration_ms=24000),
    )

    assert response.reaction == "accepted"
    assert opportunities.reaction.candidate_id == "cand-alex"


@pytest.mark.asyncio
async def test_create_submission_service() -> None:
    submissions = FakeSubmissionRepository()
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(opportunity_id="opp-test")
    service = SubmissionService(submissions, opportunities, CandidateIdentity())

    response = await service.create(
        CreateSubmissionRequest(
            opportunity_id="opp-test",
            github_url="https://github.com/alexmorgan-dev/incident-queue",
            explanation_video=media(),
        )
    )

    assert response.status == "submitted"
    assert response.explanation_video_secure_url == "https://res.cloudinary.com/demo/video/upload/test.mp4"


@pytest.mark.asyncio
async def test_delete_opportunity_deletes_cloudinary_video_and_database_records() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity()
    submissions = FakeSubmissionRepository()
    cloudinary = FakeCloudinaryService()
    service = OpportunityService(opportunities, submissions, EmployerIdentity(), cloudinary)

    await service.delete("opp-delete")

    assert cloudinary.deleted_public_ids == ["reelhire/opportunities/delete-me"]
    assert opportunities.deleted_reactions_for == "opp-delete"
    assert opportunities.deleted is True


@pytest.mark.asyncio
async def test_delete_unknown_opportunity_returns_404() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = None
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity(), FakeCloudinaryService())

    with pytest.raises(HTTPException) as exc_info:
        await service.delete("missing")

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_opportunity_rejects_wrong_employer() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(employer_id="emp-other")
    cloudinary = FakeCloudinaryService()
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity(), cloudinary)

    with pytest.raises(HTTPException) as exc_info:
        await service.delete("opp-delete")

    assert exc_info.value.status_code == 403
    assert cloudinary.deleted_public_ids == []
    assert opportunities.deleted is False


@pytest.mark.asyncio
async def test_delete_opportunity_prevents_deletion_when_submission_exists() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity()
    submissions = FakeSubmissionRepository()
    submissions.opportunity_submission_count = 1
    cloudinary = FakeCloudinaryService()
    service = OpportunityService(opportunities, submissions, EmployerIdentity(), cloudinary)

    with pytest.raises(HTTPException) as exc_info:
        await service.delete("opp-delete")

    assert exc_info.value.status_code == 409
    assert cloudinary.deleted_public_ids == []
    assert opportunities.deleted is False


@pytest.mark.asyncio
async def test_delete_opportunity_cloudinary_failure_prevents_database_deletion() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity()
    service = OpportunityService(
        opportunities,
        FakeSubmissionRepository(),
        EmployerIdentity(),
        FakeCloudinaryService(should_fail=True),
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.delete("opp-delete")

    assert exc_info.value.status_code == 502
    assert opportunities.deleted_reactions_for is None
    assert opportunities.deleted is False


@pytest.mark.asyncio
async def test_delete_opportunity_allows_database_deletion_when_media_is_already_missing() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity()
    cloudinary = FakeCloudinaryService()
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity(), cloudinary)

    await service.delete("opp-delete")

    assert opportunities.deleted is True
