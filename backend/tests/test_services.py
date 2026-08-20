from datetime import UTC, datetime

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from app.dependencies.identity import CandidateIdentity, EmployerIdentity
from app.models.opportunity import CandidateReaction, Opportunity
from app.repositories.opportunity_repository import OpportunityRepository
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
        self.items = None
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
        if self.items is not None:
            return [
                item
                for item in self.items
                if item.employer_id == employer_id and item.status == "published"
            ]
        return [self.item] if self.item and self.item.employer_id == employer_id and self.item.status == "published" else []

    async def list_feed(self, candidate_id: str):
        if (
            self.reaction
            and self.reaction.candidate_id == candidate_id
            and self.reaction.reaction == "accepted"
            and self.reaction.withdrawn_at is None
        ):
            return []
        return [self.item] if self.item else []

    async def upsert_candidate_reaction(self, reaction):
        reaction.id = "cr-test"
        reaction.withdrawn_at = None
        self.reaction = reaction
        return reaction

    async def accepted_for_candidate(self, candidate_id: str):
        if (
            self.item
            and self.reaction
            and self.reaction.candidate_id == candidate_id
            and self.reaction.reaction == "accepted"
            and self.reaction.withdrawn_at is None
        ):
            return [self.item]
        return []

    async def reactions_for_opportunity(self, opportunity_id: str):
        if self.reaction and self.reaction.opportunity_id == opportunity_id:
            return [self.reaction]
        return []

    async def withdraw_candidate_reaction(self, candidate_id: str, opportunity_id: str, withdrawn_at: datetime):
        if (
            self.reaction
            and self.reaction.candidate_id == candidate_id
            and self.reaction.opportunity_id == opportunity_id
            and self.reaction.reaction == "accepted"
            and self.reaction.withdrawn_at is None
        ):
            self.reaction.withdrawn_at = withdrawn_at
            return self.reaction
        return None

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

    async def count_all_for_opportunity(self, opportunity_id: str):
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


class CapturingScalarResult:
    def __init__(self, reaction: CandidateReaction) -> None:
        self.reaction = reaction

    def one(self) -> CandidateReaction:
        return self.reaction


class CapturingSession:
    def __init__(self) -> None:
        self.statement = None

    async def scalars(self, statement):
        self.statement = statement
        return CapturingScalarResult(
            CandidateReaction(
                id="cr-test",
                candidate_id="cand-alex",
                opportunity_id="opp-test",
                reaction="accepted",
                watch_time_ms=1200,
                video_duration_ms=24000,
                reacted_at=datetime.now(UTC),
            )
        )


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
        created_at=datetime.now(UTC),
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
async def test_employer_active_opportunities_exclude_closed_items() -> None:
    active = stored_opportunity(opportunity_id="opp-active")
    closed = stored_opportunity(opportunity_id="opp-closed")
    closed.status = "closed"
    opportunities = FakeOpportunityRepository()
    opportunities.items = [active, closed]
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity())

    response = await service.list_employer()

    assert [item.id for item in response] == ["opp-active"]


@pytest.mark.asyncio
async def test_opportunity_analytics_uses_current_backend_state() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(opportunity_id="opp-test")
    opportunities.reaction = CandidateReaction(
        id="cr-test",
        candidate_id="cand-alex",
        opportunity_id="opp-test",
        reaction="accepted",
        watch_time_ms=1200,
        video_duration_ms=24000,
        reacted_at=datetime.now(UTC),
    )
    submissions = FakeSubmissionRepository()
    submissions.opportunity_submission_count = 1
    service = OpportunityService(opportunities, submissions, EmployerIdentity())

    response = await service.analytics("opp-test")

    assert response.opportunityId == "opp-test"
    assert response.uniqueViews == 1
    assert response.acceptedCount == 1
    assert response.submissionsCount == 1
    assert response.acceptanceRate == 1


@pytest.mark.asyncio
async def test_opportunity_analytics_rejects_closed_opportunity() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(opportunity_id="opp-test")
    opportunities.item.status = "closed"
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity())

    with pytest.raises(HTTPException) as exc_info:
        await service.analytics("opp-test")

    assert exc_info.value.status_code == 404


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
async def test_candidate_reaction_upsert_generates_id_and_updates_on_conflict() -> None:
    session = CapturingSession()
    repository = OpportunityRepository(session)  # type: ignore[arg-type]

    response = await repository.upsert_candidate_reaction(
        CandidateReaction(
            candidate_id="cand-alex",
            opportunity_id="opp-test",
            reaction="accepted",
            watch_time_ms=1200,
            video_duration_ms=24000,
            reacted_at=datetime.now(UTC),
        )
    )

    assert response.id == "cr-test"
    assert session.statement is not None
    compiled = session.statement.compile(dialect=postgresql.dialect())
    assert compiled.params["id"].startswith("cr-")
    assert "ON CONFLICT ON CONSTRAINT uq_candidate_reaction_opportunity DO UPDATE" in str(compiled)


@pytest.mark.asyncio
async def test_accepted_opportunity_is_excluded_from_feed_and_included_in_challenges() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(opportunity_id="opp-test")
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity())
    candidate = CandidateIdentity()

    assert len(await service.list_feed(candidate)) == 1

    await service.react(
        "opp-test",
        candidate,
        CandidateReactionRequest(reaction="accepted", watch_time_ms=1200, video_duration_ms=24000),
    )

    assert await service.list_feed(candidate) == []
    challenges = await service.candidate_challenges(candidate)
    assert [item["id"] for item in challenges] == ["opp-test"]


@pytest.mark.asyncio
async def test_removing_accepted_challenge_withdraws_reaction_and_restores_feed_eligibility() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(opportunity_id="opp-test")
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity())
    candidate = CandidateIdentity()

    await service.react(
        "opp-test",
        candidate,
        CandidateReactionRequest(reaction="accepted", watch_time_ms=1200, video_duration_ms=24000),
    )
    await service.remove_candidate_reaction("opp-test", candidate)

    assert opportunities.reaction.reaction == "accepted"
    assert opportunities.reaction.withdrawn_at is not None
    assert await service.candidate_challenges(candidate) == []
    assert [item.id for item in await service.list_feed(candidate)] == ["opp-test"]


@pytest.mark.asyncio
async def test_reaccept_after_removal_reactivates_existing_reaction() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(opportunity_id="opp-test")
    service = OpportunityService(opportunities, FakeSubmissionRepository(), EmployerIdentity())
    candidate = CandidateIdentity()

    await service.react(
        "opp-test",
        candidate,
        CandidateReactionRequest(reaction="accepted", watch_time_ms=1200, video_duration_ms=24000),
    )
    await service.remove_candidate_reaction("opp-test", candidate)
    await service.react(
        "opp-test",
        candidate,
        CandidateReactionRequest(reaction="accepted", watch_time_ms=2200, video_duration_ms=24000),
    )

    assert opportunities.reaction.withdrawn_at is None
    assert opportunities.reaction.watch_time_ms == 2200
    assert await service.list_feed(candidate) == []


@pytest.mark.asyncio
async def test_removing_challenge_with_submission_returns_409() -> None:
    opportunities = FakeOpportunityRepository()
    opportunities.item = stored_opportunity(opportunity_id="opp-test")
    submissions = FakeSubmissionRepository()
    submissions.item = object()
    service = OpportunityService(opportunities, submissions, EmployerIdentity())
    candidate = CandidateIdentity()

    await service.react(
        "opp-test",
        candidate,
        CandidateReactionRequest(reaction="accepted", watch_time_ms=1200, video_duration_ms=24000),
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.remove_candidate_reaction("opp-test", candidate)

    assert exc_info.value.status_code == 409
    assert opportunities.reaction.withdrawn_at is None


@pytest.mark.asyncio
async def test_removing_unknown_challenge_returns_404() -> None:
    service = OpportunityService(FakeOpportunityRepository(), FakeSubmissionRepository(), EmployerIdentity())

    with pytest.raises(HTTPException) as exc_info:
        await service.remove_candidate_reaction("missing", CandidateIdentity())

    assert exc_info.value.status_code == 404


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
