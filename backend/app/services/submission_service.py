from fastapi import HTTPException, status

from app.dependencies.identity import CandidateIdentity
from app.models.submission import Submission
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.media import MediaAssetResponse
from app.schemas.submission import CandidateResponse, CreateSubmissionRequest, SubmissionResponse


def candidate_response(identity: CandidateIdentity) -> CandidateResponse:
    return CandidateResponse(
        id=identity.id,
        name=identity.name,
        avatarUrl=identity.avatar_url,
        headline=identity.headline,
        location=identity.location,
        skills=list(identity.skills),
        githubUsername=identity.github_username,
    )


def media_from_submission(submission: Submission) -> MediaAssetResponse | None:
    if not submission.explanation_video_public_id or not submission.explanation_video_secure_url:
        return None
    return MediaAssetResponse(
        public_id=submission.explanation_video_public_id,
        secure_url=submission.explanation_video_secure_url,
        resource_type="video",
        format=submission.explanation_video_format or "mp4",
        bytes=submission.explanation_video_bytes or 1,
        width=submission.explanation_video_width,
        height=submission.explanation_video_height,
        duration_seconds=submission.explanation_video_duration_seconds,
        created_at=submission.explanation_video_created_at,
    )


def submission_response(submission: Submission, candidate: CandidateIdentity) -> SubmissionResponse:
    return SubmissionResponse(
        id=submission.id,
        candidate=candidate_response(candidate),
        candidate_id=submission.candidate_id,
        opportunity_id=submission.opportunity_id,
        github_url=submission.github_url,
        explanation_video=media_from_submission(submission),
        explanation_video_secure_url=submission.explanation_video_secure_url,
        status=submission.status,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
    )


class SubmissionService:
    def __init__(
        self,
        repository: SubmissionRepository,
        opportunity_repository: OpportunityRepository,
        candidate: CandidateIdentity,
    ):
        self.repository = repository
        self.opportunity_repository = opportunity_repository
        self.candidate = candidate

    async def create(self, payload: CreateSubmissionRequest) -> SubmissionResponse:
        if not await self.opportunity_repository.get(payload.opportunity_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")

        media = payload.explanation_video
        submission = Submission(
            candidate_id=self.candidate.id,
            opportunity_id=payload.opportunity_id,
            github_url=str(payload.github_url),
            explanation_video_public_id=media.public_id,
            explanation_video_secure_url=str(media.secure_url),
            explanation_video_duration_seconds=media.duration_seconds,
            explanation_video_format=media.format,
            explanation_video_bytes=media.bytes,
            explanation_video_width=media.width,
            explanation_video_height=media.height,
            explanation_video_created_at=media.created_at,
            status="submitted",
        )
        saved = await self.repository.upsert(submission)
        return submission_response(saved, self.candidate)

    async def get(self, submission_id: str) -> SubmissionResponse:
        submission = await self.repository.get(submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
        return submission_response(submission, self.candidate)

    async def list_candidate(self) -> list[SubmissionResponse]:
        return [submission_response(item, self.candidate) for item in await self.repository.list_for_candidate(self.candidate.id)]

    async def list_opportunity(self, opportunity_id: str) -> list[SubmissionResponse]:
        return [submission_response(item, self.candidate) for item in await self.repository.list_for_opportunity(opportunity_id)]
