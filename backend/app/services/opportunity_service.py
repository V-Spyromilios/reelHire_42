from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.dependencies.identity import CandidateIdentity, EmployerIdentity
from app.models.opportunity import CandidateReaction, Opportunity
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.media import MediaAssetResponse
from app.schemas.opportunity import CreateOpportunityRequest, EmployerResponse, OpportunityResponse
from app.schemas.reaction import CandidateReactionRequest, CandidateReactionResponse
from app.services.cloudinary_service import CloudinaryService


def employer_response(identity: EmployerIdentity) -> EmployerResponse:
    return EmployerResponse(
        id=identity.id,
        companyName=identity.company_name,
        logoUrl=identity.logo_url,
        recruiterName=identity.recruiter_name,
        recruiterAvatarUrl=identity.recruiter_avatar_url,
        location=identity.location,
    )


def media_from_opportunity(opportunity: Opportunity) -> MediaAssetResponse | None:
    if not opportunity.pitch_video_public_id or not opportunity.pitch_video_secure_url:
        return None
    return MediaAssetResponse(
        public_id=opportunity.pitch_video_public_id,
        secure_url=opportunity.pitch_video_secure_url,
        resource_type="video",
        format=opportunity.pitch_video_format or "mp4",
        bytes=opportunity.pitch_video_bytes or 1,
        width=opportunity.pitch_video_width,
        height=opportunity.pitch_video_height,
        duration_seconds=opportunity.pitch_video_duration_seconds,
        created_at=opportunity.pitch_video_created_at,
    )


def opportunity_response(opportunity: Opportunity, employer: EmployerIdentity) -> OpportunityResponse:
    return OpportunityResponse(
        id=opportunity.id,
        employer=employer_response(employer),
        employer_id=opportunity.employer_id,
        company_name=opportunity.company_name,
        role_title=opportunity.role_title,
        short_description=opportunity.short_description,
        challenge_title=opportunity.challenge_title,
        challenge_description=opportunity.challenge_description,
        skills=opportunity.skills,
        location=opportunity.location,
        work_mode=opportunity.work_mode,
        expected_challenge_duration=opportunity.expected_challenge_duration,
        deadline=opportunity.deadline,
        created_at=opportunity.created_at,
        status=opportunity.status,
        pitch_video=media_from_opportunity(opportunity),
        pitch_video_secure_url=opportunity.pitch_video_secure_url,
    )


class OpportunityService:
    def __init__(
        self,
        repository: OpportunityRepository,
        submission_repository: SubmissionRepository,
        employer: EmployerIdentity,
        cloudinary_service: CloudinaryService | None = None,
    ):
        self.repository = repository
        self.submission_repository = submission_repository
        self.employer = employer
        self.cloudinary_service = cloudinary_service

    async def create(self, payload: CreateOpportunityRequest) -> OpportunityResponse:
        media = payload.pitch_video
        opportunity = Opportunity(
            employer_id=self.employer.id,
            company_name=self.employer.company_name,
            role_title=payload.role_title,
            short_description=payload.short_description,
            challenge_title=payload.challenge_title,
            challenge_description=payload.challenge_description,
            skills=payload.skills,
            location=payload.location,
            work_mode=payload.work_mode.value,
            expected_challenge_duration=payload.expected_challenge_duration,
            deadline=payload.deadline,
            status="published",
            pitch_video_public_id=media.public_id,
            pitch_video_secure_url=str(media.secure_url),
            pitch_video_duration_seconds=media.duration_seconds,
            pitch_video_format=media.format,
            pitch_video_bytes=media.bytes,
            pitch_video_width=media.width,
            pitch_video_height=media.height,
            pitch_video_created_at=media.created_at,
        )
        created = await self.repository.add(opportunity)
        return opportunity_response(created, self.employer)

    async def list_employer(self) -> list[OpportunityResponse]:
        return [opportunity_response(item, self.employer) for item in await self.repository.list_for_employer(self.employer.id)]

    async def list_feed(self) -> list[OpportunityResponse]:
        return [opportunity_response(item, self.employer) for item in await self.repository.list_feed()]

    async def get(self, opportunity_id: str) -> OpportunityResponse:
        opportunity = await self.repository.get(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")
        return opportunity_response(opportunity, self.employer)

    async def delete(self, opportunity_id: str) -> None:
        opportunity = await self.repository.get(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")
        if opportunity.employer_id != self.employer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to delete this opportunity.")

        if await self.submission_repository.count_for_opportunity(opportunity_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This opportunity already has candidate submissions and cannot be deleted.",
            )

        if opportunity.pitch_video_public_id and self.cloudinary_service:
            self.cloudinary_service.delete_video(opportunity.pitch_video_public_id)

        await self.repository.delete_candidate_reactions(opportunity_id)
        await self.repository.delete(opportunity)

    async def react(self, opportunity_id: str, candidate: CandidateIdentity, payload: CandidateReactionRequest) -> CandidateReactionResponse:
        if not await self.repository.get(opportunity_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")

        reaction = CandidateReaction(
            candidate_id=candidate.id,
            opportunity_id=opportunity_id,
            reaction=payload.reaction.value,
            watch_time_ms=payload.watch_time_ms,
            video_duration_ms=payload.video_duration_ms,
            reacted_at=payload.reacted_at or datetime.now(timezone.utc),
        )
        saved = await self.repository.upsert_candidate_reaction(reaction)
        return CandidateReactionResponse(
            id=saved.id,
            candidateId=saved.candidate_id,
            opportunityId=saved.opportunity_id,
            reaction=saved.reaction,
            watchTimeMs=saved.watch_time_ms,
            videoDurationMs=saved.video_duration_ms,
            reactedAt=saved.reacted_at,
        )

    async def candidate_challenges(self, candidate: CandidateIdentity) -> list[dict]:
        opportunities = await self.repository.accepted_for_candidate(candidate.id)
        responses: list[dict] = []
        for opportunity in opportunities:
            submission = await self.submission_repository.get_for_candidate_opportunity(candidate.id, opportunity.id)
            item = opportunity_response(opportunity, self.employer).model_dump(mode="json")
            item["challenge_status"] = "submitted" if submission else "in progress"
            responses.append(item)
        return responses
